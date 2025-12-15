# Ultrasound Report with AI

Pediatric ultrasound reporting web app (Next.js + React + Supabase) with an AI-assisted “polish” workflow.

## Local setup
1. Copy env vars: `cp .env.example .env.local` and fill values.
2. Install deps: `npm install`
3. Run dev server: `npm run dev`

## Supabase schema
- SQL migration: `supabase/migrations/0001_init.sql`
- Enable Row Level Security policies in that file before using the app.

## Notes
- Landing background expects `public/landing.mp4` (ChatGPT Sora video). Add your own file at that path.

