// Explains the ExpiryRing colours using real sample rings (the same component
// the pantry uses), so the legend always matches what the user sees.
//
// Props:  visible (bool), onDismiss (function)
import { View, StyleSheet } from "react-native";
import { Portal, Dialog, Text, Button, Divider } from "react-native-paper";
import ExpiryRing from "./ExpiryRing";
import { EXPIRY_LEVELS } from "../utils/expiryStatus";
import { toISODate } from "../utils/dates";

// A date `days` away from today, as 'YYYY-MM-DD'
const fromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

// Sample items that land in each colour
const SAMPLES = [
  { level: "fresh", purchaseDate: fromToday(-2), expiryDate: fromToday(12) },
  { level: "soon", purchaseDate: fromToday(-4), expiryDate: fromToday(3) },
  { level: "urgent", purchaseDate: fromToday(-6), expiryDate: fromToday(1) },
  { level: "expired", purchaseDate: fromToday(-5), expiryDate: fromToday(-1) },
];

export default function ExpiryLegendDialog({ visible, onDismiss }) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Reading the expiry ring</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.intro}>
            The ring shows how much shelf life is left. The number is the days
            left.
          </Text>

          {SAMPLES.map((sample, index) => {
            const info = EXPIRY_LEVELS[sample.level];
            return (
              <View key={sample.level}>
                {index > 0 && <Divider style={styles.divider} />}
                <View style={styles.row}>
                  <ExpiryRing
                    purchaseDate={sample.purchaseDate}
                    expiryDate={sample.expiryDate}
                    size={48}
                    strokeWidth={5}
                  />
                  <View style={styles.text}>
                    <Text variant="titleSmall" style={{ color: info.color }}>
                      {info.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.description}>
                      {info.description}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          <Text variant="bodySmall" style={styles.footer}>
            The colour uses whichever is more urgent: days left or the share of
            shelf life left.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="contained" onPress={onDismiss}>
            Got it
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { borderRadius: 20 },
  intro: { marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  text: { flex: 1, marginLeft: 16 },
  description: { color: "#616161", marginTop: 2 },
  divider: { marginLeft: 64 },
  footer: { color: "#616161", marginTop: 12, fontStyle: "italic" },
});
