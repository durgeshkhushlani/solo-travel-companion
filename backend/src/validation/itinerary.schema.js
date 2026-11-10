import { z } from 'zod';

// Shape of a Generated Itinerary. Model output is untrusted, so this is the only way in.
// Too-long activity lists are rejected, never trimmed: a silent cut would hide a bad answer.
export const MAX_ACTIVITIES_PER_DAY = 8;
export const MAX_TRIP_DAYS = 60;

const itineraryDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string().trim().min(1).max(120),
  activities: z.array(z.string().trim().min(1).max(200)).min(1).max(MAX_ACTIVITIES_PER_DAY),
});

export const itinerarySchema = z.object({
  days: z.array(itineraryDaySchema).min(1).max(MAX_TRIP_DAYS),
});
