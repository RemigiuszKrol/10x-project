import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import type { UiTheme } from "@/types";

export interface ThemeOption {
  value: UiTheme;
  label: string;
  icon: React.ReactNode;
}

export interface ThemeSelectorProps {
  options: ThemeOption[];
  value: UiTheme;
  disabled: boolean;
  onChange: (theme: UiTheme) => void;
}

/**
 * Przełącznik motywu (light/dark)
 */
export function ThemeSelector({ options, value, disabled, onChange }: ThemeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium text-gray-900 dark:text-gray-100">Motyw kolorystyczny</Label>

      <div className="flex gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? "default" : "outline"}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className="flex-1 gap-2"
          >
            {option.icon}
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Domyślne opcje motywu z ikonami
 */
export const DEFAULT_THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Jasny",
    icon: <Sun className="h-4 w-4" />,
  },
  {
    value: "dark",
    label: "Ciemny",
    icon: <Moon className="h-4 w-4" />,
  },
];
