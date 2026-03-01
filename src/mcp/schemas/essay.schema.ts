import { z } from 'zod';
import { BaseGeneratedSchema } from './generated.schema';

const EssayQuestionSchema = z.object({
  question: z.string(),
  expected_points: z.string(), // payload kamu string "5"
});

export const EssayGeneratedSchema = BaseGeneratedSchema.extend({
  result: BaseGeneratedSchema.shape.result.extend({
    essay_quiz: z.object({
      questions: z.array(EssayQuestionSchema),
    }),
  }),
});

export type EssayGeneratedT = z.infer<typeof EssayGeneratedSchema>;
