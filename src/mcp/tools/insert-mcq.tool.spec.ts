import { InsertMcqTool } from './insert-mcq.tool';
import { GenerationJob } from '../entities/generation-job.entity';

describe('InsertMcqTool', () => {
  it('should insert job, quiz, and mcq questions', async () => {
    const job = { id: 'job-db-id', jobId: 'job-1' };
    const quiz = { id: 'quiz-1' };
    const savedQuestions = [{ id: 'q1' }, { id: 'q2' }];

    const em = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(
        (_entity: unknown, data: Record<string, unknown>) => data,
      ),
      save: jest
        .fn()
        .mockResolvedValueOnce(job)
        .mockResolvedValueOnce(quiz)
        .mockResolvedValueOnce(savedQuestions),
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
      job_id: 'job-1',
      user_id: 'user-1',
      document_id: 'doc-1',
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
      mcqQuizId: 'quiz-1',
      questionsInserted: 2,
    });
    expect(em.create).toHaveBeenCalledWith(
      GenerationJob,
      expect.objectContaining({
        jobId: 'job-1',
        userId: 'user-1',
        documentId: 'doc-1',
        event: 'material.generated',
        status: 'succeeded',
        filename: 'doc-1.pdf',
        fileType: 'application/pdf',
        extractedChars: 0,
      }),
    );
    expect(ds.transaction).toHaveBeenCalledTimes(1);
    expect(em.findOne).toHaveBeenCalledTimes(2);
    expect(em.save).toHaveBeenCalledTimes(3);
    expect(redis.isEnabled).toHaveBeenCalledTimes(1);
  });
});
