import { z } from 'zod';

export const MAX_ACTIVITIES_PER_DAY = 8;
export const MAX_TRIP_DAYS = 60;

// One Itinerary Day. The single definition behind both Travel Plan input and the Generated
// Itinerary from the AI layer, so the shape of an Itinerary is written down once.
const activity = z.string().trim().min(1).max(200);

export const itineraryDaySchema = z.object({
  day: z.number().int().min(1).max(MAX_TRIP_DAYS),
  title: z.string().trim().min(1).max(120),
  activities: z.array(activity).max(MAX_ACTIVITIES_PER_DAY),
});

// Itinerary Days are ordered: day 1, 2, 3 ... with no gaps.
const inOrder = (days) => days.every((d, i) => d.day === i + 1);
const inOrderMessage = { message: 'Itinerary Days must be numbered 1, 2, 3 ... in order' };

// A Travel Plan's Itinerary as the Host writes it: may be empty, days may have no activities.
export const itinerarySchema = z
  .array(itineraryDaySchema)
  .max(MAX_TRIP_DAYS)
  .refine(inOrder, inOrderMessage);

// A Generated Itinerary is untrusted model output, so it must be useful: at least one day and
// at least one activity per day. Too-long lists are rejected, never trimmed: a silent cut
// would hide a bad answer.
const generatedDaySchema = itineraryDaySchema.extend({
  activities: z.array(activity).min(1).max(MAX_ACTIVITIES_PER_DAY),
});

export const generatedItinerarySchema = z.object({
  days: z.array(generatedDaySchema).min(1).max(MAX_TRIP_DAYS).refine(inOrder, inOrderMessage),
});
