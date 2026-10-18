// What each permission is used for. Shown in our own dialog BEFORE the
// system popup, so the user knows why ShelfLife is asking.
export const PERMISSIONS = {
  camera: {
    icon: "camera-outline",
    title: "Allow camera access?",
    reason:
      "ShelfLife uses the camera only when you tap Take photo, so you can recognize each item on your shelf. Photos stay on this phone and are not uploaded.",
    // Asked only after the user taps a button, so it is fine to ask again next time
    rememberNotNow: false,
  },
  notifications: {
    icon: "bell-outline",
    title: "Allow notifications?",
    reason:
      "ShelfLife reminds you at 9:00 the day before an item expires, and tells you when someone in your household sends or answers a request.",
    // Asked by the app itself, so after "Not now" we do not ask again until the app restarts
    rememberNotNow: true,
  },
};
