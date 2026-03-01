import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { DataSource } from 'typeorm';
import {
  EssayGeneratedSchema,
  type EssayGeneratedT,
} from '../schemas/essay.schema';
import { GenerationJob } from '../entities/generation-job.entity';
import { GenerationSource } from '../entities/generation-source.entity';
import { GenerationWarning } from '../entities/generation-warning.entity';
import { EssayQuiz } from '../entities/essay-quiz.entity';
import { EssayQuestion } from '../entities/essay-question.entity';

@Injectable()
export class InsertEssayTool {
  constructor(private readonly ds: DataSource) {}

  @Tool({
    name: 'db_insert_essay_generated',
    description:
      'Insert payload "essay generated" (event material.generated) ke DB.',
    parameters: EssayGeneratedSchema,
    annotations: { destructiveHint: true },
  })
  async run(args: EssayGeneratedT) {
    const { event, job_id, status, user_id, result } = args;

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
        await em.save(
          result.sources.map((s) =>
            em.create(GenerationSource, {
              job,
              chunkId: s.chunk_id,
              sourceId: s.source_id,
              excerpt: s.excerpt,
            }),
          ),
        );
      }

      if (result.warnings?.length) {
        await em.save(
          result.warnings.map((w) =>
            em.create(GenerationWarning, { job, message: w }),
          ),
        );
      }

      const quiz = await em.save(
        em.create(EssayQuiz, {
          job,
          userId: result.user_id,
          documentId: result.document_id,
        }),
      );

      const questions = result.essay_quiz.questions.map((q) =>
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

    return saved;
  }
}
