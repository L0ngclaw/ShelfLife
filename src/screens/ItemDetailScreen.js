import { useState } from "react";
import { ScrollView, View, Image, StyleSheet } from "react-native";
import { Text, Button, List, Divider, Banner } from "react-native-paper";
import { useItems } from "../context/ItemsContext";
import { useCategories } from "../context/CategoriesContext";
import { describeExpiry, toISODate } from "../utils/dates";
import { getExpiryStatus } from "../utils/expiryStatus";
import ExpiryRing from "../components/ExpiryRing";
import UseSomeDialog from "../components/UseSomeDialog";
import { useFeedback } from "../context/FeedbackContext";
import { useHousehold } from "../context/HouseholdContext";
import { formatAmount } from "../utils/amount";

export default function ItemDetailScreen({ route, navigation }) {
  const { itemId } = route.params; // passed from the Pantry list
  const { items, updateItem, recordPartialUse } = useItems();
  const { getCategory } = useCategories();
  const { household, addToShelf } = useHousehold();
  const [tip, setTip] = useState(""); // message shown by the ring's events
  const [using, setUsing] = useState(false); // "Use some" dialog open

  const item = items.find((i) => i.id === itemId);
  const { showMessage } = useFeedback();
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
    showMessage(
      newStatus === "eaten"
        ? `Nice! ${item.name} marked as eaten`
        : `${item.name} marked as thrown away`,
    );
    navigation.goBack();
  };

  // Part of the item was used: lower the amount, or mark as eaten when none is left
  const handleUse = async ({ changes, used, finished }) => {
    setUsing(false);
    if (finished) return finish("eaten");
    await recordPartialUse(item.id, changes, used); // the used part counts as eaten
    showMessage(`${item.name}: ${formatAmount({ ...item, ...changes })} left`);
  };

  // Move a private item to the shared family shelf.
  // The private copy gets status "shared" so it leaves the pantry and Impact.
  const shareWithFamily = async () => {
    addToShelf({
      name: item.name,
      category: item.category,
      categoryLabel: cat.label,
      categoryIcon: cat.icon,
      weightKg: item.weightKg,
      unit: item.unit ?? "kg",
      quantity: item.quantity ?? null,
      weightPerItemKg: item.weightPerItemKg ?? null,
      purchaseDate: item.purchaseDate,
      expiryDate: item.expiryDate,
    }).catch(() => showMessage("Could not share the item. Please try again."));
    await updateItem(item.id, { status: "shared" });
    showMessage(`${item.name} moved to the family shelf`);
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
        title="Amount"
        description={formatAmount(item)}
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

      {isActive ? (
        <View style={styles.actionRow}>
          <Button
            mode="outlined"
            icon="minus-circle-outline"
            onPress={() => setUsing(true)}
            style={styles.actionButton}
          >
            Use some
          </Button>
          <Button
            mode="outlined"
            icon="pencil-outline"
            onPress={() => navigation.navigate("AddItem", { editItemId: item.id })}
            style={styles.actionButton}
          >
            Edit
          </Button>
        </View>
      ) : null}

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
          {household ? (
            <Button
              mode="text"
              icon="account-group-outline"
              onPress={shareWithFamily}
              style={styles.button}
            >
              Share with family
            </Button>
          ) : null}
        </View>
      ) : (
        <Text variant="bodyLarge" style={styles.question}>
          Marked as {item.status === "eaten" ? "eaten" : "thrown away"} on{" "}
          {item.finishedDate}.
        </Text>
      )}

      <UseSomeDialog
        key={`${item.id}-${using}`}
        item={item}
        visible={using}
        onUse={handleUse}
        onDismiss={() => setUsing(false)}
      />
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
  actionRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionButton: { flex: 1 },
  question: { marginBottom: 12 },
  button: { marginBottom: 12 },
});
