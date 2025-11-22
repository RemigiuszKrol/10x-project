/**
 * PlantCard - Karta pojedynczej rośliny w liście
 *
 * Wyświetla:
 * - Nazwę rośliny i pozycję (x, y)
 * - Scores jako gwiazdki (sunlight, humidity, precip, overall)
 * - Akcje: JumpTo, Delete
 */

import { type ReactNode } from "react";
import type { PlantPlacementDto } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sprout, MapPin, Trash2, Sun, Droplets, CloudRain, Star } from "lucide-react";
import { FIT_PARAMETER_DESCRIPTIONS } from "@/lib/integrations/ai.config";

/**
 * Props dla PlantCard
 */
export interface PlantCardProps {
  plant: PlantPlacementDto;
  onJumpTo?: (x: number, y: number) => void;
  onDelete: (x: number, y: number) => void;
  isDeleting?: boolean;
}

/**
 * Helper do renderowania gwiazdek (1-5)
 */
function renderStars(score: number | null): ReactNode {
  if (score === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

/**
 * ScoreRow - Wiersz z pojedynczym score
 */
interface ScoreRowProps {
  icon: ReactNode;
  label: string;
  score: number | null;
  description?: string;
}

function ScoreRow({ icon, label, score, description }: ScoreRowProps): ReactNode {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {icon}
              <span className="text-xs">{label}:</span>
            </div>
            {renderStars(score)}
          </div>
        </TooltipTrigger>
        {description && (
          <TooltipContent side="left">
            <p className="max-w-xs text-xs">{description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * PlantCard component
 */
export function PlantCard({ plant, onJumpTo, onDelete, isDeleting = false }: PlantCardProps): ReactNode {
  const hasScores =
    plant.sunlight_score !== null ||
    plant.humidity_score !== null ||
    plant.precip_score !== null ||
    plant.overall_score !== null;

  return (
    <Card className="p-4 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        {/* Left: Info */}
        <div className="flex-1 space-y-3">
          {/* Nazwa rośliny */}
          <div className="flex items-start gap-2">
            <Sprout className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div>
              <h3 className="font-semibold leading-tight">{plant.plant_name}</h3>
              {/* Pozycja */}
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>
                  x: {plant.x}, y: {plant.y}
                </span>
              </div>
            </div>
          </div>

          {/* Scores */}
          {hasScores && (
            <div className="space-y-1.5 rounded-md bg-muted/50 p-2">
              <ScoreRow
                icon={<Sun className="h-3 w-3" />}
                label="Nasłonecznienie"
                score={plant.sunlight_score}
                description={FIT_PARAMETER_DESCRIPTIONS.sunlight}
              />
              <ScoreRow
                icon={<Droplets className="h-3 w-3" />}
                label="Wilgotność"
                score={plant.humidity_score}
                description={FIT_PARAMETER_DESCRIPTIONS.humidity}
              />
              <ScoreRow
                icon={<CloudRain className="h-3 w-3" />}
                label="Opady"
                score={plant.precip_score}
                description={FIT_PARAMETER_DESCRIPTIONS.precip}
              />
              <div className="border-t border-border pt-1.5">
                <ScoreRow
                  icon={<Star className="h-3 w-3" />}
                  label="Ogólnie"
                  score={plant.overall_score}
                  description={FIT_PARAMETER_DESCRIPTIONS.overall}
                />
              </div>
            </div>
          )}

          {!hasScores && (
            <p className="text-xs italic text-muted-foreground">Brak oceny dopasowania (dodano ręcznie)</p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-2">
          {/* Jump to button */}
          {onJumpTo && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => onJumpTo(plant.x, plant.y)} className="h-8 w-8">
                    <MapPin className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Przejdź do komórki</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Delete button */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(plant.x, plant.y)}
                  disabled={isDeleting}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Usuń roślinę</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Card>
  );
}
