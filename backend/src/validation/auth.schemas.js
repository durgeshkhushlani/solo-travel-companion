import { z } from 'zod';

// Parsed once at the edge (validate middleware); the service receives only trusted values.
// bcrypt ignores bytes past 72, so longer passwords are refused rather than silently cut.
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(72);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});
