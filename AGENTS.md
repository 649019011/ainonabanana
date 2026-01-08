# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router routes (pages, layouts) and API endpoints (e.g. `app/api/generate/route.ts`).
- `components/`: shared React components; `components/ui/` contains shadcn/ui + Radix primitives.
- `hooks/`: reusable React hooks.
- `lib/`: utilities (e.g. `lib/utils.ts` exports `cn()` for className merging).
- `public/`: static assets (icons, sample images).
- `styles/`: additional/legacy CSS. Global styles are primarily in `app/globals.css`.

## Build, Test, and Development Commands
- Install deps (preferred): `npm ci` (uses `package-lock.json`).
- Dev server: `npm run dev` (starts Next.js at `http://localhost:3000`).
- Production build: `npm run build`.
- Serve production build: `npm run start`.
- Lint: `npm run lint` (currently runs `eslint .`; ensure `eslint` is installed/configured or switch the script to `next lint`).

## Coding Style & Naming Conventions
- TypeScript + React; type-checking is strict (`tsconfig.json`).
- Use 2-space indentation and avoid unrelated reformatting.
- Match the file’s existing quote style (both single and double quotes are present).
- Prefer path aliases via `@/` (from `tsconfig.json`), e.g. `import { cn } from "@/lib/utils"`.

## Testing Guidelines
- No automated test suite is configured in this snapshot.
- If you add tests, keep them close to the code (e.g. `components/__tests__/...`) and add the corresponding `npm run test` script.

## Commit & Pull Request Guidelines
- Git history isn’t included in this snapshot; use Conventional Commits when possible (e.g. `feat: add crop tool`).
- PRs should include: a short summary, screenshots/GIFs for UI changes, and notes for any config/env updates.

## Security & Configuration Tips
- Store secrets in `.env.local` (ignored by `.gitignore`). The API route expects `OPENROUTER_API_KEY`.
- Supabase Google auth expects `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local`.
- Don’t commit generated output (e.g. `.next/`, `node_modules/`) or secrets.

## Agent-Specific Instructions
- Keep changes small and scoped; avoid drive-by refactors.
- Never print or paste secrets into logs, issues, or PRs.

## 本项目请始终用中文跟用户交流。
