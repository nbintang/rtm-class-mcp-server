import { z } from 'zod';
import { BaseGeneratedSchema } from './generated.schema';

const McqQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correct_answer: z.string(),
  explanation: z.string(),
});

export const McqGeneratedSchema = BaseGeneratedSchema.extend({
  result: BaseGeneratedSchema.shape.result.extend({
    mcq_quiz: z.object({
      questions: z.array(McqQuestionSchema),
    }),
  }),
});

export type McqGeneratedT = z.infer<typeof McqGeneratedSchema>;
