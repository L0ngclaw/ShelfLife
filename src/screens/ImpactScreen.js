import { useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { Text, Card, Snackbar, Icon, SegmentedButtons } from "react-native-paper";
import { useItems } from "../context/ItemsContext";
import { useCategories } from "../context/CategoriesContext";
import { useHousehold } from "../context/HouseholdContext";
import { calculateImpact, RESCUE_GOAL } from "../utils/impact";
import { toISODate } from "../utils/dates";
import RescueGauge from "../components/RescueGauge";

// Small stat box used three times below
function Stat({ icon, value, label, color }) {
  return (
    <Card style={styles.stat}>
      <Card.Content style={styles.statContent}>
        <Icon source={icon} size={22} color={color} />
        <Text variant="headlineSmall" style={styles.statValue}>
          {value}
        </Text>
        <Text variant="bodySmall" style={styles.statLabel}>
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function ImpactScreen() {
  const { items } = useItems();
  const { getCategory } = useCategories();
  const { household, shelf } = useHousehold();
  const [celebrate, setCelebrate] = useState(false);
  const [scope, setScope] = useState("personal"); // "personal" or a household id

  // Which items to measure: my private pantry, or the household's family shelf
  const showFamily = !!household && scope === household.id;
  const source = showFamily ? shelf : items;

  const thisMonth = toISODate(new Date()).slice(0, 7); // 'YYYY-MM'
  const month = calculateImpact(source, getCategory, thisMonth);
  const allTime = calculateImpact(source, getCategory);
  const monthName = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Only celebrate once there is enough data (1 of 1 eaten = 100% is not much of a goal)
  const enoughData = month.finishedCount >= 3;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        {household ? (
          <SegmentedButtons
            value={showFamily ? household.id : "personal"}
            onValueChange={setScope}
            style={styles.scope}
            buttons={[
              { value: "personal", label: "Personal", icon: "account-outline" },
              { value: household.id, label: household.name, icon: "account-group-outline" },
            ]}
          />
        ) : null}

        <Text variant="titleLarge" style={styles.heading}>
          {monthName}
        </Text>
        <Text variant="bodySmall" style={styles.scopeNote}>
          {showFamily
            ? `Family shelf of ${household.name} – everyone's eaten and thrown-away items`
            : "Your private pantry"}
        </Text>

        <Card style={styles.card}>
          <Card.Content style={styles.gaugeBox}>
            <RescueGauge
              value={month.rescueRate}
              goal={RESCUE_GOAL}
              caption={
                month.finishedCount
                  ? `${month.eatenCount} of ${month.finishedCount} finished items were eaten`
                  : "No finished items yet this month"
              }
              onGoalReached={enoughData ? () => setCelebrate(true) : undefined}
            />
            <Text variant="bodySmall" style={styles.hint}>
              Rescue rate = food you ate instead of throwing away. Goal: {RESCUE_GOAL}% (the
              marker on the gauge).
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.row}>
          <Stat icon="silverware-fork-knife" value={month.eatenCount} label="Eaten" color="#2E7D32" />
          <Stat icon="delete-outline" value={month.wastedCount} label="Thrown away" color="#C62828" />
          <Stat
            icon="timer-sand"
            value={month.justInTimeCount}
            label="Saved just in time"
            color="#F9A825"
          />
        </View>
        <Text variant="bodySmall" style={styles.note}>
          “Saved just in time” = eaten while its ring was amber or red.
        </Text>

        <Card style={styles.card}>
          <Card.Title title="Most wasted category" />
          <Card.Content>
            {month.topWaste ? (
              <Text variant="bodyMedium">
                {month.topWaste.label}: thrown away {month.topWaste.count} time
                {month.topWaste.count === 1 ? "" : "s"} this month. Try buying smaller amounts.
              </Text>
            ) : (
              <Text variant="bodyMedium">Nothing thrown away this month. Great job!</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="All time" />
          <Card.Content>
            <Text variant="bodyMedium">
              Rescue rate {allTime.rescueRate}% · {allTime.eatenCount} eaten ·{" "}
              {allTime.wastedCount} thrown away · {allTime.justInTimeCount} saved just in time
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar visible={celebrate} onDismiss={() => setCelebrate(false)} duration={4000}>
        Goal reached! You ate {RESCUE_GOAL}% or more of your food this month.
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16 },
  heading: { marginBottom: 2 },
  scope: { marginBottom: 16 },
  scopeNote: { color: "#616161", marginBottom: 12 },
  card: { marginBottom: 12 },
  gaugeBox: { alignItems: "center" },
  hint: { textAlign: "center", marginTop: 8, color: "#616161" },
  row: { flexDirection: "row", gap: 8, marginBottom: 4 },
  stat: { flex: 1 },
  statContent: { alignItems: "center" },
  statValue: { marginTop: 4 },
  statLabel: { textAlign: "center" },
  note: { color: "#616161", marginBottom: 12, marginLeft: 4 },
});
