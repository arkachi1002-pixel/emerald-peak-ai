# Vercel Setup

## Build Settings

- Framework Preset: Other
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: leave empty/default. Do not set this to `dist`.

This app uses TanStack Start with Nitro's Vercel preset. The build generates Vercel Build Output API files in `.vercel/output`, including `.vercel/output/config.json`, `.vercel/output/static`, and `.vercel/output/functions/__server.func`.

## Environment Variables

Add these variables in Vercel for Production, Preview, and Development:

```text
SUPABASE_URL=<Supabase project URL>
SUPABASE_PUBLISHABLE_KEY=<Supabase anon/public publishable key>
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<Supabase anon/public publishable key>
VITE_SUPABASE_PROJECT_ID=<Supabase project ref>
NITRO_PRESET=vercel
```

Find these values in Supabase Project Settings:

- Project URL: Project Settings -> API -> Project URL.
- Anon/public key: Project Settings -> API -> Project API keys -> anon/public.
- Project ref: the subdomain part of the Supabase URL, or Project Settings -> General -> Reference ID.

Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel unless you later add trusted server-only code that truly needs admin access. This app currently uses the anon/public key and RLS-aware clients, so the service role key is not required. Never expose it to browser code.

## Supabase Auth URLs

In Supabase Auth settings, add your Vercel URL after deploy:

```text
https://your-project.vercel.app
https://your-project.vercel.app/**
```

For preview deployments, also add the preview domain pattern you use.

## Supabase Database Migrations

This repo has SQL migrations in `supabase/migrations`. Apply them to the same Supabase project used by the app before relying on runtime database queries.

```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npx supabase login
npx supabase link --project-ref nhyalhpiwcrbdjdwmfpe
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

If the CLI asks for the database password, find it in Supabase Dashboard -> Project Settings -> Database.

Manual alternative: open Supabase Dashboard -> SQL Editor, then run every SQL file from `supabase/migrations` in filename order.
