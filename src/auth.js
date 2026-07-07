/* ------------------------------------------------------------------ *
 *  auth.js — the ONLY file that talks to your auth/storage backend.
 *
 *  Right now it runs entirely in the browser (localStorage) so the app
 *  works the moment you `npm run dev`, with no keys or server. Passwords
 *  are hashed (SHA-256 + per-user salt), never stored in plain text.
 *
 *  This is demo-grade, not production security. When you're ready for
 *  real Google login + cross-device sync, replace the bodies of the five
 *  exported functions with Supabase or Firebase calls — the rest of the
 *  app (LoginPage, App) never changes, because it only uses this contract:
 *
 *    getCurrentUser()                                   -> user | null
 *    signUp({ username, displayName, password, stayIn })-> user   (throws Error)
 *    logIn({ username, password, stayIn })              -> user   (throws Error)
 *    continueWithGoogle({ displayName, stayIn })        -> user
 *    resetPassword({ username, newPassword, confirm, stayIn }) -> user (throws)
 *    logOut()                                           -> void
 *
 *  A `user` is: { username, displayName }
 *
 *  --- Supabase sketch (npm i @supabase/supabase-js) ---
 *    import { createClient } from "@supabase/supabase-js";
 *    const sb = createClient(URL, ANON_KEY);
 *    logIn:  await sb.auth.signInWithPassword({ email, password })
 *    signUp: await sb.auth.signUp({ email, password, options:{ data:{ displayName } } })
 *    google: await sb.auth.signInWithOAuth({ provider: "google" })   // real redirect
 *    reset:  await sb.auth.resetPasswordForEmail(email)              // real email
 *    session:await sb.auth.getUser()
 *
 *  --- Firebase sketch (npm i firebase) ---
 *    signInWithEmailAndPassword / createUserWithEmailAndPassword
 *    signInWithPopup(auth, new GoogleAuthProvider())
 *    sendPasswordResetEmail(auth, email)
 *    onAuthStateChanged(auth, cb)
 * ------------------------------------------------------------------ */

const ACCOUNTS = "diary_accounts";
const SESSION = "diary_session";

const read = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const sanitizeUser = (s) =>
  s.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40);

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

export async function signUp({ username, displayName, password, stayIn }) {
  const uname = sanitizeUser(username);
  if (!uname) throw new Error("Pick a username (letters, numbers, or underscores).");
  if (password.length < 4) throw new Error("Use a password with at least 4 characters.");
  const accounts = read(ACCOUNTS, {});
  if (accounts[uname]) throw new Error("That username is taken. Try logging in.");
  const salt = randomSalt();
  const name = displayName.trim() || username.trim();
  accounts[uname] = { provider: "password", displayName: name, salt, hash: await hashPassword(password, salt) };
  write(ACCOUNTS, accounts);
  saveSession(uname, stayIn);
  return { username: uname, displayName: name };
}

export async function logIn({ username, password, stayIn }) {
  const uname = sanitizeUser(username);
  if (!uname) throw new Error("Enter your username.");
  const acc = read(ACCOUNTS, {})[uname];
  if (!acc || acc.provider !== "password") throw new Error("No account with that username yet.");
  if ((await hashPassword(password, acc.salt)) !== acc.hash) throw new Error("That password doesn't match.");
  saveSession(uname, stayIn);
  return { username: uname, displayName: acc.displayName };
}

export async function continueWithGoogle({ displayName, stayIn }) {
  const name = displayName.trim();
  if (!name) throw new Error("Add a name so your pages can greet you.");
  const accounts = read(ACCOUNTS, {});
  const uname = "google_" + sanitizeUser(name);
  accounts[uname] = { ...(accounts[uname] || { provider: "google" }), displayName: name };
  write(ACCOUNTS, accounts);
  saveSession(uname, stayIn);
  return { username: uname, displayName: name };
}

export async function resetPassword({ username, newPassword, confirm, stayIn }) {
  const uname = sanitizeUser(username);
  if (!uname) throw new Error("Enter your username.");
  const accounts = read(ACCOUNTS, {});
  const acc = accounts[uname];
  if (!acc || acc.provider !== "password") throw new Error("No password account with that username.");
  if (newPassword.length < 4) throw new Error("Use a new password with at least 4 characters.");
  if (newPassword !== confirm) throw new Error("The two passwords don't match.");
  acc.salt = randomSalt();
  acc.hash = await hashPassword(newPassword, acc.salt);
  accounts[uname] = acc;
  write(ACCOUNTS, accounts);
  saveSession(uname, stayIn);
  return { username: uname, displayName: acc.displayName };
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
