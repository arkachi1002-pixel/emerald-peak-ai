# Vercel Setup

## Build Settings

- Framework Preset: Other
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

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
