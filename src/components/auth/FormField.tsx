import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
}

export function FormField({
  id,
  name,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  autoComplete,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={cn(hasError && "border-red-500 focus-visible:ring-red-500/20")}
      />
      {hasError && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
