# healthhomie architecture

healthhomie is an iOS-first, local-first calorie/macro journal with Apple Health context.

## Build principles

- Cost-efficient first: open-source libraries, free APIs, local storage before cloud sync.
- Privacy-first: journal data starts on-device; HealthKit is permissioned explicitly.
- Service boundaries: HealthKit and nutrition APIs stay isolated from UI screens.
- No secrets in git: USDA API keys live in Vercel environment variables.

## Stack

- Expo + React Native + TypeScript
- Expo Router tabs
- Expo SQLite for local MVP storage
- `@kingstinct/react-native-healthkit` for Apple HealthKit on iOS custom builds
- USDA FoodData Central for generic foods
- Open Food Facts for barcode/package foods
- Vercel serverless routes as API proxies/cache boundary

## MVP modules

- Today dashboard: calories, macros, entries, health snapshot placeholders
- Food journal: local quick logging and reusable food items
- Goals: BMR/TDEE estimate, protein-forward macro targets, weekly adjustment logic
- Scan: camera + Open Food Facts route boundary
- Settings: HealthKit permission flow and env-var guidance

## Next implementation order

1. Replace demo foods with manual custom-food creation form.
2. Add USDA search screen and persist selected foods locally.
3. Wire Open Food Facts barcode result into local food save/log flow.
4. Test HealthKit permissions on a real iPhone custom dev build.
5. Implement exact HealthKit reads for weight, steps, active energy, sleep, workouts.
6. Add weekly check-in persistence and adjustment prompts.
7. Add optional Vercel Postgres/Supabase sync only after local-first habit loop works.

## Required env vars

- `USDA_FDC_API_KEY` — Vercel env var for USDA FoodData Central.
- `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` / `OURA_REDIRECT_URI` — Oura OAuth2 app credentials (see `docs/WEB_AND_WEARABLES_STRATEGY.md`).
- `EXPO_PUBLIC_API_BASE_URL` — native builds only, points the app at the deployed Vercel API.

Open Food Facts does not require an API key for normal lookup usage.

## Wearables

- Oura is wired end to end: OAuth connect/callback/refresh/sync routes under `api/oura/`, normalized storage in the local `health_connections` / `health_metrics_daily` SQLite tables, and a Settings card to connect/sync. See `docs/WEB_AND_WEARABLES_STRATEGY.md` for the data model and the current storage tradeoff (tokens are handed to the client and stored locally since there's no cloud datastore yet — revisit once one exists).
- Apple HealthKit remains the native iOS adapter (`lib/services/healthkit.ts`), still a permission boundary with reads unwired.
- Open Wearables (self-hosted) was explored but blocked on VPS SSH access from the sandboxed dev environment; Oura became the first working provider instead.
