import { z } from 'zod';
import { BaseGeneratedSchema } from './generated.schema';

export const SummaryGeneratedSchema = BaseGeneratedSchema.extend({
  result: BaseGeneratedSchema.shape.result.extend({
    summary: z.object({
      title: z.string(),
      overview: z.string(),
      key_points: z.array(z.string()),
    }),
  }),
});

export type SummaryGeneratedT = z.infer<typeof SummaryGeneratedSchema>;
