import { View, FlatList, StyleSheet } from "react-native";
import { List, FAB, Text, ActivityIndicator } from "react-native-paper";
import { useItems } from "../context/ItemsContext";
import { getCategory } from "../constants/categories";
import { describeExpiry } from "../utils/dates";

export default function PantryScreen({ navigation }) {
  const { items, loading } = useItems();

  // Only items still in the pantry, soonest expiry first
  const pantry = items
    .filter((i) => i.status === "active")
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pantry}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const cat = getCategory(item.category);
          return (
            <List.Item
              title={item.name}
              description={`${cat.label} · ${item.weightKg} kg · ${describeExpiry(item.expiryDate)}`}
              left={(props) => <List.Icon {...props} icon={cat.icon} />}
              right={(props) =>
                item.syncStatus === "pending" ? (
                  <List.Icon {...props} icon="cloud-upload-outline" />
                ) : null
              }
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text variant="titleMedium">Your pantry is empty</Text>
            <Text variant="bodyMedium">Tap + to add your first item.</Text>
          </View>
        }
        contentContainerStyle={pantry.length === 0 && styles.emptyList}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate("AddItem")}
        accessibilityLabel="Add item"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyList: { flexGrow: 1 },
  fab: { position: "absolute", right: 16, bottom: 16 },
});
