import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../config/config.service';
import { RedisService } from '../../redis/redis.service';

import { InsertMcqSchema, type InsertMcqT } from '../schemas/mcq.schema';
import { AiJobEntity } from '../entities/ai-job.entity';
import { AiOutputEntity } from '../entities/ai-output.entity';
import { AIJobStatus, AIJobType } from '../entities/ai-job.enums';

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
    description: 'Insert hasil MCQ ke AIOutput (berdasarkan AIJob).',
    parameters: InsertMcqSchema,
    annotations: { destructiveHint: true },
  })
  async run(args: InsertMcqT) {
    const { job_id, mcq_quiz } = args;
    const requestedById = args.requested_by_id;
    const materialId = args.material_id;

    if (!requestedById || !materialId) {
      throw new Error('requested_by_id dan material_id wajib diisi');
    }

    const lockKey = `lock:insert_mcq:${job_id}:${materialId}`;
    let lockToken: string | null = null;
    let lockAcquireErrored = false;

    this.logger.log(
      `insert_mcq started job_id=${job_id} requested_by_id=${requestedById} material_id=${materialId} questions=${mcq_quiz.questions.length}`,
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
          const repo = this.ds.getRepository(AiJobEntity);
          const existingJobById = await repo.findOne({
            where: {
              id: job_id,
            },
          });
          const existingJob =
            existingJobById ??
            (await repo.findOne({
              where: {
                externalJobId: job_id,
              },
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

          const existingOutput = await this.ds
            .getRepository(AiOutputEntity)
            .findOne({
              where: { jobId: existingJob.id },
            });

          if (existingOutput) {
            const existingQuestions = (
              existingOutput.content as {
                mcq_quiz?: { questions?: unknown[] };
              }
            ).mcq_quiz?.questions;

            return {
              jobId: existingJob.id,
              aiOutputId: existingOutput.id,
              questionsInserted: Array.isArray(existingQuestions)
                ? existingQuestions.length
                : 0,
              note: 'output already exists (lock contention no-op)',
            };
          }

          throw new Error(
            `insert_mcq already processing for job_id=${job_id} material_id=${materialId}`,
          );
        }
      }

      const saved = await this.ds.transaction(async (em) => {
        let job = await em.findOne(AiJobEntity, {
          where: [{ id: job_id }, { externalJobId: job_id }],
        });

        if (!job) {
          this.logger.log(
            `AIJob not found, auto-creating for job_id=${job_id}`,
            InsertMcqTool.name,
          );
          job = await em.save(
            em.create(AiJobEntity, {
              id: job_id.length === 36 ? job_id : undefined,
              externalJobId: job_id,
              materialId,
              requestedById,
              type: AIJobType.MCQ,
              status: AIJobStatus.PROCESSING,
            }),
          );
        }

        if (
          job.requestedById !== requestedById ||
          job.materialId !== materialId
        ) {
          throw new Error('AIJob does not match requested_by_id/material_id');
        }

        const existingOutput = await em.findOne(AiOutputEntity, {
          where: { jobId: job.id },
        });

        if (existingOutput) {
          const existingQuestions = (
            existingOutput.content as {
              mcq_quiz?: { questions?: unknown[] };
            }
          ).mcq_quiz?.questions;

          if (job.status !== AIJobStatus.SUCCEEDED || !job.completedAt) {
            await em.update(
              AiJobEntity,
              { id: job.id },
              {
                status: AIJobStatus.SUCCEEDED,
                completedAt: new Date(),
                lastError: null,
              },
            );
          }

          return {
            jobId: job.id,
            aiOutputId: existingOutput.id,
            questionsInserted: Array.isArray(existingQuestions)
              ? existingQuestions.length
              : 0,
            note: 'output already exists (idempotent no-op)',
          };
        }

        const savedOutput = await em.save(
          em.create(AiOutputEntity, {
            materialId: job.materialId,
            jobId: job.id,
            type: job.type,
            content: {
              mcq_quiz,
            },
            editedContent: null,
            isPublished: false,
            publishedAt: null,
          }),
        );

        await em.update(
          AiJobEntity,
          { id: job.id },
          {
            status: AIJobStatus.SUCCEEDED,
            completedAt: new Date(),
            lastError: null,
          },
        );

        return {
          jobId: job.id,
          aiOutputId: savedOutput.id,
          questionsInserted: mcq_quiz.questions.length,
        };
      });

      this.logger.log(
        `insert_mcq success job_id=${job_id} ai_output_id=${saved.aiOutputId} questions=${saved.questionsInserted}`,
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
