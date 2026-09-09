# App Store / TestFlight metadata

The editable metadata source is [`assets/app-store/metadata.json`](../assets/app-store/metadata.json). It includes the app description, keywords, URLs, TestFlight beta copy, Firebase App Distribution release notes, and the bundle identifiers.

## Screenshot checklist

Capture real, current builds (no simulated device chrome or misleading health claims) in portrait:

- iPhone 6.7-inch: 1290 × 2796 px (required for current App Store Connect submissions).
- iPhone 6.5-inch: 1284 × 2778 px (recommended compatibility set).
- Android phone: at least 1080 × 1920 px; include a 16:9 or 9:16 set appropriate to the release track.

Recommended sequence: Today/home check-in, Journal with meal entry, barcode scanner, weekly review, and Goals. Redact personal data and use seeded test data. Store source captures under `screenshots/` (not generated placeholders), then upload through App Store Connect and Firebase App Distribution. Keep privacy and support URLs reachable over HTTPS before submission.

## TestFlight review notes

Use a test account and explain that health integrations are optional. Do not ask reviewers to enter real medical information. Verify account creation, journal entry, scanner permission, notification permission, deep links, and weekly summary PDF export on a physical device.
