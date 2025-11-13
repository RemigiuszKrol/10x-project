import { z } from "zod";

/**
 * Regex dla ISO language codes
 * Akceptuje formaty:
 * - dwuliterowy kod języka: "pl", "en", "de"
 * - kod języka z regionem: "en-US", "de-DE", "pt-BR"
 * Przykłady poprawne: "pl", "en", "en-US", "de-DE"
 * Przykłady niepoprawne: "PL", "eng", "123", "en_US"
 */
const ISO_LANGUAGE_CODE_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/;

/**
 * Schemat walidacji dla aktualizacji profilu użytkownika
 * Co najmniej jedno pole musi być obecne
 */
export const ProfileUpdateSchema = z
  .object({
    language_code: z.string().regex(ISO_LANGUAGE_CODE_REGEX, "Invalid ISO language code").optional(),
    theme: z
      .enum(["light", "dark"], {
        errorMap: () => ({ message: "Must be 'light' or 'dark'" }),
      })
      .optional(),
  })
  .strict() // odrzuca dodatkowe pola
  .refine((data) => data.language_code !== undefined || data.theme !== undefined, {
    message: "At least one field must be provided",
  });

/**
 * Typ wejściowy dla aktualizacji profilu (wynikowy z Zod schema)
 */
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
