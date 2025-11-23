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
  readonly OPENROUTER_API_KEY: string;
  readonly OPEN_METEO_API_URL?: string;
  readonly ENABLE_ERROR_LOGGING?: string; // "true" | "false" | undefined (domyślnie "true")
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
