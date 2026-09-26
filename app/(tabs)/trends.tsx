import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { Skeleton } from '@/components/ui/Skeleton';
import { getUserProfile, listFoodItems, listMealEntries, getWeightHistory, listExercisesByDateRange } from '@/lib/db/database';
import { calculateDailyGoal } from '@/lib/domain/goals';
import { summarizeDay, shiftDateKey, todayKey } from '@/lib/domain/nutrition';
import { getHealthMetricsHistory, type HealthMetricsHistoryDay } from '@/lib/services/healthMetricsClient';
import { getDailyProductivityLogs } from '@/lib/db/dailyLogStorage';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { cardShadow } from '@/lib/theme/shadow';
import type { DailyNutritionSummary, ExerciseEntry, WeightLog } from '@/types/healthhomie';

type TimeRange = 7 | 30 | 90;
const TIME_RANGES: TimeRange[] = [7, 30, 90];

const CHART_HEIGHT = 160;
const CHART_PADDING = { top: 16, right: 16, bottom: 32, left: 16 };

// ── Simple SVG line chart ─────────────────────────────────────────────────────
function SimpleLineChart({
  data,
  color,
  targetValue,
  targetLabel,
  yLabel,
  width,
  height = CHART_HEIGHT,
  yMin,
  emptyMessage,
}: {
  data: { label: string; value: number | null }[];
  color: string;
  targetValue?: number;
  targetLabel?: string;
  yLabel?: string;
  width: number;
  height?: number;
  yMin?: number;
  emptyMessage?: string;
}) {
  const { colors } = useTheme();

  const { plotW, plotH, plotX, plotY } = useMemo(() => {
    const pad = CHART_PADDING;
    return {
      plotW: width - (pad.left + pad.right),
      plotH: height - (pad.top + pad.bottom),
      plotX: pad.left,
      plotY: pad.top,
    };
  }, [width, height]);

  const validPoints = useMemo(() => data.filter((d) => d.value != null), [data]);
  const values = useMemo(() => validPoints.map((d) => d.value!), [validPoints]);

  const { dataMin, dataMax, linePath } = useMemo(() => {
    if (validPoints.length === 0) return { dataMin: 0, dataMax: 0, linePath: '' };
    const min = yMin ?? Math.min(...values);
    const allVals = targetValue != null ? [...values, targetValue] : values;
    const max = Math.max(...allVals);
    const range = max - min || 1;
    const stepX = validPoints.length > 1 ? plotW / (validPoints.length - 1) : 0;

    let path = '';
    validPoints.forEach((d, i) => {
      const x = plotX + i * stepX;
      const y = plotY + plotH - ((d.value! - min) / range) * plotH;
      path += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });

    return { dataMin: min, dataMax: max, linePath: path };
  }, [validPoints, values, plotW, plotH, plotX, plotY, targetValue, yMin]);

  const targetY = useMemo(() => {
    if (targetValue == null || validPoints.length === 0) return null;
    const range = dataMax - dataMin || 1;
    return plotY + plotH - ((targetValue - dataMin) / range) * plotH;
  }, [targetValue, dataMin, dataMax, plotY, plotH, validPoints]);

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = plotY + plotH * (1 - pct);
          const _yLabel = dataMin + (dataMax - dataMin) * pct;
          void _yLabel;
          return (
            <View key={pct}>
              <Line x1={plotX} y1={y} x2={plotX + plotW} y2={y} stroke={colors.border} strokeWidth={0.5} />
            </View>
          );
        }).reduce<React.ReactNode[]>((acc, el) => { acc.push(el); return acc; }, [])}

        {/* Target line */}
        {targetY != null && (
          <Line
            x1={plotX}
            y1={targetY}
            x2={plotX + plotW}
            y2={targetY}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="6,4"
            opacity={0.5}
          />
        )}

        {/* Data line */}
        {linePath ? (
          <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}

        {/* Data dots */}
        {validPoints.map((d, i) => {
          if (validPoints.length <= 1) return null;
          const stepX = plotW / (validPoints.length - 1);
          const x = plotX + i * stepX;
          const y = plotY + plotH - ((d.value! - dataMin) / (dataMax - dataMin || 1)) * plotH;
          return <Circle key={i} cx={x} cy={y} r={3} fill={color} />;
        })}

        {/* X-axis labels */}
        {validPoints.map((d, i) => {
          if (validPoints.length <= 1) return null;
          const stepX = plotW / (validPoints.length - 1);
          const x = plotX + i * stepX;
          // Show every Nth label to avoid overlap
          const showLabel = validPoints.length <= 10 || i % Math.ceil(validPoints.length / 7) === 0 || i === validPoints.length - 1;
          if (!showLabel) return null;
          return (
            <SvgText key={`x-${i}`} x={x} y={plotY + plotH + 18} fontSize={10} fill={colors.textMuted} textAnchor="middle">
              {d.label.length > 3 ? d.label.slice(0, 3) : d.label}
            </SvgText>
          );
        })}

        {/* Y-axis top label */}
        {validPoints.length > 0 ? (
          <SvgText x={plotX - 4} y={plotY + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">
            {Math.round(dataMax)}
          </SvgText>
        ) : null}
      </Svg>

      {/* Empty state */}
      {validPoints.length === 0 && emptyMessage ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 13 }}>{emptyMessage}</Text>
        </View>
      ) : null}

      {/* Legend */}
      {(yLabel || targetLabel) ? (
        <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: CHART_PADDING.left, marginBottom: 4 }}>
          {yLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: color }} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>{yLabel}</Text>
            </View>
          ) : null}
          {targetLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 0, borderTopWidth: 1, borderColor: color, borderStyle: 'dashed', opacity: 0.5 }} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>{targetLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ── Simple bar chart for macros ───────────────────────────────────────────────
function MacroBarChart({
  data,
  proteinTarget,
  width,
  height = 120,
}: {
  data: { label: string; protein: number; carbs: number; fat: number }[];
  proteinTarget: number;
  width: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const pad = { top: 8, right: 16, bottom: 24, left: 16 };
  const plotW = width - (pad.left + pad.right);
  const plotH = height - (pad.top + pad.bottom);

  const maxVal = Math.max(proteinTarget * 1.3, ...data.flatMap((d) => [d.protein, d.carbs, d.fat, proteinTarget]));
  const barCount = data.length;
  const groupWidth = Math.min(40, plotW / barCount);
  const barWidth = Math.max(2, groupWidth / 4);

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const gx = pad.left + i * (plotW / barCount) + (plotW / barCount - groupWidth) / 2;
        const proteinH = (d.protein / maxVal) * plotH;
        const carbsH = (d.carbs / maxVal) * plotH;
        const fatH = (d.fat / maxVal) * plotH;

        return (
          <View key={i}>
            {/* Protein bar */}
            <Rect x={gx} y={pad.top + plotH - proteinH} width={barWidth} height={Math.max(0, proteinH)} rx={1} fill={colors.primary} />
            {/* Carbs bar */}
            <Rect x={gx + barWidth + 1} y={pad.top + plotH - carbsH} width={barWidth} height={Math.max(0, carbsH)} rx={1} fill={colors.warning} />
            {/* Fat bar */}
            <Rect x={gx + (barWidth + 1) * 2} y={pad.top + plotH - fatH} width={barWidth} height={Math.max(0, fatH)} rx={1} fill="#e2725a" />
            {/* Label - show every Nth */}
            {(() => {
              const showLabel = barCount <= 10 || i % Math.ceil(barCount / 7) === 0 || i === barCount - 1;
              if (!showLabel) return null;
              return <SvgText key={`l-${i}`} x={gx + groupWidth / 2} y={pad.top + plotH + 16} fontSize={9} fill={colors.textMuted} textAnchor="middle">{d.label.length > 4 ? d.label.slice(0, 4) : d.label}</SvgText>;
            })()}
          </View>
        );
      })}
    </Svg>
  );
}

