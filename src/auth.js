/* auth.js — real authentication via Supabase (email + password).
   Sessions persist in the browser and sync across devices; password reset
   sends a real email with a link back to the app. The rest of the app speaks
   to this contract:

     getCurrentUser()                  -> user | null   (async)
     signUp({ email, password, confirm })  -> user      (async, throws)
     logIn({ email, password })            -> user      (async, throws)
     sendPasswordReset(email)              -> void       (async, throws)
     setNewPassword(newPassword)           -> user       (async, throws)
     onAuthChange(cb)                      -> subscription
     logOut()                              -> void        (async)

   A `user` is: { id, email, displayName }  (id === the auth uid) */

import { supabase } from "./supabase.js";

export const normalizeEmail = (s) => (s || "").trim().toLowerCase();
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());

// Where emailed links (password reset) return to — the deployed app.
const redirectTo = () => window.location.origin + import.meta.env.BASE_URL;

function toUser(u) {
  if (!u) return null;
  const fallback = u.email ? u.email.split("@")[0] : "You";
  return { id: u.id, email: u.email, displayName: u.user_metadata?.display_name || fallback };
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session ? toUser(data.session.user) : null;
}

export async function signUp({ email, password, confirm }) {
  const em = normalizeEmail(email);
  if (!isEmail(em)) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
  if (password !== confirm) throw new Error("The two passwords don't match.");
  const { data, error } = await supabase.auth.signUp({ email: em, password });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error("Check your email to confirm your account, then log in.");
  return toUser(data.user);
}

export async function logIn({ email, password }) {
  const em = normalizeEmail(email);
  if (!isEmail(em)) throw new Error("Enter the email you signed up with.");
  const { data, error } = await supabase.auth.signInWithPassword({ email: em, password });
  if (error) throw new Error(error.message === "Invalid login credentials"
    ? "That email or password doesn't match." : error.message);
  return toUser(data.user);
}

export async function sendPasswordReset(email) {
  const em = normalizeEmail(email);
  if (!isEmail(em)) throw new Error("Enter a valid email address.");
  const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: redirectTo() });
  if (error) throw new Error(error.message);
  // Deliberately no "account exists" signal — that's a privacy leak.
}

export async function setNewPassword(newPassword) {
  if (newPassword.length < 8) throw new Error("Use a password with at least 8 characters.");
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  return toUser(data.user);
}

export function onAuthChange(cb) {
  return supabase.auth.onAuthStateChange((event, session) => cb(event, session ? toUser(session.user) : null));
}

export async function logOut() { await supabase.auth.signOut(); }
