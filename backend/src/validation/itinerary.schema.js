import { z } from 'zod';

// One Itinerary Day. Shared by plan input and by the Generated Itinerary from the AI layer,
// so the shape of an Itinerary is written down once.
export const itineraryDaySchema = z.object({
  day: z.number().int().min(1).max(60),
  title: z.string().trim().min(1).max(100),
  activities: z.array(z.string().trim().min(1).max(200)).max(12),
});

// Itinerary Days are ordered: day 1, 2, 3 ... with no gaps.
export const itinerarySchema = z
  .array(itineraryDaySchema)
  .max(60)
  .refine((days) => days.every((d, i) => d.day === i + 1), {
    message: 'Itinerary Days must be numbered 1, 2, 3 ... in order',
  });
