import { InsertEssayTool } from './insert-essay.tool';

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
        .mockResolvedValueOnce([{ id: 'source-1' }])
        .mockResolvedValueOnce([{ id: 'warning-1' }])
        .mockResolvedValueOnce(quiz)
        .mockResolvedValueOnce(savedQuestions),
    };

    const ds = {
      transaction: jest.fn(async (cb: (arg0: typeof em) => unknown) => cb(em)),
    };

    const tool = new InsertEssayTool(ds as never);

    const result = await tool.run({
      event: 'material.generated',
      job_id: 'job-essay',
      status: 'SUCCESS',
      user_id: 'user-1',
      result: {
        user_id: 'user-1',
        document_id: 'doc-1',
        attempt: 1,
        finished_at: new Date('2026-03-01T09:00:00.000Z'),
        material: {
          filename: 'file.pdf',
          file_type: 'application/pdf',
          extracted_chars: 1000,
        },
        sources: [{ chunk_id: 'dwad', source_id: 'src-1', excerpt: 'text' }],
        warnings: ['warning-1'],
        tool_calls: [],
        essay_quiz: {
          questions: [
            { question: 'Explain X', expected_points: '5' },
            { question: 'Explain Y', expected_points: '10' },
          ],
        },
      },
    });

    expect(result).toEqual({
      jobId: 'job-db-id',
      essayQuizId: 'essay-quiz-1',
      questionsInserted: 2,
    });
    expect(ds.transaction).toHaveBeenCalledTimes(1);
    expect(em.findOne).toHaveBeenCalledTimes(1);
    expect(em.save).toHaveBeenCalledTimes(5);
  });
});
