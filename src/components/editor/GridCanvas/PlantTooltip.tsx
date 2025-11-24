/**
 * PlantTooltip - Szczegółowy tooltip z informacjami o roślinie
 *
 * Wyświetla:
 * - Nazwę rośliny i pozycję (x, y)
 * - Scores jako gwiazdki (sunlight, humidity, precip, temperature, overall)
 * - Opisy parametrów
 *
 * Pojawia się po około sekundzie (delayDuration={1000})
 */

import { type ReactNode } from "react";
import type { PlantPlacementDto } from "@/types";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Sun, Droplets, CloudRain, Thermometer, Star, MapPin } from "lucide-react";

/**
 * Props dla PlantTooltip
 */
export interface PlantTooltipProps {
  plant: PlantPlacementDto;
  children: ReactNode;
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
}

function ScoreRow({ icon, label, score }: ScoreRowProps): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}:</span>
      </div>
      {renderStars(score)}
    </div>
  );
}

/**
 * PlantTooltip component
 */
export function PlantTooltip({ plant, children }: PlantTooltipProps): ReactNode {
  const hasScores =
    plant.sunlight_score !== null ||
    plant.humidity_score !== null ||
    plant.precip_score !== null ||
    plant.temperature_score !== null ||
    plant.overall_score !== null;

  return (
    <TooltipProvider delayDuration={1000}>
      <TooltipPrimitive.Root>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs border bg-card p-4 text-card-foreground shadow-lg"
          sideOffset={8}
        >
          <div className="space-y-3">
            {/* Nazwa rośliny i pozycja */}
            <div>
              <h3 className="font-semibold text-sm leading-tight text-foreground">{plant.plant_name}</h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>
                  x: {plant.x + 1}, y: {plant.y + 1}
                </span>
              </div>
            </div>

            {/* Scores */}
            {hasScores && (
              <div className="space-y-1.5 rounded-md bg-muted/50 p-2">
                <ScoreRow icon={<Sun className="h-3 w-3" />} label="Nasłonecznienie" score={plant.sunlight_score} />
                <ScoreRow icon={<Droplets className="h-3 w-3" />} label="Wilgotność" score={plant.humidity_score} />
                <ScoreRow icon={<CloudRain className="h-3 w-3" />} label="Opady" score={plant.precip_score} />
                <ScoreRow
                  icon={<Thermometer className="h-3 w-3" />}
                  label="Temperatura"
                  score={plant.temperature_score}
                />
                <div className="border-t border-border pt-1.5">
                  <ScoreRow icon={<Star className="h-3 w-3" />} label="Ogólnie" score={plant.overall_score} />
                </div>
              </div>
            )}

            {!hasScores && (
              <p className="text-xs italic text-muted-foreground">Brak oceny dopasowania (dodano ręcznie)</p>
            )}
          </div>
        </TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipProvider>
  );
}
