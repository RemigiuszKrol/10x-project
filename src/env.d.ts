/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;

  // OpenRouter (server-only)
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_SEARCH_MODEL?: string;
  readonly OPENROUTER_FIT_MODEL?: string;
  readonly OPENROUTER_APP_NAME?: string;
  readonly OPENROUTER_SITE_URL?: string;

  readonly OPEN_METEO_API_URL?: string;
  readonly ENABLE_ERROR_LOGGING?: string; // "true" | "false" | undefined (domyślnie "true")

  // AI Mock Data Toggle (client-side)
  readonly PUBLIC_USE_MOCK_AI?: string;

  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
