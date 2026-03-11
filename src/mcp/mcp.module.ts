import { Module } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { McpModule } from '@rekog/mcp-nest';
import { InsertMcqTool } from './tools/insert-mcq.tool';
import { InsertEssayTool } from './tools/insert-essay.tool';
import { InsertSummaryTool } from './tools/insert-summary.tool';
// import { McpController } from './mcp.controller';

@Module({
  imports: [
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
