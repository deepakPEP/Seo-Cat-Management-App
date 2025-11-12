// frontend/lib/zodSchemas.ts
import { z } from 'zod';

// ✅ Signup Schema
export const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters long' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  role: z.enum(['admin', 'category_manager', 'pepagora_manager'])
});

// ✅ Login Schema
export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
});

export type SignupDtoType = z.infer<typeof signupSchema>;
export type LoginDtoType = z.infer<typeof loginSchema>;
