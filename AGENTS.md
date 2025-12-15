# Repository Guidelines

## Project Overview
**Ultrasound Report with AI** is a pediatric ultrasound reporting web app built with **Next.js (App Router)**, **React**, **Supabase (Auth + Postgres)**, and **Tailwind CSS v4**. It supports report creation, AI “polish” (OpenAI), saving to Supabase, listing/editing, and A4 printing.

## Project Structure
- `app/`: Next.js routes (landing, authenticated `/app/*`, and API routes).
- `components/`: reusable UI components (editor, auth, print toolbar).
- `lib/`: domain logic (RRN parsing, ultrasound templates, Supabase clients).
- `supabase/migrations/`: SQL migrations and RLS policies (start with `supabase/migrations/0001_init.sql`).
- `public/`: static assets (expects `public/landing.mp4` for the landing background).

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: run local dev server.
- `npm run build`: production build.
- `npm run start`: run production server.
- `npm run lint`: Next.js lint.
- `npm run typecheck`: TypeScript type check.

## Coding Style & Naming Conventions
- TypeScript-first, strict mode (`tsconfig.json`).
- Prefer small, focused components; keep domain logic in `lib/`.
- Tailwind utility classes for styling; keep UI pastel/clean (avoid heavy custom CSS).
- Use `camelCase` for variables/functions, `PascalCase` for React components, and `kebab-case` for route segments.

## Testing Guidelines
No test framework is wired yet. When adding tests, mirror module paths (e.g. `lib/rrn.ts` → `lib/rrn.test.ts`) and keep tests deterministic (no real network calls).

## Commit & Pull Request Guidelines
Git history is not available in this workspace; use **Conventional Commits** by default (e.g. `feat: add print layout`). PRs should include: summary, how to test, and screenshots for UI changes (landing, editor, print).

## Security & Configuration
- Do not commit secrets (`.env.local`). Use `.env.example` for safe placeholders.
- Reports may contain sensitive identifiers (e.g. RRN). Ensure Supabase **RLS** remains enabled and policies stay owner-only.
- OpenAI calls require `OPENAI_API_KEY` and run via `app/api/ai/polish/route.ts`.

