import AsyncStorage from '@react-native-async-storage/async-storage';
import { shiftDateKey, todayKey } from '@/lib/domain/nutrition';
import type { Mood } from '@/types/healthhomie';

export type DailyProductivityLog = {
  date: string;
  moods: Mood[];
  routineCompletedCount: number;
  waterGlasses: number;
};

/** Bulk-reads the last `days` of mood/routine/water logs from AsyncStorage (device-local, mirrors
 * the per-day key scheme ProductivityPage writes: 'morning_moodLog_<day>' etc.) via a single
 * multiGet instead of one round trip per day. */
export async function getDailyProductivityLogs(days: number, endDate: string = todayKey()): Promise<DailyProductivityLog[]> {
  const dates = Array.from({ length: days }, (_, i) => shiftDateKey(endDate, -i));
  const keys = dates.flatMap((date) => [`morning_moodLog_${date}`, `morning_routineDone_${date}`, `morning_water_${date}`]);
  const pairs = await AsyncStorage.multiGet(keys);
  const values = new Map(pairs);

  return dates.map((date) => {
    let moods: Mood[] = [];
    try {
      const raw = values.get(`morning_moodLog_${date}`);
      const moodLog = raw ? (JSON.parse(raw) as Partial<Record<string, Mood>>) : {};
      moods = Object.values(moodLog).filter((m): m is Mood => !!m);
    } catch { /* corrupt/legacy value - treat as no mood data for this day */ }

    let routineCompletedCount = 0;
    try {
      const raw = values.get(`morning_routineDone_${date}`);
      const doneIds = raw ? (JSON.parse(raw) as string[]) : [];
      routineCompletedCount = Array.isArray(doneIds) ? doneIds.length : 0;
    } catch { /* ignore */ }

    let waterGlasses = 0;
    try {
      const raw = values.get(`morning_water_${date}`);
      const parsed = raw != null ? JSON.parse(raw) : 0;
      waterGlasses = typeof parsed === 'number' ? parsed : 0;
    } catch { /* ignore */ }

    return { date, moods, routineCompletedCount, waterGlasses };
  });
}
