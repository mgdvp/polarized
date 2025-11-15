// Firebase Realtime Database user presence utilities
// Creates an online/offline status entry under /status/{uid}
// Structure: { state: 'online'|'offline', last_changed: serverTimestamp() }
import { rtdb } from '../firebase';
import { ref as dbRef, onDisconnect, set, serverTimestamp, onValue } from 'firebase/database';

// Initialize presence for a signed-in user
export function setupPresence(uid) {
  if (!uid || !rtdb) return;
  const statusRef = dbRef(rtdb, `status/${uid}`);
  const offlinePayload = { state: 'offline', last_changed: serverTimestamp() };
  const onlinePayload = { state: 'online', last_changed: serverTimestamp() };

  // Ensure we mark offline when connection closes
  try {
    onDisconnect(statusRef).set(offlinePayload).catch(() => {});
  } catch (_) {}
  // Immediately mark user online
  set(statusRef, onlinePayload).catch(() => {});
}

// Subscribe to a user's presence; callback receives { state, last_changed } or null
export function subscribePresence(uid, cb) {
  if (!uid || !rtdb) return () => {};
  const statusRef = dbRef(rtdb, `status/${uid}`);
  const handler = (snap) => {
    cb(snap.val() || null);
  };
  onValue(statusRef, handler, { onlyOnce: false });
  return () => statusRef && statusRef._callbacks && setTimeout(() => {}, 0); // caller should manage off if needed
}
