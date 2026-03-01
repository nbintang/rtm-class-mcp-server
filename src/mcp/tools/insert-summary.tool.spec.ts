import { InsertSummaryTool } from './insert-summary.tool';

describe('InsertSummaryTool', () => {
  it('should insert summary and return key point count', async () => {
    const job = { id: 'job-db-id', jobId: 'job-summary' };
    const summary = { id: 'summary-1', keyPoints: ['p1', 'p2', 'p3'] };

    const em = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((_entity, data) => data),
      save: jest
        .fn()
        .mockResolvedValueOnce(job)
        .mockResolvedValueOnce([{ id: 'source-1' }])
        .mockResolvedValueOnce([{ id: 'warning-1' }])
        .mockResolvedValueOnce(summary),
    };

    const ds = {
      transaction: jest.fn(async (cb: (arg0: typeof em) => unknown) => cb(em)),
    };
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const tool = new InsertSummaryTool(ds as never, logger as never);

    const result = await tool.run({
      event: 'material.generated',
      job_id: 'job-summary',
      status: 'SUCCESS',
      user_id: 'user-1',
      result: {
        user_id: 'user-1',
        document_id: 'doc-1',
        attempt: 1,
        finished_at: '2026-03-01T09:00:00.000Z',
        material: {
          filename: 'file.pdf',
          file_type: 'application/pdf',
          extracted_chars: 1000,
        },
        sources: [{ chunk_id: 'awdawd', source_id: 'src-1', excerpt: 'text' }],
        warnings: ['warning-1'],
        tool_calls: [],
        summary: {
          title: 'Summary title',
          overview: 'Overview text',
          key_points: ['p1', 'p2', 'p3'],
        },
      },
    });

    expect(result).toEqual({
      jobId: 'job-db-id',
      summaryId: 'summary-1',
      keyPoints: 3,
    });
    expect(ds.transaction).toHaveBeenCalledTimes(1);
    expect(em.findOne).toHaveBeenCalledTimes(1);
    expect(em.save).toHaveBeenCalledTimes(4);
  });
});
