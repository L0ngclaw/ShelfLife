import { View, StyleSheet } from "react-native";
import { Text, Button, List, Divider } from "react-native-paper";
import { useAuth } from "../context/AuthContext";
import { useItems } from "../context/ItemsContext";

const STATUS_TEXT = {
  idle: "Up to date",
  syncing: "Syncing…",
  offline: "Offline – changes are saved on this phone",
  error: "Sync failed – will try again",
};

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { sync, syncNow, pendingCount, isOnline } = useItems();

  const statusText =
    isOnline === false ? STATUS_TEXT.offline : STATUS_TEXT[sync.status];
  const lastSynced = sync.lastSyncedAt
    ? new Date(sync.lastSyncedAt).toLocaleString()
    : "Not yet";

  return (
    <View style={styles.container}>
      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Logged in as"
          description={user?.email}
          left={(p) => <List.Icon {...p} icon="account-circle-outline" />}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Cloud sync</List.Subheader>
        <List.Item
          title="Status"
          description={statusText}
          left={(p) => (
            <List.Icon
              {...p}
              icon={
                isOnline === false ? "cloud-off-outline" : "cloud-check-outline"
              }
            />
          )}
        />
        <List.Item
          title="Waiting to upload"
          description={`${pendingCount} item(s)`}
          left={(p) => <List.Icon {...p} icon="cloud-upload-outline" />}
        />
        <List.Item
          title="Last synced"
          description={lastSynced}
          left={(p) => <List.Icon {...p} icon="history" />}
        />
        {sync.status === "error" && sync.error ? (
          <Text variant="bodySmall" style={styles.error}>
            {sync.error}
          </Text>
        ) : null}
        <Button
          mode="contained-tonal"
          icon="sync"
          onPress={syncNow}
          disabled={isOnline !== true || sync.status === "syncing"}
          loading={sync.status === "syncing"}
          style={styles.button}
        >
          Sync now
        </Button>
      </List.Section>

      <Button
        mode="outlined"
        icon="logout"
        onPress={logout}
        style={styles.button}
      >
        Log out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 8 },
  button: { marginHorizontal: 16, marginTop: 8 },
  error: { marginHorizontal: 16, color: "#C62828" },
});
