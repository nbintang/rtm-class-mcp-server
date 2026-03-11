import { InsertEssayTool } from './insert-essay.tool';
import { AIJobStatus, AIJobType } from '@prisma/client';

describe('InsertEssayTool', () => {
  it('should insert AI output for an existing job and mark job as succeeded', async () => {
    const job = {
      id: 'job-db-id',
      materialId: 'doc-1',
      requestedById: 'user-1',
      type: AIJobType.ESSAY,
      status: AIJobStatus.PROCESSING,
      completedAt: null,
    };
    const output = { id: 'essay-output-1' };

    const tx = {
      aiJob: {
        findUnique: jest.fn().mockResolvedValue(job),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'job-db-id' }),
      },
      aiOutput: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(output),
      },
    };

    const prisma = {
      $transaction: jest.fn((cb: (arg0: typeof tx) => unknown) =>
        Promise.resolve(cb(tx)),
      ),
      aiJob: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      aiOutput: {
        findUnique: jest.fn(),
      },
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

    const tool = new InsertEssayTool(
      prisma as never,
      config as never,
      redis as never,
      logger as never,
    );

    const result = await tool.run({
      job_id: 'job-db-id',
      requested_by_id: 'user-1',
      material_id: 'doc-1',
      essay_quiz: {
        questions: [
          { question: 'Explain X', expected_points: '5' },
          { question: 'Explain Y', expected_points: '10' },
        ],
      },
    });

    expect(result).toEqual({
      jobId: 'job-db-id',
      aiOutputId: 'essay-output-1',
      questionsInserted: 2,
    });
    expect(tx.aiOutput.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          materialId: 'doc-1',
          type: AIJobType.ESSAY,
          jobId: 'job-db-id',
        }),
      }),
    );
    expect(tx.aiJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-db-id' },
        data: expect.objectContaining({
          status: AIJobStatus.SUCCEEDED,
        }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.aiJob.findUnique).toHaveBeenCalledTimes(1);
    expect(tx.aiOutput.findUnique).toHaveBeenCalledTimes(1);
    expect(redis.isEnabled).toHaveBeenCalledTimes(1);
  });

  it('should resolve job by externalJobId when job_id is not AIJob.id', async () => {
    const job = {
      id: 'job-db-id',
      externalJobId: 'ext-job-1',
      materialId: 'doc-1',
      requestedById: 'user-1',
      type: AIJobType.ESSAY,
      status: AIJobStatus.PROCESSING,
      completedAt: null,
    };
    const output = { id: 'essay-output-2' };

    const tx = {
      aiJob: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(job),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'job-db-id' }),
      },
      aiOutput: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(output),
      },
    };

    const prisma = {
      $transaction: jest.fn((cb: (arg0: typeof tx) => unknown) =>
        Promise.resolve(cb(tx)),
      ),
      aiJob: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      aiOutput: {
        findUnique: jest.fn(),
      },
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

    const tool = new InsertEssayTool(
      prisma as never,
      config as never,
      redis as never,
      logger as never,
    );

    const result = await tool.run({
      job_id: 'ext-job-1',
      requested_by_id: 'user-1',
      material_id: 'doc-1',
      essay_quiz: {
        questions: [{ question: 'Explain X', expected_points: '5' }],
      },
    });

    expect(result).toEqual({
      jobId: 'job-db-id',
      aiOutputId: 'essay-output-2',
      questionsInserted: 1,
    });
    expect(tx.aiJob.findUnique).toHaveBeenCalledWith({
      where: { id: 'ext-job-1' },
    });
    expect(tx.aiJob.findFirst).toHaveBeenCalledWith({
      where: { externalJobId: 'ext-job-1' },
    });
  });
});
