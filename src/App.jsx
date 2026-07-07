import { useState, useEffect } from "react";
import LoginPage from "./LoginPage.jsx";
import ProfileSetup from "./ProfileSetup.jsx";
import DiaryApp from "./DiaryApp.jsx";
import * as auth from "./auth.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [needsProfile, setNeedsProfile] = useState(false); // first-run onboarding (sign-up only)
  const [editingProfile, setEditingProfile] = useState(false); // reopened from the diary
  const [ready, setReady] = useState(false);

  // Restore an existing session (if "Keep me signed in" was checked).
  // A restored session is never a fresh sign-up, so it goes straight to the diary.
  useEffect(() => {
    setUser(auth.getCurrentUser());
    setReady(true);
  }, []);

  // The profile page appears ONLY right after sign-up. A normal login goes
  // straight to the diary — the profile is reachable later via "Edit profile".
  const handleAuth = (u, isNew) => {
    setUser(u);
    setNeedsProfile(!!isNew);
  };

  if (!ready) return null;
  if (!user) return <LoginPage onAuth={handleAuth} />;
  if (needsProfile)
    return <ProfileSetup user={user} mode="onboard" onDone={(u) => { setUser(u); setNeedsProfile(false); }} />;
  if (editingProfile)
    return <ProfileSetup user={user} mode="edit" onCancel={() => setEditingProfile(false)}
      onDone={(u) => { setUser(u); setEditingProfile(false); }} />;

  return (
    <DiaryApp user={user}
      onEditProfile={() => setEditingProfile(true)}
      onLogout={() => { auth.logOut(); setUser(null); setNeedsProfile(false); setEditingProfile(false); }} />
  );
}
