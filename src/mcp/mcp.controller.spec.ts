import { McpController } from './mcp.controller';
import { InsertMcqTool } from './tools/insert-mcq.tool';
import { InsertEssayTool } from './tools/insert-essay.tool';
import { InsertSummaryTool } from './tools/insert-summary.tool';

describe('McpController', () => {
  const mcqTool = { run: jest.fn() } as unknown as InsertMcqTool;
  const essayTool = { run: jest.fn() } as unknown as InsertEssayTool;
  const summaryTool = { run: jest.fn() } as unknown as InsertSummaryTool;
  const controller = new McpController(mcqTool, essayTool, summaryTool);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call insert mcq tool for valid payload', async () => {
    (mcqTool.run as jest.Mock).mockResolvedValue({ mcqQuizId: '1' });

    const payload = {
      event: 'material.generated',
      job_id: 'job-1',
      status: 'SUCCESS',
      user_id: 'user-1',
      result: {
        user_id: 'user-1',
        document_id: 'doc-1',
        attempt: 1,
        finished_at: new Date('2026-03-01T09:00:00.000Z'),
        material: {
          filename: 'a.pdf',
          file_type: 'application/pdf',
          extracted_chars: 100,
        },
        sources: [{ chunk_id: '1', source_id: 'source-1', excerpt: 'x' }],
        warnings: [],
        mcq_quiz: {
          questions: [
            {
              question: 'Q?',
              options: ['A', 'B', 'C', 'D'],
              correct_answer: 'A',
              explanation: 'exp',
            },
          ],
        },
      },
    };

    await controller.insertMcq(payload);
    expect(mcqTool.run).toHaveBeenCalledWith(payload);
  });

  it('should call insert summary tool', async () => {
    (summaryTool.run as jest.Mock).mockResolvedValue({ summaryId: '1' });

    const payload = {
      event: 'material.generated',
      job_id: 'job-2',
      status: 'SUCCESS',
      user_id: 'user-1',
      result: {
        user_id: 'user-1',
        document_id: 'doc-1',
        material: {
          filename: 'a.pdf',
          file_type: 'application/pdf',
          extracted_chars: 100,
        },
        sources: [],
        warnings: [],
        summary: {
          title: 'Title',
          overview: 'Overview',
          key_points: ['p1'],
        },
      },
    };

    await controller.insertSummary(payload);
    expect(summaryTool.run).toHaveBeenCalledWith(payload);
  });
});
