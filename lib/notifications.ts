import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Requests notification permissions and returns the Expo push token.
 * The token can be sent to a server for future remote push (FCM/APNs),
 * but local scheduled notifications do not require it.
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[notifications] Permission not granted");
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "howdymorning", // replace with actual Expo project ID for server-side push later
  });

  const token = tokenData.type === "expo" ? tokenData.data : null;

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563eb",
    });
  }

  return token;
}

const MORNING_REMINDER_ID = "morning-checkin-reminder";

/**
 * Schedules a daily local notification at the specified local time.
 * The notification repeats every day until cancelled.
 *
 * @param hour   Hour in 24-hour format (0–23), default 7
 * @param minute Minute (0–59), default 0
 */
export async function scheduleMorningReminder(
  hour: number = 7,
  minute: number = 0,
): Promise<string> {
  // Cancel any existing reminder with the same ID first to avoid duplicates
  await Notifications.cancelScheduledNotificationAsync(MORNING_REMINDER_ID);

  const id = await Notifications.scheduleNotificationAsync({
    identifier: MORNING_REMINDER_ID,
    content: {
      title: "☀️ Howdy Morning!",
      body: "Time for your morning check-in. How are you feeling today?",
      sound: "default",
      ...(Platform.OS === "android" ? { channelId: "reminders" } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
}

/**
 * Cancels all scheduled morning reminders.
 */
export async function cancelMorningReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MORNING_REMINDER_ID);
}

/**
 * Returns all currently scheduled notifications (for debugging).
 */
export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}
