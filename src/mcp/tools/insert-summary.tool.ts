import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../config/config.service';
import { RedisService } from '../../redis/redis.service';
import {
  InsertSummarySchema,
  type InsertSummaryT,
} from '../schemas/summary.schema';
import { GenerationJob } from '../entities/generation-job.entity';
import { GenerationSource } from '../entities/generation-source.entity';
import { GenerationWarning } from '../entities/generation-warning.entity';
import { Summary } from '../entities/summary.entity';

@Injectable()
export class InsertSummaryTool {
  constructor(
    private readonly ds: DataSource,
    private readonly config: AppConfigService,
    private readonly redis: RedisService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  @Tool({
    name: 'insert_summary',
    description: 'Insert summary ke DB (minimal payload).',
    parameters: InsertSummarySchema,
    annotations: { destructiveHint: true },
  })
  async run(args: InsertSummaryT) {
    const {
      event,
      status,
      job_id,
      user_id,
      document_id,
      summary,
      filename,
      file_type,
      extracted_chars,
      sources,
      warnings,
    } = args;

    const effectiveEvent = event ?? 'material.generated';
    const effectiveStatus = status ?? 'succeeded';
    const effectiveFilename = filename ?? `${document_id}.pdf`;
    const effectiveFileType = file_type ?? 'application/pdf';
    const effectiveExtractedChars = extracted_chars ?? 0;
    const lockKey = `lock:insert_summary:${job_id}:${document_id}`;
    let lockToken: string | null = null;
    let lockAcquireErrored = false;

    this.logger.log(
      `insert_summary started job_id=${job_id} user_id=${user_id} document_id=${document_id}`,
      InsertSummaryTool.name,
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
            `insert_summary lock unavailable, continuing without Redis lock: ${message}`,
            InsertSummaryTool.name,
          );
        }

        if (!lockToken && !lockAcquireErrored) {
          const existingJob = await this.ds
            .getRepository(GenerationJob)
            .findOne({ where: { jobId: job_id } });
          if (existingJob) {
            const existingSummary = await this.ds
              .getRepository(Summary)
              .findOne({
                where: {
                  job: { id: existingJob.id },
                  documentId: document_id,
                },
                relations: ['job'],
              });

            if (existingSummary) {
              return {
                jobId: existingJob.id,
                summaryId: existingSummary.id,
                keyPoints: existingSummary.keyPoints.length,
                note: 'summary already exists (lock contention no-op)',
              };
            }
          }

          throw new Error(
            `insert_summary already processing for job_id=${job_id} document_id=${document_id}`,
          );
        }
      }

      const saved = await this.ds.transaction(async (em) => {
        let job = await em.findOne(GenerationJob, { where: { jobId: job_id } });

        if (!job) {
          job = em.create(GenerationJob, {
            jobId: job_id,
            event: effectiveEvent,
            status: effectiveStatus,
            userId: user_id,
            documentId: document_id,
            filename: effectiveFilename,
            fileType: effectiveFileType,
            extractedChars: effectiveExtractedChars,
          });
          job = await em.save(job);
        }

        const existingSummary = await em.findOne(Summary, {
          where: { job: { id: job.id }, documentId: document_id },
          relations: ['job'],
        });

        if (existingSummary) {
          return {
            jobId: job.id,
            summaryId: existingSummary.id,
            keyPoints: existingSummary.keyPoints.length,
            note: 'summary already exists (idempotent no-op)',
          };
        }

        if (sources?.length) {
          await em.save(
            sources.map((s) =>
              em.create(GenerationSource, {
                job,
                chunkId: s.chunk_id,
                sourceId: s.source_id,
                excerpt: s.excerpt,
              }),
            ),
          );
        }

        if (warnings?.length) {
          await em.save(
            warnings.map((w) =>
              em.create(GenerationWarning, { job, message: w }),
            ),
          );
        }

        const savedSummary = await em.save(
          em.create(Summary, {
            job,
            userId: user_id,
            documentId: document_id,
            title: summary.title,
            overview: summary.overview,
            keyPoints: summary.key_points,
          }),
        );

        return {
          jobId: job.id,
          summaryId: savedSummary.id,
          keyPoints: savedSummary.keyPoints.length,
        };
      });

      this.logger.log(
        `insert_summary success job_id=${job_id} summary_id=${saved.summaryId} key_points=${saved.keyPoints}`,
        InsertSummaryTool.name,
      );
      return saved;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `insert_summary failed job_id=${job_id} error=${message}`,
        error instanceof Error ? error.stack : undefined,
        InsertSummaryTool.name,
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
            `insert_summary lock release failed: ${message}`,
            InsertSummaryTool.name,
          );
        }
      }
    }
  }
}
