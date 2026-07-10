import { useState, useEffect, useRef, useCallback } from "react";
import { BookOpen, Camera, X, LogOut, Menu, Check, Loader2, UserRound, ChevronLeft, ChevronRight, Mic } from "lucide-react";
import { C, font } from "./theme.js";
import { getProfile } from "./profile.js";
import { loadIndex, loadEntry, saveEntry, deleteEntry } from "./db.js";

/* ------------------------------------------------------------------ *
 *  DiaryApp — the signed-in experience. Entries and photos are read and
 *  written through src/db.js (Supabase), scoped to the signed-in user.
 * ------------------------------------------------------------------ */

const { display, body, ui } = font;

const MAX_PHOTOS = 5; // photos allowed per day

/* -------- viewport tiers: phone | tablet(iPad) | desktop -------- */
function useViewport() {
  const get = () => (typeof window !== "undefined" ? window.innerWidth : 1024);
  const [w, setW] = useState(get);
  useEffect(() => {
    const on = () => setW(get());
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, []);
  return {
    w,
    phone: w < 640,               // iPhone
    tablet: w >= 640 && w < 1100, // iPad portrait/landscape band
    persistent: w >= 900,         // shelf stays pinned (iPad landscape + desktop)
  };
}

/* ------------------------------ helpers ------------------------------ */
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const prettyDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
};
const shortDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Still awake";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

function processImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't an image we can open."));
      img.onload = () => {
        const max = 1400;
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r); height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function pageBtn(active) {
  return {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
    textAlign: "left", minHeight: 46, padding: "8px 12px", marginBottom: 3, borderRadius: 9, cursor: "pointer",
    border: "none", background: active ? "#E4E0D3" : "transparent", color: active ? C.ink : C.inkSoft,
  };
}

const sideBtn = {
  minHeight: 46, padding: "0 14px", borderRadius: 10, border: `1px solid ${C.line}`,
  background: "transparent", cursor: "pointer", color: C.inkSoft, fontFamily: ui, fontSize: 14.5,
  display: "flex", alignItems: "center", gap: 8,
};

/* A photo thumbnail that keeps its natural aspect ratio (no cropping) and only
   shows its Remove button after a long-press. A short tap opens the lightbox. */
