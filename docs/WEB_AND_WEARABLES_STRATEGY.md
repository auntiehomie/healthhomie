# Web app + wearable health data strategy

healthhomie should work as both:

1. a universal Expo web app for food journaling, goals, dashboards, and account settings; and
2. an iOS app with native Apple HealthKit access.

The key architecture change: **Apple Health is not a web data source.** HealthKit is native iOS-only. For web, healthhomie needs cloud/API-based wearable integrations such as Oura, Garmin, Fitbit, Withings, Whoop, or a unified wearable API.

## Recommendation

Build the web app now, but treat health data as provider-agnostic.

Recommended order:

1. Make the current Expo app export/deploy cleanly as a web app.
2. Add a normalized `health_connections` + `health_metrics_daily` data model.
3. Add Oura as the first cloud wearable integration.
4. Keep Apple HealthKit as the native iOS adapter.
5. Delay paid unified APIs until direct integrations become too expensive to maintain.

## Why Oura first

Oura is a strong first non-Apple data source because it has:

- an official API;
- OAuth2 applications for multi-user integrations;
- Personal Access Tokens for developer/self testing;
- useful daily wellness signals: sleep, readiness, activity, heart rate, HRV, workouts, SpO2, sessions, tags;
- good fit for a goal-adjustment app, because recovery/sleep/activity can explain calorie adherence and weight trend noise.

Important Oura constraints:

- Oura requires an Oura account and API application.
- Oura API V2 is the current API; V1 was removed January 22, 2024.
- Gen3 and Oura Ring 4 users need active Oura Membership for API access.
- OAuth apps have a default ten-user limit until Oura approves wider release.
- Client secret must live only on the server/Vercel env vars, never in the app bundle.

## Data source model

Do **not** make screens depend directly on Apple Health, Oura, or any one provider. Normalize into daily metrics.

Suggested tables/entities:

### `health_connections`

- `id`
- `provider`: `apple-health | oura | manual | garmin | fitbit | withings | whoop | terra | open-wearables`
- `providerUserId`
- `status`: `connected | expired | revoked | error`
- `scopes`
- `accessTokenEncrypted` / server-side token reference only
- `refreshTokenEncrypted` / server-side token reference only
- `expiresAt`
- `lastSyncedAt`
- `createdAt`
- `updatedAt`

For local-only iOS Apple Health, this can be a local row without cloud tokens.

### `health_metrics_daily`

- `date`
- `provider`
- `steps`
- `activeEnergyKcal`
- `totalEnergyKcal`
- `weightKg`
- `sleepMinutes`
- `sleepScore`
- `readinessScore`
- `restingHeartRate`
- `hrvMs`
- `spo2Pct`
- `workouts`
- `rawJsonRef` optional
- `createdAt`
- `updatedAt`

Goal engine should read this normalized table, not provider APIs.

## Web app deployment

Expo Router supports web exports. For healthhomie:

- Current app can be a universal Expo app.
- Web food journal and goals should work without HealthKit.
- Native-only features need platform guards.
- For Vercel API routes, keep server code under `api/`.
- Static Expo web output does not include Expo Router API routes, but Vercel root `api/` routes are fine.

Recommended Vercel config later:

- Build command: `npm run build:web`
- Output directory: `dist`
- Add script: `"build:web": "expo export -p web"`
- Env vars:
  - `USDA_FDC_API_KEY`
  - `OURA_CLIENT_ID`
  - `OURA_CLIENT_SECRET`
  - `OURA_REDIRECT_URI`
  - database URL / token storage secret when cloud sync is added

## Oura integration shape

Add server routes:

- `GET /api/oura/connect` — redirect user to Oura OAuth consent.
- `GET /api/oura/callback` — exchange code for access/refresh token.
- `POST /api/oura/sync` — fetch recent daily metrics for the connected user.
- `GET /api/oura/daily?start=YYYY-MM-DD&end=YYYY-MM-DD` — return normalized metrics.

Minimum Oura scopes to research/confirm before implementation:

- `personal`
- `daily`
- `heartrate`
- `workout`
- possibly `spo2`, `session`, `tag` later

Initial sync target:

- daily activity
- daily sleep
- daily readiness
- workouts
- heart rate/HRV summaries where available

## Provider comparison

### Direct provider APIs

Best for early cost control. Build only what healthhomie needs.

- **Oura**: good first choice for sleep/readiness/recovery. OAuth app limit applies.
- **Fitbit**: useful cloud API, but Google ecosystem policies/approval may add friction.
- **Garmin**: valuable fitness data, but developer access can be more partnership-oriented.
- **Withings**: strong weight/body composition devices; useful if weight tracking becomes central.
- **Whoop**: recovery/strain/sleep, likely useful later if users ask.

### Native platform APIs

- **Apple HealthKit**: best for iOS; no web access. Already scaffolded.
- **Android Health Connect**: best for Android; native Android only. Google Fit APIs are being deprecated/replaced by Health Connect.

### Unified wearable APIs

Good later, not first, unless direct provider work gets too slow.

- **Terra API**: unified API for 500+ sources including Oura, Garmin, Fitbit, Apple Health, Google Fit. Convenient but likely paid/enterprise-oriented.
- **Open Wearables**: open-source/self-hosted unified wearable platform. Promising for cost control and data ownership, but adds infrastructure complexity.

Recommendation: start direct with Oura, keep the model compatible with a future `terra` or `open-wearables` provider.

## Product implications

Web app features available immediately:

- food journal
- calorie/macro dashboard
- manual health metrics
- goals and weekly check-ins
- Oura-connected sleep/readiness/activity once OAuth is built

Native iOS-only extras:

- Apple Health read/write
- local device health permissions
- background/native health sync behavior

The app should show source-aware UI:

- `Apple Health connected on iPhone`
- `Oura connected for web + mobile`
- `Manual metrics only`

## Immediate engineering next steps

1. Add `build:web` script and Vercel config.
2. Fix/verify Expo web export in CI/local.
3. Add normalized health connection/metric types and SQLite schema.
4. Add Oura provider service with OAuth route scaffolds.
5. Add Settings UI card for Oura connection.
6. Add web-safe fallback dashboard that shows Oura/manual metrics when HealthKit is unavailable.
7. Add cloud persistence decision before real OAuth token storage:
   - cheapest dev option: Vercel KV/Postgres free tier if available;
   - alternative: Supabase free tier;
   - avoid storing tokens in local app storage for web OAuth.

## Open questions

- Does Amanda personally have/want an Oura Ring for first-party testing?
- Should web login be required now, or can web remain local-only until Oura OAuth is implemented?
- Which cloud datastore should hold OAuth tokens and synced daily metrics?
- Do we want to support manual weight/sleep/activity entry before Oura?
