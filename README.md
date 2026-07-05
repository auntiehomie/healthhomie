# healthhomie

Health tracking at a multi-dimensional level: daily food journal, calorie/macro tracking, Apple Health context, and adaptive goals.

## MVP

- Expo React Native app with TypeScript
- Local-first SQLite food journal
- Today dashboard for calories/macros
- Goal engine for calories/protein/carbs/fat
- Apple HealthKit permission boundary
- USDA FoodData Central + Open Food Facts API route scaffolds

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

- `USDA_FDC_API_KEY`
- `OURA_CLIENT_ID`
- `OURA_CLIENT_SECRET`
- `OURA_REDIRECT_URI` — `https://<your-vercel-domain>/api/oura/callback`, must match the redirect URI registered on the Oura OAuth app exactly

For native (iOS/Android) builds only, also set `EXPO_PUBLIC_API_BASE_URL` (e.g. `https://healthhomie.vercel.app`) so the app knows where to reach the Oura API routes — web builds infer this from `window.location.origin`.

## Legal

Privacy Policy and Terms of Service are live in the app at `/legal/privacy` and `/legal/terms` (e.g. `https://healthhomie.vercel.app/legal/privacy`), with the same text mirrored in [`docs/legal/`](docs/legal/) for offline review. These were drafted as a comprehensive starting point (GDPR, CCPA/CPRA, general health-app liability) and are not a substitute for a lawyer's review — get that review before treating them as final, especially before submitting the privacy policy URL to Oura's developer application.

## Notes

Architecture and next steps live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
