import { z } from "zod";

const McqQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct_answer: z.string().min(1),
  explanation: z.string().min(1),
});

export const InsertMcqSchema = z.object({
  job_id: z.string().min(1),
  user_id: z.string().min(1),
  document_id: z.string().min(1),
  mcq_quiz: z.object({
    questions: z.array(McqQuestionSchema).min(1).max(20),
  }),
});

export type InsertMcqT = z.infer<typeof InsertMcqSchema>;