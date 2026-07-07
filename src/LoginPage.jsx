import { useState, useEffect } from "react";
import { BookOpen, ChevronLeft, Lock, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { C, font } from "./theme.js";
import * as auth from "./auth.js";

/* Collapses the two-panel layout into a stacked one below 640px. */
function usePhone() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    const on = () => setP(window.innerWidth < 640);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return p;
}

function GoogleG() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const HEADS = {
  login: ["Welcome back", "Sign in to pick up where you left off."],
  signup: ["Begin your diary", "A name and a password is all it takes."],
  google: ["One last thing", "What should your pages call you?"],
  reset: ["Reset your password", "No email needed here — just set a new one."],
};
const BTN = { login: "Open my diary", signup: "Start writing", google: "Continue with Google", reset: "Save and sign in" };

export default function LoginPage({ onAuth }) {
  const phone = usePhone();
  const [mode, setModeRaw] = useState("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stayIn, setStayIn] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setMode = (m) => { setModeRaw(m); setError(""); setPassword(""); setConfirm(""); setShowPw(false); };

  async function handleSubmit() {
    setError("");
    setBusy(true);
    try {
      let user;
      if (mode === "google") user = await auth.continueWithGoogle({ displayName, stayIn });
      else if (mode === "reset") user = await auth.resetPassword({ username, newPassword: password, confirm, stayIn });
      else if (mode === "signup") user = await auth.signUp({ username, displayName, password, stayIn });
      else user = await auth.logIn({ username, password, stayIn });
      onAuth(user);
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
      setBusy(false);
    }
  }
  const onKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  const field = {
    width: "100%", padding: "14px 14px", marginTop: 6, fontFamily: font.body, fontSize: 16,
    color: C.ink, background: C.page, border: `1px solid ${C.line}`, borderRadius: 10, outline: "none", WebkitAppearance: "none",
  };
  const label = { fontFamily: font.ui, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.faint };
  const tapBtn = { minHeight: 48 };
  const linkBtn = { background: "none", border: "none", cursor: "pointer", fontFamily: font.ui, padding: 0, color: C.brassDeep };
  const isPw = mode === "login" || mode === "signup";

  const pwField = (value, set, ph, ac) => (
    <div style={{ position: "relative" }}>
      <input type={showPw ? "text" : "password"} value={value} onChange={(e) => set(e.target.value)} onKeyDown={onKey}
        placeholder={ph} autoComplete={ac} style={{ ...field, paddingRight: 46 }} />
      <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}
        style={{ position: "absolute", right: 8, top: 6, width: 34, height: 44, display: "grid", placeItems: "center",
          background: "none", border: "none", cursor: "pointer", color: C.faint }}>
        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100%", display: "grid", placeItems: "center", padding: phone ? 16 : 24, background: C.paper,
      paddingTop: "max(16px, env(safe-area-inset-top))", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
      <div className="rise" style={{ width: "100%", maxWidth: phone ? 430 : 840, display: "flex", flexDirection: phone ? "column" : "row",
        background: C.page, border: `1px solid ${C.line}`, borderRadius: 18, overflow: "hidden",
        boxShadow: "0 1px 0 #fff inset, 0 30px 60px -40px rgba(38,38,58,0.55)" }}>

        {/* Cover */}
        <div style={{ background: C.ink, color: C.paper, position: "relative", flexShrink: 0,
          width: phone ? "auto" : 322, padding: phone ? "26px 24px" : "36px 30px",
          display: "flex", flexDirection: "column", gap: phone ? 10 : 0, justifyContent: "space-between", minHeight: phone ? "auto" : 400 }}>
          {!phone && <span style={{ position: "absolute", right: 34, top: -1, width: 12, height: 120, background: C.brass,
            clipPath: "polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)" }} />}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: C.brass }}>
              <BookOpen size={22} strokeWidth={1.7} />
              <span style={{ fontFamily: font.display, fontSize: 23, fontWeight: 500, color: C.paper, letterSpacing: "-0.01em", lineHeight: 1.1 }}>My Little Secret Diary</span>
            </div>
            <p style={{ fontFamily: font.body, fontStyle: "italic", fontSize: phone ? 15 : 17, color: "rgba(237,235,228,0.82)",
              margin: phone ? "8px 0 0" : "16px 0 0", lineHeight: 1.5, maxWidth: 220 }}>
              A quiet page for each day.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "rgba(237,235,228,0.6)", marginTop: phone ? 2 : 0 }}>
            <Lock size={13} />
            <span style={{ fontFamily: font.ui, fontSize: 12 }}>Private by default.</span>
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, minWidth: 0, padding: phone ? "24px 22px 26px" : "34px 34px" }}>
          {(mode === "google" || mode === "reset") && (
            <button onClick={() => setMode("login")}
              style={{ ...linkBtn, display: "inline-flex", alignItems: "center", gap: 4, color: C.inkSoft, fontSize: 14, marginBottom: 14, minHeight: 32 }}>
              <ChevronLeft size={15} /> Back to sign in
            </button>
          )}

          <h1 style={{ fontFamily: font.display, fontSize: phone ? 24 : 27, fontWeight: 500, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>{HEADS[mode][0]}</h1>
          <p style={{ fontFamily: font.body, fontSize: 15, color: C.inkSoft, margin: "6px 0 20px", lineHeight: 1.5 }}>{HEADS[mode][1]}</p>

          {isPw && (
            <div style={{ display: "flex", gap: 4, background: C.paper, borderRadius: 10, padding: 4, marginBottom: 20 }}>
              {["login", "signup"].map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ ...tapBtn, flex: 1, borderRadius: 7, border: "none", cursor: "pointer", fontFamily: font.ui, fontSize: 15, fontWeight: 500,
                    background: mode === m ? C.page : "transparent", color: mode === m ? C.ink : C.inkSoft,
                    boxShadow: mode === m ? "0 1px 4px -2px rgba(38,38,58,0.5)" : "none" }}>
                  {m === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "google" ? (
              <div>
                <label style={label}>Your name</label>
                <input autoFocus value={displayName} onChange={(e) => setDisplayName(e.target.value)} onKeyDown={onKey} placeholder="e.g. Sofia" style={field} />
              </div>
            ) : (
              <>
                <div>
                  <label style={label}>Username</label>
                  <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={onKey} placeholder="quietpen" autoComplete="username" style={field} />
                </div>
                {mode === "signup" && (
                  <div>
                    <label style={label}>Name on your pages <span style={{ textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} onKeyDown={onKey} placeholder="Sofia" style={field} />
                  </div>
                )}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={label}>{mode === "reset" ? "New password" : "Password"}</label>
                    {mode === "login" && <button onClick={() => setMode("reset")} style={{ ...linkBtn, fontSize: 12.5, minHeight: 24 }}>Forgot password?</button>}
                  </div>
                  {pwField(password, setPassword, "••••••••", mode === "login" ? "current-password" : "new-password")}
                </div>
                {mode === "reset" && (
                  <div>
                    <label style={label}>Confirm new password</label>
                    <input type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={onKey} placeholder="••••••••" style={field} />
                  </div>
                )}
              </>
            )}
          </div>

          <button type="button" onClick={() => setStayIn((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, border: `1px solid ${stayIn ? C.brass : C.line}`,
              background: stayIn ? C.brass : C.page, display: "grid", placeItems: "center", flexShrink: 0 }}>
              {stayIn && <Check size={14} color={C.page} />}
            </span>
            <span style={{ fontFamily: font.ui, fontSize: 14, color: C.inkSoft }}>Keep me signed in</span>
          </button>

          {error && <p style={{ fontFamily: font.body, color: C.danger, fontSize: 14, margin: "14px 0 0" }}>{error}</p>}

          <button onClick={handleSubmit} disabled={busy}
            style={{ ...tapBtn, width: "100%", marginTop: 18, borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer",
              background: C.ink, color: C.page, fontFamily: font.ui, fontSize: 16, fontWeight: 500,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1 }}>
            {busy && <Loader2 size={16} className="spin" />}
            {BTN[mode]}
          </button>

          {isPw && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
                <span style={{ flex: 1, height: 1, background: C.line }} />
                <span style={{ fontFamily: font.ui, fontSize: 12, color: C.faint }}>or</span>
                <span style={{ flex: 1, height: 1, background: C.line }} />
              </div>
              <button onClick={() => { setMode("google"); setDisplayName(""); }}
                style={{ ...tapBtn, width: "100%", borderRadius: 10, cursor: "pointer", background: C.page, border: `1px solid ${C.line}`,
                  color: C.ink, fontFamily: font.ui, fontSize: 15, fontWeight: 500, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <GoogleG /> Continue with Google
              </button>
            </>
          )}

          {mode === "reset" && (
            <p style={{ fontFamily: font.body, fontStyle: "italic", color: C.faint, fontSize: 12.5, margin: "16px 0 0", lineHeight: 1.5 }}>
              This local version has no email, so you reset it here. Real email recovery comes with a connected account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
