import { useState, useEffect, useRef } from "react";
import { Pencil, Loader2, ChevronLeft, BookOpen, Lock } from "lucide-react";
import { C, font } from "./theme.js";
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
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

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
  const accountEmail = (user.email || "").includes("@") ? user.email : ""; // sign-in email

  const [gender, setGender] = useState("");
  const [firstName, setFirstName] = useState(user.displayName || "");
  const [lastName, setLastName] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState(accountEmail);
  const [interests, setInterests] = useState([]);
  const [about, setAbout] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const editing = mode === "edit";

  // Load any saved profile from Supabase and prefill the form.
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await getProfile(user.id);
      if (!alive || !saved) return;
      setGender(saved.gender || "");
      if (saved.firstName) setFirstName(saved.firstName);
      setLastName(saved.lastName || "");
      setBirthMonth(saved.birthMonth ? String(saved.birthMonth) : "");
      setBirthDay(saved.birthDay ? String(saved.birthDay) : "");
      setAddress(saved.address || "");
      setPhoneNo(saved.phone || "");
      if (saved.email) setEmail(saved.email);
      setInterests(saved.interests || []);
      setAbout(saved.about || "");
      setAvatar(saved.avatar || null);
    })();
    return () => { alive = false; };
  }, [user.id]);

  const toggleInterest = (i) =>
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  async function onPhoto(files) {
    setErr("");
    const file = files?.[0];
    if (!file) return;
    try { setAvatar(await processAvatar(file)); }
    catch (e) { setErr(e.message || "Couldn't use that photo."); }
  }

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      await saveProfile(user.id, {
        gender, firstName, lastName, address, phone: phoneNo, email, interests, about, avatar,
        birthMonth: birthMonth ? Number(birthMonth) : null,
        birthDay: birthDay ? Number(birthDay) : null,
      });
      onDone();
    } catch (e) {
      setErr(e.message || "Couldn't save your profile. Try again.");
      setBusy(false);
    }
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
              <input type="email" value={email} readOnly={!!accountEmail}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                style={{ ...field, ...(accountEmail ? { color: C.inkSoft, cursor: "default" } : null) }} />
              {accountEmail && <p style={{ fontFamily: font.body, fontStyle: "italic", fontSize: 12, color: C.faint, margin: "6px 0 0" }}>Your sign-in email.</p>}
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

          {/* Birthday — month & day only, no year */}
          <div style={{ marginBottom: 20 }}>
            <label style={label}>Birthday <span style={{ textTransform: "none", letterSpacing: 0, color: C.faint }}>(month &amp; day)</span></label>
            <div style={{ ...twoCol, marginTop: 8 }}>
              <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}
                style={{ ...field, cursor: "pointer", WebkitAppearance: "menulist", color: birthMonth ? C.ink : C.faint }}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1} style={{ color: C.ink }}>{m}</option>)}
              </select>
              <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)}
                style={{ ...field, cursor: "pointer", WebkitAppearance: "menulist", color: birthDay ? C.ink : C.faint }}>
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1} style={{ color: C.ink }}>{i + 1}</option>)}
              </select>
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
