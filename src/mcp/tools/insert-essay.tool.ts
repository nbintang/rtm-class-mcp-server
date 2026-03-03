import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../config/config.service';
import { RedisService } from '../../redis/redis.service';

import { InsertEssaySchema, type InsertEssayT } from '../schemas/essay.schema';
import { GenerationJob } from '../entities/generation-job.entity';
import { EssayQuiz } from '../entities/essay-quiz.entity';
import { EssayQuestion } from '../entities/essay-question.entity';

@Injectable()
export class InsertEssayTool {
  constructor(
    private readonly ds: DataSource,
    private readonly config: AppConfigService,
    private readonly redis: RedisService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  @Tool({
    name: 'insert_essay',
    description: 'Insert essay quiz ke DB (minimal payload).',
    parameters: InsertEssaySchema,
    annotations: { destructiveHint: true },
  })
  async run(args: InsertEssayT) {
    const { job_id, user_id, document_id, essay_quiz } = args;
    const lockKey = `lock:insert_essay:${job_id}:${document_id}`;
    let lockToken: string | null = null;
    let lockAcquireErrored = false;

    this.logger.log(
      `insert_essay started job_id=${job_id} user_id=${user_id} document_id=${document_id} questions=${essay_quiz.questions.length}`,
      InsertEssayTool.name,
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
            `insert_essay lock unavailable, continuing without Redis lock: ${message}`,
            InsertEssayTool.name,
          );
        }

        if (!lockToken && !lockAcquireErrored) {
          const existingJob = await this.ds
            .getRepository(GenerationJob)
            .findOne({ where: { jobId: job_id } });
          if (existingJob) {
            const existingQuiz = await this.ds
              .getRepository(EssayQuiz)
              .findOne({
                where: {
                  job: { id: existingJob.id },
                  documentId: document_id,
                },
                relations: ['job'],
              });

            if (existingQuiz) {
              return {
                jobId: existingJob.id,
                essayQuizId: existingQuiz.id,
                questionsInserted: 0,
                note: 'quiz already exists (lock contention no-op)',
              };
            }
          }

          throw new Error(
            `insert_essay already processing for job_id=${job_id} document_id=${document_id}`,
          );
        }
      }

      const saved = await this.ds.transaction(async (em) => {
        // 1) pastikan job ada (idealnya dibuat oleh webhook receiver / job-accepted flow)
        let job = await em.findOne(GenerationJob, { where: { jobId: job_id } });

        if (!job) {
          // Pilih salah satu:
          // A) strict: throw supaya datanya selalu konsisten
          // throw new Error(`GenerationJob not found for job_id=${job_id}`);

          // B) atau buat stub minimal (butuh kolom event/status nullable/default di entity)
          job = await em.save(
            em.create(GenerationJob, {
              jobId: job_id,
              userId: user_id,
              documentId: document_id,
              event: 'material.generated',
              status: 'succeeded',
              filename: `${document_id}.pdf`,
              fileType: 'application/pdf',
              extractedChars: 0,
            }),
          );
        }

        // 2) idempotency sederhana: kalau sudah ada quiz utk job+document, skip
        const existingQuiz = await em.findOne(EssayQuiz, {
          where: { job: { id: job.id }, documentId: document_id },
          relations: ['job'],
        });

        if (existingQuiz) {
          return {
            jobId: job.id,
            essayQuizId: existingQuiz.id,
            questionsInserted: 0,
            note: 'quiz already exists (idempotent no-op)',
          };
        }

        // 3) insert quiz
        const quiz = await em.save(
          em.create(EssayQuiz, {
            job,
            userId: user_id,
            documentId: document_id,
          }),
        );

        // 4) insert questions
        const questions = essay_quiz.questions.map((q) =>
          em.create(EssayQuestion, {
            quiz,
            question: q.question,
            expectedPoints: q.expected_points,
          }),
        );
        await em.save(questions);

        return {
          jobId: job.id,
          essayQuizId: quiz.id,
          questionsInserted: questions.length,
        };
      });

      this.logger.log(
        `insert_essay success job_id=${job_id} essay_quiz_id=${saved.essayQuizId} questions=${saved.questionsInserted}`,
        InsertEssayTool.name,
      );
      return saved;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `insert_essay failed job_id=${job_id} error=${message}`,
        error instanceof Error ? error.stack : undefined,
        InsertEssayTool.name,
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
            `insert_essay lock release failed: ${message}`,
            InsertEssayTool.name,
          );
        }
      }
    }
  }
}
