import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation/auth";

describe("Auth Validation", () => {
  describe("loginSchema", () => {
    it("powinien zaakceptować poprawne dane logowania", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
        expect(result.data.password).toBe("password123");
      }
    });

    it("powinien przyciąć spacje w emailu", () => {
      const result = loginSchema.safeParse({
        email: "  test@example.com  ",
        password: "password123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("powinien zamienić email na małe litery", () => {
      const result = loginSchema.safeParse({
        email: "TEST@EXAMPLE.COM",
        password: "password123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("powinien przyciąć spacje i zamienić na małe litery jednocześnie", () => {
      const result = loginSchema.safeParse({
        email: "  TEST@EXAMPLE.COM  ",
        password: "password123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("powinien odrzucić brak pola email", () => {
      const result = loginSchema.safeParse({
        password: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Email jest wymagany");
      }
    });

    it("powinien odrzucić brak pola password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło jest wymagane");
      }
    });

    it("powinien odrzucić pusty string email", () => {
      const result = loginSchema.safeParse({
        email: "",
        password: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Nieprawidłowy format adresu email");
      }
    });

    it("powinien odrzucić nieprawidłowy format email", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Nieprawidłowy format adresu email");
      }
    });

    it("powinien odrzucić pusty string password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło jest wymagane");
      }
    });

    it("powinien zaakceptować password z jednym znakiem", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "a",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe("a");
      }
    });

    it("powinien odrzucić null jako email", () => {
      const result = loginSchema.safeParse({
        email: null,
        password: "password123",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined jako email", () => {
      const result = loginSchema.safeParse({
        email: undefined,
        password: "password123",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null jako password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: null,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined jako password", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: undefined,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ dla email (number)", () => {
      const result = loginSchema.safeParse({
        email: 123,
        password: "password123",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ dla password (number)", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: 123,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić pusty obiekt", () => {
      const result = loginSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    it("powinien zaakceptować poprawne dane rejestracji", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
        expect(result.data.password).toBe("password123");
        expect(result.data.confirmPassword).toBe("password123");
      }
    });

    it("powinien przyciąć spacje i zamienić email na małe litery", () => {
      const result = registerSchema.safeParse({
        email: "  TEST@EXAMPLE.COM  ",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("powinien odrzucić hasło krótsze niż 8 znaków", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "pass123",
        confirmPassword: "pass123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło musi mieć minimum 8 znaków");
      }
    });

    it("powinien zaakceptować hasło o długości dokładnie 8 znaków", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "pass1234",
        confirmPassword: "pass1234",
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić hasło bez liter", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "12345678",
        confirmPassword: "12345678",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło musi zawierać przynajmniej jedną literę i jedną cyfrę");
      }
    });

    it("powinien odrzucić hasło bez cyfr", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password",
        confirmPassword: "password",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło musi zawierać przynajmniej jedną literę i jedną cyfrę");
      }
    });

    it("powinien zaakceptować hasło z wielką literą i cyfrą", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "Password123",
      });

      expect(result.success).toBe(true);
    });

    it("powinien zaakceptować hasło z małą literą i cyfrą", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić niezgodne hasła", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password456",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const refineError = result.error.errors.find(
          (e) => e.path.includes("confirmPassword") && e.message === "Hasła muszą być identyczne"
        );
        expect(refineError).toBeDefined();
      }
    });

    it("powinien odrzucić brak pola email", () => {
      const result = registerSchema.safeParse({
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Email jest wymagany");
      }
    });

    it("powinien odrzucić brak pola password", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło jest wymagane");
      }
    });

    it("powinien odrzucić brak pola confirmPassword", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Potwierdzenie hasła jest wymagane");
      }
    });

    it("powinien odrzucić pusty string email", () => {
      const result = registerSchema.safeParse({
        email: "",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Nieprawidłowy format adresu email");
      }
    });

    it("powinien odrzucić nieprawidłowy format email", () => {
      const result = registerSchema.safeParse({
        email: "invalid-email",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Nieprawidłowy format adresu email");
      }
    });

    it("powinien odrzucić pusty string confirmPassword", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Potwierdzenie hasła jest wymagane");
      }
    });

    it("powinien odrzucić null jako email", () => {
      const result = registerSchema.safeParse({
        email: null,
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null jako password", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: null,
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null jako confirmPassword", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        confirmPassword: null,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("powinien zaakceptować poprawny email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "test@example.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("powinien przyciąć spacje w emailu", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "  test@example.com  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("powinien zamienić email na małe litery", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "TEST@EXAMPLE.COM",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("powinien przyciąć spacje i zamienić na małe litery jednocześnie", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "  TEST@EXAMPLE.COM  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("powinien odrzucić brak pola email", () => {
      const result = forgotPasswordSchema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Email jest wymagany");
      }
    });

    it("powinien odrzucić pusty string email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Nieprawidłowy format adresu email");
      }
    });

    it("powinien odrzucić nieprawidłowy format email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "invalid-email",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Nieprawidłowy format adresu email");
      }
    });

    it("powinien odrzucić null jako email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: null,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined jako email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: undefined,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ dla email (number)", () => {
      const result = forgotPasswordSchema.safeParse({
        email: 123,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("powinien zaakceptować poprawne dane resetowania hasła", () => {
      const result = resetPasswordSchema.safeParse({
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe("password123");
        expect(result.data.confirmPassword).toBe("password123");
      }
    });

    it("powinien odrzucić hasło krótsze niż 8 znaków", () => {
      const result = resetPasswordSchema.safeParse({
        password: "pass123",
        confirmPassword: "pass123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło musi mieć minimum 8 znaków");
      }
    });

    it("powinien zaakceptować hasło o długości dokładnie 8 znaków", () => {
      const result = resetPasswordSchema.safeParse({
        password: "pass1234",
        confirmPassword: "pass1234",
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić hasło bez liter", () => {
      const result = resetPasswordSchema.safeParse({
        password: "12345678",
        confirmPassword: "12345678",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło musi zawierać przynajmniej jedną literę i jedną cyfrę");
      }
    });

    it("powinien odrzucić hasło bez cyfr", () => {
      const result = resetPasswordSchema.safeParse({
        password: "password",
        confirmPassword: "password",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło musi zawierać przynajmniej jedną literę i jedną cyfrę");
      }
    });

    it("powinien zaakceptować hasło z wielką literą i cyfrą", () => {
      const result = resetPasswordSchema.safeParse({
        password: "Password123",
        confirmPassword: "Password123",
      });

      expect(result.success).toBe(true);
    });

    it("powinien zaakceptować hasło z małą literą i cyfrą", () => {
      const result = resetPasswordSchema.safeParse({
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(true);
    });

    it("powinien odrzucić niezgodne hasła", () => {
      const result = resetPasswordSchema.safeParse({
        password: "password123",
        confirmPassword: "password456",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const refineError = result.error.errors.find(
          (e) => e.path.includes("confirmPassword") && e.message === "Hasła muszą być identyczne"
        );
        expect(refineError).toBeDefined();
      }
    });

    it("powinien odrzucić brak pola password", () => {
      const result = resetPasswordSchema.safeParse({
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło jest wymagane");
      }
    });

    it("powinien odrzucić brak pola confirmPassword", () => {
      const result = resetPasswordSchema.safeParse({
        password: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Potwierdzenie hasła jest wymagane");
      }
    });

    it("powinien odrzucić pusty string password", () => {
      const result = resetPasswordSchema.safeParse({
        password: "",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Hasło musi mieć minimum 8 znaków");
      }
    });

    it("powinien odrzucić pusty string confirmPassword", () => {
      const result = resetPasswordSchema.safeParse({
        password: "password123",
        confirmPassword: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Potwierdzenie hasła jest wymagane");
      }
    });

    it("powinien odrzucić null jako password", () => {
      const result = resetPasswordSchema.safeParse({
        password: null,
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić null jako confirmPassword", () => {
      const result = resetPasswordSchema.safeParse({
        password: "password123",
        confirmPassword: null,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined jako password", () => {
      const result = resetPasswordSchema.safeParse({
        password: undefined,
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić undefined jako confirmPassword", () => {
      const result = resetPasswordSchema.safeParse({
        password: "password123",
        confirmPassword: undefined,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ dla password (number)", () => {
      const result = resetPasswordSchema.safeParse({
        password: 123,
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić nieprawidłowy typ dla confirmPassword (number)", () => {
      const result = resetPasswordSchema.safeParse({
        password: "password123",
        confirmPassword: 123,
      });

      expect(result.success).toBe(false);
    });

    it("powinien odrzucić pusty obiekt", () => {
      const result = resetPasswordSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});
