import { sendEmail, EmailNotConfiguredError } from './email';

function buildWelcomeEmailHtml(appUrl: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
      <h1 style="font-size: 22px;">Howdy Mornin' 🌞</h1>
      <p>Your Howdy Morning account is ready. A few tips to get the most out of it:</p>

      <h2 style="font-size: 16px; margin-top: 20px;">🍽️ Logging food</h2>
      <p style="margin: 4px 0;">Scan a barcode or search once, then star it as a <strong>Quick add</strong> so you're not re-scanning the same things every day. After a few logs, the Journal starts <strong>suggesting foods</strong> for the time of day on its own, learned from your own history.</p>

      <h2 style="font-size: 16px; margin-top: 20px;">✅ Morning routine</h2>
      <p style="margin: 4px 0;">Add your routine once on the Home tab — it carries over every day, and checks off separately per day. Finish it all and the card collapses into a quick "nice work" instead of sticking around.</p>

      <h2 style="font-size: 16px; margin-top: 20px;">📝 Notes</h2>
      <p style="margin: 4px 0;">Link related notes with <code>[[Note Title]]</code> — it'll offer to create the note if it doesn't exist yet, and shows backlinks so you can find your way back.</p>

      <h2 style="font-size: 16px; margin-top: 20px;">📊 Patterns</h2>
      <p style="margin: 4px 0;">Once you've logged for a couple of weeks, the Health page starts surfacing patterns in your own data — like how your mood compares on days you hit your protein target versus days you don't.</p>

      <p style="margin-top: 24px;"><a href="${appUrl}" style="background: #2563eb; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open Howdy Morning →</a></p>
    </div>
  `;
}

/** Best-effort welcome email fired after a successful registration - failures are logged, never
 * thrown, since a flaky email provider shouldn't be able to break account creation. */
export async function sendWelcomeEmail(to: string, appUrl: string): Promise<void> {
  try {
    await sendEmail({
      to,
      subject: "Welcome to Howdy Morning — a few tips to get started",
      html: buildWelcomeEmailHtml(appUrl),
    });
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) return; // Resend not set up yet - fine, just skip
    console.error('Failed to send welcome email:', error);
  }
}
