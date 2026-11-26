import { afterEach, expect, jest, test } from '@jest/globals';
import React from 'react';
import { WeeklyJournalInsights } from '../components/health/WeeklyJournalInsights';
import { weeklyJournalInsights } from '../lib/domain/weeklyJournalInsights';
import type { MealEntry } from '../types/healthhomie';
import { journalInsightSuggestion } from '../lib/domain/journalInsightSuggestions';

const { renderToStaticMarkup } = jest.requireActual<{ renderToStaticMarkup: (element: React.ReactNode) => string }>('react-dom/server');
jest.mock('react-native', () => ({ Text: 'span', View: 'div' }));
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../lib/db/database', () => ({}));
jest.mock('../lib/db/notesStorage', () => ({}));
jest.mock('../lib/services/healthMetricsClient', () => ({}));
jest.mock('../lib/theme/ThemeContext', () => ({ useTheme: () => ({ colors: {} }) }));
afterEach(() => { jest.restoreAllMocks(); });

function renderReport(report: ReturnType<typeof weeklyJournalInsights>) {
  jest.spyOn(React, 'useState').mockReturnValueOnce([report, jest.fn()] as ReturnType<typeof React.useState>).mockReturnValueOnce([false, jest.fn()]);
  return renderToStaticMarkup(React.createElement(WeeklyJournalInsights));
}

test('a surfaced late-meal readiness correlation includes an evidence-tagged next action', () => {
  const entries = Array.from({ length: 12 }, (_, i) => ({ id: String(i), foodItemId: 'food', date: `2026-11-${String(i + 1).padStart(2, '0')}`, hour: i < 6 ? 22 : 18, servings: 1, mealType: 'dinner', createdAt: '' } as MealEntry));
  const metrics = entries.map((entry, i) => ({ date: `2026-11-${String(i + 2).padStart(2, '0')}`, readinessScore: i < 6 ? 60 : 90 }));
  const report = weeklyJournalInsights({ today: '2026-11-25', entries, nutrition: [], notes: [], metrics, proteinTargetG: 100 });
  const html = renderReport(report);
  expect(html).toContain('30 points lower');
  expect(html).toContain('What to try next');
  expect(html).toContain('30–60 minutes earlier');
  expect(html).toContain('Personal pattern · observational');
  expect(html).toContain('6 vs 6 logged days');
  expect(html).toContain('Patterns, not causes or medical advice');
});

test('a positive protein pattern suggests planning toward the existing target, not raising it', () => {
  const html = renderReport({ start: '2026-10-26', end: '2026-11-22', insights: [{ id: 'protein-sleepScore', text: 'Protein pattern', exposedDays: 5, comparisonDays: 4, delta: 8 }] });
  expect(html).toContain('Plan a protein-containing food');
  expect(html).toContain('existing protein target');
  expect(html).toContain('Personal pattern · observational');
});

test.each(['sleepScore', 'readinessScore'])('templates respect the direction of %s comparisons', outcome => {
  const base = { text: 'Pattern', exposedDays: 5, comparisonDays: 4 };
  expect(journalInsightSuggestion({ ...base, id: `late-${outcome}`, delta: -8 }).action).toContain('30–60 minutes earlier');
  expect(journalInsightSuggestion({ ...base, id: `protein-${outcome}`, delta: 8 }).action).toContain('Plan a protein-containing food');
  for (const [id, delta] of [[`late-${outcome}`, 8], [`protein-${outcome}`, -8], [`alcohol-${outcome}`, 8], [`alcohol-${outcome}`, -8], ['unknown-future-pattern', -8]] as const) {
    const insight = Object.freeze({ ...base, id, delta });
    const suggestion = journalInsightSuggestion(insight);
    expect(suggestion.action).toContain('note changes in bedtime, activity, or stress');
    expect(suggestion.evidenceTag).toBe('Personal pattern · observational');
    expect(insight.delta).toBe(delta);
  }
});

test('no comparison means no suggestion, preserving the insufficient-evidence message', () => {
  const html = renderReport(weeklyJournalInsights({ today: '2026-11-25', entries: [], nutrition: [], notes: [], metrics: [], proteinTargetG: 100 }));
  expect(html).not.toContain('What to try next');
  expect(html).toContain('Not enough comparable data yet');
});
