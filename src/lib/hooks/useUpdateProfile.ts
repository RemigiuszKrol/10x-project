import { useState, useCallback } from "react";
import type { ProfileUpdateCommand, ProfileDto, ApiItemResponse, ApiErrorResponse } from "@/types";
import type { ProfileViewModel, ProfileError } from "./useProfilePreferences";

/**
 * Payload aktualizacji profilu (używa snake_case zgodnie z API)
 */
export type ProfileUpdatePayload = ProfileUpdateCommand;

/**
 * Wynik mutacji
 */
export interface UpdateProfileResult {
  success: boolean;
  data?: ProfileViewModel;
  error?: ProfileError;
}

/**
 * Callback dla optimistic update
 */
export type OptimisticUpdateCallback = (payload: ProfileUpdatePayload) => void;

/**
 * Callback dla rollback
 */
export type RollbackCallback = () => void;

/**
 * Mapuje ProfileDto na ProfileViewModel
 */
function mapProfileDtoToViewModel(dto: ProfileDto): ProfileViewModel {
  return {
    id: dto.id,
    languageCode: dto.language_code,
    theme: dto.theme,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

/**
 * Hook do aktualizacji profilu użytkownika z obsługą optimistic update
 * @param options - Opcje z callbackami dla optimistic update i rollback
 * @returns { mutate, isLoading, error }
 */
export function useUpdateProfile(options?: {
  onOptimisticUpdate?: OptimisticUpdateCallback;
  onRollback?: RollbackCallback;
  onSuccess?: (data: ProfileViewModel) => void;
  onError?: (error: ProfileError) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ProfileError | null>(null);

  const mutate = useCallback(
    async (payload: ProfileUpdatePayload): Promise<UpdateProfileResult> => {
      // Reset poprzedniego błędu
      setError(null);
      setIsLoading(true);

      // Optimistic update - natychmiast aktualizuj UI
      if (options?.onOptimisticUpdate) {
        options.onOptimisticUpdate(payload);
      }

      try {
        // Wywołaj API PUT /api/profile
        // Sesja jest automatycznie sprawdzana po stronie serwera przez cookies
        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Ważne: wysyła cookies z requestem
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          // Obsługa błędów HTTP
          let errorObj: ProfileError;

          if (response.status === 401 || response.status === 403) {
            errorObj = {
              code: "Unauthorized",
              message: "Nie masz uprawnień do aktualizacji profilu.",
            };
          } else if (response.status === 404) {
            errorObj = {
              code: "NotFound",
              message: "Profil nie został znaleziony.",
            };
          } else {
            // Spróbuj sparsować błąd z API
            try {
              const errorData: ApiErrorResponse = await response.json();
              errorObj = {
                code: errorData.error.code,
                message: errorData.error.message,
                fieldErrors: errorData.error.details?.field_errors,
              };
            } catch {
              errorObj = {
                code: "InternalError",
                message: "Wystąpił nieoczekiwany błąd.",
              };
            }
          }

          setError(errorObj);
          setIsLoading(false);

          // Rollback optimistic update
          if (options?.onRollback) {
            options.onRollback();
          }

          if (options?.onError) {
            options.onError(errorObj);
          }

          return { success: false, error: errorObj };
        }

        // Parsuj odpowiedź sukcesu
        const data: ApiItemResponse<ProfileDto> = await response.json();
        const viewModel = mapProfileDtoToViewModel(data.data);

        setIsLoading(false);

        if (options?.onSuccess) {
          options.onSuccess(viewModel);
        }

        return { success: true, data: viewModel };
      } catch {
        // Obsługa błędów sieci / timeout
        const errorObj: ProfileError = {
          code: "InternalError",
          message: "Nie udało się połączyć z serwerem. Spróbuj ponownie.",
        };

        setError(errorObj);
        setIsLoading(false);

        // Rollback optimistic update
        if (options?.onRollback) {
          options.onRollback();
        }

        if (options?.onError) {
          options.onError(errorObj);
        }

        return { success: false, error: errorObj };
      }
    },
    [options]
  );

  return { mutate, isLoading, error };
}
