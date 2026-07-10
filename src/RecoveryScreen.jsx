import { useState } from "react";
import { BookOpen, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { C, font } from "./theme.js";
import * as auth from "./auth.js";

/* Shown after the user clicks the emailed password-reset link. Supabase has
   given us a temporary recovery session; here they choose a new password. */
export default function RecoveryScreen({ onDone }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    if (pw.length < 8) return setErr("Use a password with at least 8 characters.");
    if (pw !== confirm) return setErr("The two passwords don't match.");
    setBusy(true);
    try { await auth.setNewPassword(pw); onDone(); }
    catch (e) { setErr(e.message || "Couldn't update your password."); setBusy(false); }
  }
  const onKey = (e) => { if (e.key === "Enter") submit(); };

  const field = {
    width: "100%", padding: "14px 14px", marginTop: 6, fontFamily: font.body, fontSize: 16, color: C.ink,
    background: C.page, border: `1px solid ${C.line}`, borderRadius: 10, outline: "none", WebkitAppearance: "none",
  };
  const label = { fontFamily: font.ui, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.faint };

  return (
    <div style={{ minHeight: "100%", display: "grid", placeItems: "center", padding: 20, background: C.paper }}>
      <div className="rise" style={{ width: "100%", maxWidth: 420, background: C.page, border: `1px solid ${C.line}`,
        borderRadius: 18, padding: "30px 28px", boxShadow: "0 1px 0 #fff inset, 0 30px 60px -40px rgba(38,38,58,0.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: C.brass, marginBottom: 14 }}>
          <BookOpen size={20} strokeWidth={1.7} />
          <span style={{ fontFamily: font.display, fontSize: 19, fontWeight: 500, color: C.ink }}>My Little Secret Diary</span>
        </div>
        <h1 style={{ fontFamily: font.display, fontSize: 25, fontWeight: 500, color: C.ink, margin: 0 }}>Set a new password</h1>
        <p style={{ fontFamily: font.body, fontSize: 15, color: C.inkSoft, margin: "6px 0 20px" }}>Choose a new password for your account.</p>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>New password</label>
          <div style={{ position: "relative" }}>
            <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={onKey}
              placeholder="At least 8 characters" autoComplete="new-password" style={{ ...field, paddingRight: 46 }} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
              style={{ position: "absolute", right: 8, top: 6, width: 34, height: 44, display: "grid", placeItems: "center", background: "none", border: "none", cursor: "pointer", color: C.faint }}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div>
          <label style={label}>Confirm new password</label>
          <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={onKey}
            placeholder="••••••••" autoComplete="new-password" style={field} />
        </div>

        {err && <p style={{ fontFamily: font.body, color: C.danger, fontSize: 14, margin: "14px 0 0" }}>{err}</p>}

        <button onClick={submit} disabled={busy}
          style={{ width: "100%", minHeight: 48, marginTop: 20, borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer",
            background: C.ink, color: C.page, fontFamily: font.ui, fontSize: 16, fontWeight: 500,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1 }}>
          {busy ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
          Save and sign in
        </button>
      </div>
    </div>
  );
}
