import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../config/config.service';
import { RedisService } from '../../redis/redis.service';

import { InsertEssaySchema, type InsertEssayT } from '../schemas/essay.schema';
import { AiJobEntity } from '../entities/ai-job.entity';
import { AiOutputEntity } from '../entities/ai-output.entity';
import { AIJobStatus } from '../entities/ai-job.enums';

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
    description: 'Insert hasil essay ke AIOutput (berdasarkan AIJob).',
    parameters: InsertEssaySchema,
    annotations: { destructiveHint: true },
  })
  async run(args: InsertEssayT) {
    const { job_id, essay_quiz } = args;
    const requestedById = args.requested_by_id;
    const materialId = args.material_id;

    if (!requestedById || !materialId) {
      throw new Error('requested_by_id dan material_id wajib diisi');
    }

    const lockKey = `lock:insert_essay:${job_id}:${materialId}`;
    let lockToken: string | null = null;
    let lockAcquireErrored = false;

    this.logger.log(
      `insert_essay started job_id=${job_id} requested_by_id=${requestedById} material_id=${materialId} questions=${essay_quiz.questions.length}`,
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
          const existingJob = await this.ds.getRepository(AiJobEntity).findOne({
            where: {
              id: job_id,
            },
          });

          if (!existingJob) {
            throw new Error('AIJob not found');
          }

          if (
            existingJob.requestedById !== requestedById ||
            existingJob.materialId !== materialId
          ) {
            throw new Error('AIJob does not match requested_by_id/material_id');
          }

          const existingOutput = await this.ds
            .getRepository(AiOutputEntity)
            .findOne({ where: { jobId: existingJob.id } });

          if (existingOutput) {
            const existingQuestions = (existingOutput.content as {
              essay_quiz?: { questions?: unknown[] };
            }).essay_quiz?.questions;

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
            `insert_essay already processing for job_id=${job_id} material_id=${materialId}`,
          );
        }
      }

      const saved = await this.ds.transaction(async (em) => {
        const job = await em.findOne(AiJobEntity, {
          where: {
            id: job_id,
          },
        });

        if (!job) {
          throw new Error('AIJob not found');
        }

        if (job.requestedById !== requestedById || job.materialId !== materialId) {
          throw new Error('AIJob does not match requested_by_id/material_id');
        }

        const existingOutput = await em.findOne(AiOutputEntity, {
          where: { jobId: job.id },
        });

        if (existingOutput) {
          const existingQuestions = (existingOutput.content as {
            essay_quiz?: { questions?: unknown[] };
          }).essay_quiz?.questions;

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
              essay_quiz,
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
          questionsInserted: essay_quiz.questions.length,
        };
      });

      this.logger.log(
        `insert_essay success job_id=${job_id} ai_output_id=${saved.aiOutputId} questions=${saved.questionsInserted}`,
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
