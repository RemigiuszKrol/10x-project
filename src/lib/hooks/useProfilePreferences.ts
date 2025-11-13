import { useState, useEffect, useCallback } from "react";
import type { ProfileDto, ApiItemResponse, ApiErrorResponse } from "@/types";

/**
 * ViewModel profilu dla UI
 */
export interface ProfileViewModel {
  id: string;
  languageCode: string;
  theme: "light" | "dark";
  createdAt: string;
  updatedAt: string;
}

/**
 * Błąd profilu
 */
export interface ProfileError {
  code: ApiErrorResponse["error"]["code"];
  message: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Stan profilu (union type)
 */
export type ProfileState =
  | { status: "loading" }
  | { status: "error"; error: ProfileError }
  | { status: "ready"; data: ProfileViewModel };

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
 * Hook do pobierania i zarządzania stanem preferencji profilu
 * @returns { state, refetch }
 */
export function useProfilePreferences() {
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  const fetchProfile = useCallback(async () => {
    setState({ status: "loading" });

    try {
      // Wywołaj API GET /api/profile
      // Sesja jest automatycznie sprawdzana po stronie serwera przez cookies
      const response = await fetch("/api/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Ważne: wysyła cookies z requestem
      });

      if (!response.ok) {
        // Obsługa błędów HTTP
        if (response.status === 401 || response.status === 403) {
          setState({
            status: "error",
            error: {
              code: "Unauthorized",
              message: "Nie masz uprawnień do wyświetlenia profilu.",
            },
          });
          return;
        }

        if (response.status === 404) {
          setState({
            status: "error",
            error: {
              code: "NotFound",
              message: "Profil nie został jeszcze utworzony.",
            },
          });
          return;
        }

        // Spróbuj sparsować błąd z API
        try {
          const errorData: ApiErrorResponse = await response.json();
          setState({
            status: "error",
            error: {
              code: errorData.error.code,
              message: errorData.error.message,
              fieldErrors: errorData.error.details?.field_errors,
            },
          });
        } catch {
          setState({
            status: "error",
            error: {
              code: "InternalError",
              message: "Wystąpił nieoczekiwany błąd.",
            },
          });
        }
        return;
      }

      // Parsuj odpowiedź sukcesu
      const data: ApiItemResponse<ProfileDto> = await response.json();
      const viewModel = mapProfileDtoToViewModel(data.data);

      setState({ status: "ready", data: viewModel });
    } catch {
      // Obsługa błędów sieci / timeout
      setState({
        status: "error",
        error: {
          code: "InternalError",
          message: "Nie udało się połączyć z serwerem. Spróbuj ponownie.",
        },
      });
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { state, refetch: fetchProfile };
}
