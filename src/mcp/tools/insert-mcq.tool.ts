import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../config/config.service';
import { RedisService } from '../../redis/redis.service';

import { InsertMcqSchema, type InsertMcqT } from '../schemas/mcq.schema';
import { GenerationJob } from '../entities/generation-job.entity';
import { McqQuiz } from '../entities/mcp-quiz.entity';
import { McqQuestion } from '../entities/mcq-question.entity';

@Injectable()
export class InsertMcqTool {
  constructor(
    private readonly ds: DataSource,
    private readonly config: AppConfigService,
    private readonly redis: RedisService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  @Tool({
    name: 'insert_mcq',
    description: 'Insert MCQ quiz ke DB (minimal payload).',
    parameters: InsertMcqSchema,
    annotations: { destructiveHint: true },
  })
  async run(args: InsertMcqT) {
    const { job_id, user_id, document_id, mcq_quiz } = args;
    const lockKey = `lock:insert_mcq:${job_id}:${document_id}`;
    let lockToken: string | null = null;
    let lockAcquireErrored = false;

    this.logger.log(
      `insert_mcq started job_id=${job_id} user_id=${user_id} document_id=${document_id} questions=${mcq_quiz.questions.length}`,
      InsertMcqTool.name,
    );

    try {
      if (this.redis.isEnabled()) {
        try {
          lockToken = await this.redis.acquireLock(
            lockKey,
            this.config.redisLockTtlMs,
          );
        } catch (error) {
          lockAcquireErrored = true;
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `insert_mcq lock unavailable, continuing without Redis lock: ${message}`,
            InsertMcqTool.name,
          );
        }

        if (!lockToken && !lockAcquireErrored) {
          const existingJob = await this.ds
            .getRepository(GenerationJob)
            .findOne({ where: { jobId: job_id } });
          if (existingJob) {
            const existingQuiz = await this.ds.getRepository(McqQuiz).findOne({
              where: {
                job: { id: existingJob.id },
                documentId: document_id,
              },
              relations: ['job'],
            });

            if (existingQuiz) {
              return {
                jobId: existingJob.id,
                mcqQuizId: existingQuiz.id,
                questionsInserted: 0,
                note: 'quiz already exists (lock contention no-op)',
              };
            }
          }

          throw new Error(
            `insert_mcq already processing for job_id=${job_id} document_id=${document_id}`,
          );
        }
      }

      const saved = await this.ds.transaction(async (em) => {
        // 1) Pastikan job record ada (atau buat stub minimal)
        let job = await em.findOne(GenerationJob, { where: { jobId: job_id } });

        if (!job) {
          // Stub minimal (kalau kamu mau strict: throw error saja)
          job = em.create(GenerationJob, {
            jobId: job_id,
            userId: user_id,
            documentId: document_id,
            // event/status/material/finishedAt/attempt TIDAK ADA di schema minimal
            // set default/nullable di entity, atau isi nilai aman:
            event: 'material.generated',
            status: 'succeeded',
            filename: `${document_id}.pdf`,
            fileType: 'application/pdf',
            extractedChars: 0,
          });
          job = await em.save(job);
        }

        // 2) Idempotency sederhana:
        //    kalau sudah pernah insert quiz untuk job+document, jangan dobel
        const existingQuiz = await em.findOne(McqQuiz, {
          where: { job: { id: job.id }, documentId: document_id },
          relations: ['job'],
        });

        if (existingQuiz) {
          // Optional: juga cek jumlah questions yg ada, dll
          return {
            jobId: job.id,
            mcqQuizId: existingQuiz.id,
            questionsInserted: 0,
            note: 'quiz already exists (idempotent no-op)',
          };
        }

        // 3) Insert quiz
        const quiz = em.create(McqQuiz, {
          job,
          userId: user_id,
          documentId: document_id,
        });
        const savedQuiz = await em.save(quiz);

        // 4) Insert questions
        const questions = mcq_quiz.questions.map((q) =>
          em.create(McqQuestion, {
            quiz: savedQuiz,
            question: q.question,
            options: q.options,
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
          }),
        );
        await em.save(questions);

        return {
          jobId: job.id,
          mcqQuizId: savedQuiz.id,
          questionsInserted: questions.length,
        };
      });

      this.logger.log(
        `insert_mcq success job_id=${job_id} mcq_quiz_id=${saved.mcqQuizId} questions=${saved.questionsInserted}`,
        InsertMcqTool.name,
      );
      return saved;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `insert_mcq failed job_id=${job_id} error=${message}`,
        error instanceof Error ? error.stack : undefined,
        InsertMcqTool.name,
      );
      throw error;
    } finally {
      if (lockToken) {
        try {
          await this.redis.releaseLock(lockKey, lockToken);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `insert_mcq lock release failed: ${message}`,
            InsertMcqTool.name,
          );
        }
      }
    }
  }
}
