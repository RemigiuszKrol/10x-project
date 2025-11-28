import { z } from "zod";

/**
 * Schemat walidacji dla logowania
 */
export const loginSchema = z.object({
  email: z
    .string({
      required_error: "Email jest wymagany",
    })
    .trim()
    .toLowerCase()
    .email("Nieprawidłowy format adresu email"),
  password: z
    .string({
      required_error: "Hasło jest wymagane",
    })
    .min(1, "Hasło jest wymagane"),
});

/**
 * Schemat walidacji dla rejestracji
 */
export const registerSchema = z
  .object({
    email: z
      .string({
        required_error: "Email jest wymagany",
      })
      .trim()
      .toLowerCase()
      .email("Nieprawidłowy format adresu email"),
    password: z
      .string({
        required_error: "Hasło jest wymagane",
      })
      .min(8, "Hasło musi mieć minimum 8 znaków")
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Hasło musi zawierać przynajmniej jedną literę i jedną cyfrę"),
    confirmPassword: z
      .string({
        required_error: "Potwierdzenie hasła jest wymagane",
      })
      .min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

/**
 * Schemat walidacji dla odzyskiwania hasła
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({
      required_error: "Email jest wymagany",
    })
    .trim()
    .toLowerCase()
    .email("Nieprawidłowy format adresu email"),
});

/**
 * Schemat walidacji dla resetowania hasła
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string({
        required_error: "Hasło jest wymagane",
      })
      .min(8, "Hasło musi mieć minimum 8 znaków")
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Hasło musi zawierać przynajmniej jedną literę i jedną cyfrę"),
    confirmPassword: z
      .string({
        required_error: "Potwierdzenie hasła jest wymagane",
      })
      .min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });
