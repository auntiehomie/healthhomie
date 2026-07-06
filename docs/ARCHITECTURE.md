# healthhomie architecture

healthhomie is a calorie/macro journal with Apple Health and Oura context. Your account's data (food journal, profile, goals, connected wearables) lives in a shared Postgres database and syncs across web, iOS, and Android — it is no longer device-local.

## Build principles

- Cost-efficient first: open-source libraries, free APIs, a single small Postgres instance rather than a heavier backend.
- Account-scoped: every row is keyed to the logged-in user; a lightweight email/password + JWT session gates the API (see "Auth" below) since there's no public signup beyond an invite-style signup code.
- Service boundaries: HealthKit and nutrition APIs stay isolated from UI screens.
- No secrets in git: API keys, the JWT signing secret, and the signup code all live in Vercel environment variables.

## Stack

- Expo + React Native + TypeScript, Expo Router tabs
- Vercel serverless functions (`api/`) for all data access, auth, and third-party integrations
- Postgres (Vercel Storage → Neon) as the single source of truth, queried via `@neondatabase/serverless`
- `jsonwebtoken` + `bcryptjs` for session tokens and password hashing
- `@kingstinct/react-native-healthkit` for Apple HealthKit on iOS custom builds (native-only, reads not yet synced to the account)
- USDA FoodData Central for generic foods, Open Food Facts for barcode/package foods
- Oura OAuth2 for sleep/readiness/activity, tokens stored server-side per account

## Auth

There's no public signup: `POST /api/auth/register` requires a `signupSecret` matching the `SIGNUP_SECRET` env var, alongside an email + password. `POST /api/auth/login` verifies the password (bcrypt) and issues a long-lived JWT (`AUTH_JWT_SECRET`, 365-day expiry — this is a personal app, not a bank). The client stores that token in `expo-secure-store` on native and `localStorage` on web, and sends it as `Authorization: Bearer <token>` on every `/api/data/*` and `/api/oura/*` call. `app/_layout.tsx` gates the whole app behind a token check, redirecting to `/login` when absent.

## Data flow

`lib/db/database.ts` keeps its original function names (`listFoodItems`, `addMealEntry`, `getUserProfile`, etc.) but every one is now a `fetch` call to `api/data/*` with the stored bearer token attached — screens didn't need to change. There is currently no offline cache or local persistence: the app needs a network connection for reads and writes. Revisit this (e.g. a local queue/cache layer) if offline logging becomes a real need; deliberately skipped for now to avoid building sync/conflict-resolution machinery before it's needed.

## MVP modules

- Today dashboard: calories, macros, entries, health snapshot placeholders
- Food journal: USDA search with a live macro-preview modal (amount + gram/ounce entry), reusable saved foods
- Goals: BMR/TDEE estimate, protein-forward macro targets, weekly adjustment logic
- Scan: camera + Open Food Facts route boundary
- Settings: account (logout), Apple Health permission flow, Oura connect/sync, legal links

## Required env vars

- `DATABASE_URL` (or `POSTGRES_URL`) — auto-set by Vercel's Postgres/Neon storage integration.
- `AUTH_JWT_SECRET` — signs login sessions and the short-lived Oura OAuth state token.
- `SIGNUP_SECRET` — required to register an account and to call `/api/admin/migrate`.
- `USDA_FDC_API_KEY` — Vercel env var for USDA FoodData Central.
- `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` / `OURA_REDIRECT_URI` — Oura OAuth2 app credentials (see `docs/WEB_AND_WEARABLES_STRATEGY.md`).
- `EXPO_PUBLIC_API_BASE_URL` — native builds only, points the app at the deployed Vercel API.

Open Food Facts does not require an API key for normal lookup usage.

## Wearables

- Oura is wired end to end and stores tokens server-side, per account, in Postgres — the client never sees an Oura access/refresh token. `api/oura/start.ts` (authenticated) mints a short-lived signed state token and returns Oura's consent URL; `api/oura/callback.ts` verifies that state, exchanges the code, and stores the tokens; `api/oura/sync.ts` (authenticated) refreshes if needed and pulls daily activity/sleep/readiness into `health_metrics_daily`. This closes the token-handling tradeoff flagged in an earlier version of this doc.
- Apple HealthKit remains the native iOS adapter (`lib/services/healthkit.ts`), still a permission boundary with reads unwired and not synced to the account.
- Open Wearables (self-hosted) was explored but blocked on VPS SSH access from the sandboxed dev environment; Oura became the first working provider instead.

## Next implementation order

1. Replace demo foods with a manual custom-food creation form.
2. Wire Open Food Facts barcode result into the same log flow as USDA search.
3. Test HealthKit permissions on a real iPhone custom dev build, and decide whether/how HealthKit reads join the synced account data.
4. Add weekly check-in persistence and adjustment prompts (the domain logic already exists in `lib/domain/goals.ts`, just unpersisted).
5. Consider an offline cache/write queue if always-online logging turns out to be a real friction point.
