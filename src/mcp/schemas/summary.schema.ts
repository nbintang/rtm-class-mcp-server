import { z } from 'zod';
import { SourceSchema } from './generated.schema';

export const InsertSummarySchema = z.object({
  job_id: z.string().min(1),
  user_id: z.string().min(1),
  document_id: z.string().min(1),
  summary: z.object({
    title: z.string().min(1),
    overview: z.string().min(1),
    key_points: z.array(z.string().min(1)).min(1),
  }),
  event: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  filename: z.string().min(1).optional(),
  file_type: z.string().min(1).optional(),
  extracted_chars: z.number().int().nonnegative().optional(),
  sources: z.array(SourceSchema).optional().default([]),
  warnings: z.array(z.string()).optional().default([]),
});

export type InsertSummaryT = z.infer<typeof InsertSummarySchema>;
