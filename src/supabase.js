import { createClient } from "@supabase/supabase-js";

// The publishable key is meant for the browser and is safe to ship in the
// built site; your data is protected by the row-level security rules in
// supabase/schema.sql. Values can also be overridden at build time via
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
const url = import.meta.env.VITE_SUPABASE_URL || "https://ejzzeuhhkmuooswabwzm.supabase.co";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_B3xhqWT7WC8kqbupjML_cw_rSfE0sjN";

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
