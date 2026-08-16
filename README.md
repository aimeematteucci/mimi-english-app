# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Speaking practice setup

1. Run `speaking-practice-schema.sql` in the Supabase SQL editor.
2. Set these as **Netlify environment variables** (Site settings → Environment variables — do NOT put them in `.env`, they're server-only and must never ship to the browser):
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings → API (the `service_role` secret key, not the anon key).
   - `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com), used for audio transcription (Whisper).
   - `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com), used to generate the pedagogical feedback.
3. `netlify/functions/evaluate-audio.js` reads `VITE_SUPABASE_URL` too (already set) to reach the Supabase project from the server side.
4. Recording is capped at 3 minutes client-side and the function runs synchronously — if audio evaluation starts timing out (Netlify's default function timeout is short), the fix is switching it to a [Background Function](https://docs.netlify.com/functions/background-functions/) (requires a paid Netlify plan).
