Project deployment and environment rules
=====================================

- **Never commit real `.env`.** Keep secrets out of the repo.
- **Always commit `.env.example`.** Provide placeholders only.
- **When creating ready-to-copy Vercel handoff files** (for sharing with deployers), name them exactly:
  - `VERCEL_ENV_IMPORT.local.env` (for Vercel import/paste) and
  - `VERCEL_ENV_VALUES.local.md` (human-readable mapping of values).
  Keep these files local and ensure they are ignored by git (see .gitignore).
- **Do not leak API keys, tokens, DB URLs, private keys, service-role keys, or secrets in chat or commits.**
- **Public frontend variables** (prefixed with `VITE_*`, `NEXT_PUBLIC_*`, etc.) are visible in the browser - do not put private secrets there.
- **Supabase keys:** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (anon) are safe for frontend/public use; `SUPABASE_SERVICE_ROLE_KEY` is strictly backend-only and should not be exposed to the browser.
- **Gemini keys** must be backend-only; default to `gemini-2.5-flash-lite` for low-cost student usage where applicable.
- **Do not require `SUPABASE_SERVICE_ROLE_KEY`** unless the project actually needs server-admin privileges (e.g., migrations or admin endpoints). Only add it to Vercel if server-only code needs it.
- **Font imports:** Avoid remote CSS `@import` inside app CSS (can break Lightning CSS / Vite builds). Prefer placing remote font `<link>`s in the document `<head>`.
- **Database:** All app database tables must exist in Supabase before Vercel/local runtime queries them. Apply migrations before or during deployment.
- **Vercel config (minimal & correct):**
  - Framework Preset: `Other`
  - Install Command: `npm install`
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Ensure `NITRO_PRESET=vercel` is set in Vercel env for Nitro builds that target Vercel.

Keep this file in the repository - future Codex/agent runs should check and preserve these rules.
