import { z } from 'zod';

export const MAX_ASSISTANT_MESSAGES = 20;
export const MAX_ASSISTANT_CONTENT = 2000;

export const itineraryRequestSchema = z.object({
  destination: z.string().trim().min(2).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  budget: z.string().trim().max(50).optional(),
  interests: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10).default([]),
});

// The client sends the whole conversation each time. The last turn must be the user's, so the
// model always has something to answer.
export const assistantRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(MAX_ASSISTANT_CONTENT),
      }),
    )
    .min(1)
    .max(MAX_ASSISTANT_MESSAGES)
    .refine((messages) => messages.at(-1).role === 'user', {
      message: 'The last message must be from the user',
    }),
});
