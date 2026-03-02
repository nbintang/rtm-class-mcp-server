import { InsertSummaryTool } from './insert-summary.tool';
import { GenerationJob } from '../entities/generation-job.entity';

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
      job_id: 'job-summary',
      user_id: 'user-1',
      document_id: 'doc-1',
      summary: {
        title: 'Summary title',
        overview: 'Overview text',
        key_points: ['p1', 'p2', 'p3'],
      },
      sources: [{ chunk_id: 'awdawd', source_id: 'src-1', excerpt: 'text' }],
      warnings: ['warning-1'],
    });

    expect(result).toEqual({
      jobId: 'job-db-id',
      summaryId: 'summary-1',
      keyPoints: 3,
    });
    expect(em.create).toHaveBeenCalledWith(
      GenerationJob,
      expect.objectContaining({
        jobId: 'job-summary',
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
    expect(em.findOne).toHaveBeenCalledTimes(1);
    expect(em.save).toHaveBeenCalledTimes(4);
  });
});
