import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { useAuth } from "../context/AuthContext";

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text variant="titleMedium">Logged in as</Text>
      <Text variant="bodyLarge" style={styles.email}>
        {user?.email}
      </Text>
      <Button mode="outlined" icon="logout" onPress={logout}>
        Log out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  email: { marginBottom: 24 },
});
