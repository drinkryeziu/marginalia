/* db.js — reads/writes profiles and diary entries in Supabase (Postgres).
   Row-level security (see supabase/schema.sql) guarantees a signed-in user can
   only ever touch their own rows, so every call is scoped by the auth uid. */

import { supabase } from "./supabase.js";

/* ------------------------------- profiles ------------------------------- */
export async function hasProfile(userId) {
  const { count } = await supabase.from("profiles")
    .select("id", { count: "exact", head: true }).eq("id", userId);
  return (count || 0) > 0;
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) { console.error("getProfile", error); return null; }
  if (!data) return null;
  return {
    firstName: data.first_name || "", lastName: data.last_name || "", gender: data.gender || "",
    address: data.address || "", phone: data.phone || "", email: data.email || "",
    interests: data.interests || [], about: data.about || "", avatar: data.avatar_url || null,
    birthMonth: data.birth_month ?? null, birthDay: data.birth_day ?? null,
    displayName: data.display_name || "",
  };
}

export async function saveProfile(userId, p) {
  const row = {
    id: userId,
    display_name: (p.firstName || "").trim() || null,
    first_name: p.firstName || null, last_name: p.lastName || null, gender: p.gender || null,
    address: p.address || null, phone: p.phone || null, email: p.email || null,
    interests: p.interests || [], about: p.about || null, avatar_url: p.avatar || null,
    birth_month: p.birthMonth ?? null, birth_day: p.birthDay ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("profiles").upsert(row);
  if (error) throw new Error(error.message);
}

/* -------------------------------- entries ------------------------------- */
// Returns the list of days (newest first) that have an entry.
export async function loadIndex(userId) {
  const { data, error } = await supabase.from("entries")
    .select("day").eq("user_id", userId).order("day", { ascending: false });
  if (error) { console.error("loadIndex", error); return []; }
  return (data || []).map((r) => r.day);
}

// Returns { html, text, photos:[{id,dataUrl}] } for a day (empty if none).
export async function loadEntry(userId, day) {
  const { data, error } = await supabase.from("entries")
    .select("html, content, photos").eq("user_id", userId).eq("day", day).maybeSingle();
  if (error) console.error("loadEntry", error);
  if (!data) return { html: "", text: "", photos: [] };
  return { html: data.html || "", text: data.content || "", photos: data.photos || [] };
}

export async function saveEntry(userId, day, { html, text, photos }) {
  const { error } = await supabase.from("entries").upsert(
    { user_id: userId, day, html: html || "", content: text || "", photos: photos || [], updated_at: new Date().toISOString() },
    { onConflict: "user_id,day" },
  );
  if (error) throw new Error(error.message);
}

export async function deleteEntry(userId, day) {
  const { error } = await supabase.from("entries").delete().eq("user_id", userId).eq("day", day);
  if (error) console.error("deleteEntry", error);
}
