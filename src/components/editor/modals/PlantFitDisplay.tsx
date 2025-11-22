/**
 * PlantFitDisplay - Wyświetlanie wyników oceny dopasowania rośliny
 *
 * Pokazuje:
 * - 4 scores jako gwiazdki (sunlight, humidity, precip, overall)
 * - Explanation text od AI (collapsible)
 * - Season info tooltip
 * - Loading state podczas sprawdzania
 */

import { type ReactNode, useState } from "react";
import type { PlantFitResultDto } from "@/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Sun, Droplets, CloudRain, Star, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { FIT_PARAMETER_DESCRIPTIONS, SCORE_LABELS } from "@/lib/integrations/ai.config";

/**
 * Props dla PlantFitDisplay
 */
export interface PlantFitDisplayProps {
  fitResult: PlantFitResultDto | null;
  isLoading: boolean;
}

/**
 * Props dla ScoreCard
 */
interface ScoreCardProps {
  icon: ReactNode;
  label: string;
  score: number;
  description: string;
}

/**
 * ScoreCard - Pojedyncza karta z oceną parametru
 */
function ScoreCard({ icon, label, score, description }: ScoreCardProps): ReactNode {
  const scoreLabel = SCORE_LABELS[score as keyof typeof SCORE_LABELS];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="p-4 transition-shadow hover:shadow-md">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                {icon}
                <span className="text-sm font-medium">{label}</span>
              </div>

              {/* Gwiazdki */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < score ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>

              {/* Etykieta score */}
              <div className="text-sm">
                <span className="font-semibold">{score}/5</span>
                <span className="ml-2 text-muted-foreground">({scoreLabel})</span>
              </div>
            </div>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * SeasonInfoTooltip - Tooltip z info o wagach sezonów
 */
function SeasonInfoTooltip(): ReactNode {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-sm">
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Wagi sezonów w ocenie:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <strong>Sezon wzrostu (IV-IX):</strong> waga 2x - ważniejsze warunki podczas okresu wegetacyjnego
              </li>
              <li>
                <strong>Poza sezonem (X-III):</strong> waga 1x - mniejszy wpływ na ocenę
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">Uwaga: Wagi są odwrócone dla półkuli południowej</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * PlantFitDisplay component
 */
export function PlantFitDisplay({ fitResult, isLoading }: PlantFitDisplayProps): ReactNode {
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">Sprawdzam dopasowanie rośliny...</p>
            <p className="text-xs text-muted-foreground">AI analizuje warunki klimatyczne w Twojej lokalizacji</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
    );
  }

  // Brak wyniku
  if (!fitResult) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header z tytułem i season info */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ocena dopasowania</h3>
        <SeasonInfoTooltip />
      </div>

      {/* Grid 2x2 dla scores */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreCard
          icon={<Sun className="h-5 w-5" />}
          label="Nasłonecznienie"
          score={fitResult.sunlight_score}
          description={FIT_PARAMETER_DESCRIPTIONS.sunlight}
        />
        <ScoreCard
          icon={<Droplets className="h-5 w-5" />}
          label="Wilgotność"
          score={fitResult.humidity_score}
          description={FIT_PARAMETER_DESCRIPTIONS.humidity}
        />
        <ScoreCard
          icon={<CloudRain className="h-5 w-5" />}
          label="Opady"
          score={fitResult.precip_score}
          description={FIT_PARAMETER_DESCRIPTIONS.precip}
        />
        <ScoreCard
          icon={<Star className="h-5 w-5" />}
          label="Ogólna ocena"
          score={fitResult.overall_score}
          description={FIT_PARAMETER_DESCRIPTIONS.overall}
        />
      </div>

      {/* Explanation (collapsible) */}
      {fitResult.explanation && (
        <Card className="p-4">
          <button
            type="button"
            onClick={() => setIsExplanationExpanded(!isExplanationExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-medium">Wyjaśnienie od AI</span>
            {isExplanationExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {isExplanationExpanded && (
            <div className="mt-3 border-t pt-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{fitResult.explanation}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
