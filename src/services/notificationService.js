// Local notifications: remind the user the day before an item expires
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { parseISODate } from "../utils/dates";

const REMINDER_HOUR = 9; // 9:00 in the morning
const CHANNEL_ID = "expiry";

// Show reminders even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensurePermission() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Expiry reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

// Returns the reminder id, or null if no reminder was scheduled
export async function scheduleExpiryReminder(item) {
  const when = parseISODate(item.expiryDate);
  when.setDate(when.getDate() - 1); // the day before
  when.setHours(REMINDER_HOUR, 0, 0, 0);
  if (when <= new Date()) return null; // too late to remind

  try {
    if (!(await ensurePermission())) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "Eat it before it goes off",
        body: `${item.name} expires tomorrow. Use it first to avoid waste.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    return null; // reminders are a bonus; never block saving an item
  }
}

export async function cancelReminder(reminderId) {
  if (!reminderId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId);
  } catch {
    // already fired or removed
  }
}

// For the demo: a reminder in 5 seconds
export async function sendTestReminder() {
  if (!(await ensurePermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "ShelfLife reminder test",
      body: "Reminders are working.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}
