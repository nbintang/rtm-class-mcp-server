import { createZodDto } from 'nestjs-zod';
import { McqGeneratedSchema } from '../schemas/mcq.schema';
import { EssayGeneratedSchema } from '../schemas/essay.schema';
import { SummaryGeneratedSchema } from '../schemas/summary.schema';

export class InsertMcqDto extends createZodDto(McqGeneratedSchema) {}

export class InsertEssayDto extends createZodDto(EssayGeneratedSchema) {}

export class InsertSummaryDto extends createZodDto(SummaryGeneratedSchema) {}
