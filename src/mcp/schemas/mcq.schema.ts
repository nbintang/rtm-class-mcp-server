import { z } from 'zod';
import { AIJobStatus } from '../entities/ai-job.enums';

const McqQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct_answer: z.string().min(1),
  explanation: z.string().min(1),
});

export const InsertMcqSchema = z.object({
  job_id: z.string().min(1),
  requested_by_id: z.string().min(1),
  material_id: z.string().min(1),
  status: z.enum(Object.values(AIJobStatus)).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  mcq_quiz: z.object({
    questions: z.array(McqQuestionSchema).min(1).max(20),
  }),
});

export type InsertMcqT = z.infer<typeof InsertMcqSchema>;
