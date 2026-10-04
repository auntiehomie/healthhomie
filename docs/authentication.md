# Account registration, recovery, and support

## What this change enables

The Expo web app uses Clerk when `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is configured. `/login` and `/register` render Clerk's prebuilt UI, including email verification, password recovery, and social providers enabled in the Clerk dashboard. `/forgot-password` then opens the Clerk sign-in screen, where recovery is available. Support remains accessible without a session at `/support`, using the contact already present in the app's terms: thehomiehelps@gmail.com.

Native Expo builds retain the legacy login for now. After an account is linked to Clerk, legacy password login and legacy password reset for it are disabled. Do not roll this out to native users until a Clerk Expo sign-in flow has been added, or direct them to the web app. No native Clerk flow is claimed by this change.

## Required deployment setup

1. Create a dedicated HealthHomie / Howdy Morning application at https://dashboard.clerk.com/. Start on the free plan; do not buy a plan or reuse a different project's production instance.
2. Enable email sign-up with email verification and passwords, including password recovery. Enable Google and any other desired social connections (Apple and others may require their own developer credentials). Enable account linking only using verified emails. Set Home URL and redirect allowlist to the actual production domain. Use production keys and complete Clerk's domain/DNS setup for production.
3. Before deploying code that reads `clerkUserId`, run these additive statements in the existing Neon database (also included in the repository schema migration):

   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS "clerkUserId" TEXT;
   CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_id_idx ON users("clerkUserId");
   ```

4. Add to the HealthHomie Vercel project and local development environment:
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key (safe to expose).
   - `CLERK_SECRET_KEY`: Clerk server secret, never prefixed with `EXPO_PUBLIC_`.
   - `APP_ORIGIN`: canonical origin such as `https://howdymornin.io`, without a trailing slash. For preview testing use that preview's origin and the corresponding allowed Clerk redirect. The server restricts token authorized parties to this exact origin.
   - Keep `AUTH_JWT_SECRET` and `DATABASE_URL` / `POSTGRES_URL`.
5. Redeploy because Expo inlines public environment variables at build time. Test with a fresh browser and an existing account.

As of the 2026-10-04 investigation, the project's Vercel environment names included `RESEND_API_KEY`, but no Clerk keys, `APP_ORIGIN`, or `RESEND_FROM_EMAIL`. The supplied screenshot showed a Resend test-recipient restriction. Live email/social recovery cannot be verified until the above setup is complete.

## Recovering an existing legacy account without its password

Register with Clerk using the exact same account email, and complete Clerk's verification, or use a social provider that verifies the same primary email. The server verifies the Clerk session (not a client-provided email), fetches the primary verified email from Clerk, and atomically links it to the existing local user. The local user ID, owner flag, and health-data foreign keys are retained. It refuses to relink an email owned by a different Clerk identity. Future sessions resolve by immutable Clerk ID, so changing email in Clerk will not select someone else's health records. The app's stored contact email remains the original email; use that original email for existing delete-account confirmation.

A legacy user is not automatically a Clerk user before registration. “Forgot password” in Clerk works after the Clerk account exists. Do not delete the old local user or create another app profile to recover access.

## Session boundaries and remaining work

Clerk session tokens are exchanged for five-minute app bearer tokens to remain compatible with existing synchronous API guards. These tokens live only in memory, are refreshed after four minutes while signed in, and are not written to localStorage. Requests are deduplicated per mounted session. Sign-out clears the in-memory cache and signs out from Clerk. Revocation of an already-issued app token may lag by at most five minutes. Existing 365-day legacy tokens remain an outstanding security backlog item; this PR does not revoke previously issued sessions or replace every API guard with direct Clerk authentication.

New Clerk registrations are public (controlled by Clerk instance settings), unlike legacy invite-code registration. New users are never granted owner access. Existing owners retain their original role upon verified linking. Legacy invitation generation remains for native/legacy registration only.

Account deletion in app Settings deletes app health records. This first integration does not delete the separate Clerk identity or consume Clerk user-deletion webhooks; closing a Clerk identity is not a substitute for deleting app data. Use app Settings for data deletion. Add provider lifecycle/webhook handling before exposing provider account deletion UI.

## Legacy Resend configuration

If retaining legacy/native password reset, verify a sending domain at https://resend.com/domains and set `RESEND_FROM_EMAIL` to a sender on that domain. `onboarding@resend.dev` can only send test messages to the Resend owner's email. `APP_ORIGIN` supplies the reset URL instead of trusting forwarded host headers. The API rejects missing/test sender configuration before looking up an account, and provider failures return a support message without provider payloads or account addresses.

## Release checks

- Existing email registration + verification preserves the original health data and owner flag.
- Fresh email registration requires verification and grants no owner role.
- Google sign-in links only to the matching verified email.
- Clerk password recovery delivers a code and allows a new password.
- Sign-out and reload require Clerk sign-in, with no fallback to an old localStorage token.
- Public support works while signed out.
- Repeat the checks on Android Chrome and iPhone Safari.
- Run typecheck, lint, unit tests, and web export. Real delivery/OAuth require configured credentials and live manual verification.
