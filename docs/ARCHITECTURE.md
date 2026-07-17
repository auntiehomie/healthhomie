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

There's no public signup: `POST /api/auth/register` requires a `code` alongside an email + password — either a per-person invite code (see "Invites" below) or the `SIGNUP_SECRET` bootstrap secret, which is only ever used by the app owner and never handed out. `POST /api/auth/login` verifies the password (bcrypt) and issues a long-lived JWT (`AUTH_JWT_SECRET`, 365-day expiry — this is a personal app, not a bank). The client stores that token in `expo-secure-store` on native and `localStorage` on web, and sends it as `Authorization: Bearer <token>` on every `/api/data/*`, `/api/invites`, and `/api/oura/*` call. `app/_layout.tsx` gates the whole app behind a token check, redirecting to `/login` when absent, except for `/login`, `/forgot-password`, and `/reset-password`, which stay reachable while logged out.

Forgotten passwords go through email, not the invite/signup flow: `POST /api/auth/forgot-password` looks up the account, mints a 1-hour single-use token (`lib/server/passwordResetStore.ts`, stored as a SHA-256 hash) and emails a `/reset-password?token=...` link via Resend (`lib/server/email.ts`); the response is the same generic message whether or not the email matched, to avoid leaking which emails have accounts. `POST /api/auth/reset-password` consumes the token and updates the password hash.

## Invites

Friends register with a one-time invite code instead of the shared signup secret the app used before. `POST /api/invites` (authenticated) mints an 8-character code (`lib/server/inviteStore.ts`); `GET /api/invites` lists the codes a given account has generated, including who used each one; `DELETE /api/invites?id=...` revokes an unused code. Registration (`api/auth/register.ts`) consumes the code atomically on success — reused, revoked, or unknown codes are rejected. This replaces `SIGNUP_SECRET`'s old double duty as both the friend-facing invite code and the `/api/admin/migrate` credential: that secret is now bootstrap-only, and `/api/admin/migrate` prefers a separate `ADMIN_SECRET` (falling back to `SIGNUP_SECRET` if unset, for backward compatibility).

## Data flow

`lib/db/database.ts` keeps its original function names (`listFoodItems`, `addMealEntry`, `getUserProfile`, etc.) but every one is now a `fetch` call to `api/data/*` with the stored bearer token attached — screens didn't need to change. There is currently no offline cache or local persistence: the app needs a network connection for reads and writes. Revisit this (e.g. a local queue/cache layer) if offline logging becomes a real need; deliberately skipped for now to avoid building sync/conflict-resolution machinery before it's needed.

## MVP modules

- Today dashboard: calories, macros, entries, health snapshot placeholders
- Food journal: USDA search with a live macro-preview modal (amount + gram/ounce entry), reusable saved foods
- Goals: BMR/TDEE estimate, protein-forward macro targets, weekly adjustment logic
- Scan: camera + Open Food Facts route boundary
- Settings: account (logout), Apple Health permission flow, Oura connect/sync, legal links
- Energy: Oura readiness/sleep/activity scores via the same account-synced Postgres data (`lib/services/ouraClient.ts` + `/api/oura/sync`), energy curve and schedule suggestions derived client-side from the readiness score
- Morning, Notes (added in a separate merge): mood check-in, priorities, hydration, routine checklist, and Zettelkasten-style notes — currently persisted locally on-device via `AsyncStorage`, not yet synced through the account/Postgres layer the way Today/Journal/Goals/Energy are

## Required env vars

- `DATABASE_URL` (or `POSTGRES_URL`) — auto-set by Vercel's Postgres/Neon storage integration.
- `AUTH_JWT_SECRET` — signs login sessions and the short-lived Oura OAuth state token.
- `SIGNUP_SECRET` — bootstrap secret for the owner's own account(s); not shared with anyone else. Falls back to being accepted by `/api/admin/migrate` too if `ADMIN_SECRET` isn't set.
- `ADMIN_SECRET` — recommended, keeps `/api/admin/migrate` on its own credential separate from `SIGNUP_SECRET`.
- `USDA_FDC_API_KEY` — Vercel env var for USDA FoodData Central.
- `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` / `OURA_REDIRECT_URI` — Oura OAuth2 app credentials (see `docs/WEB_AND_WEARABLES_STRATEGY.md`).
- `RESEND_API_KEY` — sends password-reset emails via Resend.
- `RESEND_FROM_EMAIL` — optional; defaults to Resend's unverified sandbox sender. Set to something like `Howdy Morning <noreply@howdymornin.io>` once the domain is verified in Resend.
- `EXPO_PUBLIC_API_BASE_URL` — native builds only, points the app at the deployed Vercel API.

Open Food Facts does not require an API key for normal lookup usage.

## Survey

Settings → "Take the survey" links to an optional `/survey` screen (two cards: Body & movement, Knowledge & productivity), backed by a single `survey_responses` row per user (`api/data/survey.ts`, `lib/services/surveyClient.ts`). Every field is optional. Weight is the one sensitive field: it's encrypted client-side (`lib/services/privacy.ts`) with a passphrase the user chooses on the spot — PBKDF2 (100k iterations) derives an AES-CBC key from that passphrase plus a random per-save salt, both generated with `expo-crypto`'s secure RNG. The passphrase itself is never sent to the server or stored anywhere; only ciphertext, salt, and IV land in Postgres, so the server (and anyone with direct database access, including the app's own developer) cannot read the value. Losing the passphrase means the old encrypted weight is unrecoverable — the UI makes this explicit and lets the user just save a new one.

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
