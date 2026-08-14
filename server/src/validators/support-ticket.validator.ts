import { z } from 'zod';

export const createSupportTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters long'),
  description: z.string().min(10, 'Description must be at least 10 characters long'),
  category: z.string().min(1, 'Category is required').optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

export const updateSupportTicketStatusSchema = z.object({
  status: z.enum(['open', 'pending', 'resolved', 'closed']),
  note: z.string().optional(),
});
