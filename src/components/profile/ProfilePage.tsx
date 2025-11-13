import { useRef } from "react";
import { useProfilePreferences } from "@/lib/hooks/useProfilePreferences";
import { useUpdateProfile } from "@/lib/hooks/useUpdateProfile";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { ProfileContent } from "./ProfileContent";
import type { ProfileFormValues, ProfileFormErrors } from "./ProfileForm";
import type { LanguageOption } from "./LanguageSelector";

export interface ProfilePageProps {
  userId: string;
}

/**
 * Domyślne opcje języków
 */
const DEFAULT_LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: "pl",
    label: "Polski",
    nativeLabel: "Polish",
  },
  {
    code: "en",
    label: "Angielski",
    nativeLabel: "English",
  },
];

/**
 * Główny komponent strony profilu użytkownika
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ProfilePage({ userId }: ProfilePageProps) {
  const { state, refetch } = useProfilePreferences();
  const { theme, setTheme } = useTheme();
  const { languageCode, setLanguageCode } = useLanguage();

  // Przechowuj poprzednie wartości dla rollback
  const previousValuesRef = useRef<{ theme: string; languageCode: string }>({
    theme,
    languageCode,
  });

  const {
    mutate,
    isLoading: isSubmitting,
    error: updateError,
  } = useUpdateProfile({
    // Optimistic update - natychmiast aktualizuj konteksty
    onOptimisticUpdate: (payload) => {
      // Zapisz poprzednie wartości przed zmianą
      previousValuesRef.current = { theme, languageCode };

      // Natychmiast zastosuj zmiany w UI
      if (payload.theme) {
        setTheme(payload.theme);
      }
      if (payload.language_code) {
        setLanguageCode(payload.language_code);
      }
    },
    // Rollback w przypadku błędu
    onRollback: () => {
      // Przywróć poprzednie wartości
      setTheme(previousValuesRef.current.theme as "light" | "dark");
      setLanguageCode(previousValuesRef.current.languageCode);
    },
    // Success - zaktualizuj konteksty z odpowiedzi API
    onSuccess: (data) => {
      setTheme(data.theme);
      setLanguageCode(data.languageCode);
    },
  });

  // Obsługa przycisk "Ponów" w przypadku błędu
  const handleRetry = () => {
    refetch();
  };

  // Obsługa zapisu formularza
  const handleSubmit = async (values: ProfileFormValues) => {
    // Przygotuj payload - wysyłaj tylko zmienione wartości
    const payload: { language_code?: string; theme?: "light" | "dark" } = {};

    if (state.status === "ready") {
      if (values.languageCode !== state.data.languageCode) {
        payload.language_code = values.languageCode;
      }
      if (values.theme !== state.data.theme) {
        payload.theme = values.theme;
      }
    }

    // Jeśli nie ma zmian, nie wysyłaj
    if (Object.keys(payload).length === 0) {
      return;
    }

    // Wykonaj mutację
    const result = await mutate(payload);

    if (result.success) {
      // Po sukcesie odśwież dane z serwera
      refetch();
    }
  };

  // Mapuj błędy field_errors na kontrolki
  const fieldErrors: ProfileFormErrors | undefined = updateError?.fieldErrors
    ? {
        languageCode: updateError.fieldErrors.language_code,
        theme: updateError.fieldErrors.theme,
        global: updateError.message,
      }
    : undefined;

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <ProfileContent
          state={state}
          onSubmit={handleSubmit}
          onRetry={handleRetry}
          languages={DEFAULT_LANGUAGE_OPTIONS}
          isSubmitting={isSubmitting}
          fieldErrors={fieldErrors}
        />
      </div>
    </main>
  );
}
