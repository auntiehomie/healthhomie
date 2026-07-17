# Howdy Morning ☀️

**howdymornin.io** — your daily health, energy & scheduling companion.

Howdy Morning is an Expo (React Native) mobile-first app that merges health tracking with energy-aware scheduling:

- 🥗 **Food & Nutrition** — food journal, macro tracking, goal engine, barcode scanner
- 🌅 **Morning Routine** — mood check-in, priorities, hydration, daily affirmation
- ⚡ **Energy Scheduling** — Oura readiness → auto-schedule your optimal day
- 📓 **Notes & Journal** — Zettelkasten notes with wiki links, backlinks, and tags
- 🎯 **Goals & Streaks** — calorie/macro targets + weekly adjustment insight

Built for iOS, Android, and web. Runs on Expo SDK 57. The web build is installable as a PWA with light/dark mode and an in-app update banner — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Tabs

| Tab | What it does |
|---|---|
| 🌅 Morning | Mood check-in, top 3 priorities, hydration tracker, morning routine, daily affirmation |
| 🏠 Today | Calories left, macro rings (protein/carbs/fat), Apple Health steps + active kcal |
| ⚡ Energy | Oura readiness/sleep/activity scores, energy curve by time block, smart schedule, hobby suggestions |
| 📓 Journal | Food search (USDA), log meals by type, daily totals, delete entries |
| 📝 Notes | Zettelkasten-style notes with IDs, tags, [[wiki links]], backlinks, search |
| 🎯 Goals | Goal type (lose/maintain/gain/consistency), calorie + macro targets, weekly adjustment insight |
| 📷 Scan | Barcode scanner → Open Food Facts lookup |
| ⚙️ Settings | Account (logout), Apple Health permission, Oura connect/sync, legal links |

---

## Stack

- **Expo SDK 57** + React Native + TypeScript
- **Expo Router** (file-based tabs)
- **Postgres** (Vercel Storage → Neon) as the single source of truth for the account's food journal, profile, goals, and Oura connection — the same data syncs across web, iOS, and Android. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full data flow.
- **Email/password accounts** gated by a per-person invite code (or the owner's bootstrap secret), JWT sessions (`jsonwebtoken` + `bcryptjs`) — no third-party auth provider
- **Resend** for password-reset emails
- **Oura API v2** (readiness, sleep, activity data), tokens stored server-side per account, never on-device
- Morning and Notes tabs currently persist locally on-device via `AsyncStorage`, separate from the account-synced Postgres data used by Today/Journal/Goals/Energy
- Light/dark theme (`lib/theme/`) with a Settings toggle, and a PWA service worker on web that prompts to refresh when a new version ships

---

## Setup

```bash
npm install
npx expo start
```

### Environment Variables (Vercel)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` (or `POSTGRES_URL`) | Auto-set when you add a Postgres store in the Vercel dashboard (Storage → Create Database → Postgres) |
| `AUTH_JWT_SECRET` | Signs login sessions and the short-lived Oura OAuth state token |
| `SIGNUP_SECRET` | Bootstrap secret for your own account(s) only — never share it |
| `ADMIN_SECRET` | Recommended — separate credential for `/api/admin/migrate` (falls back to `SIGNUP_SECRET` if unset) |
| `USDA_FDC_API_KEY` | USDA FoodData Central search |
| `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` / `OURA_REDIRECT_URI` | Oura OAuth2 app credentials |
| `RESEND_API_KEY` | Sends password-reset emails via [Resend](https://resend.com) |
| `RESEND_FROM_EMAIL` | Optional — e.g. `Howdy Morning <noreply@howdymornin.io>` once the domain is verified in Resend; defaults to Resend's unverified sandbox sender |
| `EXPO_PUBLIC_API_BASE_URL` | Native builds only — points the app at the deployed API (web infers this from the browser origin) |

### First-time database setup

1. Add a Postgres store to the Vercel project (Storage tab → Create Database → Postgres).
2. Set `AUTH_JWT_SECRET`, `SIGNUP_SECRET`, and `ADMIN_SECRET`, redeploy.
3. Run the schema migration once: `GET /api/admin/migrate?secret=<ADMIN_SECRET>` (or `POST` with an `x-migrate-secret` header).
4. Register your own account from the app's login screen using `SIGNUP_SECRET` as the invite code.
5. For friends: generate a one-time invite code from Settings → Invite friends, and send it to them directly — don't reuse `SIGNUP_SECRET` for this.

### Password reset

Set `RESEND_API_KEY` (and `RESEND_FROM_EMAIL` once `howdymornin.io` is verified in your [Resend](https://resend.com) account) to enable "Forgot password?" on the login screen. Without a `RESEND_API_KEY`, the forgot-password request returns a 503 instead of silently failing.

---

## Legal

Privacy Policy and Terms of Service are live in the app at `/legal/privacy` and `/legal/terms`, mirrored in [`docs/legal/`](docs/legal/) for offline review.

---

## Domain

**howdymornin.io**

---

## License

MIT
