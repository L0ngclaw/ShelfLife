// Explains why a permission is needed before the system popup appears.
// If the permission was turned off earlier ("blocked"), the system will not
// ask again, so the dialog offers to open the phone's settings instead.
//
// Props:  visible (bool), type ("camera" | "notifications"), blocked (bool)
// Events: onAllow, onOpenSettings, onDismiss
import { StyleSheet } from "react-native";
import { Portal, Dialog, Text, Button } from "react-native-paper";
import { PERMISSIONS } from "../constants/permissions";

export default function PermissionDialog({
  visible,
  type,
  blocked,
  onAllow,
  onOpenSettings,
  onDismiss,
}) {
  const info = PERMISSIONS[type];
  if (!info) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Icon icon={info.icon} />
        <Dialog.Title style={styles.title}>{info.title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{info.reason}</Text>
          {blocked && (
            <Text variant="bodySmall" style={styles.blocked}>
              This permission is turned off for ShelfLife. You can turn it on
              in your phone&apos;s settings.
            </Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Not now</Button>
          {blocked ? (
            <Button mode="contained" onPress={onOpenSettings}>
              Open settings
            </Button>
          ) : (
            <Button mode="contained" onPress={onAllow}>
              Continue
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { borderRadius: 20 },
  title: { textAlign: "center" },
  blocked: { color: "#616161", marginTop: 12 },
});
