import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { randomUUID } from 'node:crypto';
import { AIJobStatus, AIJobType, Prisma } from '@prisma/client';
import { AppConfigService } from '../../config/config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  InsertSummarySchema,
  type InsertSummaryT,
} from '../schemas/summary.schema';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class InsertSummaryTool {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly redis: RedisService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  @Tool({
    name: 'insert_summary',
    description: 'Insert hasil summary ke AIOutput (berdasarkan AIJob).',
    parameters: InsertSummarySchema,
    annotations: { destructiveHint: true },
  })
  async run(args: InsertSummaryT) {
    const { job_id, summary, sources, warnings } = args;
    const requestedById = args.requested_by_id;
    const materialId = args.material_id;

    if (!requestedById || !materialId) {
      throw new Error('requested_by_id dan material_id wajib diisi');
    }

    const lockKey = `lock:insert_summary:${job_id}:${materialId}`;
    let lockToken: string | null = null;
    let lockAcquireErrored = false;

    this.logger.log(
      `insert_summary started job_id=${job_id} requested_by_id=${requestedById} material_id=${materialId}`,
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
          const existingJobById = await this.prisma.aiJob.findUnique({
            where: { id: job_id },
          });
          const existingJob =
            existingJobById ??
            (await this.prisma.aiJob.findFirst({
              where: { externalJobId: job_id },
            }));

          if (!existingJob) {
            throw new Error(
              `AIJob not found for job_id=${job_id} (checked id and externalJobId)`,
            );
          }

          if (
            existingJob.requestedById !== requestedById ||
            existingJob.materialId !== materialId
          ) {
            throw new Error('AIJob does not match requested_by_id/material_id');
          }

          const existingOutput = await this.prisma.aiOutput.findUnique({
            where: { jobId: existingJob.id },
          });

          if (existingOutput) {
            return {
              jobId: existingJob.id,
              aiOutputId: existingOutput.id,
              keyPoints: Array.isArray(
                (
                  existingOutput.content as {
                    summary?: { key_points?: unknown };
                  }
                ).summary?.key_points,
              )
                ? ((
                    existingOutput.content as {
                      summary: { key_points: unknown[] };
                    }
                  ).summary.key_points.length ?? 0)
                : 0,
              note: 'output already exists (lock contention no-op)',
            };
          }

          throw new Error(
            `insert_summary already processing for job_id=${job_id} material_id=${materialId}`,
          );
        }
      }

      const saved = await this.prisma.$transaction(async (tx) => {
        const jobById = await tx.aiJob.findUnique({
          where: { id: job_id },
        });

        let job =
          jobById ??
          (await tx.aiJob.findFirst({
            where: { externalJobId: job_id },
          }));

        if (!job) {
          this.logger.log(
            `AIJob not found, auto-creating for job_id=${job_id}`,
            InsertSummaryTool.name,
          );
          const autoJobId = UUID_REGEX.test(job_id) ? job_id : randomUUID();
          job = await tx.aiJob.create({
            data: {
              id: autoJobId,
              externalJobId: job_id,
              materialId,
              requestedById,
              type: AIJobType.SUMMARY,
              status: AIJobStatus.PROCESSING,
            },
          });
        }

        if (
          job.requestedById !== requestedById ||
          job.materialId !== materialId
        ) {
          throw new Error('AIJob does not match requested_by_id/material_id');
        }

        const existingOutput = await tx.aiOutput.findUnique({
          where: { jobId: job.id },
        });

        if (existingOutput) {
          const existingKeyPoints = (
            existingOutput.content as {
              summary?: { key_points?: unknown[] };
            }
          ).summary?.key_points;

          if (job.status !== AIJobStatus.SUCCEEDED || !job.completedAt) {
            await tx.aiJob.update({
              where: { id: job.id },
              data: {
                status: AIJobStatus.SUCCEEDED,
                completedAt: new Date(),
                lastError: null,
              },
            });
          }

          return {
            jobId: job.id,
            aiOutputId: existingOutput.id,
            keyPoints: Array.isArray(existingKeyPoints)
              ? existingKeyPoints.length
              : 0,
            note: 'output already exists (idempotent no-op)',
          };
        }

        const savedOutput = await tx.aiOutput.create({
          data: {
            id: randomUUID(),
            materialId: job.materialId,
            jobId: job.id,
            type: job.type,
            content: {
              summary,
              sources: sources ?? [],
              warnings: warnings ?? [],
            } as Prisma.InputJsonValue,
            editedContent: Prisma.DbNull,
            isPublished: false,
            publishedAt: null,
          },
        });

        await tx.aiJob.update({
          where: { id: job.id },
          data: {
            status: AIJobStatus.SUCCEEDED,
            completedAt: new Date(),
            lastError: null,
          },
        });

        return {
          jobId: job.id,
          aiOutputId: savedOutput.id,
          keyPoints: summary.key_points.length,
        };
      });

      this.logger.log(
        `insert_summary success job_id=${job_id} ai_output_id=${saved.aiOutputId} key_points=${saved.keyPoints}`,
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
