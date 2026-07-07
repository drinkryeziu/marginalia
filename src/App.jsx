import { useState, useEffect } from "react";
import LoginPage from "./LoginPage.jsx";
import ProfileSetup from "./ProfileSetup.jsx";
import DiaryApp from "./DiaryApp.jsx";
import * as auth from "./auth.js";
import { hasProfile } from "./profile.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [needsProfile, setNeedsProfile] = useState(false); // first-run onboarding
  const [editingProfile, setEditingProfile] = useState(false); // reopened from the diary
  const [ready, setReady] = useState(false);

  // Restore an existing session (if "Keep me signed in" was checked).
  useEffect(() => {
    const u = auth.getCurrentUser();
    setUser(u);
    setNeedsProfile(u ? !hasProfile(u.username) : false);
    setReady(true);
  }, []);

  // On fresh sign-in/sign-up, send first-timers through the profile step.
  const handleAuth = (u) => {
    setUser(u);
    setNeedsProfile(!hasProfile(u.username));
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
