import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

export default function ImpactScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">Impact</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
