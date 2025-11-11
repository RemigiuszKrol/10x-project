import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubmitButtonProps {
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SubmitButton({ isLoading = false, disabled = false, children, className }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || isLoading}
      className={cn(
        "w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
        "shadow-md hover:shadow-lg transition-all duration-200",
        className
      )}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Przetwarzanie...</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
}
