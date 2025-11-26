import { Button } from "@/components/ui/button";
import type { UiTheme } from "@/types";

export interface ThemePreviewProps {
  theme: UiTheme;
}

/**
 * Podgląd motywu z przykładowymi elementami UI
 * Używa rzeczywistych klas Tailwind używanych w aplikacji
 */
export function ThemePreview({ theme }: ThemePreviewProps) {
  const isDark = theme === "dark";

  // Klasy Tailwind używane w aplikacji dla motywu jasnego
  const lightClasses = {
    label: "text-sm font-medium text-gray-900",
    container: "rounded-lg border border-green-100 bg-white text-gray-900 p-4",
    card: "rounded border border-green-100 bg-white text-gray-900 p-3",
    text: "text-sm text-gray-900",
    mutedText: "text-xs text-gray-600",
  };

  // Klasy Tailwind używane w aplikacji dla motywu ciemnego
  const darkClasses = {
    label: "text-sm font-medium text-gray-100",
    container: "rounded-lg border border-gray-700 bg-gray-800 text-gray-100 p-4",
    card: "rounded border border-gray-700 bg-gray-800 text-gray-100 p-3",
    text: "text-sm text-gray-100",
    mutedText: "text-xs text-gray-400",
  };

  const classes = isDark ? darkClasses : lightClasses;

  // CSS variables dla odpowiedniego motywu (dla przycisków)
  const themeVariables = isDark
    ? {
        "--background": "oklch(0.145 0 0)",
        "--foreground": "oklch(0.985 0 0)",
        "--primary": "oklch(0.548 0.166 155.828)",
        "--primary-foreground": "oklch(0.985 0 0)",
        "--secondary": "oklch(0.269 0 0)",
        "--secondary-foreground": "oklch(0.985 0 0)",
        "--border": "oklch(1 0 0 / 10%)",
        "--input": "oklch(1 0 0 / 15%)",
        "--accent": "oklch(0.269 0 0)",
        "--accent-foreground": "oklch(0.985 0 0)",
      }
    : {
        "--background": "oklch(1 0 0)",
        "--foreground": "oklch(0.145 0 0)",
        "--primary": "oklch(0.548 0.166 155.828)",
        "--primary-foreground": "oklch(0.985 0 0)",
        "--secondary": "oklch(0.97 0 0)",
        "--secondary-foreground": "oklch(0.205 0 0)",
        "--border": "oklch(0.922 0 0)",
        "--input": "oklch(0.922 0 0)",
        "--accent": "oklch(0.97 0 0)",
        "--accent-foreground": "oklch(0.205 0 0)",
      };

  return (
    <div className="space-y-3">
      <p className={classes.label}>Podgląd motywu</p>

      {/* Wrapper z odpowiednimi CSS variables dla przycisków */}
      <div style={themeVariables as React.CSSProperties}>
        <div className={`${classes.container} transition-colors`}>
          <div className="space-y-3">
            {/* Header preview */}
            <div className={classes.card}>
              <h4 className="text-sm font-semibold">PlantsPlaner</h4>
              <p className={classes.mutedText}>Przykładowy nagłówek</p>
            </div>

            {/* Content preview */}
            <div className="space-y-2">
              <p className={classes.text}>Przykładowy tekst w interfejsie aplikacji.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="default">
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
    </div>
  );
}
