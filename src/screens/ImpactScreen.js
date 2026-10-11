import { useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { Text, Card, Snackbar } from "react-native-paper";
import { useItems } from "../context/ItemsContext";
import { useCategories } from "../context/CategoriesContext";
import { calculateImpact, MONTHLY_GOAL_KG } from "../utils/impact";
import { toISODate } from "../utils/dates";
import CO2SavingsGauge from "../components/CO2SavingsGauge";

// Small stat box used three times below
function Stat({ value, label }) {
  return (
    <Card style={styles.stat}>
      <Card.Content style={styles.statContent}>
        <Text variant="headlineSmall">{value}</Text>
        <Text variant="bodySmall">{label}</Text>
      </Card.Content>
    </Card>
  );
}

export default function ImpactScreen() {
  const { items } = useItems();
  const { getCategory } = useCategories();
  const [celebrate, setCelebrate] = useState(false);

  const thisMonth = toISODate(new Date()).slice(0, 7); // 'YYYY-MM'
  const month = calculateImpact(items, getCategory, thisMonth);
  const allTime = calculateImpact(items, getCategory);
  const monthName = new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="titleLarge" style={styles.heading}>
          {monthName}
        </Text>

        <Card style={styles.card}>
          <Card.Content style={styles.gaugeBox}>
            <CO2SavingsGauge
              savedKg={month.savedKg}
              wastedKg={month.wastedKg}
              monthlyGoalKg={MONTHLY_GOAL_KG}
              onGoalReached={() => setCelebrate(true)}
            />
            <Text variant="bodySmall" style={styles.hint}>
              CO₂ saved = the emissions of food you ate instead of throwing
              away.
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.row}>
          <Stat value={month.eatenCount} label="Eaten" />
          <Stat value={month.wastedCount} label="Thrown away" />
          <Stat
            value={`${Math.round(month.wasteRate * 100)}%`}
            label="Waste rate"
          />
        </View>

        {month.topWaste ? (
          <Card style={styles.card}>
            <Card.Title
              title="Biggest source of waste"
              left={(p) => <Card.Title title="Biggest source of waste" />}
            />
            <Card.Content>
              <Text variant="bodyMedium">
                {month.topWaste.label}: {month.topWaste.co2Kg.toFixed(1)} kg CO₂
                this month. Try buying smaller amounts.
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {month.eatenCount + month.wastedCount === 0 ? (
          <Text variant="bodyMedium" style={styles.hint}>
            Mark items as eaten or thrown away to see your impact.
          </Text>
        ) : null}

        <Card style={styles.card}>
          <Card.Title title="All time" />
          <Card.Content>
            <Text variant="bodyMedium">
              {allTime.savedKg.toFixed(1)} kg CO₂ saved ·{" "}
              {allTime.wastedKg.toFixed(1)} kg CO₂ wasted
            </Text>
            <Text variant="bodyMedium">
              {allTime.wastedFoodKg.toFixed(1)} kg of food thrown away
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={celebrate}
        onDismiss={() => setCelebrate(false)}
        duration={4000}
      >
        Monthly goal reached! You saved {MONTHLY_GOAL_KG} kg of CO₂.
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16 },
  heading: { marginBottom: 12 },
  card: { marginBottom: 12 },
  gaugeBox: { alignItems: "center" },
  hint: { textAlign: "center", marginTop: 8, color: "#616161" },
  row: { flexDirection: "row", gap: 8, marginBottom: 12 },
  stat: { flex: 1 },
  statContent: { alignItems: "center" },
});
