import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="color-scheme" content="light dark" />

        <title>Howdy Morning</title>
        <meta name="description" content="Your daily health, energy & scheduling companion — food logging, morning routines, notes, and insights from your own data." />

        {/* Open Graph / social share preview (iMessage, Slack, Twitter, etc.) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Howdy Morning" />
        <meta property="og:title" content="Howdy Morning" />
        <meta property="og:description" content="Your daily health, energy & scheduling companion — food logging, morning routines, notes, and insights from your own data." />
        <meta property="og:image" content="https://www.howdymornin.io/pwa-icon.png" />
        <meta property="og:url" content="https://www.howdymornin.io/" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Howdy Morning" />
        <meta name="twitter:description" content="Your daily health, energy & scheduling companion — food logging, morning routines, notes, and insights from your own data." />
        <meta name="twitter:image" content="https://www.howdymornin.io/pwa-icon.png" />

        {/* PWA: installable app metadata + update-detecting service worker (registered in components/UpdateBanner.tsx) */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#2563eb" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#3b82f6" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Howdy Morning" />

        {/* Open Graph / social embed — makes links shared to Discord, iMessage, Slack, Twitter etc. show a preview card */}
        <meta property="og:title" content="Howdy Morning — Your daily food &amp; health loop" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="675" />
        <meta property="og:description" content="The morning routine that checks you — log meals, scan barcodes, track your energy, and build habits that actually stick. howdymornin.io" />
        <meta property="og:image" content="https://howdymornin.io/og-image.jpg" />
        <meta property="og:url" content="https://howdymornin.io" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Howdy Morning" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Howdy Morning — Your daily food &amp; health loop" />
        <meta name="twitter:description" content="The morning routine that checks you — log meals, scan barcodes, track your energy, and build habits that actually stick. howdymornin.io" />
        <meta name="twitter:image" content="https://howdymornin.io/og-image.jpg" />
        <meta name="description" content="The morning routine that checks you — log meals, scan barcodes, track your energy, and build habits that actually stick. howdymornin.io" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #f8fafc;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #020617;
  }
}`;
