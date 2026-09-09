import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { WeeklyDigest } from "@/lib/domain/weeklyDigest";

export function weeklyDigestHtml(digest: WeeklyDigest): string {
  return `<!doctype html><html><body style="font-family:Arial;color:#172033;padding:32px"><h1>Howdy Morning — Weekly health summary</h1><p>${digest.start} – ${digest.end}</p><h2>Nutrition</h2><p>${digest.avgCalories} kcal/day · ${digest.avgProteinG}g protein/day · ${digest.avgCarbsG}g carbs/day · ${digest.avgFatG}g fat/day</p><p>Food logged on ${digest.daysLogged} of 7 days.</p><h2>Energy & habits</h2><p>Average mood: ${digest.avgMood ?? "No data"}<br/>Water: ${digest.avgWaterGlasses} glasses/day<br/>Routine: ${digest.routinePct}% of days</p></body></html>`;
}

export async function exportWeeklySummaryPdf(
  digest: WeeklyDigest,
): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html: weeklyDigestHtml(digest),
    base64: false,
  });
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Share weekly health summary",
    });
}
