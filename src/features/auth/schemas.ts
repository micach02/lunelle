import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;

const email = z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.');

const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(72, 'Use at most 72 characters.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Tell us what to call you.').max(80, 'Use at most 80 characters.'),
    email,
    password: newPassword,
    confirmPassword: z.string(),
    acknowledge: z.boolean().refine((v) => v, 'Please confirm you understand how Lunelle works.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords don’t match.',
  });
export type SignupValues = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords don’t match.',
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords don’t match.',
  })
  .refine((v) => v.password !== v.currentPassword, {
    path: ['password'],
    message: 'Choose a password different from your current one.',
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  email,
  currentPassword: z.string().min(1, 'Enter your current password.'),
});
export type ChangeEmailValues = z.infer<typeof changeEmailSchema>;
