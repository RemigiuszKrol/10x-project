import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Edit, MapPin, Maximize2, Compass } from "lucide-react";
import type { PlanCreateFormData, PlanCreatorStep } from "@/types";

export interface PlanCreatorStepSummaryProps {
  data: PlanCreateFormData;
  onEditStep: (step: PlanCreatorStep) => void;
}

/**
 * Krok 4: Podsumowanie - przegląd wszystkich danych przed utworzeniem
 *
 * Funkcje:
 * - Wyświetlenie wszystkich wprowadzonych danych
 * - Przyciski "Edytuj" dla każdej sekcji
 * - Ostrzeżenie o nieodwracalności operacji
 * - Czytelny, kartowy layout
 */
export function PlanCreatorStepSummary({ data, onEditStep }: PlanCreatorStepSummaryProps) {
  // Obliczenia pomocnicze
  const widthCm = data.width_m !== undefined ? data.width_m * 100 : 0;
  const heightCm = data.height_m !== undefined ? data.height_m * 100 : 0;
  const gridWidth = widthCm && data.cell_size_cm ? widthCm / data.cell_size_cm : 0;
  const gridHeight = heightCm && data.cell_size_cm ? heightCm / data.cell_size_cm : 0;
  const totalCells = gridWidth * gridHeight;

  // Wyświetlanie wymiarów w metrach
  const widthDisplay = data.width_m !== undefined ? `${data.width_m.toFixed(2)} m` : "—";
  const heightDisplay = data.height_m !== undefined ? `${data.height_m.toFixed(2)} m` : "—";

  // Etykiety półkuli
  const hemisphereLabel = data.hemisphere === "northern" ? "Północna" : "Południowa";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Nagłówek */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Podsumowanie</h2>
        <p className="text-muted-foreground">
          Sprawdź wprowadzone dane przed utworzeniem planu. Możesz wrócić i edytować każdą sekcję.
        </p>
      </div>

      {/* Ostrzeżenie */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Uwaga!</strong> Po utworzeniu planu nie będzie możliwa zmiana wymiarów ani jednostki kratki. Będziesz
          mógł edytować tylko nazwę, lokalizację i orientację.
        </AlertDescription>
      </Alert>

      {/* Karty z danymi */}
      <div className="space-y-4">
        {/* Karta 1: Podstawy */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Podstawowe informacje</CardTitle>
                <CardDescription>Nazwa planu</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => onEditStep("basics")}>
                <Edit className="h-4 w-4 mr-2" />
                Edytuj
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Nazwa:</span>
                <p className="font-medium">{data.name || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Karta 2: Lokalizacja */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Lokalizacja</CardTitle>
                  <CardDescription>Położenie geograficzne działki</CardDescription>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => onEditStep("location")}>
                <Edit className="h-4 w-4 mr-2" />
                Edytuj
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.latitude && data.longitude ? (
              <div className="space-y-2">
                {data.address && (
                  <div>
                    <span className="text-sm text-muted-foreground">Adres:</span>
                    <p className="font-medium">{data.address}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">Współrzędne:</span>
                  <p className="font-mono font-medium">
                    {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Lokalizacja nie została ustawiona</p>
            )}
          </CardContent>
        </Card>

        {/* Karta 3: Wymiary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Maximize2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Wymiary i siatka</CardTitle>
                  <CardDescription>Rozmiar działki i jednostka kratki</CardDescription>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => onEditStep("dimensions")}>
                <Edit className="h-4 w-4 mr-2" />
                Edytuj
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Wymiary rzeczywiste:</span>
                <p className="font-medium">
                  {widthDisplay} × {heightDisplay}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Rozmiar kratki:</span>
                <p className="font-medium">{data.cell_size_cm} cm</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Wymiary siatki:</span>
                <p className="font-medium">
                  {gridWidth} × {gridHeight} pól
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Liczba pól:</span>
                <p className="font-medium">{totalCells.toLocaleString("pl-PL")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Karta 4: Orientacja */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Orientacja i półkula</CardTitle>
                  <CardDescription>Ustawienie względem stron świata</CardDescription>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => onEditStep("dimensions")}>
                <Edit className="h-4 w-4 mr-2" />
                Edytuj
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Orientacja:</span>
                <p className="font-medium">{data.orientation}° (0° = północ)</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Półkula:</span>
                <p className="font-medium">{hemisphereLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informacja końcowa */}
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
        <h3 className="text-sm font-medium text-green-900 dark:text-green-200 mb-1">✓ Gotowe do utworzenia</h3>
        <p className="text-sm text-green-700 dark:text-green-300">
          Wszystkie dane zostały wprowadzone poprawnie. Kliknij przycisk &ldquo;Utwórz plan&rdquo; poniżej, aby zapisać
          plan i przejść do edytora siatki.
        </p>
      </div>
    </div>
  );
}
