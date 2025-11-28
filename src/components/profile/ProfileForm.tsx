import { useState, useEffect, type FormEvent } from "react";
import type { UiTheme } from "@/types";
import { ThemeSelector, DEFAULT_THEME_OPTIONS } from "./ThemeSelector";
import { ThemePreview } from "./ThemePreview";
import { FormActions } from "./FormActions";

export interface ProfileFormValues {
  theme: UiTheme;
}

export interface ProfileFormErrors {
  theme?: string;
  global?: string;
}

export interface ProfileFormProps {
  initialValues: ProfileFormValues;
  isSubmitting: boolean;
  onSubmit: (values: ProfileFormValues) => void;
  fieldErrors?: ProfileFormErrors;
  onReset?: () => void;
}

/**
 * Formularz edycji preferencji profilu
 */
export function ProfileForm({ initialValues, isSubmitting, onSubmit, fieldErrors, onReset }: ProfileFormProps) {
  const [values, setValues] = useState<ProfileFormValues>(initialValues);

  // Aktualizuj wartości gdy initialValues się zmienią (np. po sukcesie)
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  // Sprawdź czy formularz jest "dirty" (zmieniony)
  const isDirty = values.theme !== initialValues.theme;

  const handleThemeChange = (theme: UiTheme) => {
    setValues((prev) => ({ ...prev, theme }));
  };

  const handleReset = () => {
    setValues(initialValues);
    onReset?.();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isDirty || isSubmitting) return;
    onSubmit(values);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl shadow-xl border border-green-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-8"
    >
      {/* Global error message */}
      {fieldErrors?.global && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-400">
          {fieldErrors.global}
        </div>
      )}

      {/* Theme selector */}
      <ThemeSelector
        options={DEFAULT_THEME_OPTIONS}
        value={values.theme}
        onChange={handleThemeChange}
        disabled={isSubmitting}
      />

      {/* Theme preview */}
      <ThemePreview theme={values.theme} />

      {/* Form actions */}
      <FormActions isDirty={isDirty} isSubmitting={isSubmitting} onReset={handleReset} />
    </form>
  );
}
