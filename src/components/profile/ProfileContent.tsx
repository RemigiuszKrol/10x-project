import type { ProfileState } from "@/lib/hooks/useProfilePreferences";
import type { ProfileFormValues, ProfileFormErrors } from "./ProfileForm";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { ProfileErrorFallback } from "./ProfileErrorFallback";
import { ProfileForm } from "./ProfileForm";
import { PreferenceSummary } from "./PreferenceSummary";

export interface ProfileContentProps {
  state: ProfileState;
  onSubmit: (values: ProfileFormValues) => void;
  onRetry: () => void;
  isSubmitting: boolean;
  fieldErrors?: ProfileFormErrors;
}

/**
 * Renderuje główną sekcję profilu w zależności od stanu
 */
export function ProfileContent({ state, onSubmit, onRetry, isSubmitting, fieldErrors }: ProfileContentProps) {
  // Stan ładowania
  if (state.status === "loading") {
    return <ProfileSkeleton />;
  }

  // Stan błędu
  if (state.status === "error") {
    return <ProfileErrorFallback error={state.error} onRetry={onRetry} />;
  }

  // Stan gotowy - renderuj formularz i podsumowanie
  const { data } = state;
  const initialValues: ProfileFormValues = {
    theme: data.theme,
  };

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Preferencje profilu</h1>
      </div>

      {/* Formularz edycji */}
      <ProfileForm
        initialValues={initialValues}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        fieldErrors={fieldErrors}
      />

      {/* Sekcja bezpieczeństwa */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Bezpieczeństwo</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Hasło</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Zmień hasło do swojego konta</p>
          </div>
          <a
            href="/auth/reset-password"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Zmień hasło
          </a>
        </div>
      </div>

      {/* Podsumowanie profilu */}
      <PreferenceSummary createdAt={data.createdAt} updatedAt={data.updatedAt} />
    </div>
  );
}
