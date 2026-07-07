/* ------------------------------------------------------------------ *
 *  auth.js — the ONLY file that talks to your auth/storage backend.
 *
 *  Accounts are keyed by EMAIL. Right now everything runs in the browser
 *  (localStorage) so the app works the moment you `npm run dev`, with no
 *  keys or server. Passwords are hashed (SHA-256 + a per-user salt),
 *  never stored in plain text.
 *
 *  This is demo-grade, not production security, and there is no real email
 *  yet — "forgot password" resets locally instead of emailing a link. When
 *  you're ready for real Google login, emailed reset links, and cross-device
 *  sync, replace the bodies below with Supabase or Firebase; the rest of the
 *  app only uses this contract:
 *
 *    getCurrentUser()                                        -> user | null
 *    signUp({ email, password, confirm, stayIn })            -> user (throws)
 *    logIn({ email, password, stayIn })                      -> user (throws)
 *    continueWithGoogle({ displayName, stayIn })             -> user
 *    accountExists(email)                                    -> boolean
 *    resetPassword({ email, newPassword, confirm, stayIn })  -> user (throws)
 *    updateDisplayName(username, displayName)                -> user
 *    logOut()                                                -> void
 *
 *  A `user` is: { username, displayName }  (username === the email)
 *
 *  --- Supabase sketch (npm i @supabase/supabase-js) ---
 *    signUp: sb.auth.signUp({ email, password })
 *    logIn:  sb.auth.signInWithPassword({ email, password })
 *    reset:  sb.auth.resetPasswordForEmail(email)   // real emailed link
 *    google: sb.auth.signInWithOAuth({ provider: "google" })
 * ------------------------------------------------------------------ */

const ACCOUNTS = "diary_accounts";
const SESSION = "diary_session";

const read = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const normalizeEmail = (s) => (s || "").trim().toLowerCase();
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());
export const sanitizeUser = (s) =>
  s.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40);

// A friendly default name from the email's local part; the profile step
// lets the user replace it.
function nameFromEmail(email) {
  const local = email.split("@")[0].replace(/[._+-]+/g, " ").trim();
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "You";
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder().encode(salt + "::" + password);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const randomSalt = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");

// "Keep me signed in" -> localStorage (survives restarts).
// Unchecked -> sessionStorage (cleared when the tab closes).
function saveSession(username, stayIn) {
  const store = stayIn ? localStorage : sessionStorage;
  store.setItem(SESSION, JSON.stringify({ username }));
}
function readSession() {
  const raw = localStorage.getItem(SESSION) || sessionStorage.getItem(SESSION);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function getCurrentUser() {
  const s = readSession();
  if (!s?.username) return null;
  const acc = read(ACCOUNTS, {})[s.username];
  return acc ? { username: s.username, displayName: acc.displayName } : null;
}

export function accountExists(email) {
  return !!read(ACCOUNTS, {})[normalizeEmail(email)];
}

export async function signUp({ email, password, confirm, stayIn }) {
  const em = normalizeEmail(email);
  if (!isEmail(em)) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
  if (password !== confirm) throw new Error("The two passwords don't match.");
  const accounts = read(ACCOUNTS, {});
  if (accounts[em]) throw new Error("An account with that email already exists. Try logging in.");
  const salt = randomSalt();
  const displayName = nameFromEmail(em);
  accounts[em] = { provider: "password", email: em, displayName, salt, hash: await hashPassword(password, salt) };
  write(ACCOUNTS, accounts);
  saveSession(em, stayIn);
  return { username: em, displayName };
}

export async function logIn({ email, password, stayIn }) {
  const em = normalizeEmail(email);
  if (!isEmail(em)) throw new Error("Enter the email you signed up with.");
  const acc = read(ACCOUNTS, {})[em];
  if (!acc || acc.provider !== "password") throw new Error("No account found for that email.");
  if ((await hashPassword(password, acc.salt)) !== acc.hash) throw new Error("That password doesn't match.");
  saveSession(em, stayIn);
  return { username: em, displayName: acc.displayName };
}

export async function continueWithGoogle({ displayName, stayIn }) {
  const name = displayName.trim();
  if (!name) throw new Error("Add a name so your pages can greet you.");
  const accounts = read(ACCOUNTS, {});
  const uname = "google_" + sanitizeUser(name);
  const isNew = !accounts[uname]; // first time this Google identity signs in
  accounts[uname] = { ...(accounts[uname] || { provider: "google" }), displayName: name };
  write(ACCOUNTS, accounts);
  saveSession(uname, stayIn);
  return { username: uname, displayName: name, isNew };
}

export async function resetPassword({ email, newPassword, confirm, stayIn }) {
  const em = normalizeEmail(email);
  const accounts = read(ACCOUNTS, {});
  const acc = accounts[em];
  if (!acc || acc.provider !== "password") throw new Error("No account found for that email.");
  if (newPassword.length < 8) throw new Error("Use a new password with at least 8 characters.");
  if (newPassword !== confirm) throw new Error("The two passwords don't match.");
  acc.salt = randomSalt();
  acc.hash = await hashPassword(newPassword, acc.salt);
  accounts[em] = acc;
  write(ACCOUNTS, accounts);
  saveSession(em, stayIn);
  return { username: em, displayName: acc.displayName };
}

// Lets the profile step update the name the diary greets you by.
export function updateDisplayName(username, displayName) {
  const accounts = read(ACCOUNTS, {});
  const acc = accounts[username];
  if (!acc) return null;
  const name = (displayName || "").trim();
  if (name) { acc.displayName = name; accounts[username] = acc; write(ACCOUNTS, accounts); }
  return { username, displayName: acc.displayName };
}

export function logOut() {
  localStorage.removeItem(SESSION);
  sessionStorage.removeItem(SESSION);
}
