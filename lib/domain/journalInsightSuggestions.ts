import type { JournalInsight } from './weeklyJournalInsights';

export type JournalInsightSuggestion = {
  action: string;
  evidenceTag: 'Personal pattern · observational';
};

/** Presentation only: use the engine's surfaced comparisons, never infer new correlations. */
export function journalInsightSuggestion(insight: JournalInsight): JournalInsightSuggestion {
  const evidenceTag = 'Personal pattern · observational' as const;
  if ((insight.id === 'late-sleepScore' || insight.id === 'late-readinessScore') && insight.delta < 0) {
    return {
      evidenceTag,
      action: 'If it fits your schedule, try your evening meal 30–60 minutes earlier for a few days, without skipping food. Keep logging meal times and compare next-day scores in your next weekly report. This is an experiment, not a promised improvement.',
    };
  }
  if ((insight.id === 'protein-sleepScore' || insight.id === 'protein-readinessScore') && insight.delta > 0) {
    return {
      evidenceTag,
      action: 'Plan a protein-containing food you enjoy in tomorrow’s meals to help meet your existing protein target, if that target is appropriate for you. Keep logging portions and compare next-day scores in your next weekly report; there is no need to raise your target based on this pattern.',
    };
  }
  return {
    evidenceTag,
    action: 'Keep your usual routine for now. For the next few days, log meal times and note changes in bedtime, activity, or stress; review the next weekly report before deciding what to change. A pattern alone does not show what caused it.',
  };
}
