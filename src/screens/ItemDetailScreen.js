import { useState } from "react";
import { ScrollView, View, Image, StyleSheet } from "react-native";
import { Text, Button, List, Divider, Banner } from "react-native-paper";
import { useItems } from "../context/ItemsContext";
import { useCategories } from "../context/CategoriesContext";
import { describeExpiry, toISODate } from "../utils/dates";
import { getExpiryStatus } from "../utils/expiryStatus";
import ExpiryRing from "../components/ExpiryRing";

export default function ItemDetailScreen({ route, navigation }) {
  const { itemId } = route.params; // passed from the Pantry list
  const { items, updateItem } = useItems();
  const { getCategory } = useCategories();
  const [tip, setTip] = useState(""); // message shown by the ring's events

  const item = items.find((i) => i.id === itemId);
  if (!item) {
    return (
      <View style={styles.center}>
        <Text>Item not found.</Text>
      </View>
    );
  }
  const cat = getCategory(item.category);
  const status = getExpiryStatus(item.purchaseDate, item.expiryDate);
  const isActive = item.status === "active";

  // We keep the item and only change its status,
  // so the Impact screen can count eaten vs wasted food later
  const finish = async (newStatus) => {
    await updateItem(item.id, {
      status: newStatus,
      finishedDate: toISODate(new Date()),
    });
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Banner
        visible={!!tip}
        icon="alert-circle-outline"
        actions={[{ label: "Got it", onPress: () => setTip("") }]}
      >
        {tip}
      </Banner>

      {item.photoUri ? (
        <Image source={{ uri: item.photoUri }} style={styles.photo} />
      ) : null}
      <Text variant="headlineSmall" style={styles.title}>
        {item.name}
      </Text>

      {isActive ? (
        <View style={styles.ringRow}>
          <ExpiryRing
            purchaseDate={item.purchaseDate}
            expiryDate={item.expiryDate}
            size={120}
            strokeWidth={10}
            onExpiringSoon={() => setTip("Eat this first to avoid wasting it.")}
            onExpired={() =>
              setTip(
                "This item has expired. Mark it as thrown away if you can't use it.",
              )
            }
          />
          <View style={styles.ringText}>
            <Text variant="titleMedium" style={{ color: status.color }}>
              {status.title}
            </Text>
            <Text variant="bodyMedium">{status.reason}</Text>
          </View>
        </View>
      ) : null}

      <List.Item
        title="Category"
        description={cat.label}
        left={(p) => <List.Icon {...p} icon={cat.icon} />}
      />
      <List.Item
        title="Weight"
        description={`${item.weightKg} kg`}
        left={(p) => <List.Icon {...p} icon="scale" />}
      />
      <List.Item
        title="Added on"
        description={item.purchaseDate}
        left={(p) => <List.Icon {...p} icon="calendar-plus" />}
      />
      <List.Item
        title="Expiry"
        description={`${item.expiryDate} · ${describeExpiry(item.expiryDate)}`}
        left={(p) => <List.Icon {...p} icon="calendar-alert" />}
      />

      <Divider style={styles.divider} />

      {isActive ? (
        <View>
          <Text variant="titleMedium" style={styles.question}>
            What happened to it?
          </Text>
          <Button
            mode="contained"
            icon="silverware-fork-knife"
            onPress={() => finish("eaten")}
            style={styles.button}
          >
            Eaten
          </Button>
          <Button
            mode="outlined"
            icon="delete-outline"
            onPress={() => finish("wasted")}
            style={styles.button}
          >
            Thrown away
          </Button>
        </View>
      ) : (
        <Text variant="bodyLarge" style={styles.question}>
          Marked as {item.status === "eaten" ? "eaten" : "thrown away"} on{" "}
          {item.finishedDate}.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  photo: { width: "100%", aspectRatio: 1, borderRadius: 12, marginBottom: 16 },
  title: { marginBottom: 12 },
  ringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  ringText: { flex: 1 },
  divider: { marginVertical: 16 },
  question: { marginBottom: 12 },
  button: { marginBottom: 12 },
});
