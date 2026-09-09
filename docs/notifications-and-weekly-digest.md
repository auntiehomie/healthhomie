# Notifications and weekly review delivery

## What is implemented

- `lib/services/notifications.ts` requests notification permission, creates the Android channel, stores an Expo push token, and schedules a **device-local daily reminder at 07:00 in the device's local timezone**.
- `lib/domain/weeklyDigest.ts` compiles seven days of meal, nutrition, mood, hydration, and routine data and renders a small HTML email template.
- `lib/services/weeklySummaryPdf.ts` uses `expo-print` (rather than `react-native-pdf`) to create and share a PDF summary.

The local reminder is useful immediately, but it is not a server push. The app must be rebuilt as a native EAS build; Expo Go cannot validate all notification behavior.

## Amanda: Firebase / Expo setup

1. Create or select the production Firebase project.
2. Register iOS bundle ID `io.howdymorning.app` and Android package `io.howdymorning.app`.
3. Download `GoogleService-Info.plist` and `google-services.json`; keep them out of git and add their paths to an EAS secret/file variable (or configure them in `app.config.js`).
4. Create an EAS project and set `extra.eas.projectId` in the Expo config. Run `eas credentials` to create/upload APNs credentials and Android FCM credentials.
5. Configure the server to send to the stored Expo token (Expo Push Service) or migrate the token registration endpoint to native FCM tokens. Never put Firebase server keys in the app.
6. Add a token registration API and persist one token per user/device. Remove tokens on logout and handle token rotation.
7. Add a server scheduler (Vercel Cron/worker) for the weekly digest. It should load each user's prior seven days, call `compileWeeklyDigest`, and send `weeklyDigestEmailHtml` through the existing Resend adapter. Required environment: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and a verified sender/domain. SMTP can be used instead, but must remain server-side.
8. Add notification preference/timezone fields to the user profile if users should be able to opt out or choose another time.

## Domain / deep links

`app.json` includes `howdymornin.io` prefixes, iOS Universal Links (`applinks:howdymornin.io`), and Android App Links. Deploy:

- `https://howdymornin.io/.well-known/apple-app-site-association` with `appID: <TEAM_ID>.io.howdymorning.app` and paths such as `/*`.
- `https://howdymornin.io/.well-known/assetlinks.json` with the release SHA-256 signing certificate fingerprint and package `io.howdymorning.app`.

The domain registration itself remains a manual task.
