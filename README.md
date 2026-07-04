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

## Notes

Architecture and next steps live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
