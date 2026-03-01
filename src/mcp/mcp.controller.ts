import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { InsertMcqTool } from './tools/insert-mcq.tool';
import { InsertEssayTool } from './tools/insert-essay.tool';
import { InsertSummaryTool } from './tools/insert-summary.tool';
import { InsertEssayDto, InsertMcqDto, InsertSummaryDto } from './dto/mcp.dto';

@Controller('api/mcp')
@UsePipes(ZodValidationPipe)
export class McpController {
  constructor(
    private readonly insertMcqTool: InsertMcqTool,
    private readonly insertEssayTool: InsertEssayTool,
    private readonly insertSummaryTool: InsertSummaryTool,
  ) {}

  @Post('insert/mcq')
  async insertMcq(@Body() body: InsertMcqDto) {
    return this.insertMcqTool.run(body);
  }

  @Post('insert/essay')
  async insertEssay(@Body() body: InsertEssayDto) {
    return this.insertEssayTool.run(body);
  }

  @Post('insert/summary')
  async insertSummary(@Body() body: InsertSummaryDto) {
    return this.insertSummaryTool.run(body);
  }
}
