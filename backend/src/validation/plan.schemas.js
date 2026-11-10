import { z } from 'zod';
import { itinerarySchema } from './itinerary.schema.js';

const interest = z.string().trim().toLowerCase().min(1).max(30);

// Date ordering is checked by the domain (assertDatesOrdered), so the rule lives in one place.
const planFields = z.object({
  title: z.string().trim().min(3).max(100),
  destination: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  coverUrl: z.string().url().max(500).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  interests: z.array(interest).max(10).default([]),
  maxCompanions: z.number().int().min(1).max(50).nullable().optional(),
  itinerary: itinerarySchema.default([]),
});

export const createPlanSchema = planFields;
// partial() skips defaults for absent fields, so an update never resets interests or itinerary.
export const updatePlanSchema = planFields.partial();

const flag = z.enum(['true', 'false']).transform((v) => v === 'true');
const csv = z
  .string()
  .optional()
  .transform((v) =>
    v
      ? v
          .split(',')
          .map((i) => i.trim().toLowerCase())
          .filter(Boolean)
      : [],
  );

// Explore Feed query string: ?q=&interest=trek,food&from=&to=&openOnly=true&page=1
export const exploreQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  interest: csv,
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  openOnly: flag.optional().default('false'),
  hideEnded: flag.optional().default('true'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
export const planUserParamSchema = z.object({ id: z.string().uuid(), userId: z.string().uuid() });
