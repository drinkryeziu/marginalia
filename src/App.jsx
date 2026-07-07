import { useState, useEffect } from "react";
import LoginPage from "./LoginPage.jsx";
import DiaryApp from "./DiaryApp.jsx";
import * as auth from "./auth.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore an existing session (if "Keep me signed in" was checked).
  useEffect(() => {
    setUser(auth.getCurrentUser());
    setReady(true);
  }, []);

  if (!ready) return null;

  return user
    ? <DiaryApp user={user} onLogout={() => { auth.logOut(); setUser(null); }} />
    : <LoginPage onAuth={setUser} />;
}
