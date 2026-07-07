# Marginalia

A quiet daily diary. This repo is the real, runnable starting point — the finalized
login page plus a clean auth layer you can build on.

## Run it

```bash
npm install
npm run dev
```

Open the local URL Vite prints. Sign up, and you'll land on the signed-in screen.
No keys or server needed — it works out of the box.

## What's here

```
index.html            Fonts (Fraunces + Newsreader), reset, root mount
src/
  main.jsx            React entry point
  App.jsx             Restores the session, routes login <-> signed-in view
  LoginPage.jsx       The finished login design (two-panel journal cover)
  DiaryPlaceholder.jsx  Signed-in screen — drop the diary UI here next
  auth.js             The ONLY file that touches your auth/storage backend
  theme.js            Palette + font tokens (one source of truth)
```

## The login page

Responsive by design: the indigo cover and the form sit side by side on
desktop/iPad and stack on phone (below 640px). It includes email/username +
password, sign-up, "Continue with Google", a **Forgot password** reset flow, a
**Keep me signed in** toggle, and a show/hide password control.

## Auth: local now, real when you're ready

`src/auth.js` currently runs entirely in the browser (localStorage), hashing
passwords with SHA-256 + a per-user salt. **This is demo-grade, not production
security**, and data lives only in that browser.

To get real Google sign-in and cross-device sync, replace the bodies of the five
exported functions in `auth.js` with Supabase or Firebase calls. Nothing else in
the app changes, because everything speaks to this contract:

```
getCurrentUser()                                    -> user | null
signUp({ username, displayName, password, stayIn }) -> user
logIn({ username, password, stayIn })               -> user
continueWithGoogle({ displayName, stayIn })         -> user
resetPassword({ username, newPassword, confirm, stayIn }) -> user
logOut()
```

`auth.js` includes short Supabase and Firebase sketches in comments.
**Recommended:** Supabase — you get Google OAuth, email/password, a Postgres
database for entries, and a storage bucket for photos in one place.

## Deploy (GitHub + Vercel)

These files are deploy-ready. `vercel.json` sets the Vite preset, `dist` output,
and an SPA fallback. `.gitignore` keeps `node_modules`/`dist` out of the repo.

**1 — Push to your GitHub repo** (run from the folder that holds these files, so
`package.json` sits at the repo root):

```bash
git init
git add .
git commit -m "Marginalia: login page + auth scaffold"
git branch -M main
git remote add origin https://github.com/<your-username>/diary.git
git push -u origin main
```

Copy the exact URL from your repo's page (green **Code** button) in place of the
`origin` above.

**2 — Deploy on Vercel:**

1. Go to vercel.com → **Add New… → Project**, and import the `diary` repo.
2. Vercel auto-detects **Vite** (Build `npm run build`, Output `dist`). Leave the defaults.
3. If `package.json` is in a subfolder rather than the repo root, set **Root Directory** to that folder.
4. Click **Deploy**. You'll get a live URL, and every future `git push` redeploys automatically.

No environment variables are needed yet — the current build runs on browser
storage. You'll add Vercel env vars later when you connect Supabase/Firebase
(e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), read in code as
`import.meta.env.VITE_...`.

## Next steps

1. Port the diary UI into `DiaryPlaceholder.jsx` (daily pages, welcome, photos, shelf).
2. Swap `auth.js` to Supabase/Firebase for real Google login + sync.
3. For an installable phone app, add a web app manifest (PWA) so it opens
   fullscreen from the Home Screen.

## Notes

- Targeting a native iOS/App Store app instead of the web is a separate path
  (Swift/Xcode or React Native) — say so and it can be scaffolded differently.
- Design tokens and full spec live alongside this project in the design files.
