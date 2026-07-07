/* profile.js — the one-time "Tell me about yourself" profile.
   Stored per user in localStorage (same demo-grade layer as auth.js/DiaryApp).
   Swap these three functions for your backend later; nothing else changes. */

const key = (username) => `diary_profile_${username}`;

export function hasProfile(username) {
  try { return localStorage.getItem(key(username)) != null; } catch { return false; }
}

export function getProfile(username) {
  try { const v = localStorage.getItem(key(username)); return v ? JSON.parse(v) : null; }
  catch { return null; }
}

export function saveProfile(username, data) {
  try { localStorage.setItem(key(username), JSON.stringify({ ...data, updatedAt: Date.now() })); return true; }
  catch (e) { console.error("profile save failed", e); return false; }
}
