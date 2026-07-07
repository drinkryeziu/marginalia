import { useState, useEffect, useRef, useCallback } from "react";
import { BookOpen, Camera, X, LogOut, Menu, Check, Loader2, UserRound } from "lucide-react";
import { C, font } from "./theme.js";

/* ------------------------------------------------------------------ *
 *  DiaryApp — the signed-in experience.
 *
 *  Ported from the diary.jsx prototype into the runnable Vite app.
 *  The prototype talked to a sandbox `window.storage` API; here it
 *  persists to localStorage, scoped per user (keys carry the username),
 *  so it lines up with src/auth.js. Swap `store` for your backend later
 *  and nothing above this file changes.
 * ------------------------------------------------------------------ */

const { display, body, ui } = font;

/* ------------------------------ storage ------------------------------ */
const store = {
  async get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v != null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  async getRaw(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error("save failed", e); return false; }
  },
  async setRaw(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (e) { console.error("save failed", e); return false; }
  },
  async del(key) { try { localStorage.removeItem(key); } catch {} },
};

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

/* ============================ DIARY ============================ */
export default function DiaryApp({ user, onLogout, onEditProfile }) {
  const vp = useViewport();
  const { phone, tablet, persistent } = vp;
  const [index, setIndex] = useState(null);
  const [selected, setSelected] = useState(todayKey());
  const [entry, setEntry] = useState({ text: "", photoIds: [] });
  const [photos, setPhotos] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [uploadErr, setUploadErr] = useState("");
  const [loadingEntry, setLoadingEntry] = useState(true);

  const saveTimer = useRef(null);
  const savedTimer = useRef(null);
  const fileInput = useRef(null);

  const idxKey = `diary_index_${user.username}`;
  const entryKey = (d) => `diary_entry_${user.username}_${d}`;
  const photoKey = (id) => `diary_photo_${user.username}_${id}`;

  useEffect(() => { (async () => setIndex(await store.get(idxKey, [])))(); }, [idxKey]);
  useEffect(() => { if (persistent) setDrawerOpen(false); }, [persistent]);

  useEffect(() => {
    let alive = true;
    setLoadingEntry(true);
    (async () => {
      const e = (await store.get(entryKey(selected))) || { text: "", photoIds: [] };
      const loaded = {};
      for (const id of e.photoIds || []) {
        const raw = await store.getRaw(photoKey(id));
        if (raw) loaded[id] = raw;
      }
      if (!alive) return;
      setEntry({ text: e.text || "", photoIds: e.photoIds || [] });
      setPhotos(loaded);
      setSaveState("idle");
      setLoadingEntry(false);
    })();
    return () => { alive = false; };
  }, [selected, user.username]);

  const persist = useCallback(async (next) => {
    setSaveState("saving");
    const hasContent = next.text.trim() || next.photoIds.length;
    if (hasContent) {
      await store.set(entryKey(selected), { text: next.text, photoIds: next.photoIds, updatedAt: Date.now() });
      setIndex((cur) => {
        const list = cur || [];
        if (list.includes(selected)) return list;
        const merged = [...list, selected].sort((a, b) => (a < b ? 1 : -1));
        store.set(idxKey, merged);
        return merged;
      });
    } else {
      await store.del(entryKey(selected));
      setIndex((cur) => {
        const list = (cur || []).filter((d) => d !== selected);
        store.set(idxKey, list);
        return list;
      });
    }
    setSaveState("saved");
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaveState("idle"), 1600);
  }, [selected, idxKey]);

  const onText = (e) => {
    const text = e.target.value;
    setEntry((cur) => {
      const next = { ...cur, text };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next), 700);
      return next;
    });
  };

  async function addPhotos(files) {
    setUploadErr("");
    const additions = { ...photos };
    let ids = [...entry.photoIds];
    for (const file of Array.from(files)) {
      try {
        const dataUrl = await processImage(file);
        const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const ok = await store.setRaw(photoKey(id), dataUrl);
        if (!ok) { setUploadErr("That photo was too large to save. Try a smaller one."); continue; }
        additions[id] = dataUrl; ids.push(id);
      } catch (err) { setUploadErr(err.message || "Couldn't add that photo."); }
    }
    setPhotos(additions);
    const next = { ...entry, photoIds: ids };
    setEntry(next); persist(next);
  }

  async function removePhoto(id) {
    await store.del(photoKey(id));
    const ids = entry.photoIds.filter((x) => x !== id);
    const p = { ...photos }; delete p[id];
    setPhotos(p);
    const next = { ...entry, photoIds: ids };
    setEntry(next); persist(next); setLightbox(null);
  }

  const isToday = selected === todayKey();
  const isBlank = !entry.text.trim() && entry.photoIds.length === 0;
  const showWelcome = isToday && isBlank && !loadingEntry;

  const sidebarW = phone ? "82vw" : tablet ? 248 : 264;

  const Sidebar = (
    <aside style={{
      width: sidebarW, maxWidth: 320, flexShrink: 0, background: C.paper,
      borderRight: `1px solid ${C.line}`, display: "flex", flexDirection: "column", height: "100%",
      paddingTop: "env(safe-area-inset-top)",
    }}>
      <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.brass }}>
          <BookOpen size={18} strokeWidth={1.7} />
          <span style={{ fontFamily: display, fontSize: 17, fontWeight: 500, color: C.ink, lineHeight: 1.1 }}>My Little Secret Diary</span>
        </div>
        <p style={{ fontFamily: body, fontSize: 13.5, color: C.inkSoft, margin: "10px 0 0" }}>{user.displayName}</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "10px 12px" }}>
        <button onClick={() => { setSelected(todayKey()); setDrawerOpen(false); }} style={pageBtn(isToday)}>
          <span style={{ fontFamily: ui, fontWeight: 500, fontSize: 15 }}>Today</span>
          <span style={{ fontFamily: body, fontSize: 12.5, color: isToday ? C.brassDeep : C.faint }}>{shortDate(todayKey())}</span>
        </button>

        <p style={{ fontFamily: ui, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint, margin: "16px 8px 6px" }}>Earlier pages</p>
        {index === null ? (
          <p style={{ fontFamily: body, fontSize: 13.5, color: C.faint, padding: "0 8px", fontStyle: "italic" }}>Opening the shelf…</p>
        ) : index.filter((d) => d !== todayKey()).length === 0 ? (
          <p style={{ fontFamily: body, fontSize: 13.5, color: C.faint, padding: "0 8px", fontStyle: "italic", lineHeight: 1.5 }}>
            Nothing here yet. Each day you write becomes a page on this shelf.
          </p>
        ) : (
          index.filter((d) => d !== todayKey()).map((d) => (
            <button key={d} onClick={() => { setSelected(d); setDrawerOpen(false); }} style={pageBtn(selected === d)}>
              <span style={{ fontFamily: body, fontSize: 15 }}>{prettyDate(d).replace(/,\s\d{4}$/, "")}</span>
              <span style={{ fontFamily: body, fontSize: 12, color: C.faint }}>{d.slice(0, 4)}</span>
            </button>
          ))
        )}
      </div>

      <div style={{ padding: 12, paddingBottom: "max(12px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => { onEditProfile?.(); setDrawerOpen(false); }} style={sideBtn}>
          <UserRound size={15} /> Edit profile
        </button>
        <button onClick={onLogout} style={sideBtn}>
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
              {saveState === "saving" && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Loader2 size={13} className="spin" /> Saving…</span>}
              {saveState === "saved" && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.brassDeep }}><Check size={14} /> Saved</span>}
            </div>
          </div>
          <button onClick={() => fileInput.current?.click()}
            style={{ height: 44, padding: phone ? "0 12px" : "0 16px", borderRadius: 10, border: `1px solid ${C.line}`,
              background: C.page, cursor: "pointer", color: C.ink, fontFamily: ui, fontSize: 14.5, fontWeight: 500,
              display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <Camera size={18} /> {!phone && "Add photo"}
          </button>
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
                  {greeting()}, {user.displayName}.
                </h1>
                <p style={{ fontFamily: body, fontStyle: "italic", fontSize: phone ? 16 : 17, color: C.inkSoft, margin: 0 }}>A fresh page. Begin wherever you like.</p>
                <div style={{ height: 1, background: C.line, margin: "24px 0 0" }} />
              </div>
            ) : (
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontFamily: ui, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: C.brass, margin: 0 }}>{isToday ? "Today" : "On this day"}</p>
                <h1 style={{ fontFamily: display, fontSize: dateSize, fontWeight: 500, color: C.ink, margin: "7px 0 0", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{prettyDate(selected)}</h1>
                <div style={{ height: 1, background: C.line, margin: "20px 0 0" }} />
              </div>
            )}

            <textarea value={entry.text} onChange={onText}
              placeholder={showWelcome ? "Dear diary…" : "Continue the day…"} spellCheck
              style={{ flex: 1, width: "100%", minHeight: phone ? 200 : 240, resize: "none", border: "none", outline: "none",
                background: "transparent", color: C.ink, fontFamily: body, fontSize: textSize, lineHeight: 1.85 }} />

            {entry.photoIds.length > 0 && (
              <div style={{ marginTop: 24, borderTop: `1px solid ${C.line}`, paddingTop: 22 }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${phone ? 96 : 120}px, 1fr))`, gap: phone ? 8 : 12 }}>
                  {entry.photoIds.map((id) => photos[id] && (
                    <div key={id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.line}`, aspectRatio: "1 / 1" }}>
                      <img src={photos[id]} alt="" onClick={() => setLightbox(id)}
                        style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in", display: "block" }} />
                      <button onClick={() => removePhoto(id)} aria-label="Remove photo"
                        style={{ position: "absolute", top: 6, right: 6, width: 30, height: 30, borderRadius: "50%", border: "none",
                          cursor: "pointer", background: "rgba(38,38,58,0.72)", color: "#fff", display: "grid", placeItems: "center" }}>
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
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
