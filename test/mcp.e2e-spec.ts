import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { App } from 'supertest/types';
import { McpController } from '../src/mcp/mcp.controller';
import { InsertMcqTool } from '../src/mcp/tools/insert-mcq.tool';
import { InsertEssayTool } from '../src/mcp/tools/insert-essay.tool';
import { InsertSummaryTool } from '../src/mcp/tools/insert-summary.tool';

describe('McpController (e2e)', () => {
  let app: INestApplication<App>;

  const mcqTool = { run: jest.fn() };
  const essayTool = { run: jest.fn() };
  const summaryTool = { run: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        { provide: InsertMcqTool, useValue: mcqTool },
        { provide: InsertEssayTool, useValue: essayTool },
        { provide: InsertSummaryTool, useValue: summaryTool },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await (app as NestFastifyApplication).getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/mcp/insert/mcq should return 201 for valid payload', async () => {
    mcqTool.run.mockResolvedValue({
      jobId: 'job-db-id',
      mcqQuizId: 'quiz-id',
      questionsInserted: 1,
    });

    const payload = {
      event: 'material.generated',
      job_id: 'job-1',
      status: 'SUCCESS',
      user_id: 'user-1',
      result: {
        user_id: 'user-1',
        document_id: 'doc-1',
        material: {
          filename: 'file.pdf',
          file_type: 'application/pdf',
          extracted_chars: 1000,
        },
        sources: [{ chunk_id: 'c1', source_id: 's1', excerpt: 'excerpt' }],
        warnings: [],
        attempt: 1,
        mcq_quiz: {
          questions: [
            {
              question: 'What is A?',
              options: ['A', 'B', 'C', 'D'],
              correct_answer: 'A',
              explanation: 'Because A',
            },
          ],
        },
      },
    };

    const response = await request(app.getHttpServer())
      .post('/api/mcp/insert/mcq')
      .send(payload)
      .expect(201);

    expect(response.body).toEqual({
      jobId: 'job-db-id',
      mcqQuizId: 'quiz-id',
      questionsInserted: 1,
    });
    expect(mcqTool.run).toHaveBeenCalledTimes(1);
  });

  it('POST /api/mcp/insert/summary should return 400 for invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/api/mcp/insert/summary')
      .send({ invalid: true })
      .expect(400);

    expect(summaryTool.run).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await app.close();
  });
});
