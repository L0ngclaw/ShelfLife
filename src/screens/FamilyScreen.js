// Family tab: the shared, online part of ShelfLife
//  - Requests:     "Pubudu asked Mum: Buy milk" (live for every member)
//  - Family shelf: food shared by the household (live)
//  - Members:      who is in the household + in-app invites
import { useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  List,
  Chip,
  Icon,
  ActivityIndicator,
  HelperText,
  SegmentedButtons,
  Portal,
  Dialog,
} from "react-native-paper";
import { useAuth } from "../context/AuthContext";
import { useHousehold } from "../context/HouseholdContext";
import { useFeedback } from "../context/FeedbackContext";
import { describeExpiry, timeAgo } from "../utils/dates";
import ExpiryRing from "../components/ExpiryRing";
import { formatAmount } from "../utils/amount";
import { theme } from "../theme";

export default function FamilyScreen({ navigation }) {
  const { user } = useAuth();
  const h = useHousehold();
  const { showMessage } = useFeedback();
  const [section, setSection] = useState("requests");
  const [householdName, setHouseholdName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [requestText, setRequestText] = useState("");
  const [requestFor, setRequestFor] = useState(null); // null = anyone
  const [requestNote, setRequestNote] = useState(""); // optional message
  const [forwarding, setForwarding] = useState(null); // request being forwarded
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [selectedShelfItem, setSelectedShelfItem] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Runs an online-only action with a loading state and a friendly error
  const run = async (action, successMessage) => {
    setError("");
    setBusy(true);
    try {
      await action();
      if (successMessage) showMessage(successMessage);
      return true;
    } catch (e) {
      setError(
        e.code === "permission-denied"
          ? "The server refused this (permission denied). Check that the latest Firestore rules are published."
          : e.message,
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Offline-capable writes: not awaited, Firestore queues them while offline
  const queueWrite = (write) => {
    write.catch(() => setError("Could not save that change. Please try again."));
  };

  const handleSendRequest = () => {
    setError("");
    try {
      queueWrite(h.sendRequest(requestText, requestFor, requestNote));
      setRequestText("");
      setRequestNote("");
      showMessage(
        h.isOnline === false
          ? "Saved – it will be sent when you're back online"
          : "Request sent",
      );
    } catch (e) {
      setError(e.message); // validation error
    }
  };

  const handleDecline = (request) => {
    queueWrite(h.declineRequest(request));
    showMessage(`You declined "${request.text}"`);
  };

  const handleForward = (toUid) => {
    const request = forwarding;
    setForwarding(null);
    queueWrite(h.forwardRequest(request, toUid));
    showMessage(`"${request.text}" passed to ${h.memberNames[toUid]}`);
  };

  // Chip style: solid green with white text when selected, so the choice is obvious
  const chipProps = (selected) => ({
    selected,
    showSelectedCheck: false,
    selectedColor: selected ? theme.colors.onPrimary : undefined,
    style: [styles.chip, selected && styles.chipSelected],
  });

  const handleBought = (request) => {
    queueWrite(h.markBought(request));
    showMessage(`Marked "${request.text}" as bought`);
  };

  const handleFinishShelfItem = (status) => {
    const item = selectedShelfItem;
    setSelectedShelfItem(null);
    queueWrite(h.finishShelfItem(item, status));
    showMessage(`${item.name} marked as ${status === "eaten" ? "eaten" : "thrown away"}`);
  };

  if (h.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const offlineBanner =
    h.isOnline === false ? (
      <View style={styles.offline}>
        <Icon source="cloud-off-outline" size={18} color="#5D4037" />
        <Text variant="bodySmall" style={styles.offlineText}>
          {"Offline – new requests are queued and sent when you're back online."}
        </Text>
      </View>
    ) : null;

  // ---------- Not in a household yet ----------
  if (!h.household) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {offlineBanner}
        {h.invites.map((inv) => (
          <Card key={inv.id} style={styles.card}>
            <Card.Title
              title={`Join "${inv.householdName}"`}
              subtitle={`Invited by ${inv.fromEmail}`}
              left={(p) => <List.Icon {...p} icon="email-open-outline" />}
            />
            <Card.Actions>
              <Button disabled={busy} onPress={() => run(() => h.decline(inv), "Invite declined")}>
                Decline
              </Button>
              <Button
                mode="contained"
                disabled={busy}
                onPress={() => run(() => h.accept(inv), `You joined ${inv.householdName}`)}
              >
                Accept
              </Button>
            </Card.Actions>
          </Card>
        ))}

        <Card style={styles.card}>
          <Card.Title
            title="Create a household"
            subtitle="Share a shelf and shopping requests with your family"
          />
          <Card.Content>
            <TextInput
              label="Household name"
              mode="outlined"
              value={householdName}
              onChangeText={setHouseholdName}
              maxLength={30}
            />
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              icon="home-plus-outline"
              loading={busy}
              disabled={busy}
              onPress={() => run(() => h.create(householdName), "Household created")}
            >
              Create
            </Button>
          </Card.Actions>
        </Card>

        <Text variant="bodySmall" style={styles.hint}>
          Waiting for an invite? Ask a family member to invite your ShelfLife email ({user?.email}).
        </Text>
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      </ScrollView>
    );
  }

  // ---------- In a household ----------
  const otherMembers = Object.entries(h.memberNames).filter(([uid]) => uid !== user.uid);
  const activeShelf = h.shelf
    .filter((s) => s.status === "active")
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  const sortedRequests = [...h.requests].sort(
    (a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1),
  );

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {offlineBanner}
        <Text variant="titleLarge">{h.household.name}</Text>
        <Text variant="bodySmall" style={styles.subtle}>
          {Object.values(h.memberNames).join(", ")}
        </Text>

        <SegmentedButtons
          value={section}
          onValueChange={setSection}
          style={styles.segments}
          buttons={[
            { value: "requests", label: "Requests", icon: "cart-outline" },
            { value: "shelf", label: "Shelf", icon: "fridge-outline" },
            { value: "members", label: "Members", icon: "account-group-outline" },
          ]}
        />

        {section === "requests" && (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <TextInput
                  label="What do you need?"
                  placeholder="e.g. Milk 2 L"
                  mode="outlined"
                  value={requestText}
                  onChangeText={setRequestText}
                  maxLength={60}
                />
                <TextInput
                  label="Message (optional)"
                  placeholder="e.g. The low-fat one, please"
                  mode="outlined"
                  value={requestNote}
                  onChangeText={setRequestNote}
                  maxLength={120}
                  multiline
                  style={styles.noteInput}
                />
                <Text variant="labelMedium" style={styles.forLabel}>
                  Ask
                </Text>
                <View style={styles.chips}>
                  <Chip {...chipProps(requestFor === null)} onPress={() => setRequestFor(null)}>
                    Anyone
                  </Chip>
                  {otherMembers.map(([uid, name]) => (
                    <Chip key={uid} {...chipProps(requestFor === uid)} onPress={() => setRequestFor(uid)}>
                      {name}
                    </Chip>
                  ))}
                </View>
              </Card.Content>
              <Card.Actions>
                <Button mode="contained" icon="send" onPress={handleSendRequest}>
                  Send request
                </Button>
              </Card.Actions>
            </Card>

            {sortedRequests.length === 0 ? (
              <Text variant="bodyMedium" style={styles.hint}>
                No requests yet. Ask your family to buy something!
              </Text>
            ) : null}

            {sortedRequests.map((r) => {
              const open = r.status === "open";
              const declined = r.status === "declined";
              const forMe = r.toUid === user.uid;
              const fromName = r.fromUid === user.uid ? "You" : r.fromName;
              const toName = !r.toUid ? "anyone" : forMe ? "you" : r.toName;
              const forwarded = r.forwardedByName ? ` · passed on by ${r.forwardedByName}` : "";
              const status = r.pending
                ? "Sending…"
                : open
                  ? `${timeAgo(r.createdAtMs)} · Open${forwarded}`
                  : declined
                    ? `✗ Declined by ${r.declinedByName}`
                    : `✓ Bought by ${r.doneByUid === user.uid ? "you" : r.doneByName}`;
              return (
                <Card key={r.id} style={[styles.card, !open && styles.done]}>
                  <Card.Title
                    title={`${fromName} asked ${toName}: ${r.text}`}
                    titleNumberOfLines={2}
                    subtitle={status}
                    subtitleNumberOfLines={2}
                    left={(p) => (
                      <List.Icon
                        {...p}
                        icon={
                          r.pending
                            ? "clock-outline"
                            : open
                              ? "cart-outline"
                              : declined
                                ? "close-circle-outline"
                                : "check-circle-outline"
                        }
                      />
                    )}
                  />
                  {r.note ? (
                    <Card.Content>
                      <View style={styles.note}>
                        <Icon source="message-text-outline" size={16} color="#616161" />
                        <Text variant="bodyMedium" style={styles.noteText}>
                          {r.note}
                        </Text>
                      </View>
                    </Card.Content>
                  ) : null}
                  <Card.Actions>
                    {open && forMe ? (
                      <Button icon="close" onPress={() => handleDecline(r)}>
                        Decline
                      </Button>
                    ) : null}
                    {open && forMe && otherMembers.length > 0 ? (
                      <Button icon="share-outline" onPress={() => setForwarding(r)}>
                        Forward
                      </Button>
                    ) : null}
                    {open ? (
                      <Button mode={forMe ? "contained" : "text"} icon="check" onPress={() => handleBought(r)}>
                        Bought
                      </Button>
                    ) : null}
                    {!open && r.doneByUid === user.uid ? (
                      <Button
                        icon="fridge-outline"
                        onPress={() => navigation.navigate("AddItem", { presetName: r.text })}
                      >
                        Add to my shelf
                      </Button>
                    ) : null}
                  </Card.Actions>
                </Card>
              );
            })}
          </>
        )}

        {section === "shelf" && (
          <>
            <Text variant="bodySmall" style={styles.hint}>
              Items everyone in the household can see. Add one with the “Family shelf”
              switch on Add item, or “Share with family” on an item.
            </Text>
            {activeShelf.length === 0 ? (
              <Text variant="bodyMedium" style={styles.hint}>
                The family shelf is empty.
              </Text>
            ) : null}
            {activeShelf.map((s) => (
              <Card key={s.id} style={styles.card} onPress={() => setSelectedShelfItem(s)}>
                <Card.Title
                  title={s.name}
                  subtitle={`${s.categoryLabel} · ${formatAmount(s)} · ${describeExpiry(s.expiryDate)}${
                    s.pending ? " · Sending…" : ` · by ${s.addedByUid === user.uid ? "you" : s.addedByName}`
                  }`}
                  subtitleNumberOfLines={2}
                  left={(p) => <List.Icon {...p} icon={s.categoryIcon || "food"} />}
                  right={() => (
                    <View style={styles.ring}>
                      <ExpiryRing purchaseDate={s.purchaseDate} expiryDate={s.expiryDate} />
                    </View>
                  )}
                />
              </Card>
            ))}
          </>
        )}

        {section === "members" && (
          <>
            <Card style={styles.card}>
              <Card.Title title="Members" />
              <Card.Content>
                {Object.entries(h.household.memberEmails ?? {}).map(([uid, email]) => (
                  <List.Item
                    key={uid}
                    title={uid === user.uid ? `${h.memberNames[uid]} (you)` : h.memberNames[uid]}
                    description={email}
                    left={(p) => <List.Icon {...p} icon="account-outline" />}
                  />
                ))}
              </Card.Content>
            </Card>
            <Card style={styles.card}>
              <Card.Title
                title="Invite a family member"
                subtitle="Enter their ShelfLife account email – the invite appears in their app"
                subtitleNumberOfLines={2}
              />
              <Card.Content>
                <TextInput
                  label="Their ShelfLife email"
                  mode="outlined"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  icon="account-plus-outline"
                  loading={busy}
                  disabled={busy}
                  onPress={async () => {
                    const sent = await run(
                      () => h.invite(inviteEmail),
                      `Invite sent to ${inviteEmail.trim()}`,
                    );
                    if (sent) setInviteEmail("");
                  }}
                >
                  Send invite
                </Button>
              </Card.Actions>
            </Card>

            <Button
              mode="outlined"
              icon="exit-run"
              textColor="#C62828"
              style={styles.leaveButton}
              onPress={() => setConfirmLeave(true)}
            >
              Leave household
            </Button>
          </>
        )}

        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      </ScrollView>

      <Portal>
        <Dialog visible={confirmLeave} onDismiss={() => setConfirmLeave(false)}>
          <Dialog.Icon icon="exit-run" />
          <Dialog.Title style={styles.centerText}>Leave {h.household.name}?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              You will lose access to its shelf and requests. Your personal shelf is not
              affected. You can join again if someone invites you.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmLeave(false)}>Cancel</Button>
            <Button
              textColor="#C62828"
              disabled={busy}
              onPress={async () => {
                setConfirmLeave(false);
                await run(() => h.leave(), `You left ${h.household.name}`);
              }}
            >
              Leave
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!forwarding} onDismiss={() => setForwarding(null)}>
          <Dialog.Title>Pass this request on</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.forwardText}>
              Who should get “{forwarding?.text}”?
            </Text>
            {otherMembers.map(([uid, name]) => (
              <List.Item
                key={uid}
                title={name}
                left={(p) => <List.Icon {...p} icon="account-arrow-right-outline" />}
                onPress={() => handleForward(uid)}
              />
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setForwarding(null)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!selectedShelfItem} onDismiss={() => setSelectedShelfItem(null)}>
          <Dialog.Title>{selectedShelfItem?.name}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">What happened to it?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelectedShelfItem(null)}>Cancel</Button>
            <Button onPress={() => handleFinishShelfItem("wasted")}>Thrown away</Button>
            <Button mode="contained" onPress={() => handleFinishShelfItem("eaten")}>
              Eaten
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { marginBottom: 12 },
  done: { opacity: 0.6 },
  subtle: { color: "#616161", marginBottom: 12 },
  segments: { marginBottom: 12 },
  forLabel: { marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  chip: { marginRight: 8, marginBottom: 8 },
  chipSelected: { backgroundColor: theme.colors.primary },
  noteInput: { marginTop: 8 },
  note: { flexDirection: "row", gap: 8, backgroundColor: "#F1F8E9", borderRadius: 8, padding: 8 },
  noteText: { flex: 1, fontStyle: "italic" },
  forwardText: { marginBottom: 8 },
  leaveButton: { marginTop: 8, borderColor: "#C62828" },
  centerText: { textAlign: "center" },
  hint: { textAlign: "center", color: "#616161", marginVertical: 8 },
  ring: { marginRight: 12 },
  offline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF8E1",
    padding: 8,
    marginBottom: 12,
  },
  offlineText: { flex: 1, color: "#5D4037" },
});
