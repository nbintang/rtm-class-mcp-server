import { InsertEssayTool } from './insert-essay.tool';
import { GenerationJob } from '../entities/generation-job.entity';

describe('InsertEssayTool', () => {
  it('should insert essay quiz and questions', async () => {
    const job = { id: 'job-db-id', jobId: 'job-essay' };
    const quiz = { id: 'essay-quiz-1' };
    const savedQuestions = [{ id: 'eq-1' }, { id: 'eq-2' }];

    const em = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((_entity, data) => data),
      save: jest
        .fn()
        .mockResolvedValueOnce(job)
        .mockResolvedValueOnce(quiz)
        .mockResolvedValueOnce(savedQuestions),
    };

    const ds = {
      transaction: jest.fn(async (cb: (arg0: typeof em) => unknown) => cb(em)),
    };
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const tool = new InsertEssayTool(ds as never, logger as never);

    const result = await tool.run({
      job_id: 'job-essay',
      user_id: 'user-1',
      document_id: 'doc-1',
      essay_quiz: {
        questions: [
          { question: 'Explain X', expected_points: '5' },
          { question: 'Explain Y', expected_points: '10' },
        ],
      },
    });

    expect(result).toEqual({
      jobId: 'job-db-id',
      essayQuizId: 'essay-quiz-1',
      questionsInserted: 2,
    });
    expect(em.create).toHaveBeenCalledWith(
      GenerationJob,
      expect.objectContaining({
        jobId: 'job-essay',
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
  });
});
