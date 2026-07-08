import { z } from 'zod';

export const createWaitlistSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  source: z.string().optional(),
});
