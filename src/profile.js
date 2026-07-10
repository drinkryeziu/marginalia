/* profile.js — profiles now live in Supabase; these are thin re-exports so
   existing imports (ProfileSetup, DiaryApp) keep working. */
export { getProfile, saveProfile, hasProfile } from "./db.js";
