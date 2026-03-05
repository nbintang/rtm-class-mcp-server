import { z } from 'zod';
import { SourceSchema } from './generated.schema';
import { AIJobStatus } from '../entities/ai-job.enums';

export const InsertSummarySchema = z.object({
  job_id: z.string().min(1),
  requested_by_id: z.string().min(1),
  material_id: z.string().min(1),
  summary: z.object({
    title: z.string().min(1),
    overview: z.string().min(1),
    key_points: z.array(z.string().min(1)).min(1),
  }),
  status: z.enum(Object.values(AIJobStatus)).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  sources: z.array(SourceSchema).optional().default([]),
  warnings: z.array(z.string()).optional().default([]),
});

export type InsertSummaryT = z.infer<typeof InsertSummarySchema>;
