import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrientationCompass } from "@/components/plans/OrientationCompass";
import { GridPreview } from "@/components/plans/GridPreview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { PlanDimensionsFormData, GridDimensions } from "@/types";

export interface PlanCreatorStepDimensionsProps {
  data: PlanDimensionsFormData;
  onChange: (data: PlanDimensionsFormData) => void;
  errors: Partial<Record<keyof PlanDimensionsFormData, string>>;
  gridDimensions: GridDimensions;
}

/**
 * Krok 3: Wymiary - rozmiar, orientacja i półkula
 *
 * Funkcje:
 * - Inputy dla wymiarów (width_cm, height_cm)
 * - Select dla jednostki kratki (cell_size_cm)
 * - OrientationCompass - wizualizacja orientacji
 * - Select dla półkuli
 * - GridPreview - podgląd siatki
 * - Walidacja w czasie rzeczywistym
 * - Ostrzeżenie o limicie 200×200
 */
export function PlanCreatorStepDimensions({ data, onChange, errors, gridDimensions }: PlanCreatorStepDimensionsProps) {
  /**
   * Obsługa zmiany szerokości
   */
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChange({
      ...data,
      width_cm: isNaN(value) ? 0 : value,
    });
  };

  /**
   * Obsługa zmiany wysokości
   */
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChange({
      ...data,
      height_cm: isNaN(value) ? 0 : value,
    });
  };

  /**
   * Obsługa zmiany rozmiaru kratki
   */
  const handleCellSizeChange = (value: string) => {
    const numValue = parseInt(value, 10) as 10 | 25 | 50 | 100;
    onChange({
      ...data,
      cell_size_cm: numValue,
    });
  };

  /**
   * Obsługa zmiany orientacji
   */
  const handleOrientationChange = (value: number) => {
    onChange({
      ...data,
      orientation: value,
    });
  };

  /**
   * Obsługa zmiany półkuli
   */
  const handleHemisphereChange = (value: string) => {
    onChange({
      ...data,
      hemisphere: value as "northern" | "southern",
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Nagłówek */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Wymiary i orientacja</h2>
        <p className="text-muted-foreground">
          Określ rozmiar działki, jednostkę siatki oraz orientację względem stron świata.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Lewa kolumna - Formularz */}
        <div className="space-y-6">
          {/* Wymiary działki */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Wymiary działki</h3>

            {/* Szerokość */}
            <div className="space-y-2">
              <Label htmlFor="width-cm">
                Szerokość (cm)
                <span className="text-red-500 ml-1" aria-label="wymagane">
                  *
                </span>
              </Label>
              <Input
                id="width-cm"
                type="number"
                min={10}
                max={20000}
                step={data.cell_size_cm}
                value={data.width_cm || ""}
                onChange={handleWidthChange}
                placeholder="np. 1000"
                aria-describedby={errors.width_cm ? "width-error" : "width-help"}
                aria-invalid={!!errors.width_cm}
                className={errors.width_cm ? "border-red-500" : ""}
              />
              {errors.width_cm && (
                <p id="width-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.width_cm}
                </p>
              )}
              {!errors.width_cm && (
                <p id="width-help" className="text-sm text-muted-foreground">
                  Szerokość działki w centymetrach
                </p>
              )}
            </div>

            {/* Wysokość */}
            <div className="space-y-2">
              <Label htmlFor="height-cm">
                Wysokość (cm)
                <span className="text-red-500 ml-1" aria-label="wymagane">
                  *
                </span>
              </Label>
              <Input
                id="height-cm"
                type="number"
                min={10}
                max={20000}
                step={data.cell_size_cm}
                value={data.height_cm || ""}
                onChange={handleHeightChange}
                placeholder="np. 1500"
                aria-describedby={errors.height_cm ? "height-error" : "height-help"}
                aria-invalid={!!errors.height_cm}
                className={errors.height_cm ? "border-red-500" : ""}
              />
              {errors.height_cm && (
                <p id="height-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.height_cm}
                </p>
              )}
              {!errors.height_cm && (
                <p id="height-help" className="text-sm text-muted-foreground">
                  Wysokość działki w centymetrach
                </p>
              )}
            </div>

            {/* Rozmiar kratki */}
            <div className="space-y-2">
              <Label htmlFor="cell-size">
                Rozmiar pojedynczej kratki
                <span className="text-red-500 ml-1" aria-label="wymagane">
                  *
                </span>
              </Label>
              <Select value={data.cell_size_cm.toString()} onValueChange={handleCellSizeChange}>
                <SelectTrigger id="cell-size">
                  <SelectValue placeholder="Wybierz rozmiar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 cm (precyzyjne planowanie)</SelectItem>
                  <SelectItem value="25">25 cm (standardowe)</SelectItem>
                  <SelectItem value="50">50 cm (większe rośliny)</SelectItem>
                  <SelectItem value="100">100 cm (duża działka)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Rozmiar pojedynczego pola siatki. Mniejszy rozmiar = większa precyzja.
              </p>
            </div>
          </div>

          {/* Orientacja i półkula */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Orientacja</h3>

            {/* Kompas */}
            <OrientationCompass value={data.orientation} onChange={handleOrientationChange} />

            {/* Półkula */}
            <div className="space-y-2">
              <Label htmlFor="hemisphere">
                Półkula
                <span className="text-red-500 ml-1" aria-label="wymagane">
                  *
                </span>
              </Label>
              <Select value={data.hemisphere} onValueChange={handleHemisphereChange}>
                <SelectTrigger id="hemisphere">
                  <SelectValue placeholder="Wybierz półkulę" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="northern">Północna (Europa, Ameryka Północna, Azja)</SelectItem>
                  <SelectItem value="southern">Południowa (Australia, Ameryka Południowa, Afryka)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Półkula wpływa na nasłonecznienie i pory roku</p>
            </div>
          </div>
        </div>

        {/* Prawa kolumna - Podgląd */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Podgląd siatki</h3>

          {/* GridPreview */}
          {data.width_cm > 0 && data.height_cm > 0 && (
            <GridPreview
              gridWidth={gridDimensions.gridWidth}
              gridHeight={gridDimensions.gridHeight}
              cellSizeCm={data.cell_size_cm}
              orientation={data.orientation}
            />
          )}

          {/* Ostrzeżenie o wymiarach */}
          {data.width_cm === 0 || data.height_cm === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Wprowadź wymiary działki aby zobaczyć podgląd siatki</AlertDescription>
            </Alert>
          ) : null}

          {/* Błąd przekroczenia limitu */}
          {!gridDimensions.isValid && gridDimensions.errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Błąd wymiarów:</strong> {gridDimensions.errorMessage}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Informacja dodatkowa */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">💡 Wskazówka</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Wymiary muszą być podzielne przez rozmiar kratki</li>
          <li>Siatka nie może przekroczyć 200 × 200 pól (ograniczenie techniczne)</li>
          <li>Mniejszy rozmiar kratki = większa precyzja, ale większa liczba pól</li>
          <li>Orientacja 0° oznacza, że górna krawędź działki skierowana jest na północ</li>
        </ul>
      </div>
    </div>
  );
}
