import { z } from 'zod';

export const SourceSchema = z.object({
  chunk_id: z.string(),
  source_id: z.string(),
  excerpt: z.string(),
});

export const BaseGeneratedSchema = z.object({
  event: z.string(),
  job_id: z.string(),
  status: z.string(),
  user_id: z.string(),

  result: z.object({
    user_id: z.string(),
    document_id: z.string(),
    attempt: z.number().int().optional(),
    finished_at: z.string().datetime().optional(),
    material: z.object({
      filename: z.string(),
      file_type: z.string(),
      extracted_chars: z.number().int(),
    }),
    sources: z.array(SourceSchema).default([]),
    tool_calls: z.array(z.any()).optional().default([]),
    warnings: z.array(z.string()).optional().default([]),
  }),
});
