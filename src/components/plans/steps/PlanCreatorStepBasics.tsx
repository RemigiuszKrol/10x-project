import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlanBasicsFormData } from "@/types";

export interface PlanCreatorStepBasicsProps {
  data: PlanBasicsFormData;
  onChange: (data: PlanBasicsFormData) => void;
  errors: Partial<Record<keyof PlanBasicsFormData, string>>;
}

/**
 * Krok 1: Podstawy - nazwa planu
 *
 * Funkcje:
 * - Input dla nazwy planu
 * - Walidacja w czasie rzeczywistym
 * - Auto-focus przy montowaniu
 * - Automatyczne trimowanie białych znaków
 * - Komunikaty błędów
 */
export function PlanCreatorStepBasics({ data, onChange, errors }: PlanCreatorStepBasicsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus na input przy montowaniu
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Obsługa zmiany nazwy
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      name: e.target.value,
    });
  };

  /**
   * Obsługa blur - trim białych znaków
   */
  const handleNameBlur = () => {
    onChange({
      name: data.name.trim(),
    });
  };

  const hasError = !!errors.name;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Nagłówek */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Podstawowe informacje</h2>
        <p className="text-muted-foreground">
          Rozpocznij od nadania nazwy swojemu planowi działki. Możesz ją później zmienić.
        </p>
      </div>

      {/* Formularz */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="plan-name" className="text-base font-medium">
            Nazwa planu
            <span className="text-red-500 ml-1" aria-label="wymagane">
              *
            </span>
          </Label>
          <Input
            ref={inputRef}
            id="plan-name"
            type="text"
            placeholder="np. Mój ogród, Działka letnia, Plan 2025"
            value={data.name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            aria-describedby={hasError ? "plan-name-error" : "plan-name-help"}
            aria-invalid={hasError}
            className={hasError ? "border-red-500 focus-visible:ring-red-500" : ""}
            maxLength={100}
          />

          {/* Komunikat błędu */}
          {hasError && (
            <p
              id="plan-name-error"
              className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
              role="alert"
            >
              <span aria-hidden="true">⚠</span>
              {errors.name}
            </p>
          )}

          {/* Tekst pomocniczy */}
          {!hasError && (
            <p id="plan-name-help" className="text-sm text-muted-foreground">
              Podaj opisową nazwę, która pomoże Ci rozpoznać ten plan (maksymalnie 100 znaków)
            </p>
          )}
        </div>

        {/* Licznik znaków */}
        <div className="flex justify-end">
          <span className="text-xs text-muted-foreground">{data.name.length} / 100 znaków</span>
        </div>
      </div>

      {/* Informacja dodatkowa */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">💡 Wskazówka</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Wybierz nazwę, która opisuje lokalizację lub przeznaczenie działki. Dobrze dobrana nazwa ułatwi zarządzanie
          wieloma planami.
        </p>
      </div>
    </div>
  );
}
