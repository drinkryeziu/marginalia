import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Clickjacking guard: GitHub Pages can't send X-Frame-Options, so refuse to run
// inside a frame — break out, or hide the page if a sandboxed frame blocks that.
if (window.top !== window.self) {
  try { window.top.location = window.self.location.href; }
  catch { document.documentElement.style.display = "none"; }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
