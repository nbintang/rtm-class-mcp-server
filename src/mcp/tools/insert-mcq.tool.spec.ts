import { InsertMcqTool } from './insert-mcq.tool';
import { AiOutputEntity } from '../entities/ai-output.entity';
import { AIJobStatus, AIJobType } from '../entities/ai-job.enums';

describe('InsertMcqTool', () => {
  it('should insert AI output for an existing job and mark job as succeeded', async () => {
    const job = {
      id: 'job-db-id',
      materialId: 'doc-1',
      requestedById: 'user-1',
      type: AIJobType.MCQ,
      status: AIJobStatus.PROCESSING,
      completedAt: null,
    };
    const output = { id: 'output-1' };

    const em = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(job)
        .mockResolvedValueOnce(null),
      create: jest.fn(
        (_entity: unknown, data: Record<string, unknown>) => data,
      ),
      save: jest.fn().mockResolvedValueOnce(output),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const ds = {
      transaction: jest.fn((cb: (arg0: typeof em) => unknown) =>
        Promise.resolve(cb(em)),
      ),
    };
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    const config = { redisLockTtlMs: 15000 };
    const redis = {
      isEnabled: jest.fn().mockReturnValue(false),
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
    };

    const tool = new InsertMcqTool(
      ds as never,
      config as never,
      redis as never,
      logger as never,
    );

    const result = await tool.run({
      job_id: 'job-db-id',
      requested_by_id: 'user-1',
      material_id: 'doc-1',
      mcq_quiz: {
        questions: [
          {
            question: 'What is A?',
            options: ['A', 'B', 'C', 'D'],
            correct_answer: 'A',
            explanation: 'Because A',
          },
          {
            question: 'What is B?',
            options: ['A', 'B', 'C', 'D'],
            correct_answer: 'B',
            explanation: 'Because B',
          },
        ],
      },
    });

    expect(result).toEqual({
      jobId: 'job-db-id',
      aiOutputId: 'output-1',
      questionsInserted: 2,
    });
    expect(em.create).toHaveBeenCalledWith(
      AiOutputEntity,
      expect.objectContaining({
        materialId: 'doc-1',
        type: AIJobType.MCQ,
        jobId: 'job-db-id',
      }),
    );
    expect(em.update).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'job-db-id' },
      expect.objectContaining({
        status: AIJobStatus.SUCCEEDED,
      }),
    );
    expect(ds.transaction).toHaveBeenCalledTimes(1);
    expect(em.findOne).toHaveBeenCalledTimes(2);
    expect(em.save).toHaveBeenCalledTimes(1);
    expect(redis.isEnabled).toHaveBeenCalledTimes(1);
  });
});
