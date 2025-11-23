import { useMemo } from "react";
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
 * - Inputy dla wymiarów (width_m, height_m) w metrach
 * - Select dla jednostki kratki (cell_size_cm)
 * - OrientationCompass - wizualizacja orientacji
 * - Select dla półkuli
 * - GridPreview - podgląd siatki
 * - Walidacja w czasie rzeczywistym
 * - Ostrzeżenie o limicie 200×200
 */
export function PlanCreatorStepDimensions({ data, onChange, errors, gridDimensions }: PlanCreatorStepDimensionsProps) {
  /**
   * Oblicza maksymalną wartość dla danej skali (200m * skala)
   */
  const maxDimension = useMemo(() => {
    if (!data.cell_size_cm) return 200;
    const scaleInMeters = data.cell_size_cm / 100;
    return 200 * scaleInMeters;
  }, [data.cell_size_cm]);

  /**
   * Oblicza krok dla inputu (musi być podzielny przez skale)
   */
  const stepValue = useMemo(() => {
    if (!data.cell_size_cm) return 0.1;
    return data.cell_size_cm / 100;
  }, [data.cell_size_cm]);

  /**
   * Obsługa zmiany szerokości
   */
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onChange({
      ...data,
      width_m: isNaN(value) ? 0 : value,
    });
  };

  /**
   * Obsługa zmiany wysokości
   */
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onChange({
      ...data,
      height_m: isNaN(value) ? 0 : value,
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
              <Label htmlFor="width-m">
                Szerokość (m)
                <span className="text-red-500 ml-1" aria-label="wymagane">
                  *
                </span>
              </Label>
              <Input
                id="width-m"
                type="number"
                min={stepValue}
                max={maxDimension}
                step={stepValue}
                value={data.width_m || ""}
                onChange={handleWidthChange}
                placeholder={`np. ${maxDimension.toFixed(1)}`}
                aria-describedby={errors.width_m ? "width-error" : "width-help"}
                aria-invalid={!!errors.width_m}
                className={errors.width_m ? "border-red-500" : ""}
              />
              {errors.width_m && (
                <p id="width-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.width_m}
                </p>
              )}
              {!errors.width_m && (
                <p id="width-help" className="text-sm text-muted-foreground">
                  Szerokość działki w metrach (max: {maxDimension.toFixed(1)}m dla skali {data.cell_size_cm}cm)
                </p>
              )}
            </div>

            {/* Wysokość */}
            <div className="space-y-2">
              <Label htmlFor="height-m">
                Wysokość (m)
                <span className="text-red-500 ml-1" aria-label="wymagane">
                  *
                </span>
              </Label>
              <Input
                id="height-m"
                type="number"
                min={stepValue}
                max={maxDimension}
                step={stepValue}
                value={data.height_m || ""}
                onChange={handleHeightChange}
                placeholder={`np. ${maxDimension.toFixed(1)}`}
                aria-describedby={errors.height_m ? "height-error" : "height-help"}
                aria-invalid={!!errors.height_m}
                className={errors.height_m ? "border-red-500" : ""}
              />
              {errors.height_m && (
                <p id="height-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors.height_m}
                </p>
              )}
              {!errors.height_m && (
                <p id="height-help" className="text-sm text-muted-foreground">
                  Wysokość działki w metrach (max: {maxDimension.toFixed(1)}m dla skali {data.cell_size_cm}cm)
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

          {/* GridPreview - renderuj tylko gdy wymiary są prawidłowe */}
          {data.width_m > 0 && data.height_m > 0 && gridDimensions.isValid && (
            <GridPreview
              gridWidth={gridDimensions.gridWidth}
              gridHeight={gridDimensions.gridHeight}
              cellSizeCm={data.cell_size_cm}
              orientation={data.orientation}
            />
          )}

          {/* Ostrzeżenie o wymiarach */}
          {data.width_m === 0 || data.height_m === 0 ? (
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
          <li>Wymiary wprowadzasz w metrach (m)</li>
          <li>
            Maksymalna wartość: {maxDimension.toFixed(1)}m dla skali {data.cell_size_cm}cm (200m × skala)
          </li>
          <li>Wymiary muszą być podzielne przez rozmiar kratki (krok: {stepValue.toFixed(2)}m)</li>
          <li>Siatka nie może przekroczyć 200 × 200 pól (ograniczenie techniczne)</li>
          <li>Mniejszy rozmiar kratki = większa precyzja, ale większa liczba pól</li>
          <li>Orientacja 0° oznacza, że górna krawędź działki skierowana jest na północ</li>
          <li>Zmiana skali automatycznie przeskaluje wymiary działki</li>
        </ul>
      </div>
    </div>
  );
}
