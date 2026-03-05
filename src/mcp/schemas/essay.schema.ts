import { z } from 'zod';
import { AIJobStatus } from '../entities/ai-job.enums';

const EssayQuestionSchema = z.object({
  question: z.string().min(1),
  expected_points: z.union([z.string().min(1), z.number()]),
});

export const InsertEssaySchema = z.object({
  job_id: z.string().min(1),
  requested_by_id: z.string().min(1),
  material_id: z.string().min(1),
  status: z.enum(Object.values(AIJobStatus)).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  essay_quiz: z.object({
    questions: z.array(EssayQuestionSchema).min(1).max(10),
  }),
});

export type InsertEssayT = z.infer<typeof InsertEssaySchema>;
