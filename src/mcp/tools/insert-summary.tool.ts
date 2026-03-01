import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { DataSource } from 'typeorm';
import {
  SummaryGeneratedSchema,
  type SummaryGeneratedT,
} from '../schemas/summary.schema';
import { GenerationJob } from '../entities/generation-job.entity';
import { GenerationSource } from '../entities/generation-source.entity';
import { GenerationWarning } from '../entities/generation-warning.entity';
import { Summary } from '../entities/summary.entity';

@Injectable()
export class InsertSummaryTool {
  constructor(private readonly ds: DataSource) {}

  @Tool({
    name: 'insert_summary',
    description:
      'Insert payload "summary generated" (event material.generated) ke DB.',
    parameters: SummaryGeneratedSchema,
    annotations: { destructiveHint: true },
  })
  async run(args: SummaryGeneratedT) {
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

      const summary = await em.save(
        em.create(Summary, {
          job,
          userId: result.user_id,
          documentId: result.document_id,
          title: result.summary.title,
          overview: result.summary.overview,
          keyPoints: result.summary.key_points,
        }),
      );

      return {
        jobId: job.id,
        summaryId: summary.id,
        keyPoints: summary.keyPoints.length,
      };
    });

    return saved;
  }
}
