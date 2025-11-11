import * as React from "react";
import { AuthFormShell } from "./AuthFormShell";
import { FormField } from "./FormField";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function RegisterForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
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
    } else if (password.length < 8) {
      newErrors.password = "Hasło musi mieć co najmniej 8 znaków";
    } else if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      newErrors.password = "Hasło musi zawierać co najmniej jedną literę i cyfrę";
    }

    // Walidacja potwierdzenia hasła
    if (!confirmPassword) {
      newErrors.confirmPassword = "Potwierdzenie hasła jest wymagane";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Hasła muszą być identyczne";
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const data = await response.json();

      if (data.success) {
        // Po udanej rejestracji przekieruj do strony z informacją o potwierdzeniu email
        const emailParam = data.data?.email ? `?email=${encodeURIComponent(data.data.email)}` : "";
        window.location.assign(data.redirectTo || `/auth/register-success${emailParam}`);
      } else {
        // Mapowanie błędu z backendu
        if (data.error?.field) {
          setErrors({
            [data.error.field]: data.error.message,
          });
        } else {
          setErrors({
            general: data.error?.message || "Wystąpił błąd podczas rejestracji",
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
    <AuthFormShell title="Utwórz konto" description="Rozpocznij planowanie swojego ogrodu" onSubmit={handleSubmit}>
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
        autoComplete="new-password"
      />

      <FormField
        id="confirmPassword"
        name="confirmPassword"
        label="Potwierdź hasło"
        type="password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={errors.confirmPassword}
        disabled={isLoading}
        required
        autoComplete="new-password"
      />

      <div className="text-xs text-gray-500">
        Hasło musi zawierać co najmniej 8 znaków, w tym co najmniej jedną literę i jedną cyfrę.
      </div>

      <SubmitButton isLoading={isLoading}>Zarejestruj się</SubmitButton>

      <div className="text-center text-sm text-gray-600">
        Masz już konto?{" "}
        <a href="/auth/login" className="text-green-600 hover:text-green-700 font-medium hover:underline">
          Zaloguj się
        </a>
      </div>
    </AuthFormShell>
  );
}
