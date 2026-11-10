import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  bio: z.string().trim().max(500).optional(),
  interests: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10).optional(),
  travelStyle: z.string().trim().max(40).optional(),
  photoUrl: z.string().url().max(500).optional(),
});

export const userIdParamSchema = z.object({ id: z.string().uuid() });
export const targetBodySchema = z.object({ userId: z.string().uuid() });
export const otherUserParamSchema = z.object({ userId: z.string().uuid() });
