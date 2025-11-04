## Tech stack – PlantsPlaner (MVP)

- **Aplikacja/Framework**: Astro 5, React 19, TypeScript 5
- **Render/adapter**: `@astrojs/node` (standalone), SSR gdzie potrzebne
- **Integracje Astro**: `@astrojs/react`, `@astrojs/sitemap`
- **Styling/UI**: Tailwind CSS 4 (plugin `@tailwindcss/vite`), shadcn/ui (komponenty w `src/components/ui`), Radix UI primitives, `lucide-react` (ikony)
- **Architektura frontu**: Astro dla layoutów/static, React dla interaktywności; alias ścieżek `@/*` (tsconfig)

### Backend, baza i autoryzacja
- **BaaS/DB/Auth**: Supabase (Postgres, Auth, Storage) – przewidziane wg reguł projektu; klient w `src/db/`

### Integracje zewnętrzne (PRD)
- **Mapy i geolokalizacja**: Leaflet.js + OpenStreetMap (mapy, geokodowanie)
- **Pogoda**: Open‑Meteo API (cache miesięczny per plan)
- **AI**: usługa LLM (dostawca do ustalenia); odpowiedzi w stałym schemacie JSON, sanity‑check po stronie aplikacji

### Walidacja i dobre praktyki
- **Walidacja**: Zod (walidacja wejść/DTO w API i komponentach)
- **Obsługa błędów**: guard clauses, wczesne zwroty, przyjazne komunikaty (wg reguł)

### Narzędzia developerskie i jakość
- **Linting**: ESLint 9 (+ `@typescript-eslint`, `eslint-plugin-astro`, `eslint-plugin-react`, `eslint-plugin-react-compiler`)
- **Formatowanie**: Prettier (+ `prettier-plugin-astro`)
- **Git hooks**: Husky, lint-staged

### Konfiguracja/projekt
- `astro.config.mjs`: integracje React/Sitemap, adapter Node, Vite plugin Tailwind
- `tsconfig.json`: `jsx: react-jsx`, `jsxImportSource: react`, alias `@/*`
- Tailwind 4 działa bez dedykowanego `tailwind.config.*` (konfiguracja przez plugin Vite)

Uwagi:
- PRD wskazuje Leaflet + OSM (zamiast Google Maps) oraz Open‑Meteo.
- Supabase jest częścią założeń projektu (backend/auth/DB), nawet jeśli jeszcze nie ma pełnej instalacji w repo.

