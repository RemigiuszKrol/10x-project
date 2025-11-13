import { useState, useEffect, type FormEvent } from "react";
import type { UiTheme } from "@/types";
import { LanguageSelector, type LanguageOption } from "./LanguageSelector";
import { ThemeSelector, DEFAULT_THEME_OPTIONS } from "./ThemeSelector";
import { ThemePreview } from "./ThemePreview";
import { FormActions } from "./FormActions";

export interface ProfileFormValues {
  languageCode: string;
  theme: UiTheme;
}

export interface ProfileFormErrors {
  languageCode?: string;
  theme?: string;
  global?: string;
}

export interface ProfileFormProps {
  initialValues: ProfileFormValues;
  isSubmitting: boolean;
  onSubmit: (values: ProfileFormValues) => void;
  languages: LanguageOption[];
  fieldErrors?: ProfileFormErrors;
}

/**
 * Formularz edycji preferencji profilu
 */
export function ProfileForm({ initialValues, isSubmitting, onSubmit, languages, fieldErrors }: ProfileFormProps) {
  const [values, setValues] = useState<ProfileFormValues>(initialValues);

  // Aktualizuj wartości gdy initialValues się zmienią (np. po sukcesie)
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  // Sprawdź czy formularz jest "dirty" (zmieniony)
  const isDirty = values.languageCode !== initialValues.languageCode || values.theme !== initialValues.theme;

  const handleLanguageChange = (languageCode: string) => {
    setValues((prev) => ({ ...prev, languageCode }));
  };

  const handleThemeChange = (theme: UiTheme) => {
    setValues((prev) => ({ ...prev, theme }));
  };

  const handleReset = () => {
    setValues(initialValues);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isDirty || isSubmitting) return;
    onSubmit(values);
  };

  // Znajdź label dla wybranego języka
  const selectedLanguageLabel =
    languages.find((lang) => lang.code === values.languageCode)?.label || values.languageCode;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl shadow-xl border border-green-100 bg-white p-8">
      {/* Global error message */}
      {fieldErrors?.global && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{fieldErrors.global}</div>}

      {/* Language selector */}
      <LanguageSelector
        options={languages}
        value={values.languageCode}
        onChange={handleLanguageChange}
        disabled={isSubmitting}
        error={fieldErrors?.languageCode}
      />

      {/* Theme selector */}
      <ThemeSelector
        options={DEFAULT_THEME_OPTIONS}
        value={values.theme}
        onChange={handleThemeChange}
        disabled={isSubmitting}
      />

      {/* Theme preview */}
      <ThemePreview theme={values.theme} languageLabel={selectedLanguageLabel} />

      {/* Form actions */}
      <FormActions isDirty={isDirty} isSubmitting={isSubmitting} onReset={handleReset} />
    </form>
  );
}
