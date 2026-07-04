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

Open Food Facts does not require an API key for normal lookup usage.
