# Apple Health / Garmin sync groundwork

## Existing integration inventory

- `@kingstinct/react-native-healthkit` is already installed and configured in `app.json`, including the native plugin and Health usage descriptions.
- `lib/services/healthkit.ts` already requested read and nutrition write scopes, but `readTodayHealthSnapshot` returned only a date. It did not query samples or export nutrition.
- Oura and Fitbit already have authenticated server OAuth/sync flows, normalized `health_connections` / `health_metrics_daily` stores, and a shared `createHealthProviderClient` factory. `__tests__/fitbit.test.ts` exercises the existing Fitbit implementation; it is not a Garmin implementation and remains unchanged.
- The metrics table uses `(userId, date, provider)` as its primary key; provider is text, so adding the Garmin TypeScript discriminator needs no migration.

## What this PR implements

Settings now offers native, explicitly initiated Apple Health operations:

1. **Preview today:** queries cumulative steps and active energy plus the latest weight recorded today, in device-local calendar boundaries. Unknown data stays unknown. This preview is not uploaded to the server.
2. **Export today’s nutrition:** reads the existing authenticated food journal, computes daily calories/protein/carbs/fat, asks for write permission only on this action, and saves four HealthKit samples. Account/date/nutrient sync identifiers and increasing sync versions allow HealthKit to replace this app’s previous totals on repeat export. Other apps’ samples are not changed.
3. The adapter returns failures instead of claiming an empty stub is synced. HealthKit authorization completion cannot prove that read access was granted; the UI explains this.
4. `garminAdapter.ts` adds a bounded, pure daily-summary normalizer into the existing `HealthMetricsDaily` shape and an explicit capability declaration. It performs no network calls or writes and is not exposed as an unauthenticated ingestion endpoint. Its unit fixtures are synthetic, not captured provider responses.

## Deliberate limits

This is **manual bidirectional groundwork**, not finished automatic two-way sync. No background task, cloud HealthKit ingestion, historical backfill, sleep/workout aggregation, change observer, or deletion propagation is implemented. Sleep/workout scopes remain from the original adapter but are not queried yet. Journal edits require re-export. A four-nutrient export can partially succeed; retry the same date to replace prior app-owned samples. Device clock skew or reinstall/account ownership requires native validation before enabling unattended exports. Removing all journal entries does not clear existing HealthKit totals; remove those samples in Apple Health for now.

Do not import nutrition from Apple Health back into the journal or export third-party nutrition: that creates a sync feedback loop. Do not sum the same activity across Garmin, Oura and Apple Health. A future cloud ingest adapter should preserve provider provenance and choose an explicit provider priority, not rely on SQL row order.

## Garmin access and remaining work

The [Garmin program overview](https://developer.garmin.com/gc-developer-program/overview) currently describes Personal access and Business Starter/Enterprise access. Personal access is for one’s own account and is not a substitute for multi-user app authorization. [Health API documentation](https://developer.garmin.com/gc-developer-program/enterprise/health-api/) describes consented health-data delivery and approved integration access. The repository has no configured Garmin transport or owner-provided approved API schema.

Before enabling a Garmin Connect button:

- Owner selects the appropriate program and provisions the official app/credentials; keep secrets server-side. Do not scrape Garmin login sessions.
- Confirm the delivery schema and authorization/webhook verification protocol in that app’s official documentation. Reconcile the isolated daily-summary mapper with real consented payloads; add sleep/HR mapping only once validated.
- Reuse the existing authenticated account-linking and metrics upsert boundaries; never trust a payload-supplied local user ID. Make delivery replay-safe, record cursors, and handle revocation/backfill according to the selected program.
- Confirm supported outbound API capabilities separately. This PR does **not** claim Garmin food/macronutrient write-back exists; `nutritionWrite` is explicitly false.

## Validation and native QA

Run `npm test -- --runInBand`, `npm run typecheck`, `npm run lint`, and `npm run build:web`. Tests mock only the native HealthKit boundary and exercise real adapter calls, units, sync metadata, permission opt-in, malformed exports, denied writes, web guards, and Garmin normalization. Existing Fitbit tests must continue to pass.

Before release, use a real iPhone/custom development build (not Expo Go) to verify denied/partial permissions, local midnight/DST, repeat export replacing rather than doubling samples, partial-write retry, separate app accounts, edits/deletions, and no interference with other apps. This environment cannot execute native HealthKit or a live Garmin integration.
