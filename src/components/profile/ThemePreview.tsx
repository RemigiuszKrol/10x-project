import { Button } from "@/components/ui/button";
import type { UiTheme } from "@/types";

export interface ThemePreviewProps {
  theme: UiTheme;
  languageLabel: string;
}

/**
 * Podgląd motywu z przykładowymi elementami UI
 */
export function ThemePreview({ theme, languageLabel }: ThemePreviewProps) {
  const isDark = theme === "dark";

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-900">Podgląd motywu</p>

      <div
        className={`rounded-lg border p-4 transition-colors ${
          isDark ? "border-neutral-700 bg-neutral-900 text-neutral-100" : "border-green-100 bg-green-50 text-gray-900"
        }`}
      >
        <div className="space-y-3">
          {/* Header preview */}
          <div
            className={`rounded border p-3 ${
              isDark ? "border-neutral-700 bg-neutral-800" : "border-green-200 bg-white"
            }`}
          >
            <h4 className="text-sm font-semibold">PlantsPlaner</h4>
            <p className="text-xs opacity-80">Język: {languageLabel}</p>
          </div>

          {/* Content preview */}
          <div className="space-y-2">
            <p className="text-sm">Przykładowy tekst w interfejsie aplikacji.</p>
            <div className="flex gap-2">
              <Button size="sm" variant={isDark ? "secondary" : "default"}>
                Przycisk
              </Button>
              <Button size="sm" variant="outline">
                Anuluj
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
