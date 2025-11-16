import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Save, Check, Loader2 } from "lucide-react";
import type { PlanCreatorStep } from "@/types";

export interface PlanCreatorActionsProps {
  currentStep: PlanCreatorStep;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

/**
 * Pasek akcji kreatora planu
 *
 * Funkcje:
 * - Przyciski nawigacji (Cofnij, Kontynuuj/Utwórz)
 * - Przycisk "Zapisz szkic"
 * - Dialog potwierdzenia przed wysyłką
 * - Obsługa stanów (loading, disabled)
 */
export function PlanCreatorActions({
  currentStep,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onSaveDraft,
  onSubmit,
  isSubmitting,
}: PlanCreatorActionsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const isLastStep = currentStep === "summary";

  /**
   * Obsługa zapisu szkicu
   */
  const handleSaveDraft = () => {
    onSaveDraft();
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000); // Toast na 2s
  };

  /**
   * Obsługa kontynuowania/wysyłki
   */
  const handleForwardOrSubmit = () => {
    if (isLastStep) {
      setShowConfirmDialog(true);
    } else {
      onForward();
    }
  };

  /**
   * Obsługa potwierdzenia w dialogu
   */
  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    onSubmit();
  };

  return (
    <>
      {/* Pasek akcji */}
      <div className="sticky bottom-0 bg-background border-t border-gray-200 dark:border-gray-800 mt-8 py-4 -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Lewa strona - Cofnij */}
          <div className="flex-1">
            {canGoBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Cofnij
              </Button>
            )}
          </div>

          {/* Środek - Zapisz szkic */}
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {draftSaved ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Zapisano
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Zapisz szkic
                </>
              )}
            </Button>
          </div>

          {/* Prawa strona - Kontynuuj/Utwórz */}
          <div className="flex-1 flex justify-end">
            {(canGoForward || isLastStep) && (
              <Button
                type="button"
                onClick={handleForwardOrSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Tworzenie...
                  </>
                ) : isLastStep ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Utwórz plan
                  </>
                ) : (
                  <>
                    Kontynuuj
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dialog potwierdzenia */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Czy na pewno chcesz utworzyć plan?</DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <p>Plan zostanie zapisany z podanymi wymiarami i konfiguracją siatki.</p>
                <p className="font-medium text-orange-600 dark:text-orange-400">
                  ⚠ Po utworzeniu nie będzie można zmienić wymiarów działki ani rozmiaru kratki.
                </p>
                <p>Będziesz mógł edytować tylko nazwę, lokalizację i orientację planu.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isSubmitting}>
              Anuluj
            </Button>
            <Button type="button" onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Tworzenie...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Tak, utwórz plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
