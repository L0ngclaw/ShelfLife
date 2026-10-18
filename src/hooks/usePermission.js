// Asks for a permission in two steps:
//   1. our PermissionDialog explains why it is needed
//   2. only after "Continue" the system popup appears
//
// Usage in a screen:
//   const { askPermission, dialogProps } = usePermission();
//   if (await askPermission("camera")) { ...use the camera... }
//   <PermissionDialog {...dialogProps} />
import { useState } from "react";
import { Linking } from "react-native";
import { PERMISSIONS } from "../constants/permissions";
import {
  getCameraPermission,
  requestCameraPermission,
} from "../services/photoService";
import {
  getNotificationPermission,
  requestNotificationPermission,
} from "../services/notificationService";

const CHECKS = {
  camera: { get: getCameraPermission, request: requestCameraPermission },
  notifications: {
    get: getNotificationPermission,
    request: requestNotificationPermission,
  },
};

// "Not now" answers, remembered until the app restarts
const notNow = new Set();

export function usePermission() {
  const [prompt, setPrompt] = useState(null); // { type, blocked, resolve }

  // Returns true when the permission is granted
  const askPermission = async (type) => {
    try {
      const status = await CHECKS[type].get();
      if (status.granted) return true;
      if (status.unsupported || notNow.has(type)) return false;

      // Wait until the user taps a button in the dialog
      const choice = await new Promise((resolve) =>
        setPrompt({ type, blocked: !status.canAskAgain, resolve }),
      );
      setPrompt(null);

      if (choice === "allow") return (await CHECKS[type].request()).granted;
      if (choice === "settings") Linking.openSettings();
      else if (PERMISSIONS[type].rememberNotNow) notNow.add(type);
      return false;
    } catch {
      setPrompt(null);
      return false;
    }
  };

  const dialogProps = {
    visible: !!prompt,
    type: prompt?.type,
    blocked: prompt?.blocked,
    onAllow: () => prompt?.resolve("allow"),
    onOpenSettings: () => prompt?.resolve("settings"),
    onDismiss: () => prompt?.resolve("notNow"),
  };

  return { askPermission, dialogProps };
}
