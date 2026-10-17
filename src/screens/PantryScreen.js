import { useLayoutEffect, useState } from "react";
import { View, FlatList, ScrollView, StyleSheet } from "react-native";
import {
  List,
  FAB,
  Text,
  ActivityIndicator,
  Avatar,
  Icon,
  Searchbar,
  Chip,
} from "react-native-paper";
import { useItems } from "../context/ItemsContext";
import { useCategories } from "../context/CategoriesContext";
import { describeExpiry } from "../utils/dates";
import { formatAmount } from "../utils/amount";
import ExpiryRing from "../components/ExpiryRing";
import ExpiryLegendDialog from "../components/ExpiryLegendDialog";
import ColorKeyButton from "../components/ColorKeyButton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { theme } from "../theme";

export default function PantryScreen({ navigation }) {
  const { items, loading, isOnline } = useItems();
  const { getCategory } = useCategories();

  const [legendVisible, setLegendVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null); // null = all
  const searchText = useDebouncedValue(query).trim().toLowerCase();

  // Mini colour-ring button in the Pantry header that opens the colour guide
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <ColorKeyButton onPress={() => setLegendVisible(true)} />
      ),
    });
  }, [navigation]);

  const activeItems = items.filter((i) => i.status === "active");

  // Category filter: only categories that have items, with a count each
  const categoryCounts = {};
  for (const item of activeItems) {
    categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1;
  }
  const filterCategories = Object.keys(categoryCounts).map((key) => getCategory(key));
  // If the selected category has no items any more, show everything
  const activeFilter = categoryCounts[selectedCategory] ? selectedCategory : null;

  // Items matching the category filter and the search, soonest expiry first
  const pantry = activeItems
    .filter((i) => !activeFilter || i.category === activeFilter)
    .filter(
      (i) =>
        !searchText ||
        i.name.toLowerCase().includes(searchText) ||
        getCategory(i.category).label.toLowerCase().includes(searchText),
    )
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  const isFiltering = !!searchText || !!activeFilter;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOnline === false ? (
        <View style={styles.offline} accessibilityRole="alert">
          <Icon source="cloud-off-outline" size={18} color="#5D4037" />
          <Text variant="bodySmall" style={styles.offlineText}>
            Offline – changes are saved on this phone and will sync later
          </Text>
        </View>
      ) : null}

      <Searchbar
        placeholder="Search by name or category"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      {filterCategories.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterContent}
        >
          <Chip
            icon={
              !activeFilter
                ? ({ size }) => <Icon source="check" size={size} color={theme.colors.onPrimary} />
                : "view-grid-outline"
            }
            selected={!activeFilter}
            showSelectedCheck={false}
            onPress={() => setSelectedCategory(null)}
            style={[styles.filterChip, !activeFilter && styles.chipSelected]}
            selectedColor={!activeFilter ? theme.colors.onPrimary : undefined}
          >
            All ({activeItems.length})
          </Chip>
          {filterCategories.map((cat) => {
            const selected = activeFilter === cat.key;
            return (
              <Chip
                key={cat.key}
                icon={
                  selected
                    ? ({ size }) => <Icon source="check" size={size} color={theme.colors.onPrimary} />
                    : cat.icon
                }
                selected={selected}
                showSelectedCheck={false}
                onPress={() => setSelectedCategory(selected ? null : cat.key)}
                style={[styles.filterChip, selected && styles.chipSelected]}
                selectedColor={selected ? theme.colors.onPrimary : undefined}
              >
                {cat.label} ({categoryCounts[cat.key]})
              </Chip>
            );
          })}
        </ScrollView>
      ) : null}

      <FlatList
        data={pantry}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const cat = getCategory(item.category);
          return (
            <List.Item
              title={item.name}
              description={`${cat.label} · ${formatAmount(item)} · ${describeExpiry(item.expiryDate)}`}
              onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}
              left={(props) =>
                item.photoUri ? (
                  <Avatar.Image size={40} source={{ uri: item.photoUri }} style={props.style} />
                ) : (
                  <List.Icon {...props} icon={cat.icon} />
                )
              }
              right={() => (
                <View style={styles.right}>
                  {item.syncStatus === "pending" ? (
                    <Icon source="cloud-upload-outline" size={16} />
                  ) : null}
                  <ExpiryRing purchaseDate={item.purchaseDate} expiryDate={item.expiryDate} />
                </View>
              )}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Icon source={isFiltering ? "magnify" : "fridge-outline"} size={64} color="#9E9E9E" />
            <Text variant="titleMedium">
              {isFiltering ? "No items match your search" : "Your shelf is empty"}
            </Text>
            {!isFiltering && <Text variant="bodyMedium">Tap + to add your first item.</Text>}
          </View>
        }
        contentContainerStyle={pantry.length === 0 ? styles.emptyList : styles.list}
      />

      <ExpiryLegendDialog visible={legendVisible} onDismiss={() => setLegendVisible(false)} />

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
  list: { paddingBottom: 88 }, // room for the + button
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  fab: { position: "absolute", right: 16, bottom: 16 },
  search: { marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  filterBar: { flexGrow: 0, marginBottom: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: { borderRadius: 20 },
  chipSelected: { backgroundColor: theme.colors.primary },
  offline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineText: { flex: 1, color: "#5D4037" },
});
