import { Check } from "lucide-react";
import { STEP_CONFIGS } from "@/types";
import type { PlanCreatorStep } from "@/types";

export interface PlanCreatorStepperProps {
  currentStep: PlanCreatorStep;
  completedSteps: Set<PlanCreatorStep>;
  onStepClick: (step: PlanCreatorStep) => void;
}

/**
 * Komponent wizualizujący postęp w kreatorze
 *
 * Funkcje:
 * - Wyświetlanie kroków z numerami i etykietami
 * - Statusy: aktywny, ukończony, nieaktywny
 * - Kliknięcie na ukończony krok pozwala wrócić
 * - Responsywność (poziomy na desktop, pionowy na mobile)
 */
export function PlanCreatorStepper({ currentStep, completedSteps, onStepClick }: PlanCreatorStepperProps) {
  const currentStepIndex = STEP_CONFIGS.findIndex((s) => s.key === currentStep);

  return (
    <nav aria-label="Postęp w kreatorze planu" className="mb-8">
      {/* Desktop - Horizontal */}
      <ol className="hidden md:flex items-center w-full">
        {STEP_CONFIGS.map((step, index) => {
          const isActive = step.key === currentStep;
          const isCompleted = completedSteps.has(step.key);
          const isClickable = isCompleted || isActive;
          const isLast = index === STEP_CONFIGS.length - 1;

          return (
            <li key={step.key} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive ? "bg-primary text-primary-foreground shadow-md" : ""}
                  ${isCompleted && !isActive ? "bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50" : ""}
                  ${!isActive && !isCompleted ? "bg-gray-50 dark:bg-gray-900" : ""}
                  ${isClickable && !isActive ? "cursor-pointer" : "cursor-default"}
                  disabled:opacity-50
                `}
                aria-current={isActive ? "step" : undefined}
              >
                {/* Numer/Ikona */}
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full font-semibold
                    ${isActive ? "bg-primary-foreground text-primary" : ""}
                    ${isCompleted && !isActive ? "bg-green-600 text-white" : ""}
                    ${!isActive && !isCompleted ? "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400" : ""}
                  `}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-5 w-5" aria-label="Ukończone" />
                  ) : (
                    <span>{step.order}</span>
                  )}
                </div>

                {/* Tekst */}
                <div className="text-left">
                  <div className="font-medium">{step.label}</div>
                  {step.description && (
                    <div className={`text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {step.description}
                    </div>
                  )}
                </div>
              </button>

              {/* Linia łącząca */}
              {!isLast && (
                <div
                  className={`
                    h-0.5 flex-1 mx-2
                    ${index < currentStepIndex ? "bg-green-600" : "bg-gray-200 dark:bg-gray-800"}
                  `}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile - Vertical */}
      <ol className="md:hidden space-y-2">
        {STEP_CONFIGS.map((step) => {
          const isActive = step.key === currentStep;
          const isCompleted = completedSteps.has(step.key);
          const isClickable = isCompleted || isActive;

          return (
            <li key={step.key}>
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                className={`
                  flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all
                  ${isActive ? "bg-primary text-primary-foreground shadow-md" : ""}
                  ${isCompleted && !isActive ? "bg-green-50 dark:bg-green-950/30" : ""}
                  ${!isActive && !isCompleted ? "bg-gray-50 dark:bg-gray-900" : ""}
                  ${isClickable && !isActive ? "cursor-pointer" : "cursor-default"}
                  disabled:opacity-50
                `}
                aria-current={isActive ? "step" : undefined}
              >
                {/* Numer/Ikona */}
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full font-semibold shrink-0
                    ${isActive ? "bg-primary-foreground text-primary" : ""}
                    ${isCompleted && !isActive ? "bg-green-600 text-white" : ""}
                    ${!isActive && !isCompleted ? "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400" : ""}
                  `}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-5 w-5" aria-label="Ukończone" />
                  ) : (
                    <span>{step.order}</span>
                  )}
                </div>

                {/* Tekst */}
                <div className="text-left flex-1">
                  <div className="font-medium">{step.label}</div>
                  {step.description && (
                    <div className={`text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {step.description}
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
