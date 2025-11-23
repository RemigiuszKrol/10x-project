import { useEffect, useState, useRef } from "react";
import { usePlanCreator } from "@/lib/hooks/usePlanCreator";
import { PlanCreatorStepper } from "@/components/plans/PlanCreatorStepper";
import { PlanCreatorActions } from "@/components/plans/PlanCreatorActions";
import { PlanCreatorStepBasics } from "@/components/plans/steps/PlanCreatorStepBasics";
import { PlanCreatorStepLocation } from "@/components/plans/steps/PlanCreatorStepLocation";
import { PlanCreatorStepDimensions } from "@/components/plans/steps/PlanCreatorStepDimensions";
import { PlanCreatorStepSummary } from "@/components/plans/steps/PlanCreatorStepSummary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PlanDraft } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Główny komponent kreatora nowego planu
 *
 * Funkcje:
 * - Zarządzanie całym procesem tworzenia planu (4 kroki)
 * - Integracja wszystkich kroków i nawigacji
 * - Obsługa szkicu (wznowienie/rozpoczęcie od nowa)
 * - Komunikacja z API
 * - Przekierowanie po sukcesie
 */
export function PlanCreator() {
  const creator = usePlanCreator();
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftToLoad, setDraftToLoad] = useState<PlanDraft | null>(null);
  const hasCheckedDraft = useRef(false);

  /**
   * Sprawdzenie szkicu przy montowaniu
   * useRef zapewnia że sprawdzenie nastąpi tylko raz, bez powodowania re-renderów
   */
  useEffect(() => {
    if (!hasCheckedDraft.current) {
      hasCheckedDraft.current = true;
      const draft = creator.loadDraft();
      if (draft) {
        setDraftToLoad(draft);
        setShowDraftDialog(true);
      }
    }
  }, [creator]);

  /**
   * Obsługa wznowienia szkicu
   */
  const handleResumeDraft = () => {
    if (draftToLoad) {
      creator.updateFormData(draftToLoad.formData);

      // Znajdź ostatni ukończony krok i przejdź do następnego
      if (draftToLoad.formData.width_m && draftToLoad.formData.height_m) {
        creator.goToStep("summary");
      } else if (draftToLoad.formData.latitude || draftToLoad.formData.longitude) {
        creator.goToStep("dimensions");
      } else if (draftToLoad.formData.name) {
        creator.goToStep("location");
      }
    }
    setShowDraftDialog(false);
  };

  /**
   * Obsługa rozpoczęcia od nowa
   */
  const handleStartFresh = () => {
    creator.clearDraft();
    setShowDraftDialog(false);
  };

  /**
   * Obsługa wysyłki planu
   */
  const handleSubmit = async () => {
    const plan = await creator.submitPlan();

    if (plan) {
      // Sukces - przekieruj do edytora planu
      window.location.href = `/plans/${plan.id}`;
    }
    // Błędy są obsługiwane przez hook (state.apiError)
  };

  /**
   * Renderowanie aktywnego kroku
   */
  const renderCurrentStep = () => {
    switch (creator.state.currentStep) {
      case "basics":
        return (
          <PlanCreatorStepBasics
            data={{
              name: creator.state.formData.name || "",
            }}
            onChange={(data) => creator.updateFormData(data)}
            errors={{
              name: creator.state.errors.name,
            }}
          />
        );

      case "location":
        return (
          <PlanCreatorStepLocation
            data={{
              latitude: creator.state.formData.latitude,
              longitude: creator.state.formData.longitude,
              address: creator.state.formData.address,
            }}
            onChange={(data) => creator.updateFormData(data)}
            errors={{
              latitude: creator.state.errors.latitude,
              longitude: creator.state.errors.longitude,
            }}
          />
        );

      case "dimensions":
        return (
          <PlanCreatorStepDimensions
            data={{
              width_m: creator.state.formData.width_m ?? 0,
              height_m: creator.state.formData.height_m ?? 0,
              cell_size_cm: creator.state.formData.cell_size_cm || 25,
              orientation: creator.state.formData.orientation || 0,
              hemisphere: creator.state.formData.hemisphere || "northern",
            }}
            onChange={(data) => creator.updateFormData(data)}
            errors={{
              width_m: creator.state.errors.width_m,
              height_m: creator.state.errors.height_m,
              cell_size_cm: creator.state.errors.cell_size_cm,
              orientation: creator.state.errors.orientation,
              hemisphere: creator.state.errors.hemisphere,
            }}
            gridDimensions={creator.gridDimensions}
            latitude={creator.state.formData.latitude}
          />
        );

      case "summary":
        return (
          <PlanCreatorStepSummary
            data={{
              name: creator.state.formData.name || "",
              latitude: creator.state.formData.latitude,
              longitude: creator.state.formData.longitude,
              address: creator.state.formData.address,
              width_m: creator.state.formData.width_m || 10,
              height_m: creator.state.formData.height_m || 10,
              cell_size_cm: creator.state.formData.cell_size_cm || 25,
              orientation: creator.state.formData.orientation || 0,
              hemisphere: creator.state.formData.hemisphere || "northern",
            }}
            onEditStep={creator.goToStep}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Nagłówek */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Kreator nowego planu</h1>
            <p className="text-muted-foreground">Przygotuj plan swojej działki w kilku prostych krokach</p>
          </div>

          {/* Błąd API */}
          {creator.state.apiError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Wystąpił błąd:</strong> {creator.state.apiError}
              </AlertDescription>
            </Alert>
          )}

          {/* Stepper */}
          <PlanCreatorStepper
            currentStep={creator.state.currentStep}
            completedSteps={creator.state.completedSteps}
            onStepClick={creator.goToStep}
          />

          {/* Aktywny krok */}
          <div className="mb-24">{renderCurrentStep()}</div>

          {/* Akcje */}
          <PlanCreatorActions
            currentStep={creator.state.currentStep}
            canGoBack={creator.canGoBack}
            canGoForward={creator.canGoForward}
            onBack={creator.goBack}
            onForward={creator.goForward}
            onSaveDraft={creator.saveDraft}
            onSubmit={handleSubmit}
            isSubmitting={creator.state.isSubmitting}
          />
        </div>
      </div>

      {/* Dialog wznowienia szkicu */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Znaleziono zapisany szkic
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <p>
                  Wykryliśmy zapisany szkic planu z dnia{" "}
                  <strong>{draftToLoad ? new Date(draftToLoad.savedAt).toLocaleString("pl-PL") : ""}</strong>.
                </p>
                <p>Czy chcesz kontynuować pracę nad tym szkicem, czy rozpocząć tworzenie nowego planu od początku?</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={handleStartFresh} className="w-full sm:w-auto">
              Rozpocznij od nowa
            </Button>
            <Button type="button" onClick={handleResumeDraft} className="w-full sm:w-auto">
              Kontynuuj szkic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
