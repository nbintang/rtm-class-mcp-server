import { z } from 'zod';

export const SourceSchema = z.object({
  chunk_id: z.string().nullable().optional(), // Python: chunk_id optional
  source_id: z.string().nullable().optional(), // Python: source_id optional
  excerpt: z.string(),
});

export const ToolCallLogSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.any()).default({}),
  call_id: z.string().nullable().optional(),
});

export const BaseGeneratedSchema = z.object({
  event: z.string(),
  job_id: z.string(),
  status: z.string(),
  user_id: z.string(),

  // ✅ top-level (sesuai Python)
  attempt: z.number().int(),
  finished_at: z.string().datetime(),

  result: z.object({
    user_id: z.string(),
    document_id: z.string(),
    material: z.object({
      filename: z.string(),
      file_type: z.string(),
      extracted_chars: z.number().int(),
    }),
    sources: z.array(SourceSchema).default([]),
    tool_calls: z.array(ToolCallLogSchema).default([]),
    warnings: z.array(z.string()).default([]),
  }),
});