function PhotoTile({ src, revealed, onOpen, onReveal, onRemove }) {
  const timer = useRef(null);
  const wasLong = useRef(false);
  const start = () => {
    wasLong.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { wasLong.current = true; onReveal(); }, 500);
  };
  const cancel = () => clearTimeout(timer.current);
  const onClick = () => { if (wasLong.current) { wasLong.current = false; return; } onOpen(); };
  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.line}`, background: C.paper }}>
      <img src={src} alt="" draggable={false}
        onPointerDown={start} onPointerUp={cancel} onPointerMove={cancel} onPointerLeave={cancel}
        onContextMenu={(e) => e.preventDefault()} onClick={onClick}
        style={{ width: "100%", height: "auto", display: "block", cursor: "pointer",
          userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }} />
      {revealed && (
        <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label="Remove photo"
          style={{ position: "absolute", top: 8, right: 8, height: 30, padding: "0 11px", borderRadius: 8, border: "none",
            cursor: "pointer", background: "rgba(38,38,58,0.85)", color: "#fff", fontFamily: ui, fontSize: 12.5, fontWeight: 500,
            display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 2px 10px -2px rgba(0,0,0,0.5)" }}>
          <X size={13} /> Remove
        </button>
      )}
    </div>
  );
}

// Primary (indigo) variant — same look as the "Open my diary" button on login.
const primarySideBtn = {
  minHeight: 46, padding: "0 14px", borderRadius: 10, border: "none",
  background: C.ink, cursor: "pointer", color: C.page, fontFamily: ui, fontSize: 15, fontWeight: 500,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};

/* Month calendar for the shelf — jump to any day. Days with an entry get a
   brass dot; today gets a ring; the selected day is filled. */
function Calendar({ selected, index, onPick }) {
  const parse = (k) => { const [y, m] = k.split("-").map(Number); return { y, m: m - 1 }; };
  const [ym, setYm] = useState(() => parse(selected));
  useEffect(() => { setYm(parse(selected)); }, [selected]);

  const first = new Date(ym.y, ym.m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const label = first.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  const todayK = todayKey();
  const has = new Set(index || []);
  const key = (d) => `${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const prev = () => setYm(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const next = () => setYm(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const arrow = { width: 26, height: 26, display: "grid", placeItems: "center", background: "none", border: "none", cursor: "pointer", color: C.inkSoft, borderRadius: 6 };
  const dow = { fontFamily: ui, fontSize: 10.5, color: C.faint, textAlign: "center", padding: "2px 0" };

  return (
    <div style={{ padding: "2px 2px 6px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 6px" }}>
        <button onClick={prev} aria-label="Previous month" style={arrow}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: display, fontStyle: "italic", fontSize: 15, color: C.ink }}>{label}</span>
        <button onClick={next} aria-label="Next month" style={arrow}><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => <span key={w} style={dow}>{w}</span>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginTop: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <span key={"b" + i} />;
          const k = key(d);
          const sel = k === selected;
          const today = k === todayK;
          const entry = has.has(k);
          return (
            <button key={k} onClick={() => onPick(k)} aria-label={k}
              style={{ position: "relative", aspectRatio: "1 / 1", minHeight: 30,
                border: today && !sel ? `1px solid ${C.brass}` : "1px solid transparent", borderRadius: 8, cursor: "pointer",
                fontFamily: body, fontSize: 13.5, fontWeight: entry || today ? 600 : 400,
                background: sel ? "#7B5836" : "transparent", color: sel ? "#fff" : (entry ? C.ink : C.faint),
                display: "grid", placeItems: "center" }}>
              {d}
              {entry && !sel && <span style={{ position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: "50%", background: C.brass }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ DIARY ============================ */
export default function DiaryApp({ user, onLogout, onEditProfile }) {
  const vp = useViewport();
  const { phone, tablet, persistent } = vp;
  const [index, setIndex] = useState(null);
  const [selected, setSelected] = useState(todayKey());
  const [entry, setEntry] = useState({ text: "", html: "", photoIds: [] });
  const [revealRemove, setRevealRemove] = useState(null); // photo id whose Remove button is shown
  const [photos, setPhotos] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [uploadErr, setUploadErr] = useState("");
  const [loadingEntry, setLoadingEntry] = useState(true);
  const [profile, setProfile] = useState(null); // for the greeting + birthday
  const [recording, setRecording] = useState(false); // speech-to-text active

  const saveTimer = useRef(null);
  const savedTimer = useRef(null);
  const fileInput = useRef(null);
  const editorRef = useRef(null); // the rich-text entry (contentEditable)
  const recognitionRef = useRef(null); // Web Speech API instance

  const speechSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => { let a = true; getProfile(user.id).then((p) => { if (a) setProfile(p); }); return () => { a = false; }; }, [user.id]);
  useEffect(() => { (async () => setIndex(await loadIndex(user.id)))(); }, [user.id]);
  useEffect(() => { if (persistent) setDrawerOpen(false); }, [persistent]);

  // Hide a photo's Remove button when tapping anywhere else.
  useEffect(() => {
    if (revealRemove == null) return;
    const clear = () => setRevealRemove(null);
    const t = setTimeout(() => document.addEventListener("pointerdown", clear), 0);
    return () => { clearTimeout(t); document.removeEventListener("pointerdown", clear); };
  }, [revealRemove]);

  useEffect(() => {
    let alive = true;
    setLoadingEntry(true);
    (async () => {
      const e = await loadEntry(user.id, selected); // { html, text, photos:[{id,dataUrl}] }
      if (!alive) return;
      const map = {}; const ids = [];
      for (const p of e.photos || []) { if (p && p.id && p.dataUrl) { map[p.id] = p.dataUrl; ids.push(p.id); } }
      // The editor is uncontrolled: set its HTML imperatively on load.
      const el = editorRef.current;
      if (el) el.innerHTML = e.html || "";
      setEntry({ text: e.text || "", html: e.html || "", photoIds: ids });
      setPhotos(map);
      setRevealRemove(null);
      setSaveState("idle");
      setLoadingEntry(false);
    })();
    return () => { alive = false; };
  }, [selected, user.id]);

  const persist = useCallback(async (next, photosArr) => {
    setSaveState("saving");
    const hasContent = next.text.trim() || next.photoIds.length;
    try {
      if (hasContent) {
        await saveEntry(user.id, selected, { html: next.html, text: next.text, photos: photosArr || [] });
        setIndex((cur) => {
          const list = cur || [];
          return list.includes(selected) ? list : [...list, selected].sort((a, b) => (a < b ? 1 : -1));
        });
      } else {
        await deleteEntry(user.id, selected);
        setIndex((cur) => (cur || []).filter((d) => d !== selected));
      }
      setSaveState("saved");
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 1600);
    } catch (e) {
      console.error("save entry", e);
      setSaveState("idle");
      setUploadErr("Couldn't save — check your connection and try again.");
    }
  }, [selected, user.id]);

  // Build the [{id,dataUrl}] array the DB stores, from the current photo ids + map.
  const photoArr = (ids, map) => ids.map((id) => ({ id, dataUrl: map[id] })).filter((p) => p.dataUrl);

  // Read the contentEditable, mirror it into state, and debounce a save.
  const readEditor = () => {
    const el = editorRef.current;
    if (!el) return;
    // Collapse a stray <br> so the empty-state placeholder can show.
    if (el.innerText.replace(/ /g, " ").trim() === "") el.innerHTML = "";
    setEntry((cur) => {
      const next = { ...cur, text: el.innerText, html: el.innerHTML };
      const arr = photoArr(next.photoIds, photos);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next, arr), 700);
      return next;
    });
  };

  // Cmd/Ctrl+B → bold, Cmd/Ctrl+I → italic on the current selection.
  const onEditorKeyDown = (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "b" || k === "i") {
      e.preventDefault();
      document.execCommand(k === "b" ? "bold" : "italic");
      readEditor();
    }
  };

  async function addPhotos(files) {
    setUploadErr("");
    const current = entry.photoIds.length;
    if (current >= MAX_PHOTOS) {
      setUploadErr(`You can add up to ${MAX_PHOTOS} photos per day.`);
      return;
    }
    const picked = Array.from(files);
    const allowed = picked.slice(0, MAX_PHOTOS - current); // only fill the remaining slots
    const additions = { ...photos };
    let ids = [...entry.photoIds];
    for (const file of allowed) {
      try {
        const dataUrl = await processImage(file);
        const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        additions[id] = dataUrl; ids.push(id);
      } catch (err) { setUploadErr(err.message || "Couldn't add that photo."); }
    }
    setPhotos(additions);
    const next = { ...entry, photoIds: ids };
    setEntry(next); persist(next, photoArr(ids, additions));
    if (picked.length > allowed.length) setUploadErr(`Only ${MAX_PHOTOS} photos per day — the rest weren't added.`);
  }

  async function removePhoto(id) {
    const ids = entry.photoIds.filter((x) => x !== id);
    const p = { ...photos }; delete p[id];
    setPhotos(p);
    const next = { ...entry, photoIds: ids };
    setEntry(next); persist(next, photoArr(ids, p)); setLightbox(null); setRevealRemove(null);
  }

  // Insert dictated text at the end of the entry, then save.
  function insertDictation(text) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false); // caret to end
    sel.removeAllRanges(); sel.addRange(range);
    document.execCommand("insertText", false, text);
    readEditor();
  }

  // Toggle voice dictation (Web Speech API — runs in the browser).
  function toggleMic() {
    if (recording) { recognitionRef.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setUploadErr("Voice input isn't supported in this browser."); return; }
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text.trim()) insertDictation(text.trim() + " ");
    };
    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed")
        setUploadErr("Microphone access is blocked. Allow it in your browser to dictate.");
      else if (ev.error !== "aborted" && ev.error !== "no-speech")
        setUploadErr("Voice input error: " + ev.error);
    };
    rec.onend = () => { setRecording(false); recognitionRef.current = null; };
    recognitionRef.current = rec;
    setUploadErr("");
    try { rec.start(); setRecording(true); } catch { /* already started */ }
  }

  // Stop dictation when leaving the day or unmounting.
  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch {} }, []);
  useEffect(() => { recognitionRef.current?.stop(); }, [selected]);

  const isToday = selected === todayKey();
  const isBlank = !entry.text.trim() && entry.photoIds.length === 0;
  const showWelcome = isToday && isBlank && !loadingEntry;

  // Birthday: does the selected day's month/day match the profile's birthday?
  const isBirthday = !!(profile?.birthMonth && profile?.birthDay) &&
    selected.slice(5) === `${String(profile.birthMonth).padStart(2, "0")}-${String(profile.birthDay).padStart(2, "0")}`;
  const greetName = (profile?.firstName || user.displayName || "").trim();

  const sidebarW = phone ? "82vw" : tablet ? 248 : 264;

  const Sidebar = (
    <aside style={{
      width: sidebarW, maxWidth: 320, flexShrink: 0, background: C.paper,
      borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", height: "100%",
      paddingTop: "env(safe-area-inset-top)",
    }}>
      <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.brass, minWidth: 0 }}>
            <BookOpen size={18} strokeWidth={1.7} />
            <span style={{ fontFamily: display, fontSize: 17, fontWeight: 500, color: C.ink, lineHeight: 1.1 }}>My Little Secret Diary</span>
          </div>
          {/* Collapse button — only on phone/iPad where the shelf is a drawer. */}
          {!persistent && (
            <button onClick={() => setDrawerOpen(false)} aria-label="Collapse shelf"
              style={{ flexShrink: 0, width: 34, height: 34, marginRight: -4, display: "grid", placeItems: "center",
                background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}>
              <ChevronLeft size={20} />
            </button>
          )}
        </div>
        <p style={{ fontFamily: body, fontSize: 13.5, color: C.inkSoft, margin: "10px 0 0" }}>{greetName || user.email}</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "10px 12px" }}>
        <button onClick={() => { setSelected(todayKey()); setDrawerOpen(false); }} style={pageBtn(isToday)}>
          <span style={{ fontFamily: ui, fontWeight: 500, fontSize: 15 }}>Today</span>
          <span style={{ fontFamily: body, fontSize: 12.5, color: isToday ? C.brassDeep : C.faint }}>{shortDate(todayKey())}</span>
        </button>

        <p style={{ fontFamily: ui, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, margin: "16px 8px 6px" }}>Recent</p>
        {index === null ? (
          <p style={{ fontFamily: body, fontSize: 13.5, color: C.faint, padding: "0 8px", fontStyle: "italic" }}>Opening the shelf…</p>
        ) : index.filter((d) => d !== todayKey()).length === 0 ? (
          <p style={{ fontFamily: body, fontSize: 13.5, color: C.faint, padding: "0 8px", fontStyle: "italic", lineHeight: 1.5 }}>
            Nothing here yet. Each day you write becomes a page — use the calendar below to revisit any day.
          </p>
        ) : (
          index.filter((d) => d !== todayKey()).slice(0, 5).map((d) => (
            <button key={d} onClick={() => { setSelected(d); setDrawerOpen(false); }} style={pageBtn(selected === d)}>
              <span style={{ fontFamily: body, fontSize: 15 }}>{prettyDate(d).replace(/,\s\d{4}$/, "")}</span>
              <span style={{ fontFamily: body, fontSize: 12, color: C.faint }}>{d.slice(0, 4)}</span>
            </button>
          ))
        )}

        <p style={{ fontFamily: ui, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, margin: "18px 8px 4px" }}>Calendar</p>
        <Calendar selected={selected} index={index} onPick={(d) => { setSelected(d); setDrawerOpen(false); }} />
      </div>

      <div style={{ padding: 12, paddingBottom: "max(12px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => { onEditProfile?.(); setDrawerOpen(false); }} style={sideBtn}>
          <UserRound size={15} /> Edit profile
        </button>
        <button onClick={onLogout} style={primarySideBtn}>
          <LogOut size={15} /> Close the diary
        </button>
      </div>
    </aside>
  );

  const pagePad = phone ? "26px 20px 40px" : tablet ? "38px 40px 46px" : "40px 44px 48px";
  const pageMax = phone ? "100%" : tablet ? 640 : 680;
  const welcomeSize = phone ? 27 : tablet ? 31 : 34;
  const dateSize = phone ? 22 : 26;
  const textSize = phone ? 17.5 : 18.5;

  return (
    <div style={{ display: "flex", height: "100%", background: C.paper, position: "relative" }}>
      {persistent && Sidebar}

      {!persistent && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)}
          style={{ position: "absolute", inset: 0, background: "rgba(38,38,58,0.35)", zIndex: 30 }}>
          <div onClick={(e) => e.stopPropagation()} className="drawer" style={{ height: "100%" }}>{Sidebar}</div>
        </div>
      )}

      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column" }}>
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          padding: "12px 16px", paddingTop: "max(12px, env(safe-area-inset-top))",
          position: "sticky", top: 0, background: C.paper, zIndex: 10, borderBottom: `1px solid ${C.line}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {!persistent && (
              <button onClick={() => setDrawerOpen(true)} aria-label="Open shelf"
                style={{ width: 44, height: 44, display: "grid", placeItems: "center", background: "none", border: "none", cursor: "pointer", color: C.ink, flexShrink: 0 }}>
                <Menu size={22} />
              </button>
            )}
            <div style={{ fontFamily: ui, fontSize: 13, color: C.faint, minHeight: 18 }}>
              {recording ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.danger }}><Mic size={13} /> Listening…</span>
              ) : (<>
                {saveState === "saving" && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Loader2 size={13} className="spin" /> Saving…</span>}
                {saveState === "saved" && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.brassDeep }}><Check size={14} /> Saved</span>}
              </>)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {speechSupported && (
              <button onClick={toggleMic} aria-label={recording ? "Stop dictation" : "Dictate with your voice"}
                title={recording ? "Stop dictation" : "Dictate"} className={recording ? "mic-pulse" : ""}
                style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                  border: `1px solid ${recording ? C.danger : C.line}`, background: recording ? C.danger : C.page,
                  color: recording ? "#fff" : C.ink, display: "grid", placeItems: "center" }}>
                <Mic size={18} />
              </button>
            )}
            {(() => { const full = entry.photoIds.length >= MAX_PHOTOS; return (
            <button onClick={() => fileInput.current?.click()} disabled={full}
              title={full ? `Up to ${MAX_PHOTOS} photos per day` : "Add photo"}
              style={{ height: 44, padding: phone ? "0 12px" : "0 16px", borderRadius: 10, border: `1px solid ${C.line}`,
                background: C.page, cursor: full ? "default" : "pointer", color: C.ink, fontFamily: ui, fontSize: 14.5, fontWeight: 500,
                display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0, opacity: full ? 0.5 : 1 }}>
              <Camera size={18} /> {!phone && (full ? `${MAX_PHOTOS}/${MAX_PHOTOS} photos` : "Add photo")}
            </button>
            ); })()}
          </div>
          <input ref={fileInput} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
        </header>

        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: phone ? "18px 12px 60px" : "34px 22px 80px" }}>
          <div style={{
            width: "100%", maxWidth: pageMax, background: C.page, borderRadius: phone ? 12 : 14,
            border: `1px solid ${C.line}`, padding: pagePad,
            boxShadow: "0 1px 0 #fff inset, 0 24px 50px -40px rgba(38,38,58,0.5)",
            minHeight: phone ? 380 : 460, display: "flex", flexDirection: "column",
          }}>
            {showWelcome ? (
              <div className="welcome" style={{ marginBottom: 20 }}>
                <p style={{ fontFamily: ui, fontSize: 12.5, letterSpacing: "0.12em", textTransform: "uppercase", color: C.brass, margin: 0 }}>{prettyDate(selected)}</p>
                <h1 style={{ fontFamily: display, fontSize: welcomeSize, fontWeight: 500, color: C.ink, margin: "12px 0 6px", lineHeight: 1.15, letterSpacing: "-0.015em" }}>
                  {isBirthday ? `Happy Birthday, ${greetName}! 🎉` : `${greeting()}, ${greetName}.`}
                </h1>
                <p style={{ fontFamily: body, fontStyle: "italic", fontSize: phone ? 16 : 17, color: C.inkSoft, margin: 0 }}>A fresh page. Begin wherever you like.</p>
                <div style={{ height: 1, background: C.line, margin: "24px 0 0" }} />
              </div>
            ) : (
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontFamily: ui, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: C.brass, margin: 0 }}>
                  {isBirthday ? `🎉 Happy Birthday, ${greetName}!` : (isToday ? "Today" : "On this day")}
                </p>
                <h1 style={{ fontFamily: display, fontSize: dateSize, fontWeight: 500, color: C.ink, margin: "7px 0 0", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{prettyDate(selected)}</h1>
                <div style={{ height: 1, background: C.line, margin: "20px 0 0" }} />
              </div>
            )}

            <div ref={editorRef} className="entry-editor" contentEditable suppressContentEditableWarning
              role="textbox" aria-multiline="true" spellCheck
              data-placeholder={showWelcome ? "Dear diary…" : "Continue the day…"}
              onInput={readEditor} onKeyDown={onEditorKeyDown}
              style={{ flex: 1, width: "100%", minHeight: phone ? 200 : 240, border: "none", outline: "none",
                background: "transparent", color: C.ink, fontFamily: body, fontSize: textSize, lineHeight: 1.85,
                whiteSpace: "pre-wrap", overflowWrap: "anywhere" }} />

            {entry.photoIds.length > 0 && (
              <div style={{ marginTop: 24, borderTop: `1px solid ${C.line}`, paddingTop: 22 }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${phone ? 130 : 160}px, 1fr))`, gap: phone ? 8 : 12, alignItems: "start" }}>
                  {entry.photoIds.map((id) => photos[id] && (
                    <PhotoTile key={id} src={photos[id]} revealed={revealRemove === id}
                      onOpen={() => { setRevealRemove(null); setLightbox(id); }}
                      onReveal={() => setRevealRemove(id)}
                      onRemove={() => removePhoto(id)} />
                  ))}
                </div>
                <p style={{ fontFamily: body, fontStyle: "italic", fontSize: 12.5, color: C.faint, margin: "12px 2px 0" }}>
                  Press and hold a photo to remove it.
                </p>
              </div>
            )}
            {uploadErr && <p style={{ fontFamily: body, color: C.danger, fontSize: 13.5, marginTop: 14 }}>{uploadErr}</p>}
          </div>
        </div>
      </main>

      {lightbox && photos[lightbox] && (
        <div onClick={() => setLightbox(null)}
          style={{ position: "absolute", inset: 0, background: "rgba(20,20,30,0.86)", zIndex: 50, display: "grid", placeItems: "center", padding: phone ? 16 : 30 }}>
          <img src={photos[lightbox]} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 10, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)" }} />
          <button onClick={() => setLightbox(null)} aria-label="Close"
            style={{ position: "absolute", top: "max(18px, env(safe-area-inset-top))", right: 18, width: 44, height: 44, borderRadius: "50%",
              border: "none", cursor: "pointer", background: "rgba(255,255,255,0.14)", color: "#fff", display: "grid", placeItems: "center" }}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
