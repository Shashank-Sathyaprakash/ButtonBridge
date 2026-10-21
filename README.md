# MX Remapper

Remaps buttons on a Logitech MX Master 2S on Windows 11 without installing
Logi Options+: a React configurator UI (hosted on local IIS) talking to a
zero-dependency Python background agent (`server.py`) that installs
low-level Win32 hooks and synthesizes keystrokes.

## What's inside

```
frontend/   React + Tailwind + lucide-react source (Vite project)
frontend/dist/   Pre-built static output — already built in this sandbox,
                 ready to copy straight into IIS if you don't want to
                 run `npm run build` yourself.
backend/server.py   The Python agent. Stdlib only — nothing to pip install.
deployment/web.config   IIS config for SPA routing + Private Network Access.
```

## ⚠️ Read before you rely on this: Mode Shift & Gesture button uplift is unverified

Windows' generic HID mouse driver (active when Logi Options+ is **not**
installed) only exposes a fixed set of events through `WH_MOUSE_LL`:

| Input | Windows message | Status |
|---|---|---|
| Middle Click | `WM_MBUTTONDOWN` | ✅ Confirmed, works out of the box |
| Side Back / Forward | `WM_XBUTTONDOWN` (XBUTTON1/2) | ✅ Confirmed, works out of the box |
| Thumb wheel tilt left/right | `WM_MOUSEHWHEEL` | ✅ Confirmed, works out of the box |
| **Mode Shift button** | — | ⚠️ **Unverified** — see below |
| **Thumb-rest Gesture button** (tap + 4-way hold/swipe) | — | ⚠️ **Unverified** — see below |

Mode Shift and the Gesture button are Logitech-proprietary controls that
Logi Options+ normally reads via the device's HID++ 2.0 report stream.
I don't have a confirmed, documented Windows message that the *generic*
driver emits for either of them — it's entirely possible the stock driver
doesn't surface them as mouse events at all, in which case no
`WH_MOUSE_LL`-based tool (including this one) can see them, and remapping
them would require reverse-engineering the raw HID++ report format (e.g.
with a USB protocol sniffer), which is a separate, larger project.

**Find out what your hardware actually sends:**

```
python server.py --diagnose
```

Then press every button, including Mode Shift and the Gesture button, and
watch the console. If something prints for those two, `server.py` has a
clearly-marked `EXTRA_XBUTTON_IDS` dict near the top where you plug in
whatever id shows up, and the config UI already has mapping rows ready
for them. If nothing prints, those two inputs are not remappable this way
on your setup — the other five inputs (Middle Click, Back, Forward,
thumb-wheel left/right) are unaffected and fully functional.

The frontend marks both buttons "unverified" in the UI for this reason.

## Quick start

1. **Backend:** `cd backend && python server.py --diagnose` → test every
   button → then `python server.py` (leave it running).
2. **Frontend (dev):** `cd frontend && npm install && npm run dev` — opens
   at `http://localhost:5173`, talks to the agent at `127.0.0.1:8765`.
3. **Frontend (IIS):** `cd frontend && npm run build`, copy `dist/*` plus
   `../deployment/web.config` into an IIS site's physical path, browse to
   it. Full steps are also in the app's own "IIS Hosting Guide" tab.

## Everything else in the spec

- All 7 inputs + 4-way gesture swipe (with adjustable pixel threshold) are
  configurable from the Configurator tab.
- 20 built-in OS presets (Task View, desktop switching, copy/paste/cut,
  undo/redo, browser tab nav, volume/media, window snap, show desktop,
  emoji picker, mic mute) plus a live keyboard-capture custom shortcut
  recorder.
- Multiple named profiles with JSON import/export and a `localStorage`
  fallback that keeps the UI usable (and syncs back) when the agent is
  offline.
- "Animate & Test Input" fires the mouse illustration's press/spin/glow
  animation and sends a real `POST /test` to the agent; "Auto-Tour
  Animations" cycles the illustration through every input as a visual-only
  preview.
- `server.py` sends `Access-Control-Allow-Private-Network: true` on every
  response (including `OPTIONS` preflight), and `web.config` adds the same
  header on the IIS side, for Chrome/Edge Private Network Access.
