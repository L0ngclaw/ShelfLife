// Local notifications: remind the user the day before an item expires.
//
// Expo Go on Android (SDK 53+) no longer supports expo-notifications, so there
// reminders are switched off instead of crashing. They work in Expo Go on iPhone
// and in a real installed build (development or production build).
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { parseISODate } from "../utils/dates";

const REMINDER_HOUR = 9; // 9:00 in the morning
const CHANNEL_ID = "expiry";

const isExpoGoAndroid =
  Platform.OS === "android" &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const remindersSupported = !isExpoGoAndroid;

// Load expo-notifications only when it is first needed (not at app start)
let notificationsModule = null;
async function getNotifications() {
  if (!remindersSupported) return null;
  if (!notificationsModule) {
    try {
      notificationsModule = await import("expo-notifications");
      // Show reminders even while the app is open
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    } catch {
      return null; // module not available on this device
    }
  }
  return notificationsModule;
}

async function ensurePermission(Notifications) {
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
    const Notifications = await getNotifications();
    if (!Notifications || !(await ensurePermission(Notifications))) return null;
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
    const Notifications = await getNotifications();
    if (Notifications)
      await Notifications.cancelScheduledNotificationAsync(reminderId);
  } catch {
    // already fired or removed
  }
}

// For the demo: a reminder in 5 seconds.
// Returns 'sent', 'denied' or 'unsupported'
export async function sendTestReminder() {
  const Notifications = await getNotifications();
  if (!Notifications) return "unsupported";
  if (!(await ensurePermission(Notifications))) return "denied";
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
  return "sent";
}
