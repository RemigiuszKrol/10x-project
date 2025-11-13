import type { ProfileState } from "@/lib/hooks/useProfilePreferences";
import type { ProfileFormValues, ProfileFormErrors } from "./ProfileForm";
import type { LanguageOption } from "./LanguageSelector";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { ProfileErrorFallback } from "./ProfileErrorFallback";
import { ProfileForm } from "./ProfileForm";
import { PreferenceSummary } from "./PreferenceSummary";

export interface ProfileContentProps {
  state: ProfileState;
  onSubmit: (values: ProfileFormValues) => void;
  onRetry: () => void;
  languages: LanguageOption[];
  isSubmitting: boolean;
  fieldErrors?: ProfileFormErrors;
}

/**
 * Renderuje główną sekcję profilu w zależności od stanu
 */
export function ProfileContent({
  state,
  onSubmit,
  onRetry,
  languages,
  isSubmitting,
  fieldErrors,
}: ProfileContentProps) {
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
    languageCode: data.languageCode,
    theme: data.theme,
  };

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Preferencje profilu</h1>
      </div>

      {/* Formularz edycji */}
      <ProfileForm
        initialValues={initialValues}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        languages={languages}
        fieldErrors={fieldErrors}
      />

      {/* Podsumowanie profilu */}
      <PreferenceSummary createdAt={data.createdAt} updatedAt={data.updatedAt} />
    </div>
  );
}