// ── Mood trend (horizontal bar-like blocks) ──────────────────────────────────
function MoodTrend({
  data,
  width,
  height = 80,
}: {
  data: { label: string; score: number | null }[];
  width: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const pad = { top: 8, right: 16, bottom: 24, left: 16 };
  const plotW = width - (pad.left + pad.right);
  const plotH = height - (pad.top + pad.bottom);

  const valid = data.filter((d) => d.score != null);
  if (valid.length === 0) return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 13 }}>No mood data logged yet</Text>
    </View>
  );

  const barW = Math.min(30, plotW / valid.length - 2);

  return (
    <Svg width={width} height={height}>
      {valid.map((d, i) => {
        const x = pad.left + i * (plotW / valid.length) + (plotW / valid.length - barW) / 2;
        const barH = (d.score! / 5) * plotH;
        const barColor = d.score! >= 4 ? colors.success : d.score! >= 3 ? colors.warning : d.score! >= 2 ? '#f59e0b' : colors.danger;
        return (
          <View key={i}>
            <Rect x={x} y={pad.top + plotH - barH} width={barW} height={Math.max(2, barH)} rx={3} fill={barColor} />
            {(() => {
              const showLabel = valid.length <= 10 || i % Math.ceil(valid.length / 7) === 0 || i === valid.length - 1;
              if (!showLabel) return null;
              return <SvgText key={`l-${i}`} x={x + barW / 2} y={pad.top + plotH + 16} fontSize={9} fill={colors.textMuted} textAnchor="middle">{d.label.length > 4 ? d.label.slice(0, 4) : d.label}</SvgText>;
            })()}
          </View>
        );
      })}
    </Svg>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TrendsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 60; // accounts for card padding

  const [range, setRange] = useState<TimeRange>(30);
  const [refreshing, setRefreshing] = useState(false);

  // Nutrition data
  const [dailySummaries, setDailySummaries] = useState<DailyNutritionSummary[]>([]);
  const [proteinTarget, setProteinTarget] = useState(120);
  const [calorieTarget, setCalorieTarget] = useState(2000);

  // Exercise data
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);

  // Weight data
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);

  // Health metrics (steps, active energy)
  const [healthMetrics, setHealthMetrics] = useState<HealthMetricsHistoryDay[]>([]);

  // Mood data
  const [moodScores, setMoodScores] = useState<{ date: string; score: number }[]>([]);

  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const dates = Array.from({ length: range }, (_, i) => shiftDateKey(todayKey(), -i)).reverse();
    const [foods, entries, profile, weights, exercises, metrics, productivity] = await Promise.all([
      listFoodItems(),
      listMealEntries(),
      getUserProfile(),
      getWeightHistory(range),
      listExercisesByDateRange(range),
      getHealthMetricsHistory(range),
      getDailyProductivityLogs(range),
    ]);

    const summaries = dates.map((date) => summarizeDay(date, entries, foods));
    const goal = calculateDailyGoal(profile);

    setDailySummaries(summaries);
    setProteinTarget(goal.proteinTargetG);
    setCalorieTarget(goal.calories);
    setWeightLogs(weights);
    setExerciseEntries(exercises);
    setHealthMetrics(metrics);
    setMoodScores(
      productivity.map((p) => {
        const moods = p.moods;
        if (moods.length === 0) return { date: p.date, score: 0 };
        const MOOD_SCORE: Record<string, number> = { stressed: 1, tired: 2, meh: 3, good: 4, great: 5 };
        return { date: p.date, score: moods.reduce((s, m) => s + (MOOD_SCORE[m] ?? 3), 0) / moods.length };
      })
    );
  }, [range]);

  useFocusEffect(useCallback(() => {
    load().then(() => setLoaded(true)).catch((err) => { console.warn('Failed to load trends:', err); setLoaded(true); });
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  // Build chart data arrays from summaries
  const calorieData = useMemo(() =>
    dailySummaries.map((s) => ({ label: s.date.slice(5), value: s.calories > 0 ? s.calories : null })),
    [dailySummaries]
  );

  const macroBarData = useMemo(() =>
    dailySummaries.map((s) => ({
      label: s.date.slice(5),
      protein: s.proteinG,
      carbs: s.carbsG,
      fat: s.fatG,
    })),
    [dailySummaries]
  );

  const weightData = useMemo(() => {
    const dateMap = new Map(weightLogs.map((w) => [w.date, w.weightKg]));
    const dates = Array.from({ length: range }, (_, i) => shiftDateKey(todayKey(), -i)).reverse();
    return dates.map((d) => ({ label: d.slice(5), value: dateMap.get(d) ?? null }));
  }, [weightLogs, range]);

  const stepsData = useMemo(() => {
    const dateMap = new Map(healthMetrics.map((m) => [m.date, m]));
    const dates = Array.from({ length: range }, (_, i) => shiftDateKey(todayKey(), -i)).reverse();
    return dates.map((d) => {
      const m = dateMap.get(d);
      return { label: d.slice(5), value: m?.steps ?? null } as { label: string; value: number | null };
    });
  }, [healthMetrics, range]);

  const activeEnergyData = useMemo(() => {
    const dateMap = new Map(healthMetrics.map((m) => [m.date, m]));
    const dates = Array.from({ length: range }, (_, i) => shiftDateKey(todayKey(), -i)).reverse();
    return dates.map((d) => {
      const m = dateMap.get(d);
      return { label: d.slice(5), value: m?.readinessScore != null ? m.readinessScore : null } as { label: string; value: number | null };
    });
  }, [healthMetrics, range]);

  const exerciseSummaryByRange = useMemo(() => {
    const startDate = shiftDateKey(todayKey(), -(range - 1));
    const inRange = exerciseEntries.filter((e) => e.date >= startDate);
    const totalMin = inRange.reduce((s, e) => s + e.durationMin, 0);
    const totalCal = inRange.reduce((s, e) => s + (e.caloriesBurned ?? 0), 0);
    return { totalMin, totalCal, count: inRange.length };
  }, [exerciseEntries, range]);

  const avgCalories = useMemo(() => {
    const vals = calorieData.filter((d) => d.value != null).map((d) => d.value!);
    return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  }, [calorieData]);

  const avgProtein = useMemo(() => {
    const vals = dailySummaries.filter((d) => d.proteinG > 0);
    return vals.length > 0 ? Math.round(vals.reduce((s, d) => s + d.proteinG, 0) / vals.length) : 0;
  }, [dailySummaries]);

  const avgMood = useMemo(() => {
    const vals = moodScores.filter((d) => d.score > 0).map((d) => d.score);
    return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : null;
  }, [moodScores]);

  if (!loaded) {
    return (
      <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
        <Skeleton style={{ height: 32, width: '40%', marginBottom: 8 }} />
        <Skeleton style={{ height: 200, width: '100%', marginBottom: 12 }} />
        <Skeleton style={{ height: 200, width: '100%', marginBottom: 12 }} />
        <Skeleton style={{ height: 200, width: '100%' }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <Text style={styles.title}>Trends</Text>
      <Text style={styles.subtitle}>Calories, macros, weight, and movement over time.</Text>

      {/* Time range toggle */}
      <View style={styles.toggleRow}>
        {TIME_RANGES.map((r) => (
          <Pressable
            key={r}
            style={[styles.toggleBtn, range === r && styles.toggleBtnActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[styles.toggleText, range === r && styles.toggleTextActive]}>{r}d</Text>
          </Pressable>
        ))}
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg kcal</Text>
          <Text style={styles.summaryValue}>{avgCalories || '—'}</Text>
          <Text style={styles.summaryHelper}>target {Math.round(calorieTarget)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Avg protein</Text>
          <Text style={styles.summaryValue}>{avgProtein ? `${avgProtein}g` : '—'}</Text>
          <Text style={styles.summaryHelper}>target {Math.round(proteinTarget)}g</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Exercise</Text>
          <Text style={styles.summaryValue}>{exerciseSummaryByRange.totalMin > 0 ? `${exerciseSummaryByRange.totalMin}m` : '—'}</Text>
          <Text style={styles.summaryHelper}>{exerciseSummaryByRange.count} sessions</Text>
        </View>
        {avgMood != null ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg mood</Text>
            <Text style={styles.summaryValue}>{avgMood}/5</Text>
            <Text style={styles.summaryHelper}>{avgMood >= 4 ? 'Great' : avgMood >= 3 ? 'Ok' : 'Rough'}</Text>
          </View>
        ) : null}
      </View>

      {/* Calorie trend */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Calorie trend</Text>
        <SimpleLineChart
          data={calorieData}
          color={colors.primary}
          targetValue={calorieTarget}
          targetLabel="target"
          yLabel="kcal"
          width={chartWidth}
          emptyMessage="No calories logged in this period"
        />
      </View>

      {/* Macro adherence */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Macro adherence</Text>
        <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: CHART_PADDING.left, marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.primary }} />
            <Text style={{ fontSize: 10, color: colors.textMuted }}>Protein</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.warning }} />
            <Text style={{ fontSize: 10, color: colors.textMuted }}>Carbs</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#e2725a' }} />
            <Text style={{ fontSize: 10, color: colors.textMuted }}>Fat</Text>
          </View>
        </View>
        <MacroBarChart data={macroBarData} proteinTarget={proteinTarget} width={chartWidth} />
      </View>

      {/* Weight trend */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Weight trend</Text>
        {weightLogs.length > 0 ? (
          <SimpleLineChart
            data={weightData}
            color="#8b5cf6"
            yLabel="kg"
            width={chartWidth}
            emptyMessage="Log weight to see your trend here"
          />
        ) : (
          <Pressable style={styles.emptyState} onPress={() => router.push('/(tabs)/today')}>
            <Text style={styles.emptyText}>No weight data yet</Text>
            <Text style={styles.emptyAction}>Log your weight in the Today tab →</Text>
          </Pressable>
        )}
      </View>

      {/* Movement trend: steps */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Movement — Steps</Text>
        <SimpleLineChart
          data={stepsData}
          color="#06b6d4"
          yLabel="steps"
          width={chartWidth}
          emptyMessage="No step data available. Connect a health provider in Settings."
        />
      </View>

      {/* Readiness trend */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Readiness score</Text>
        <SimpleLineChart
          data={activeEnergyData}
          color="#22c55e"
          yLabel="score"
          width={chartWidth}
          emptyMessage="No readiness data. Connect Oura or Fitbit in Settings."
        />
      </View>

      {/* Mood trend */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Mood trend</Text>
        <MoodTrend
          data={moodScores.map((m) => ({ label: m.date.slice(5), score: m.score > 0 ? m.score : null }))}
          width={chartWidth}
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    container: { padding: 20, gap: 16, backgroundColor: colors.background },
    title: { ...typography.display1, color: colors.text },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted },
    toggleRow: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: colors.chipBackground,
      borderRadius: 14,
      padding: 4,
      alignSelf: 'flex-start',
    },
    toggleBtn: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 10,
    },
    toggleBtnActive: { backgroundColor: colors.primary },
    toggleText: { color: colors.chipText, fontWeight: '700', fontSize: 14 },
    toggleTextActive: { color: colors.onPrimary },
    summaryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    summaryCard: {
      flex: 1,
      minWidth: 100,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 14,
      gap: 4,
      ...cardShadow,
    },
    summaryLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    summaryValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
    summaryHelper: { color: colors.textMuted, fontSize: 11 },
    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 8,
      ...cardShadow,
    },
    chartTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
    emptyState: {
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    emptyText: { color: colors.textMuted, fontWeight: '600' },
    emptyAction: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  });