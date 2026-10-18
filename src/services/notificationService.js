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

// Android needs a channel before it can show notifications
async function setUpChannel(Notifications) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Expiry reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

// Only checks. Asking is done by the screens (usePermission + PermissionDialog),
// so the user always sees why before the system popup appears.
async function isAllowed(Notifications) {
  await setUpChannel(Notifications);
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

// Used by usePermission
export async function getNotificationPermission() {
  const Notifications = await getNotifications();
  if (!Notifications) return { granted: false, canAskAgain: false, unsupported: true };
  return Notifications.getPermissionsAsync();
}

export async function requestNotificationPermission() {
  const Notifications = await getNotifications();
  if (!Notifications) return { granted: false };
  await setUpChannel(Notifications);
  return Notifications.requestPermissionsAsync();
}

// Returns the reminder id, or null if no reminder was scheduled
export async function scheduleExpiryReminder(item) {
  const when = parseISODate(item.expiryDate);
  when.setDate(when.getDate() - 1); // the day before
  when.setHours(REMINDER_HOUR, 0, 0, 0);
  if (when <= new Date()) return null; // too late to remind

  try {
    const Notifications = await getNotifications();
    if (!Notifications || !(await isAllowed(Notifications))) return null;
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

// Show a notification straight away (used for new family requests / shared items).
// Returns false when notifications are not available, so the caller can
// show an in-app message instead.
export async function notifyNow(title, body) {
  try {
    const Notifications = await getNotifications();
    if (!Notifications || !(await isAllowed(Notifications))) return false;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null, // null = now
    });
    return true;
  } catch {
    return false;
  }
}
