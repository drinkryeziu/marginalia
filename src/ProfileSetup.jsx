import { useState, useEffect, useRef } from "react";
import { Pencil, Loader2, ChevronLeft, BookOpen, Lock } from "lucide-react";
import { C, font } from "./theme.js";
import * as auth from "./auth.js";
import { saveProfile, getProfile } from "./profile.js";

/* "Tell me about yourself" — same two-panel journal look as the login page.
   Runs in two modes:
     - "onboard": shown once, right after sign-up, before the diary opens.
     - "edit":    reopened later from the diary to update details.
   Every field is optional. */

const GENDERS = [
  { key: "female", label: "Female", sym: "♀" },
  { key: "male", label: "Male", sym: "♂" },
  { key: "other", label: "Other", sym: "⚢" },
];
const INTERESTS = [
  "Reading", "Travel", "Music", "Art", "Cooking", "Fitness",
  "Photography", "Writing", "Gardening", "Fashion", "Technology", "Cinema",
];

/* Collapses the two-panel layout into a stacked one below 640px (like login). */
function usePhone() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    const on = () => setP(window.innerWidth < 640);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return p;
}

function processAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't an image we can open."));
      img.onload = () => {
        const max = 400;
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * r), h = Math.round(img.height * r);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfileSetup({ user, onDone, onCancel, mode = "onboard" }) {
  const phone = usePhone();
  const saved = getProfile(user.username) || {};

  const [gender, setGender] = useState(saved.gender || "");
  const [firstName, setFirstName] = useState(saved.firstName ?? (user.displayName || ""));
  const [lastName, setLastName] = useState(saved.lastName || "");
  const [address, setAddress] = useState(saved.address || "");
  const [phoneNo, setPhoneNo] = useState(saved.phone || "");
  const [email, setEmail] = useState(saved.email || "");
  const [interests, setInterests] = useState(saved.interests || []);
  const [about, setAbout] = useState(saved.about || "");
  const [avatar, setAvatar] = useState(saved.avatar || null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const editing = mode === "edit";
  const toggleInterest = (i) =>
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  async function onPhoto(files) {
    setErr("");
    const file = files?.[0];
    if (!file) return;
    try { setAvatar(await processAvatar(file)); }
    catch (e) { setErr(e.message || "Couldn't use that photo."); }
  }

  function submit() {
    setBusy(true);
    saveProfile(user.username, { gender, firstName, lastName, address, phone: phoneNo, email, interests, about, avatar });
    const updated = firstName.trim() ? auth.updateDisplayName(user.username, firstName.trim()) : user;
    onDone(updated || user);
  }

  /* styles — matched to LoginPage */
  const label = { fontFamily: font.ui, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.faint };
  const field = {
    width: "100%", padding: "14px 14px", marginTop: 6, fontFamily: font.body, fontSize: 16, color: C.ink,
    background: C.page, border: `1px solid ${C.line}`, borderRadius: 10, outline: "none", WebkitAppearance: "none",
  };
  const linkBtn = { background: "none", border: "none", cursor: "pointer", fontFamily: font.ui, padding: 0, color: C.inkSoft };
  const twoCol = { display: "grid", gridTemplateColumns: phone ? "1fr" : "1fr 1fr", gap: 16 };

  return (
    <div style={{ minHeight: "100%", display: "grid", placeItems: "start center", padding: phone ? 16 : 24, background: C.paper,
      paddingTop: "max(16px, env(safe-area-inset-top))", paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
      <div className="rise" style={{ width: "100%", maxWidth: phone ? 430 : 840, display: "flex", flexDirection: phone ? "column" : "row",
        background: C.page, border: `1px solid ${C.line}`, borderRadius: 18, overflow: "hidden",
        boxShadow: "0 1px 0 #fff inset, 0 30px 60px -40px rgba(38,38,58,0.55)" }}>

        {/* Cover — same journal cover as login */}
        <div style={{ background: C.ink, color: C.paper, position: "relative", flexShrink: 0,
          width: phone ? "auto" : 322, padding: phone ? "26px 24px" : "36px 30px",
          display: "flex", flexDirection: "column", gap: phone ? 10 : 18, justifyContent: "flex-start" }}>
          {!phone && <span style={{ position: "absolute", right: 34, top: -1, width: 12, height: 120, background: C.brass,
            clipPath: "polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)" }} />}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: C.brass }}>
              <BookOpen size={22} strokeWidth={1.7} />
              <span style={{ fontFamily: font.display, fontSize: 23, fontWeight: 500, color: C.paper, letterSpacing: "-0.01em", lineHeight: 1.1 }}>My Little Secret Diary</span>
            </div>
            <p style={{ fontFamily: font.body, fontStyle: "italic", fontSize: phone ? 15 : 17, color: "rgba(237,235,228,0.82)",
              margin: phone ? "8px 0 0" : "16px 0 0", lineHeight: 1.5, maxWidth: 230 }}>
              A few details, so each page feels like yours.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "rgba(237,235,228,0.6)" }}>
            <Lock size={13} />
            <span style={{ fontFamily: font.ui, fontSize: 12 }}>Private by default.</span>
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, minWidth: 0, padding: phone ? "24px 22px 26px" : "34px 34px" }}>
          {editing && (
            <button onClick={onCancel}
              style={{ ...linkBtn, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, marginBottom: 14, minHeight: 32 }}>
              <ChevronLeft size={15} /> Back to diary
            </button>
          )}

          <h1 style={{ fontFamily: font.display, fontSize: phone ? 25 : 28, fontWeight: 500, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
            {editing ? "Edit your details" : "Tell me about yourself"}
          </h1>
          <p style={{ fontFamily: font.body, fontSize: 15, color: C.inkSoft, margin: "6px 0 22px", lineHeight: 1.5 }}>
            {editing ? "Update anything you like." : "Let us personalize your diary."}
          </p>

          {/* Profile photo */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div onClick={() => fileInput.current?.click()}
                style={{ width: 64, height: 64, borderRadius: "50%", cursor: "pointer", overflow: "hidden",
                  background: avatar ? `center/cover no-repeat url(${avatar})` : C.paper,
                  border: `1px solid ${C.line}`, display: "grid", placeItems: "center",
                  color: C.brass, fontFamily: font.display, fontSize: 24 }}>
                {!avatar && "?"}
              </div>
              <button type="button" onClick={() => fileInput.current?.click()} aria-label="Change profile photo"
                style={{ position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: "50%",
                  border: `2px solid ${C.page}`, background: C.brass, color: "#fff", cursor: "pointer",
                  display: "grid", placeItems: "center" }}>
                <Pencil size={12} />
              </button>
            </div>
            <div>
              <p style={{ fontFamily: font.display, fontSize: 17, fontWeight: 500, color: C.ink, margin: 0 }}>Profile photo</p>
              <p style={{ fontFamily: font.body, fontStyle: "italic", fontSize: 13.5, color: C.faint, margin: "2px 0 0" }}>Tap the pencil to change</p>
            </div>
            <input ref={fileInput} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { onPhoto(e.target.files); e.target.value = ""; }} />
          </div>

          {/* Gender */}
          <div style={{ marginBottom: 20 }}>
            <label style={label}>Gender</label>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {GENDERS.map((g) => {
                const on = gender === g.key;
                return (
                  <button key={g.key} type="button" onClick={() => setGender(on ? "" : g.key)}
                    style={{ flex: 1, minHeight: 46, borderRadius: 10, cursor: "pointer", fontFamily: font.ui, fontSize: 14.5, fontWeight: 500,
                      background: on ? C.ink : C.page, color: on ? C.page : C.ink, border: `1px solid ${on ? C.ink : C.line}` }}>
                    {g.sym}&nbsp; {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Names */}
          <div style={{ ...twoCol, marginBottom: 20 }}>
            <div>
              <label style={label}>First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" style={field} />
            </div>
            <div>
              <label style={label}>Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" style={field} />
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: 20 }}>
            <label style={label}>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your address" style={field} />
          </div>

          {/* Phone + Email */}
          <div style={{ ...twoCol, marginBottom: 20 }}>
            <div>
              <label style={label}>Phone</label>
              <input type="tel" value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} placeholder="+1 234 567 8900" style={field} />
            </div>
            <div>
              <label style={label}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={field} />
            </div>
          </div>

          {/* Interests */}
          <div style={{ marginBottom: 20 }}>
            <label style={label}>Interests</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 10 }}>
              {INTERESTS.map((i) => {
                const on = interests.includes(i);
                return (
                  <button key={i} type="button" onClick={() => toggleInterest(i)}
                    style={{ padding: "8px 15px", borderRadius: 999, cursor: "pointer", fontFamily: font.ui, fontSize: 14,
                      background: on ? C.ink : C.page, color: on ? C.page : C.ink, border: `1px solid ${on ? C.ink : C.line}` }}>
                    {i}
                  </button>
                );
              })}
            </div>
          </div>

          {/* About me */}
          <div>
            <label style={label}>About me</label>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Write a little about yourself…" rows={4}
              style={{ ...field, resize: "vertical", minHeight: 104, lineHeight: 1.6 }} />
          </div>

          {err && <p style={{ fontFamily: font.body, color: C.danger, fontSize: 14, margin: "14px 0 0" }}>{err}</p>}

          <button onClick={submit} disabled={busy}
            style={{ width: "100%", minHeight: 52, marginTop: 22, borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer",
              background: C.ink, color: C.page, fontFamily: font.ui, fontSize: 16, fontWeight: 500,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1 }}>
            {busy && <Loader2 size={16} className="spin" />}
            {editing ? "Save changes" : "Start My Diary"}
          </button>
        </div>
      </div>
    </div>
  );
}
