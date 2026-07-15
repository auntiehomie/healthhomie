# homie — your daily health + energy + notes companion

**homie** is an Expo (React Native) mobile-first app merging two ideas into one:
- 🥗 **healthhomie** — food journal, macro tracking, goal engine, barcode scanner
- 🌅 **howdy-morning** — morning check-ins, energy-aware scheduling, Zettelkasten notes

Built for iOS (and web). Runs on Expo SDK 57.

---

## Tabs

| Tab | What it does |
|---|---|
| 🌅 Morning | Mood check-in, top 3 priorities, hydration tracker, morning routine, daily affirmation |
| 🏠 Today | Calories left, macro rings (protein/carbs/fat), Apple Health steps + active kcal |
| ⚡ Energy | Oura readiness/sleep/activity scores, energy curve by time block, smart schedule, hobby suggestions, cycle phase overlay |
| 📓 Journal | Food search (USDA), log meals by type, daily totals, delete entries |
| 📝 Notes | Zettelkasten-style notes with IDs, tags, [[wiki links]], backlinks, search |
| 🎯 Goals | Goal type (lose/maintain/gain/consistency), calorie + macro targets, weekly adjustment insight |
| 📷 Scan | Barcode scanner → Open Food Facts lookup |
| ⚙️ Settings | Oura connection, profile, app info |

---

## Stack

- **Expo SDK 57** + React Native + TypeScript
- **Expo Router** (file-based tabs)
- **SQLite** (local food journal + meal entries via `lib/db/database.ts`)
- **AsyncStorage** (morning check-in, notes persistence)
- **Neon DB** (server-side auth + Oura token store via Vercel API routes)
- **Oura API V2** (readiness, sleep, activity, cycle data)
- **USDA FDC API** + **Open Food Facts** (nutrition search + barcode lookup)
- **HealthKit** adapter (iOS only, graceful fallback on web/Android)
- **lucide-react-native** icons

---

## Getting started

```bash
npm install
npm start          # Expo dev server
npm run ios        # iOS simulator
npm run web        # Web browser
npm run typecheck  # TypeScript check
```

### Environment variables (Vercel)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Auth token signing |
| `OURA_CLIENT_ID` | Oura OAuth app ID |
| `OURA_CLIENT_SECRET` | Oura OAuth secret |
| `USDA_FDC_API_KEY` | USDA FoodData Central key (free at fdc.nal.usda.gov) |

---

## Architecture

```
app/
  (tabs)/
    morning.tsx    ← mood, priorities, hydration, routine, affirmations
    index.tsx      ← today's macro ring + metric cards
    energy.tsx     ← Oura energy map, smart schedule, hobby suggestions
    journal.tsx    ← food logging, USDA search
    notes.tsx      ← Zettelkasten notes with backlinks
    goals.tsx      ← goal type + calorie/macro targets
    scan.tsx       ← barcode → Open Food Facts
    settings.tsx   ← Oura connection, profile
api/
  oura/            ← OAuth + sync Vercel endpoints
  nutrition/       ← USDA search
  data/            ← meal entries, foods, profile
lib/
  db/database.ts   ← SQLite local data layer
  services/        ← ouraClient, nutritionApi, healthkit
  domain/          ← goals, nutrition calculation logic
```

---

## Roadmap

- [ ] USDA FDC API key connected (currently stubbed)
- [ ] iOS TestFlight build via Expo EAS
- [ ] Apple Watch complications (energy + water tracker)
- [ ] Howdy-style web companion PWA
- [ ] Google/Apple social login
- [ ] Calendar sync (Google Cal, Apple Cal)
- [ ] Plan-to-earn: reward schedule-following behavior
