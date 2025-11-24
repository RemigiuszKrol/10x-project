import { type ReactNode, useState } from "react";
import { usePlantPlacements } from "@/lib/hooks/queries/usePlantPlacements";
import { useRemovePlant } from "@/lib/hooks/mutations/usePlantMutations";
import { PlantCard } from "./PlantCard";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Sprout, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

/**
 * Props dla PlantsList
 */
export interface PlantsListProps {
  planId: string;
  onJumpToCell?: (x: number, y: number) => void;
  onPlantRemoved?: (plantName: string, x: number, y: number) => void;
}

/**
 * PlantsList - Lista roślin w planie
 *
 * Features:
 * - Wyświetlanie listy roślin z pozycjami (x, y) jako PlantCard
 * - Filtrowanie po nazwie rośliny (local search)
 * - Usuwanie rośliny z confirmation dialogiem
 * - Jump to cell w GridCanvas
 * - Empty state gdy brak roślin
 * - Loading state i error state
 * - Sortowanie po created_at desc (najnowsze na górze)
 */
export function PlantsList({ planId, onJumpToCell, onPlantRemoved }: PlantsListProps): ReactNode {
  const [filterText, setFilterText] = useState("");
  const [deletingPlant, setDeletingPlant] = useState<{ x: number; y: number } | null>(null);

  // Query do pobrania roślin
  const { data, isLoading, error } = usePlantPlacements(planId);

  // Mutation do usunięcia rośliny
  const removePlant = useRemovePlant();

  // Sortowanie i filtrowanie
  const plants = data?.data || [];
  const sortedPlants = [...plants].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const filteredPlants = filterText
    ? sortedPlants.filter((plant) => plant.plant_name.toLowerCase().includes(filterText.toLowerCase()))
    : sortedPlants;

  /**
   * Handler usunięcia rośliny
   */
  const handleRemovePlant = async (x: number, y: number) => {
    const plant = plants.find((p) => p.x === x && p.y === y);
    if (!plant) return;

    if (!confirm(`Czy na pewno chcesz usunąć roślinę "${plant.plant_name}"?\n\nPozycja: (x: ${x + 1}, y: ${y + 1})`)) {
      return;
    }

    setDeletingPlant({ x, y });

    try {
      await removePlant.mutateAsync({
        planId,
        x,
        y,
      });

      toast.success("Usunięto roślinę", {
        description: `Roślina "${plant.plant_name}" została usunięta`,
      });

      // Callback
      onPlantRemoved?.(plant.plant_name, x, y);
    } catch (err) {
      // Error handled by mutation
      if (err instanceof Error) {
        toast.error("Nie udało się usunąć rośliny", {
          description: err.message,
        });
      }
    } finally {
      setDeletingPlant(null);
    }
  };

  /**
   * Handler przejścia do komórki
   */
  const handleJumpToCell = (x: number, y: number) => {
    onJumpToCell?.(x, y);
    toast.info("Przejście do komórki", {
      description: `Pozycja: (x: ${x + 1}, y: ${y + 1})`,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Ładowanie roślin...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (plants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-8 text-center">
        <Sprout className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium">Brak roślin</p>
          <p className="text-sm text-muted-foreground">Dodaj rośliny używając zakładki &quot;Wyszukaj&quot;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Filtr wyszukiwania */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Filtruj rośliny..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Info o liczbie roślin */}
      <div className="text-sm text-muted-foreground">
        {filteredPlants.length === plants.length ? (
          <span>{plants.length === 0 ? "Brak roślin" : `Liczba roślin: ${plants.length}`}</span>
        ) : (
          <span>
            Wyświetlono {filteredPlants.length} z {plants.length}
          </span>
        )}
      </div>

      {/* Lista roślin - ScrollArea dla długich list */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-4">
          {filteredPlants.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {filterText ? "Brak roślin pasujących do filtra" : "Brak roślin w planie"}
              </p>
            </div>
          ) : (
            filteredPlants.map((plant) => (
              <PlantCard
                key={`${plant.x}-${plant.y}`}
                plant={plant}
                onJumpTo={onJumpToCell ? handleJumpToCell : undefined}
                onDelete={handleRemovePlant}
                isDeleting={deletingPlant?.x === plant.x && deletingPlant?.y === plant.y}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
