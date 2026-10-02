import { z } from "zod";

/**
 * Auth input schemas. Enforced server-side via the `validate` middleware
 * on every transport (Express + Next.js).
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Password must contain at least one letter and one number.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  phone: z.string().trim().min(6).max(20).optional(),
  password: passwordSchema,
  // ADMIN accounts are created out-of-band (seed script), never self-serve.
  role: z.enum(["BUYER", "SELLER"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  password: z.string().min(1, "Password is required.").max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
