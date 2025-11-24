import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel?: string;
}

export interface LanguageSelectorProps {
  options: LanguageOption[];
  value: string;
  disabled: boolean;
  onChange: (code: string) => void;
  error?: string;
}

/**
 * Kontrolka wyboru języka
 */
export function LanguageSelector({ options, value, disabled, onChange, error }: LanguageSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label
          htmlFor="language-selector"
          className="text-base font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap"
        >
          Język interfejsu
        </Label>

        <RadioGroup
          id="language-selector"
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          className="flex flex-wrap gap-4"
        >
          {options.map((option) => (
            <div key={option.code} className="flex items-center space-x-2">
              <RadioGroupItem value={option.code} id={`lang-${option.code}`} />
              <Label
                htmlFor={`lang-${option.code}`}
                className="cursor-pointer text-sm font-normal text-gray-900 dark:text-gray-100"
              >
                {option.label}
                {option.nativeLabel && (
                  <span className="ml-2 text-gray-500 dark:text-gray-400">({option.nativeLabel})</span>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
