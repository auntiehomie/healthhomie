# Howdy Morning ☀️

**howdymorning.io** — your daily health, energy & scheduling companion.

Howdy Morning is an Expo (React Native) mobile-first app that merges health tracking with energy-aware scheduling:

- 🥗 **Food & Nutrition** — food journal, macro tracking, goal engine, barcode scanner
- 🌅 **Morning Routine** — mood check-in, priorities, hydration, daily affirmation
- ⚡ **Energy Scheduling** — Oura/wearable readiness → auto-schedule your optimal day
- 📓 **Notes & Journal** — Zettelkasten notes with wiki links, backlinks, and tags
- 🎯 **Goals & Streaks** — calorie/macro targets + Plan-to-Earn schedule adherence credits

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
| ⚙️ Settings | Oura/wearable connection, profile, app info |

---

## Stack

- **Expo SDK 57** + React Native + TypeScript
- **Expo Router** (file-based tabs)
- **SQLite** (local food journal + meal entries via `lib/db/database.ts`)
- **Supabase** (auth + cloud sync)
- **Oura API v2** (readiness, sleep, activity data)

---

## Setup

```bash
npm install
npx expo start
```

### Environment Variables (Vercel / EAS)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `OURA_CLIENT_ID` | Oura OAuth client ID |
| `OURA_CLIENT_SECRET` | Oura OAuth client secret |

---

## Domain

**howdymorning.io** — recommended registrar: Cloudflare Registrar or Namecheap

---

## License

MIT
