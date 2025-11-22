import { type ReactNode, useState } from "react";
import type { CellPosition, GridCellType, PlantSearchCandidateDto } from "@/types";
import { useSearchPlants, useCheckPlantFit } from "@/lib/hooks/mutations/useAIMutations";
import { useAddPlant } from "@/lib/hooks/mutations/usePlantMutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Sprout, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

/**
 * Props dla PlantSearchForm
 */
export interface PlantSearchFormProps {
  planId: string;
  selectedCell: CellPosition | null;
  cellType: GridCellType | null;
  onPlantAdded?: () => void;
}

/**
 * PlantSearchForm - Wyszukiwarka roślin i formularz dodawania
 *
 * Features:
 * - Wyszukiwanie rośliny po nazwie (POST /api/ai/plants/search)
 * - Wyświetlanie kandydatów (name, latin_name)
 * - Sprawdzanie dopasowania wybranej rośliny (POST /api/ai/plants/fit)
 * - Wyświetlanie wyników oceny AI (scores, explanation)
 * - Dodawanie rośliny do komórki (PUT /api/plans/:id/plants/:x/:y)
 * - Obsługa błędów: timeout (10s), 422 (nie-soil), 429 (rate limit)
 *
 * UI States:
 * 1. Initial - input + przycisk "Szukaj"
 * 2. Searching - spinner + "Szukanie..."
 * 3. Candidates - lista kandydatów do wyboru
 * 4. Fitting - spinner + "Sprawdzanie dopasowania..."
 * 5. Fit result - scores + explanation + przycisk "Dodaj"
 * 6. Adding - spinner + "Dodawanie..."
 * 7. Success - reset do initial + callback
 */
