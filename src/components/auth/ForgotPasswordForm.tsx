import * as React from "react";
import { AuthFormShell } from "./AuthFormShell";
import { FormField } from "./FormField";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [errors, setErrors] = React.useState<{
    email?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Walidacja email
    if (!email) {
      newErrors.email = "Email jest wymagany";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Nieprawidłowy format adresu email";
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
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        // Obsługa błędu z backendu zgodnie z AuthResponse
        const errorMessage = data.error?.message || "Wystąpił błąd podczas wysyłania linku resetującego";
        const errorField = data.error?.field;

        // Jeśli błąd dotyczy pola email, przypisz go do tego pola
        if (errorField === "email") {
          setErrors({
            email: errorMessage,
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

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-8 h-8 text-green-600"
            aria-hidden="true"
          >
            <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
            <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sprawdź swoją skrzynkę email</h2>
        <p className="text-gray-600">
          Jeśli konto z podanym adresem email istnieje, wysłaliśmy na nie link do resetowania hasła. Kliknij w link w
          wiadomości email, aby przejść do strony resetowania hasła.
        </p>
        <p className="text-sm text-gray-500">
          Link jest ważny przez ograniczony czas. Nie otrzymałeś wiadomości? Sprawdź folder spam lub
        </p>
        <button
          type="button"
          onClick={() => setIsSuccess(false)}
          className="text-green-600 hover:text-green-700 text-sm font-medium hover:underline"
        >
          spróbuj ponownie
        </button>
        <div className="pt-4 border-t border-gray-200">
          <a href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 hover:underline">
            ← Wróć do logowania
          </a>
        </div>
      </div>
    );
  }

  return (
    <AuthFormShell
      title="Zapomniałeś hasła?"
      description="Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła"
      onSubmit={handleSubmit}
    >
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

      <SubmitButton isLoading={isLoading}>Wyślij link resetujący</SubmitButton>

      <div className="text-center text-sm text-gray-600">
        <a href="/auth/login" className="text-green-600 hover:text-green-700 hover:underline">
          ← Wróć do logowania
        </a>
      </div>
    </AuthFormShell>
  );
}
