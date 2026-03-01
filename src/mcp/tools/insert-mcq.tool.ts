import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource } from 'typeorm';
import { McqGeneratedSchema, type McqGeneratedT } from '../schemas/mcq.schema';
import { GenerationJob } from '../entities/generation-job.entity';
import { GenerationSource } from '../entities/generation-source.entity';
import { GenerationWarning } from '../entities/generation-warning.entity';
import { McqQuiz } from '../entities/mcp-quiz.entity';
import { McqQuestion } from '../entities/mcq-question.entity';

@Injectable()
export class InsertMcqTool {
  constructor(
    private readonly ds: DataSource,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  @Tool({
    name: 'insert_mcq',
    description:
      'Insert payload "mcq quiz generated" (event material.generated) ke DB.',
    parameters: McqGeneratedSchema,
    annotations: { destructiveHint: true },
  })
  async run(args: McqGeneratedT) {
    const { event, job_id, status, user_id, result } = args;
    this.logger.log(
      `insert_mcq started job_id=${job_id} user_id=${user_id} status=${status}`,
      InsertMcqTool.name,
    );

    try {
      const saved = await this.ds.transaction(async (em) => {
        let job = await em.findOne(GenerationJob, { where: { jobId: job_id } });

        if (!job) {
          job = em.create(GenerationJob, {
            jobId: job_id,
            event,
            status,
            userId: user_id,
            documentId: result.document_id,
            filename: result.material.filename,
            fileType: result.material.file_type,
            extractedChars: result.material.extracted_chars,
            attempt: result.attempt,
            finishedAt: result.finished_at
              ? new Date(result.finished_at)
              : undefined,
          });
          job = await em.save(job);
        }

        if (result.sources?.length) {
          const sources = result.sources.map((s) =>
            em.create(GenerationSource, {
              job,
              chunkId: s.chunk_id,
              sourceId: s.source_id,
              excerpt: s.excerpt,
            }),
          );
          await em.save(sources);
        }

        if (result.warnings?.length) {
          const warnings = result.warnings.map((w) =>
            em.create(GenerationWarning, { job, message: w }),
          );
          await em.save(warnings);
        }

        const quiz = em.create(McqQuiz, {
          job,
          userId: result.user_id,
          documentId: result.document_id,
        });
        const savedQuiz = await em.save(quiz);

        const questions = result.mcq_quiz.questions.map((q) =>
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
    }
  }
}
