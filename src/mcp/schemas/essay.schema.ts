import { z } from "zod";

const EssayQuestionSchema = z.object({
  question: z.string().min(1),
  expected_points: z.string().min(1),
});

export const InsertEssaySchema = z.object({
  job_id: z.string().min(1),
  user_id: z.string().min(1),
  document_id: z.string().min(1),
  essay_quiz: z.object({
    questions: z.array(EssayQuestionSchema).min(1).max(10),
  }),
});

export type InsertEssayT = z.infer<typeof InsertEssaySchema>;