import { useLayoutEffect, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import {
  List,
  FAB,
  Text,
  ActivityIndicator,
  Avatar,
  Icon,
  IconButton,
  Portal,
  Dialog,
  Button,
  Searchbar,
} from "react-native-paper";
import { useItems } from "../context/ItemsContext";
import { useCategories } from "../context/CategoriesContext";
import { describeExpiry } from "../utils/dates";
import { EXPIRY_LEVELS } from "../utils/expiryStatus";
import ExpiryRing from "../components/ExpiryRing";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

export default function PantryScreen({ navigation }) {
  const { items, loading } = useItems();
  const { getCategory } = useCategories();

  const [legendVisible, setLegendVisible] = useState(false);
  const [query, setQuery] = useState("");
  const searchText = useDebouncedValue(query).trim().toLowerCase();

  // Put an (i) button in the Pantry header that opens the colour legend
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="information-outline"
          onPress={() => setLegendVisible(true)}
          accessibilityLabel="What do the colours mean?"
        />
      ),
    });
  }, [navigation]);

  // Only items still in the pantry, soonest expiry first
  // Only items still in the pantry, matching the search, soonest expiry first
  const pantry = items
    .filter((i) => i.status === "active")
    .filter(
      (i) =>
        !searchText ||
        i.name.toLowerCase().includes(searchText) ||
        getCategory(i.category).label.toLowerCase().includes(searchText),
    )
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
      <Searchbar
        placeholder="Search by name or category"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />
      <FlatList
        data={pantry}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const cat = getCategory(item.category);
          return (
            <List.Item
              title={item.name}
              description={`${cat.label} · ${item.weightKg} kg · ${describeExpiry(item.expiryDate)}`}
              onPress={() =>
                navigation.navigate("ItemDetail", { itemId: item.id })
              }
              left={(props) =>
                item.photoUri ? (
                  <Avatar.Image
                    size={40}
                    source={{ uri: item.photoUri }}
                    style={props.style}
                  />
                ) : (
                  <List.Icon {...props} icon={cat.icon} />
                )
              }
              right={() => (
                <View style={styles.right}>
                  {item.syncStatus === "pending" ? (
                    <Icon source="cloud-upload-outline" size={16} />
                  ) : null}
                  <ExpiryRing
                    purchaseDate={item.purchaseDate}
                    expiryDate={item.expiryDate}
                  />
                </View>
              )}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text variant="titleMedium">
              {searchText
                ? "No items match your search"
                : "Your pantry is empty"}
            </Text>
            {!searchText && (
              <Text variant="bodyMedium">Tap + to add your first item.</Text>
            )}
          </View>
        }
        contentContainerStyle={pantry.length === 0 && styles.emptyList}
      />
      <Portal>
        <Dialog
          visible={legendVisible}
          onDismiss={() => setLegendVisible(false)}
        >
          <Dialog.Title>What do the colours mean?</Dialog.Title>
          <Dialog.Content>
            {Object.values(EXPIRY_LEVELS).map((l) => (
              <View key={l.level} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: l.color }]} />
                <View style={styles.legendText}>
                  <Text variant="titleSmall">{l.title}</Text>
                  <Text variant="bodySmall">{l.description}</Text>
                </View>
              </View>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLegendVisible(false)}>Got it</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  fab: { position: "absolute", right: 16, bottom: 16 },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dot: { width: 16, height: 16, borderRadius: 8, marginRight: 12 },
  legendText: { flex: 1 },
});
