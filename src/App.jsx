import { useState, useEffect } from "react";
import LoginPage from "./LoginPage.jsx";
import ProfileSetup from "./ProfileSetup.jsx";
import DiaryApp from "./DiaryApp.jsx";
import RecoveryScreen from "./RecoveryScreen.jsx";
import * as auth from "./auth.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [needsProfile, setNeedsProfile] = useState(false);  // first-run onboarding (sign-up only)
  const [editingProfile, setEditingProfile] = useState(false);
  const [recovery, setRecovery] = useState(false);           // arrived via a password-reset email link
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Restore an existing session (Supabase persists it in the browser).
    auth.getCurrentUser().then((u) => { if (mounted) { setUser(u); setReady(true); } });

    const { data: sub } = auth.onAuthChange((event, u) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") { setUser(u); setRecovery(true); return; }
      if (event === "SIGNED_OUT") { setUser(null); setNeedsProfile(false); setEditingProfile(false); setRecovery(false); return; }
      setUser(u); // SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED / INITIAL_SESSION
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Sign-up sends first-timers to the profile step; a normal login goes straight in.
  const handleAuth = (u, isNew) => { setUser(u); setNeedsProfile(!!isNew); };
  const logout = async () => { await auth.logOut(); setUser(null); setNeedsProfile(false); setEditingProfile(false); };

  if (!ready) return null;
  if (recovery) return <RecoveryScreen onDone={() => setRecovery(false)} />;
  if (!user) return <LoginPage onAuth={handleAuth} />;
  if (needsProfile)
    return <ProfileSetup user={user} mode="onboard" onDone={() => setNeedsProfile(false)} />;
  if (editingProfile)
    return <ProfileSetup user={user} mode="edit" onCancel={() => setEditingProfile(false)} onDone={() => setEditingProfile(false)} />;
  return <DiaryApp user={user} onEditProfile={() => setEditingProfile(true)} onLogout={logout} />;
}
