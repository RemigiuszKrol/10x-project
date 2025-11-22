/**
 * SearchTab - Zakładka wyszukiwania roślin przez AI
 *
 * Zawiera:
 * - Formularz wyszukiwania (input + button)
 * - Lista wyników (kandydatów)
 * - Loading states
 * - Error handling
 */

import { type ReactNode, useState } from "react";
import type { AddPlantDialogState } from "@/types";
import type { AddPlantFlowActions } from "@/lib/hooks/useAddPlantFlow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, AlertCircle, Leaf } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Props dla SearchTab
 */
export interface SearchTabProps {
  state: AddPlantDialogState;
  actions: AddPlantFlowActions;
}

/**
 * SearchTab component
 */
export function SearchTab({ state, actions }: SearchTabProps): ReactNode {
  const [query, setQuery] = useState(state.searchQuery);

  /**
   * Handler wyszukiwania
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 0) {
      await actions.searchPlants(query.trim());
    }
  };

  /**
   * Handler wyboru kandydata
   */
  const handleSelectCandidate = async (candidateIndex: number) => {
    if (state.searchResults && state.searchResults[candidateIndex]) {
      await actions.selectCandidate(state.searchResults[candidateIndex]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Formularz wyszukiwania */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Wpisz nazwę rośliny (np. 'pomidor')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={state.isSearching}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={state.isSearching || query.trim().length === 0}>
            {state.isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Szukam...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Szukaj
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          AI wyszuka rośliny pasujące do podanej nazwy i sprawdzi ich dopasowanie do Twojego planu
        </p>
      </form>

      {/* Error display */}
      {state.error && state.error.context === "search" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">{state.error.message}</p>
            {state.error.details && <p className="mt-1 text-xs opacity-80">{state.error.details}</p>}
            {state.error.canRetry && (
              <Button variant="outline" size="sm" onClick={actions.retrySearch} className="mt-2">
                Spróbuj ponownie
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading skeleton */}
      {state.isSearching && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-20 animate-pulse bg-muted" />
          ))}
        </div>
      )}

      {/* Wyniki wyszukiwania */}
      {!state.isSearching && state.searchResults && (
        <div className="space-y-3">
          {state.searchResults.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nie znaleziono roślin pasujących do zapytania &quot;{state.searchQuery}&quot;. Spróbuj ponownie z inną
                nazwą lub dodaj roślinę ręcznie.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p className="text-sm font-medium">
                Znaleziono {state.searchResults.length} {state.searchResults.length === 1 ? "roślinę" : "roślin"}:
              </p>
              <div className="space-y-2">
                {state.searchResults.map((candidate, index: number) => (
                  <Card
                    key={index}
                    className={`cursor-pointer p-4 transition-all hover:shadow-md ${
                      state.selectedCandidate?.name === candidate.name ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => handleSelectCandidate(index)}
                  >
                    <div className="flex items-start gap-3">
                      <Leaf className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                      <div className="flex-1">
                        <h4 className="font-semibold">{candidate.name}</h4>
                        {candidate.latin_name && (
                          <p className="text-sm italic text-muted-foreground">{candidate.latin_name}</p>
                        )}
                      </div>
                      {state.selectedCandidate?.name === candidate.name && (
                        <div className="flex-shrink-0">
                          <div className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                            Wybrano
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Prompt gdy brak wyników */}
      {!state.isSearching && !state.searchResults && !state.error && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Wpisz nazwę rośliny aby rozpocząć wyszukiwanie</p>
        </div>
      )}
    </div>
  );
}
