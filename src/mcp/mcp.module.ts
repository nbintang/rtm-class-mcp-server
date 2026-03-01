import { Module } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { McpModule } from '@rekog/mcp-nest';
import { InsertMcqTool } from './tools/insert-mcq.tool';
import { InsertEssayTool } from './tools/insert-essay.tool';
import { InsertSummaryTool } from './tools/insert-summary.tool';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GenerationJob } from './entities/generation-job.entity';
import { GenerationSource } from './entities/generation-source.entity';
import { GenerationWarning } from './entities/generation-warning.entity';
import { McqQuiz } from './entities/mcp-quiz.entity';
import { McqQuestion } from './entities/mcq-question.entity';
import { EssayQuiz } from './entities/essay-quiz.entity';
import { EssayQuestion } from './entities/essay-question.entity';
import { Summary } from './entities/summary.entity';
// import { McpController } from './mcp.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GenerationJob,
      GenerationSource,
      GenerationWarning,
      McqQuiz,
      McqQuestion,
      EssayQuiz,
      EssayQuestion,
      Summary,
    ]),
    McpModule.forRoot({
      name: 'rtm-db-mcp',
      version: '0.1.0',
      streamableHttp: {
        enableJsonResponse: false,
        sessionIdGenerator: () => randomUUID(),
        statelessMode: false,
      },
    }),
  ],
  // controllers: [McpController],
  providers: [InsertMcqTool, InsertEssayTool, InsertSummaryTool],
})
export class RtmMcpModule {}
