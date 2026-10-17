// State layer for the shared household (the ONLINE, real-time part of the app).
// Private pantry  = offline-first, stored on the phone, synced as a backup.
// Household       = shared between users, live updates through Firestore listeners.
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useFeedback } from "./FeedbackContext";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { notifyNow } from "../services/notificationService";
import {
  listenToMyHousehold,
  listenToMyInvites,
  listenToRequests,
  listenToShelf,
  createHousehold,
  inviteMember,
  acceptInvite,
  declineInvite,
  sendRequest,
  completeRequest,
  declineRequest,
  forwardRequest,
  addToShelf,
  finishShelfItem,
} from "../services/householdService";
import { displayName } from "../utils/names";
import { toISODate } from "../utils/dates";

const HouseholdContext = createContext(null);
const RECENT_MS = 5 * 60 * 1000; // only announce things created in the last 5 minutes

export function HouseholdProvider({ children }) {
  const { user } = useAuth();
  const { showMessage } = useFeedback();
  const isOnline = useNetworkStatus();

  // Each piece of state remembers WHO / WHICH household it belongs to,
  // so data from a previous login is never shown to the next user.
  const [householdData, setHouseholdData] = useState({ uid: null, household: null });
  const [inviteData, setInviteData] = useState({ uid: null, list: [] });
  const [requestData, setRequestData] = useState({ hid: null, list: [] });
  const [shelfData, setShelfData] = useState({ hid: null, list: [] });

  // 1. Listen to my household and my invites while logged in
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const stopHousehold = listenToMyHousehold(
      uid,
      (household) => setHouseholdData({ uid, household }),
      () => setHouseholdData({ uid, household: null }),
    );
    const stopInvites = listenToMyInvites(
      user.email,
      (list) => setInviteData({ uid, list }),
      () => setInviteData({ uid, list: [] }),
    );
    return () => {
      stopHousehold();
      stopInvites();
    };
  }, [user]);

  const household =
    user && householdData.uid === user.uid ? householdData.household : null;
  const householdId = household?.id ?? null;
  const loading = !!user && householdData.uid !== user.uid;
  const invites = user && inviteData.uid === user.uid ? inviteData.list : [];
  const requests = requestData.hid === householdId ? requestData.list : [];
  const shelf = shelfData.hid === householdId ? shelfData.list : [];

  // Notification (or in-app message where notifications are not available)
  const announce = useEffectEvent((title, body) => {
    notifyNow(title, body).then((shown) => {
      if (!shown) showMessage(`${title}: ${body}`);
    });
  });

  // 2. Listen to the household's requests and shelf; announce new things from others
  useEffect(() => {
    if (!householdId || !user) return;
    const uid = user.uid;
    const isNewFromOthers = (x, byUid) =>
      byUid !== uid && !x.pending && Date.now() - x.createdAtMs < RECENT_MS;
    let firstRequests = true;
    let firstShelf = true;
    const announced = new Set(); // so the same change is never announced twice

    const stopRequests = listenToRequests(
      householdId,
      (list, added, changed) => {
        setRequestData({ hid: householdId, list });
        if (firstRequests) {
          firstRequests = false; // don't announce what was already there
          return;
        }
        // New request for me (or for anyone)
        added
          .filter((r) => isNewFromOthers(r, r.fromUid) && (!r.toUid || r.toUid === uid))
          .forEach((r) =>
            announce(
              `${r.fromName} asked ${r.toUid ? "you" : "the family"}`,
              r.note ? `${r.text} – "${r.note}"` : r.text,
            ),
          );
        // Someone else bought / declined / forwarded a request that concerns me
        changed.forEach((r) => {
          const action = r.lastAction;
          if (!action || action.byUid === uid || r.pending) return;
          if (Date.now() - r.lastActionAtMs > RECENT_MS) return;
          const key = `${r.id}:${r.lastActionAtMs}`;
          if (announced.has(key)) return;
          announced.add(key);
          if (action.type === "forwarded" && r.toUid === uid)
            announce(`${action.byName} passed a request to you`, r.text);
          else if (action.type === "declined" && r.fromUid === uid)
            announce(`${action.byName} can't get it`, r.text);
          else if (action.type === "bought" && r.fromUid === uid)
            announce(`${action.byName} bought it`, r.text);
        });
      },
      () => setRequestData({ hid: householdId, list: [] }),
    );

    const stopShelf = listenToShelf(
      householdId,
      (list, added) => {
        setShelfData({ hid: householdId, list });
        if (firstShelf) {
          firstShelf = false;
          return;
        }
        added
          .filter((s) => isNewFromOthers(s, s.addedByUid))
          .forEach((s) => announce(`${s.addedByName} shared ${s.name}`, "Added to the family shelf"));
      },
      () => setShelfData({ hid: householdId, list: [] }),
    );

    return () => {
      stopRequests();
      stopShelf();
    };
  }, [householdId, user]);

  // Household membership needs the server, so these require a connection
  const requireOnline = () => {
    if (isOnline !== true) throw new Error("You need to be online to do this.");
  };

  // Names of the members, e.g. { uid1: "Pubudu", uid2: "Mum" }
  const memberNames = Object.fromEntries(
    Object.entries(household?.memberEmails ?? {}).map(([uid, email]) => [uid, displayName(email)]),
  );

  // Open requests addressed to me (or to anyone) from someone else -> tab badge
  const openForMe = user
    ? requests.filter(
        (r) => r.status === "open" && r.fromUid !== user.uid && (!r.toUid || r.toUid === user.uid),
      ).length
    : 0;

  const actions = {
    create: async (name) => {
      requireOnline();
      if (name.trim().length < 2) throw new Error("Please enter a household name.");
      await createHousehold(user, name);
    },
    invite: async (email) => {
      requireOnline();
      const clean = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(clean)) throw new Error("Please enter a valid email.");
      if (clean === user.email.toLowerCase()) throw new Error("That is your own account.");
      if (Object.values(household.memberEmails ?? {}).includes(clean))
        throw new Error("That person is already in your household.");
      await inviteMember(user, household, clean);
    },
    accept: async (invite) => {
      requireOnline();
      await acceptInvite(user, invite);
    },
    decline: async (invite) => {
      requireOnline();
      await declineInvite(invite);
    },

    // The writes below work offline: Firestore queues them and they show as "pending".
    sendRequest: (text, toUid, note = "") => {
      const clean = text.trim();
      if (clean.length < 2 || clean.length > 60)
        throw new Error("Request must be 2–60 characters.");
      if (note.trim().length > 120) throw new Error("Message must be 120 characters or less.");
      return sendRequest(householdId, user, {
        text: clean,
        note,
        toUid,
        toName: toUid ? memberNames[toUid] : null,
      });
    },
    markBought: (request) => completeRequest(householdId, request.id, user),
    declineRequest: (request) => declineRequest(householdId, request.id, user),
    forwardRequest: (request, toUid) =>
      forwardRequest(householdId, request.id, user, toUid, memberNames[toUid]),
    addToShelf: (item) => addToShelf(householdId, user, item),
    finishShelfItem: (item, status) =>
      finishShelfItem(householdId, item.id, user, status, toISODate(new Date())),
  };

  return (
    <HouseholdContext.Provider
      value={{
        household,
        loading,
        invites,
        requests,
        shelf,
        memberNames,
        openForMe,
        isOnline,
        ...actions,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export const useHousehold = () => useContext(HouseholdContext);
