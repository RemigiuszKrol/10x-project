import * as React from "react";
import { AuthFormShell } from "./AuthFormShell";
import { FormField } from "./FormField";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = React.useState(false);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Walidacja email
    if (!email) {
      newErrors.email = "Email jest wymagany";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Nieprawidłowy format adresu email";
    }

    // Walidacja hasła
    if (!password) {
      newErrors.password = "Hasło jest wymagane";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Przekierowanie zawsze na stronę planów
        window.location.assign("/plans");
      } else {
        // Obsługa błędu z backendu zgodnie z AuthResponse
        const errorMessage = data.error?.message || "Wystąpił błąd podczas logowania";
        const errorField = data.error?.field;

        // Jeśli błąd dotyczy konkretnego pola, przypisz go do tego pola
        if (errorField && (errorField === "email" || errorField === "password")) {
          setErrors({
            [errorField]: errorMessage,
          });
        } else {
          // W przeciwnym razie pokaż błąd ogólny
          setErrors({
            general: errorMessage,
          });
        }
      }
    } catch {
      setErrors({
        general: "Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFormShell title="Witaj ponownie" description="Zaloguj się na swoje konto" onSubmit={handleSubmit}>
      <FormError message={errors.general} />

      <FormField
        id="email"
        name="email"
        label="Adres email"
        type="email"
        placeholder="twoj@email.pl"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        disabled={isLoading}
        required
        autoComplete="email"
      />

      <FormField
        id="password"
        name="password"
        label="Hasło"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        disabled={isLoading}
        required
        autoComplete="current-password"
      />

      <div className="flex items-center justify-end">
        <a href="/auth/forgot-password" className="text-sm text-green-600 hover:text-green-700 hover:underline">
          Zapomniałeś hasła?
        </a>
      </div>

      <SubmitButton isLoading={isLoading}>Zaloguj się</SubmitButton>

      <div className="text-center text-sm text-gray-600">
        Nie masz konta?{" "}
        <a href="/auth/register" className="text-green-600 hover:text-green-700 font-medium hover:underline">
          Zarejestruj się
        </a>
      </div>
    </AuthFormShell>
  );
}
