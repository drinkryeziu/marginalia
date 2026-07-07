import { useState, useEffect, useRef } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { C, font } from "./theme.js";
import * as auth from "./auth.js";
import { saveProfile } from "./profile.js";

/* First-run onboarding — "Tell me about yourself".
   Shown once, right after sign-up, before the diary opens. Every field is
   optional; "Start My Diary" saves whatever's there and marks it done so the
   page never reappears. */

const script = "'Caveat', 'Fraunces', cursive";

const GENDERS = [
  { key: "female", label: "Female", sym: "♀" },
  { key: "male", label: "Male", sym: "♂" },
  { key: "other", label: "Other", sym: "⚢" },
];
const INTERESTS = [
  "Reading", "Travel", "Music", "Art", "Cooking", "Fitness",
  "Photography", "Writing", "Gardening", "Fashion", "Technology", "Cinema",
];

function usePhone() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.innerWidth < 560);
  useEffect(() => {
    const on = () => setP(window.innerWidth < 560);
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

export default function ProfileSetup({ user, onDone }) {
  const phone = usePhone();
  const [gender, setGender] = useState("");
  const [firstName, setFirstName] = useState(user.displayName || "");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState([]);
  const [about, setAbout] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

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

  /* styles */
  const label = { fontFamily: font.ui, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkSoft, marginBottom: 7, display: "block" };
  const field = {
    width: "100%", padding: "13px 14px", fontFamily: font.body, fontSize: 16, color: C.ink,
    background: C.paper, border: `1px solid ${C.line}`, borderRadius: 10, outline: "none", WebkitAppearance: "none",
  };
  const cocoa = "#7B5836"; // warm brown accent from the mockup
  const twoCol = { display: "grid", gridTemplateColumns: phone ? "1fr" : "1fr 1fr", gap: 16 };

  return (
    <div style={{ minHeight: "100%", background: C.paper, display: "grid", placeItems: "start center",
      padding: phone ? "20px 14px" : "40px 20px",
      paddingTop: "max(20px, env(safe-area-inset-top))", paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
      <div className="rise" style={{ width: "100%", maxWidth: 500, background: C.page, border: `1px solid ${C.line}`,
        borderRadius: 18, padding: phone ? "28px 22px 24px" : "38px 40px 32px",
        boxShadow: "0 1px 0 #fff inset, 0 30px 60px -42px rgba(38,38,58,0.55)" }}>

        {/* Heading */}
        <h1 style={{ fontFamily: script, fontSize: phone ? 34 : 40, fontWeight: 600, color: C.ink, margin: 0, lineHeight: 1.05 }}>
          Tell me about yourself
        </h1>
        <p style={{ fontFamily: font.body, fontStyle: "italic", fontSize: 15.5, color: C.inkSoft, margin: "8px 0 0" }}>
          Let us personalize your diary
        </p>
        <div style={{ height: 1, background: C.line, margin: "18px 0 24px" }} />

        {/* Profile photo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div onClick={() => fileInput.current?.click()}
              style={{ width: 66, height: 66, borderRadius: "50%", cursor: "pointer", overflow: "hidden",
                background: avatar ? `center/cover no-repeat url(${avatar})` : "#E0CDB4",
                border: `1px solid ${C.line}`, display: "grid", placeItems: "center",
                color: cocoa, fontFamily: font.display, fontSize: 24 }}>
              {!avatar && "?"}
            </div>
            <button type="button" onClick={() => fileInput.current?.click()} aria-label="Change profile photo"
              style={{ position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: "50%",
                border: `2px solid ${C.page}`, background: cocoa, color: "#fff", cursor: "pointer",
                display: "grid", placeItems: "center" }}>
              <Pencil size={12} />
            </button>
          </div>
          <div>
            <p style={{ fontFamily: script, fontSize: 20, color: C.ink, margin: 0 }}>Profile Photo</p>
            <p style={{ fontFamily: font.body, fontStyle: "italic", fontSize: 13.5, color: C.faint, margin: "2px 0 0" }}>Tap the pencil to change</p>
          </div>
          <input ref={fileInput} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { onPhoto(e.target.files); e.target.value = ""; }} />
        </div>

        {/* Gender */}
        <div style={{ marginBottom: 22 }}>
          <label style={label}>Gender</label>
          <div style={{ display: "flex", gap: 10 }}>
            {GENDERS.map((g) => {
              const on = gender === g.key;
              return (
                <button key={g.key} type="button" onClick={() => setGender(on ? "" : g.key)}
                  style={{ flex: 1, minHeight: 46, borderRadius: 10, cursor: "pointer", fontFamily: font.ui, fontSize: 14.5, fontWeight: 500,
                    background: on ? cocoa : C.page, color: on ? "#fff" : C.ink, border: `1px solid ${on ? cocoa : C.line}` }}>
                  {g.sym}&nbsp; {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Names */}
        <div style={{ ...twoCol, marginBottom: 22 }}>
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
        <div style={{ marginBottom: 22 }}>
          <label style={label}>Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your address" style={field} />
        </div>

        {/* Phone + Email */}
        <div style={{ ...twoCol, marginBottom: 22 }}>
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
        <div style={{ marginBottom: 22 }}>
          <label style={label}>Interests</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {INTERESTS.map((i) => {
              const on = interests.includes(i);
              return (
                <button key={i} type="button" onClick={() => toggleInterest(i)}
                  style={{ padding: "8px 15px", borderRadius: 999, cursor: "pointer", fontFamily: font.ui, fontSize: 14,
                    background: on ? cocoa : C.page, color: on ? "#fff" : C.ink, border: `1px solid ${on ? cocoa : C.line}` }}>
                  {i}
                </button>
              );
            })}
          </div>
        </div>

        {/* About me */}
        <div style={{ marginBottom: 8 }}>
          <label style={label}>About me</label>
          <textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Write a little about yourself…" rows={4}
            style={{ ...field, resize: "vertical", minHeight: 104, lineHeight: 1.6 }} />
        </div>

        {err && <p style={{ fontFamily: font.body, color: C.danger, fontSize: 14, margin: "12px 0 0" }}>{err}</p>}

        <button onClick={submit} disabled={busy}
          style={{ width: "100%", minHeight: 52, marginTop: 22, borderRadius: 12, border: "none", cursor: busy ? "default" : "pointer",
            background: cocoa, color: "#fff", fontFamily: font.ui, fontSize: 16.5, fontWeight: 600,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1 }}>
          {busy && <Loader2 size={17} className="spin" />}
          Start My Diary
        </button>
      </div>
    </div>
  );
}
