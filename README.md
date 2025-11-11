## 1. Project name

PlantsPlaner

[![Node](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Astro](https://img.shields.io/badge/astro-5.x-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
![Status](https://img.shields.io/badge/status-MVP%20in%20progress-blue)
![License](https://img.shields.io/badge/license-TBD-lightgrey)

## 2. Project description

PlantsPlaner is a web application that helps plan and assess the placement of garden plants on a grid-based plot plan. The MVP enables users to:

- Define a plot (real-world dimensions, grid unit 10/25/50/100 cm, location, orientation), generate a grid, and assign cell types (soil, path, water, building).
- Add plants to cells (rule: 1 plant = 1 cell; soil only) with guardrails and confirmations.
- Use maps (Leaflet + OpenStreetMap) for plot location and geocoding.
- Fetch local weather data (Open‑Meteo) and leverage AI to evaluate plant–location fit using a strict JSON schema with sanity checks and a 10 s timeout.
- Track minimal analytics (4 events) for core funnel insights.

Additional docs:

- Product Requirements (PRD): `.ai/prd.md`
- Tech stack details: `.ai/tech-stack.md`

## Table of contents

- 1. Project name
- 2. Project description
- 3. Tech stack
- 4. Getting started locally
- 5. Available scripts
- 6. Project scope
- 7. Project status
- 8. License

## 3. Tech stack

- Application: Astro 5, React 19, TypeScript 5
- Rendering/adapter: `@astrojs/node` (standalone), SSR where needed
- Astro integrations: `@astrojs/react`, `@astrojs/sitemap`
- Styling/UI: Tailwind CSS 4 (via `@tailwindcss/vite`), shadcn/ui, Radix UI primitives, `lucide-react`
- Backend/DB/Auth: Supabase (Postgres, Auth, Storage) – planned per PRD; client under `src/db/`
- Validation and quality: Zod (validation), ESLint 9, Prettier, Husky, lint-staged
- Project config: `tsconfig` with `jsx: react-jsx`, `jsxImportSource: react`, and path alias `@/*`

## 4. Getting started locally

Prerequisites:

- Node.js 22.14.0 (see `.nvmrc`)
- npm (bundled with Node)
- Docker (for Supabase local development)

Setup:

```bash
# install dependencies
npm install

# start Supabase locally (required for auth and database)
npx supabase start

# start dev server
npm run dev

# production build
npm run build

# preview production build locally
npm run preview
```

Notes:

- Astro dev server typically serves on `http://localhost:4321` (the CLI will confirm the exact port).
- Supabase services:
  - API: `http://localhost:54321`
  - Studio: `http://localhost:54323`
  - **Inbucket (email testing)**: `http://localhost:54324` 📧
- **Testing emails locally**: All auth emails (password reset, email verification) are captured by Inbucket. Open `http://localhost:54324` to view them. See `.ai/quick-start-inbucket.md` for details.
- Code quality:
  - Lint: `npm run lint`
  - Fix lint: `npm run lint:fix`
  - Format: `npm run format`

## 5. Available scripts

- `dev`: Start Astro development server
- `build`: Build for production
- `preview`: Preview the production build
- `astro`: Direct access to the Astro CLI
- `lint`: Run ESLint
- `lint:fix`: Run ESLint with autofix
- `format`: Run Prettier over the repo

## 6. Project scope

MVP (high-level):

- Authentication & profile:
  - Email/password sign up, login, logout (no email verification in MVP).
  - Profile page to save language and theme preferences.
- Plot plans:
  - Create plan with name, location (geocoding), orientation (0–359°), real dimensions, grid unit (10/25/50/100 cm), limit 200×200 cells.
  - Generate grid and assign rectangular areas to types: soil/path/water/building, with confirmations if plants would be removed.
  - Save grid and plan state.
- Plants:
  - Add a plant to a single soil cell (1 plant = 1 cell), remove plant, clear messages when not allowed.
- Maps & location:
  - Leaflet + OSM for map and geocoding; set plot pin with accuracy notice.
- Weather (Open‑Meteo):
  - One-time fetch after setting location or before first AI use; monthly per-plan cache and refresh.
  - Normalized metrics: sunlight (shortwave_radiation + sunshine_duration), humidity (relative_humidity_2m), precipitation (precipitation_sum).
- AI (search and fit evaluation):
  - Search plants by name with user confirmation.
  - Strict JSON response schema with sanity-check and a 10 s timeout.
  - Scores 1–5 with thresholds (≥90=5, 80–89=4, 70–79=3, 60–69=2, <60=1).
  - Weighted months: Apr–Sep weight 2, others 1; auto hemisphere, manual override available.
- Analytics (minimal):
  - `plan_created`, `grid_saved`, `area_typed`, `plant_confirmed`.

Out of scope (MVP):

- Plan sharing
- Internal plant requirement database
- Advanced transplanting assistant
- Year-round care plan assistant
- Undo/redo, drag & drop, layered editing
- CAPTCHA

Note: Email verification and password reset are **implemented** but marked as out of scope for initial MVP. They are available for testing locally via Inbucket.

## 7. Project status

- Status: MVP in progress. This repository already includes the Astro 5 + React 19 + Tailwind 4 foundation, shadcn/ui setup, and quality tooling.
- Backend/Auth/DB (Supabase), Leaflet/OSM, Open‑Meteo, and AI integration are planned per PRD and may be delivered incrementally.
- Success criteria (MVP targets):
  - 90% of users have at least one fully populated plan (≥5 plants).
  - 75% of users create a plan and add ≥5 plants within a year.

## 8. License

MIT
