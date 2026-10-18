// "Use some" dialog: the user enters how much of an item they used.
// Works for counted items (pcs) and weighed items (kg), on both shelves.
//
// Props:  item (the item being used), visible (bool)
// Events: onUse({ changes, finished }), onDismiss
// Mount it with key={item.id} so the input starts empty for each item.
import { useState } from "react";
import { StyleSheet } from "react-native";
import { Portal, Dialog, Text, Button, TextInput, HelperText } from "react-native-paper";
import { formatAmount, remainingAfterUse } from "../utils/amount";

export default function UseSomeDialog({ item, visible, onUse, onDismiss }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  if (!item) return null;

  const byCount = item.unit === "pcs";

  const confirm = () => {
    try {
      onUse(remainingAfterUse(item, amount));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Use some {item.name}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.left}>
            Left now: {formatAmount(item)}
          </Text>
          <TextInput
            label={byCount ? "How many did you use? (pcs)" : "How much did you use? (kg)"}
            mode="outlined"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              setError("");
            }}
            keyboardType={byCount ? "number-pad" : "decimal-pad"}
            autoFocus
          />
          <HelperText type={error ? "error" : "info"} visible>
            {error || "If you use all of it, the item is marked as eaten."}
          </HelperText>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button mode="contained" onPress={confirm}>
            Use
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { borderRadius: 20 },
  left: { marginBottom: 12 },
});
