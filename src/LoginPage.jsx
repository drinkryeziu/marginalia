import { useState, useEffect } from "react";
import { BookOpen, ChevronLeft, Lock, Eye, EyeOff, Loader2, Mail, Check } from "lucide-react";
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

/* Live password strength: 8 chars is required; capital/number/symbol are only
   suggested (never enforced). */
function Strength({ pw }) {
  const len = pw.length >= 8;
  const score = [len, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  let caption, color;
  if (!pw) { caption = "At least 8 characters. A capital letter, number, and symbol are suggested."; color = C.faint; }
  else if (!len) { caption = "A little longer — 8 characters minimum."; color = C.danger; }
  else if (score >= 4) { caption = "Strong password."; color = C.brassDeep; }
  else { caption = "Good. Add a capital, number, or symbol to strengthen it (optional)."; color = C.faint; }
  return (
    <div style={{ marginTop: 9 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < score ? C.brass : C.line }} />
        ))}
      </div>
      <p style={{ fontFamily: font.ui, fontSize: 12, color, margin: "7px 0 0", lineHeight: 1.45 }}>{caption}</p>
    </div>
  );
}

const HEADS = {
  login: ["Welcome back", "Sign in to pick up where you left off."],
  signup: ["Create your account", "Your email and a password — that's all it takes."],
};
const BTN = { login: "Open my diary", signup: "Create account" };

export default function LoginPage({ onAuth }) {
  const phone = usePhone();
  const [mode, setModeRaw] = useState("login"); // login | signup | reset
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setMode = (m) => { setModeRaw(m); setResetSent(false); setError(""); setPassword(""); setConfirm(""); setShowPw(false); };

  const heads = mode === "reset"
    ? (resetSent ? ["Check your email", "We've sent a reset link if that account exists."] : ["Reset your password", "Enter your email and we'll send a reset link."])
    : HEADS[mode];
  const btnLabel = mode === "reset" ? "Send reset link" : BTN[mode];

  async function handleSubmit() {
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") { const u = await auth.signUp({ email, password, confirm }); onAuth(u, true); return; }
      if (mode === "reset") { await auth.sendPasswordReset(email); setResetSent(true); setBusy(false); return; }
      const u = await auth.logIn({ email, password });
      onAuth(u, false);
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

  const emailField = (
    <div>
      <label style={label}>Email</label>
      <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKey}
        placeholder="you@email.com" style={field} />
    </div>
  );
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
              margin: phone ? "8px 0 0" : "16px 0 0", lineHeight: 1.5, maxWidth: 230 }}>
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
          {mode === "reset" && (
            <button onClick={() => setMode("login")}
              style={{ ...linkBtn, display: "inline-flex", alignItems: "center", gap: 4, color: C.inkSoft, fontSize: 14, marginBottom: 14, minHeight: 32 }}>
              <ChevronLeft size={15} /> Back to sign in
            </button>
          )}

          <h1 style={{ fontFamily: font.display, fontSize: phone ? 24 : 27, fontWeight: 500, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>{heads[0]}</h1>
          <p style={{ fontFamily: font.body, fontSize: 15, color: C.inkSoft, margin: "6px 0 20px", lineHeight: 1.5 }}>{heads[1]}</p>

          {mode === "reset" && resetSent ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 10, padding: "14px 16px" }}>
              <Mail size={18} color={C.brassDeep} style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontFamily: font.body, fontSize: 14.5, color: C.inkSoft, margin: 0, lineHeight: 1.55 }}>
                Open the link in your inbox to choose a new password. Didn't get it? Check spam, or{" "}
                <button onClick={() => setResetSent(false)} style={{ ...linkBtn, fontSize: 14.5 }}>try again</button>.
              </p>
            </div>
          ) : (
            <>
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
                {emailField}
                {mode !== "reset" && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={label}>Password</label>
                      {mode === "login" && <button onClick={() => setMode("reset")} style={{ ...linkBtn, fontSize: 12.5, minHeight: 24 }}>Forgot your password?</button>}
                    </div>
                    {pwField(password, setPassword, mode === "signup" ? "At least 8 characters" : "••••••••", mode === "login" ? "current-password" : "new-password")}
                    {mode === "signup" && <Strength pw={password} />}
                  </div>
                )}
                {mode === "signup" && (
                  <div>
                    <label style={label}>Confirm password</label>
                    <input type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={onKey} placeholder="••••••••" autoComplete="new-password" style={field} />
                    {confirm && confirm !== password && <p style={{ fontFamily: font.ui, color: C.danger, fontSize: 12.5, margin: "7px 0 0" }}>Passwords don't match.</p>}
                  </div>
                )}
              </div>

              {error && <p style={{ fontFamily: font.body, color: C.danger, fontSize: 14, margin: "14px 0 0" }}>{error}</p>}

              <button onClick={handleSubmit} disabled={busy}
                style={{ ...tapBtn, width: "100%", marginTop: 18, borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer",
                  background: C.ink, color: C.page, fontFamily: font.ui, fontSize: 16, fontWeight: 500,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1 }}>
                {busy && <Loader2 size={16} className="spin" />}
                {mode === "reset" && !busy && <Mail size={16} />}
                {btnLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
