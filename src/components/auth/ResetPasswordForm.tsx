import * as React from "react";
import { AuthFormShell } from "./AuthFormShell";
import { FormField } from "./FormField";
import { FormError } from "./FormError";
import { SubmitButton } from "./SubmitButton";

export function ResetPasswordForm() {
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = React.useState(false);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

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
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const data = await response.json();

      if (data.success) {
        // Przekierowanie do strony logowania
        window.location.assign(data.redirectTo || "/auth/login");
      } else {
        setErrors({
          general: data.error?.message || "Wystąpił błąd podczas resetowania hasła",
        });
      }
    } catch (error) {
      setErrors({
        general: "Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFormShell title="Ustaw nowe hasło" description="Wprowadź nowe hasło dla swojego konta" onSubmit={handleSubmit}>
      <FormError message={errors.general} />

      <FormField
        id="password"
        name="password"
        label="Nowe hasło"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        disabled={isLoading}
        required
        autoComplete="new-password"
        autoFocus
      />

      <FormField
        id="confirmPassword"
        name="confirmPassword"
        label="Potwierdź nowe hasło"
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

      <SubmitButton isLoading={isLoading}>Ustaw nowe hasło</SubmitButton>

      <div className="text-center text-sm text-gray-600">
        <a href="/auth/login" className="text-green-600 hover:text-green-700 hover:underline">
          ← Wróć do logowania
        </a>
      </div>
    </AuthFormShell>
  );
}
