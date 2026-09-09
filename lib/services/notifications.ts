import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const MORNING_CHECK_IN_NOTIFICATION_ID = "daily-morning-check-in";
const PUSH_TOKEN_KEY = "expo_push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function configureNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted")
    status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("morning-check-in", {
      name: "Morning check-in",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  try {
    const token = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      )
    ).data;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (error) {
    // A local reminder still works when EAS/Firebase has not been configured yet.
    console.warn(
      "Push token unavailable; configure EAS/Firebase before using remote pushes.",
      error,
    );
    return null;
  }
}

/** Schedules the device-local fallback reminder. Remote FCM delivery can use the stored Expo token. */
export async function scheduleMorningCheckIn(
  hour = 7,
  minute = 0,
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  await Notifications.cancelScheduledNotificationAsync(
    MORNING_CHECK_IN_NOTIFICATION_ID,
  ).catch(() => undefined);
  return Notifications.scheduleNotificationAsync({
    identifier: MORNING_CHECK_IN_NOTIFICATION_ID,
    content: {
      title: "Good morning ☀️",
      body: "Take a minute to check in with your food, energy, and routine.",
      data: { href: "/(tabs)" },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function setupMorningCheckInReminder(): Promise<void> {
  const token = await configureNotifications();
  if (token || Platform.OS !== "web") await scheduleMorningCheckIn();
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}
