import { z } from 'zod';

// Indian mobile: 10 digits, optionally prefixed with +91 or 0
const indianPhone = z
  .string()
  .trim()
  .regex(
    /^(\+91|0)?[6-9]\d{9}$/,
    'Enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +919876543210)'
  );

export const createClientSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  phone: indianPhone,
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