export function PlantSearchForm({ planId, selectedCell, cellType, onPlantAdded }: PlantSearchFormProps): ReactNode {
  const [query, setQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<PlantSearchCandidateDto | null>(null);

  // Mutations
  const searchPlants = useSearchPlants();
  const checkPlantFit = useCheckPlantFit();
  const addPlant = useAddPlant();

  /**
   * Handler wyszukiwania roślin
   */
  const handleSearch = async () => {
    if (!query.trim()) return;

    // Reset previous state
    setSelectedCandidate(null);
    checkPlantFit.reset();

    try {
      await searchPlants.mutateAsync({ query: query.trim() });
    } catch {
      // Error handled by mutation
    }
  };

  /**
   * Handler wyboru kandydata i sprawdzenia dopasowania
   */
  const handleSelectCandidate = async (candidate: PlantSearchCandidateDto) => {
    setSelectedCandidate(candidate);

    // Jeśli nie ma zaznaczonej komórki, tylko wyświetl kandydata
    if (!selectedCell) {
      return;
    }

    // Sprawdź dopasowanie do zaznaczonej komórki
    try {
      await checkPlantFit.mutateAsync({
        plan_id: planId,
        x: selectedCell.x,
        y: selectedCell.y,
        plant_name: candidate.name,
      });
    } catch {
      // Error handled by mutation
    }
  };

  /**
   * Handler dodania rośliny
   */
  const handleAddPlant = async () => {
    if (!selectedCandidate || !selectedCell) return;

    try {
      await addPlant.mutateAsync({
        planId,
        x: selectedCell.x,
        y: selectedCell.y,
        command: {
          plant_name: selectedCandidate.name,
          sunlight_score: checkPlantFit.data?.sunlight_score,
          humidity_score: checkPlantFit.data?.humidity_score,
          precip_score: checkPlantFit.data?.precip_score,
          overall_score: checkPlantFit.data?.overall_score,
        },
      });

      // Success - reset form
      setQuery("");
      setSelectedCandidate(null);
      searchPlants.reset();
      checkPlantFit.reset();

      // Toast success
      toast.success("Roślina dodana!", {
        description: `"${selectedCandidate.name}" została dodana na pozycji (${selectedCell.x}, ${selectedCell.y})`,
      });

      // Callback
      onPlantAdded?.();
    } catch (err) {
      // Error handled by mutation
      if (err instanceof Error) {
        toast.error("Nie udało się dodać rośliny", {
          description: err.message,
        });
      }
    }
  };

  /**
   * Handler ręcznego dodania rośliny (bez AI)
   */
  const handleAddManually = async () => {
    if (!query.trim() || !selectedCell) return;

    try {
      await addPlant.mutateAsync({
        planId,
        x: selectedCell.x,
        y: selectedCell.y,
        command: {
          plant_name: query.trim(),
        },
      });

      // Success - reset form
      setQuery("");
      searchPlants.reset();

      // Toast success
      toast.success("Roślina dodana!", {
        description: `"${query.trim()}" została dodana na pozycji (${selectedCell.x}, ${selectedCell.y}) bez oceny AI`,
      });

      // Callback
      onPlantAdded?.();
    } catch (err) {
      // Error handled by mutation
      if (err instanceof Error) {
        toast.error("Nie udało się dodać rośliny", {
          description: err.message,
        });
      }
    }
  };

  // Czy komórka nadaje się do dodania rośliny
  const canAddPlant = selectedCell !== null && cellType === "soil";

  return (
    <div className="space-y-4">
      {/* Info o zaznaczonej komórce */}
      {!selectedCell ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>Zaznacz komórkę na siatce, aby dodać roślinę</AlertDescription>
        </Alert>
      ) : !canAddPlant ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Rośliny można dodawać tylko na pola typu &quot;ziemia&quot;</AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Wybrana komórka: ({selectedCell.x}, {selectedCell.y}) - typ: ziemia ✓
          </AlertDescription>
        </Alert>
      )}

      {/* Formularz wyszukiwania */}
      <div className="space-y-2">
        <Label htmlFor="plant-query">Nazwa rośliny</Label>
        <div className="flex gap-2">
          <Input
            id="plant-query"
            type="text"
            placeholder="np. pomidor, bazylia..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            disabled={searchPlants.isPending}
          />
          <Button onClick={handleSearch} disabled={!query.trim() || searchPlants.isPending} size="icon" title="Szukaj">
            {searchPlants.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Error states */}
      {searchPlants.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{searchPlants.error.message}</AlertDescription>
        </Alert>
      )}

      {checkPlantFit.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{checkPlantFit.error.message}</AlertDescription>
        </Alert>
      )}

      {addPlant.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{addPlant.error.message}</AlertDescription>
        </Alert>
      )}

      {/* Lista kandydatów */}
      {searchPlants.data && searchPlants.data.candidates.length > 0 && (
        <div className="space-y-2">
          <Label>Wyniki wyszukiwania ({searchPlants.data.candidates.length})</Label>
          <div className="space-y-2">
            {searchPlants.data.candidates.map((candidate, index) => (
              <Button
                key={index}
                variant={selectedCandidate?.name === candidate.name ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleSelectCandidate(candidate)}
                disabled={checkPlantFit.isPending}
              >
                <Sprout className="mr-2 h-4 w-4" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">{candidate.name}</span>
                  {candidate.latin_name && <span className="text-xs italic opacity-75">{candidate.latin_name}</span>}
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Loading state sprawdzania dopasowania */}
      {checkPlantFit.isPending && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Sprawdzanie dopasowania rośliny...</span>
        </div>
      )}

      {/* Wynik dopasowania AI */}
      {checkPlantFit.data && selectedCandidate && (
        <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
          <div>
            <h3 className="font-semibold">Ocena dopasowania: {selectedCandidate.name}</h3>
            {selectedCandidate.latin_name && (
              <p className="text-xs italic text-muted-foreground">{selectedCandidate.latin_name}</p>
            )}
          </div>

          {/* Scores */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nasłonecznienie:</span>
              <span className="font-medium">
                {"⭐".repeat(checkPlantFit.data.sunlight_score)}
                {"☆".repeat(5 - checkPlantFit.data.sunlight_score)}
                <span className="ml-2 text-muted-foreground">({checkPlantFit.data.sunlight_score}/5)</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Wilgotność:</span>
              <span className="font-medium">
                {"⭐".repeat(checkPlantFit.data.humidity_score)}
                {"☆".repeat(5 - checkPlantFit.data.humidity_score)}
                <span className="ml-2 text-muted-foreground">({checkPlantFit.data.humidity_score}/5)</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Opady:</span>
              <span className="font-medium">
                {"⭐".repeat(checkPlantFit.data.precip_score)}
                {"☆".repeat(5 - checkPlantFit.data.precip_score)}
                <span className="ml-2 text-muted-foreground">({checkPlantFit.data.precip_score}/5)</span>
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
              <span>Ogólna ocena:</span>
              <span className="text-lg">
                {"⭐".repeat(checkPlantFit.data.overall_score)}
                {"☆".repeat(5 - checkPlantFit.data.overall_score)}
                <span className="ml-2 text-muted-foreground">({checkPlantFit.data.overall_score}/5)</span>
              </span>
            </div>
          </div>

          {/* Explanation */}
          {checkPlantFit.data.explanation && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {checkPlantFit.data.explanation}
            </div>
          )}

          {/* Przycisk dodaj */}
          <Button onClick={handleAddPlant} disabled={!canAddPlant || addPlant.isPending} className="w-full">
            {addPlant.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Dodawanie...
              </>
            ) : (
              <>
                <Sprout className="mr-2 h-4 w-4" />
                Dodaj roślinę
              </>
            )}
          </Button>
        </div>
      )}

      {/* Opcja ręcznego dodania (jeśli AI timeout lub user preference) */}
      {query &&
        !searchPlants.isPending &&
        !selectedCandidate &&
        searchPlants.data &&
        searchPlants.data.candidates.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Brak wyników. Dodaj roślinę ręcznie bez oceny AI:</p>
            <Button
              variant="outline"
              onClick={handleAddManually}
              disabled={!canAddPlant || addPlant.isPending}
              className="w-full"
            >
              {addPlant.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Dodawanie...
                </>
              ) : (
                <>
                  <Sprout className="mr-2 h-4 w-4" />
                  Dodaj &quot;{query}&quot; bez oceny
                </>
              )}
            </Button>
          </div>
        )}
    </div>
  );
}
