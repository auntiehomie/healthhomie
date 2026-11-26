import { beforeEach, expect, jest, test } from '@jest/globals';
import React from 'react';
import JournalScreen from '../app/(tabs)/journal';
import { PhotoMealCapture } from '../components/health/PhotoMealCapture';
import { LogFoodModal } from '../components/health/LogFoodModal';
import { addMealEntry } from '../lib/db/database';
import type { FoodItem } from '../types/healthhomie';
import { shiftDateKey, todayKey } from '../lib/domain/nutrition';

jest.mock('react-native', () => ({
  ScrollView: 'ScrollView', View: 'View', Text: 'Text', TextInput: 'TextInput',
  Modal: 'Modal', ActivityIndicator: 'ActivityIndicator', RefreshControl: 'RefreshControl',
  Platform: { OS: 'web' }, Alert: {}, StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('lucide-react-native', () => ({ Camera: 'Camera', ChevronLeft: 'ChevronLeft', ChevronRight: 'ChevronRight', ScanBarcode: 'ScanBarcode', Search: 'Search', Trash2: 'Trash2', X: 'X' }));
jest.mock('../components/ui/PressableFeedback', () => ({ PressableFeedback: 'Pressable' }));
jest.mock('../components/health/PhotoMealCapture', () => ({ PhotoMealCapture: 'PhotoMealCapture' }));
jest.mock('../components/health/BarcodeScanner', () => ({ BarcodeScanner: 'BarcodeScanner' }));
jest.mock('../components/health/EditEntryModal', () => ({ EditEntryModal: 'EditEntryModal' }));
jest.mock('../components/health/FoodRow', () => ({ FoodRow: 'FoodRow' }));
jest.mock('../components/ui/Skeleton', () => ({ FoodRowSkeleton: 'FoodRowSkeleton' }));
jest.mock('../components/health/CalendarStrip', () => ({ CalendarStrip: 'CalendarStrip' }));
jest.mock('../components/health/HourPicker', () => ({ HourPicker: 'HourPicker' }));
jest.mock('../components/health/LogFoodModal', () => ({ LogFoodModal: 'LogFoodModal' }));
jest.mock('../lib/db/database', () => ({
  createId: () => 'entry-id', addMealEntry: jest.fn(async () => {}),
  upsertFoodItem: jest.fn(async () => {}), listFoodItems: jest.fn(async () => []),
  listMealEntries: jest.fn(async () => []),
}));
jest.mock('../lib/services/nutritionApi', () => ({}));
jest.mock('../lib/utils/haptics', () => ({ hapticSuccess: jest.fn() }));
jest.mock('../lib/theme/ThemeContext', () => ({ useTheme: () => ({ colors: {} }) }));

// Exercise screen event wiring without loading native components in Node.
type Node = React.ReactElement<Record<string, unknown>>;
let state: unknown[];
let cursor: number;
function render() {
  cursor = 0;
  return JournalScreen();
}
function nodes(value: React.ReactNode): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!React.isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children as React.ReactNode)];
}
function button(tree: React.ReactNode, label: string) {
  const node = nodes(tree).find(node => node.props.accessibilityLabel === label);
  expect(node).toBeDefined();
  return node!.props.onPress as () => void;
}
beforeEach(() => {
  jest.clearAllMocks();
  state = [];
  jest.spyOn(React, 'useMemo').mockImplementation(fn => fn());
  jest.spyOn(React, 'useCallback').mockImplementation(fn => fn);
  jest.spyOn(React, 'useState').mockImplementation((initial?: unknown) => {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
    return [state[index], (next: unknown) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }] as ReturnType<typeof React.useState>;
  });
});

test('Add meal opens the photo capture first and manual search remains available', () => {
  let tree = render();
  button(tree, 'Add meal')();
  tree = render();
  const capture = nodes(tree).find(node => node.type === PhotoMealCapture);
  expect(capture?.props.autoOpen).toBe(true);
  button(tree, 'Enter meal manually')();
  tree = render();
  expect(nodes(tree).some(node => node.type === PhotoMealCapture)).toBe(false);
  expect(nodes(tree).some(node => node.props.accessibilityLabel === 'Search foods')).toBe(true);
  expect(addMealEntry).not.toHaveBeenCalled();
});

test('photo estimates use the existing portion confirmation before saving', async () => {
  button(render(), 'Previous day')();
  button(render(), 'Add meal')();
  let tree = render();
  const hourPicker = nodes(tree).find(node => node.type === ('HourPicker' as unknown));
  (hourPicker!.props.onSelectHour as (hour: number) => void)(18);
  tree = render();
  const capture = nodes(tree).find(node => node.type === PhotoMealCapture)!;
  const food = { id: 'photo-food', name: 'Meal', servingSize: 1, servingUnit: 'pictured portion', calories: 400, proteinG: 20, carbsG: 40, fatG: 18 } as FoodItem;
  (capture.props.onFound as (food: FoodItem) => void)(food);
  expect(addMealEntry).not.toHaveBeenCalled();
  tree = render();
  const review = nodes(tree).find(node => node.type === LogFoodModal)!;
  expect(review.props.food).toBe(food);
  expect(review.props.initialHour).toBe(18);
  await (review.props.onConfirm as (food: FoodItem, servings: number, hour: number) => Promise<void>)(food, 0.5, 18);
  expect(addMealEntry).toHaveBeenCalledWith(expect.objectContaining({ foodItemId: 'photo-food', servings: 0.5, hour: 18, mealType: 'dinner', date: shiftDateKey(todayKey(), -1) }));
});
