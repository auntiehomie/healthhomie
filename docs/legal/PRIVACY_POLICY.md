<!-- Source of truth for this text is lib/legal/privacyPolicy.ts, which renders it live at /legal/privacy. Keep both in sync. -->

# healthhomie Privacy Policy

Effective date: 2026-07-05

This Privacy Policy explains what information healthhomie ("healthhomie," "we," "us," "our") collects, how it is used, and the rights you have over it, including specific rights under the EU/UK General Data Protection Regulation (GDPR), the California Consumer Privacy Act as amended by the California Privacy Rights Act (CCPA/CPRA), and other applicable state privacy laws.

healthhomie is developed and operated by an independent developer, not a registered company. References to "we/us/our" refer to that developer.

## Not medical advice, not HIPAA

healthhomie is not a medical device and does not provide medical advice, diagnosis, or treatment. healthhomie is not a "covered entity" or "business associate" under the U.S. Health Insurance Portability and Accountability Act (HIPAA), and information you enter is not protected health information under HIPAA. It is, however, still treated as sensitive under GDPR ("special category data") and CCPA/CPRA ("sensitive personal information"), and we handle it accordingly, as described below.

## Information we collect

### Information you provide directly
- Food journal entries, custom foods, meal logs, and serving sizes.
- Profile information: age, sex, height, current/target weight, activity level, and goal type.

### Information from connected health services (only if you choose to connect them)
- Apple HealthKit (iOS only): steps, active energy, body mass, sleep analysis, and workouts, read directly on your device through Apple's HealthKit framework. This data stays on-device; healthhomie does not transmit it to our servers.
- Oura Ring (via OAuth2, optional): if you connect an Oura account, we request access to daily activity, sleep, and readiness data through the Oura API. This is sensitive health data under GDPR and CCPA/CPRA, and connecting it is always an explicit, opt-in action you take in Settings.

### Automatically collected technical information
- Standard web server/request logs (such as IP address, browser type, and timestamps) may be recorded by our hosting provider for security and reliability purposes.

### Information relayed to nutrition data providers
- Food search terms and barcodes you submit are relayed to USDA FoodData Central and Open Food Facts, respectively, to return nutrition data. These requests do not include your profile, journal, or health data.

## How we use information

We use collected information only to:
- provide app functionality (dashboards, goal calculations, displaying connected health data you've authorized);
- maintain, secure, and troubleshoot the app.

We do not use your health or nutrition data for advertising, profiling for marketing purposes, or any purpose unrelated to providing the app's features. We do not sell your personal information.

## Where information is stored

- Local-first architecture: your food journal, meal entries, profile, and goals are stored in a local database on your own device and are not synced to any server we operate.
- Oura OAuth tokens and synced Oura daily metrics are currently stored locally on your device in that same local database, not on our servers. The OAuth token exchange briefly passes through our serverless API function (to keep the Oura client secret off your device), but is not persisted there.
- Requests to USDA FoodData Central and Open Food Facts are proxied through serverless functions that do not persist your queries after the request completes.
- healthhomie does not currently require or create a centralized account, username, or password.

## Who we share information with

- Oura Health, Inc. — only the data needed to complete the OAuth connection and fetch the daily metrics you've authorized. Review Oura's own privacy policy before connecting.
- USDA FoodData Central and Open Food Facts — only the search term or barcode needed to return a result.
- Apple — HealthKit reads/writes on iOS are governed by Apple's own platform rules, not by healthhomie.
- Our hosting/infrastructure provider, for running the web app and API routes.

We do not sell personal information, and we do not share personal information with third parties for cross-context behavioral advertising.

## Legal bases for processing (GDPR/UK GDPR)

- Consent (Article 6(1)(a), and explicit consent under Article 9(2)(a) for special category health data): connecting Oura or Apple Health is an opt-in action that constitutes your explicit consent.
- Legitimate interests (Article 6(1)(f)): for basic technical and security logging necessary to operate the app.

You may withdraw consent at any time by disconnecting a health data source in Settings. Withdrawing consent does not affect the lawfulness of processing that already occurred.

## Your rights under GDPR/UK GDPR (EU/UK/EEA residents)

You have the right to access, rectify, erase, restrict, or object to processing of your personal data, the right to data portability, and the right to withdraw consent at any time. Because most of your data lives on your own device, you can exercise access, correction, deletion, and portability rights directly in the app: view, edit, or delete entries, and disconnect Oura or Apple Health to stop future syncing and remove locally stored tokens. For anything you believe we hold outside your device, contact us using the details below. You also have the right to lodge a complaint with your local data protection supervisory authority.

## Your rights under CCPA/CPRA (California residents)

You have the right to know what personal information (including sensitive personal information) we collect and how it is used, the right to delete it, the right to correct inaccurate information, the right to opt out of the sale or sharing of personal information, the right to limit the use of sensitive personal information, and the right to be free from discrimination for exercising these rights.

We do not sell or share personal information as defined under the CCPA/CPRA, so no opt-out mechanism is legally required, but you may still contact us to confirm this or to make any other request. We do not use sensitive personal information beyond what is necessary to provide the features you've enabled.

To exercise any CCPA/CPRA right, contact us using the details below. We may take reasonable steps to verify your request before fulfilling it.

## Other US state privacy laws

A number of other states (including Virginia, Colorado, Connecticut, and Washington, whose My Health My Data Act specifically covers "consumer health data") provide similar rights. We honor requests consistent with the rights described above for any resident of a state with an applicable privacy law, including access, deletion, and correction of consumer health data. We do not sell consumer health data and do not use geofencing around health care facilities.

## Children's privacy

healthhomie is not directed at children under 13 (or the applicable minimum age in your jurisdiction) and we do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us so we can delete it.

## Data retention

On-device data persists until you delete it or uninstall the app. OAuth tokens for connected services persist locally until you disconnect the service, revoke access with the provider, or the tokens expire.

## Security

We use HTTPS/TLS for network requests, keep OAuth client secrets only in server-side environment variables (never bundled into the app), and rely on your device's own storage protections for locally held data. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.

## International data transfers

Because most of your data stays on your device, cross-border transfer exposure is minimal. Where our infrastructure or integration providers process data outside your country, they do so subject to their own applicable safeguards.

## Changes to this policy

We may update this Privacy Policy from time to time. The effective date above will change, and we will highlight material changes in the app or on this page.

## Contact us

For any privacy question or request, contact: thehomiehelps@gmail.com

---

This document is a general-purpose privacy policy drafted for an independently developed health app. It is not a substitute for advice from a licensed attorney. Given the sensitivity of health data and the applicable EU/UK GDPR, California CCPA/CPRA, and other state health-data privacy laws, professional legal review before relying on this policy is strongly recommended.
