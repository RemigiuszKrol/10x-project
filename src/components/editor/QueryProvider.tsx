import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

/**
 * React Query Provider dla edytora planu
 *
 * Tworzy instancję QueryClient z odpowiednią konfiguracją
 * i opakowuje children w QueryClientProvider
 */
export function QueryProvider({ children }: { children: ReactNode }): ReactNode {
  // Tworzymy QueryClient w useState, aby uniknąć recreacji przy re-renderach
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Konfiguracja zgodna z planem implementacji
            staleTime: 5 * 60 * 1000, // 5 minut
            gcTime: 10 * 60 * 1000, // 10 minut (poprzednio cacheTime)
            refetchOnWindowFocus: false, // Unikamy konfliktów z lokalną edycją
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
