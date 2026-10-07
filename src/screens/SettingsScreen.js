import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Settings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
