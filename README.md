# healthhomie

Health tracking at a multi-dimensional level: daily food journal, calorie/macro tracking, Apple Health context, and adaptive goals.

## MVP

- Expo React Native app with TypeScript
- Account-based food journal backed by Postgres — the same data syncs across web, iOS, and Android
- Today dashboard for calories/macros
- Goal engine for calories/protein/carbs/fat
- Apple HealthKit permission boundary (native iOS only, not synced to the account yet)
- USDA FoodData Central + Open Food Facts search, Oura wearables integration

## Development

```bash
npm install
npm run start
npm run web
npm run typecheck
```

HealthKit requires an iOS custom dev build on a real iPhone; Expo Go is not enough for full HealthKit testing.

## Environment

Do not commit `.env` files. Add secrets in Vercel:

- `DATABASE_URL` (or `POSTGRES_URL`) — set automatically when you add a Postgres store in the Vercel dashboard (Storage tab → Create Database → Postgres, Neon-backed)
- `AUTH_JWT_SECRET` — any long random string; signs login sessions and the short-lived Oura OAuth state
- `SIGNUP_SECRET` — a code you pick; required to register an account (and to call the migration endpoint), so randoms can't self-register
- `USDA_FDC_API_KEY`
- `OURA_CLIENT_ID`
- `OURA_CLIENT_SECRET`
- `OURA_REDIRECT_URI` — `https://<your-vercel-domain>/api/oura/callback`, must match the redirect URI registered on the Oura OAuth app exactly

For native (iOS/Android) builds only, also set `EXPO_PUBLIC_API_BASE_URL` (e.g. `https://healthhomie.vercel.app`) so the app knows where to reach the API — web builds infer this from `window.location.origin`.

### First-time database setup

1. Add a Postgres store to the Vercel project (Storage tab → Create Database → Postgres).
2. Set `AUTH_JWT_SECRET` and `SIGNUP_SECRET` env vars, redeploy.
3. Run the schema migration once: `POST /api/admin/migrate` with header `x-migrate-secret: <SIGNUP_SECRET>`.
4. Register your account from the app's login screen using the `SIGNUP_SECRET` as the signup code.

## Legal

Privacy Policy and Terms of Service are live in the app at `/legal/privacy` and `/legal/terms` (e.g. `https://healthhomie.vercel.app/legal/privacy`), with the same text mirrored in [`docs/legal/`](docs/legal/) for offline review. These were drafted as a comprehensive starting point (GDPR, CCPA/CPRA, general health-app liability) and are not a substitute for a lawyer's review — get that review before treating them as final, especially before submitting the privacy policy URL to Oura's developer application.

## Notes

Architecture and next steps live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
