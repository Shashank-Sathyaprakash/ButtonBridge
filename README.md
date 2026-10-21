# MX Remapper

Remap Logitech MX Master 2S buttons on Windows 11 without installing Logi Options+.

MX Remapper consists of:

- React-based configuration UI hosted on IIS
- Zero-dependency Python background agent (`server.py`)
- Low-level Win32 mouse hooks
- Keyboard shortcut emulation
- Local-only communication

Designed for environments where Logi Options+ may be restricted or unavailable.

---

## Features

- Local-only architecture
- No cloud dependencies
- Zero-dependency Python backend
- Browser-based configuration UI
- Multiple profiles
- JSON import/export
- Built-in Windows shortcut presets
- Custom shortcut recording
- IIS deployment support
- Private Network Access (PNA) compatibility
- Live input testing and visualization

---

## Project Structure

```text
frontend/
├── src/
├── public/
├── dist/
│
├── package.json
└── vite.config.ts

backend/
└── server.py

deployment/
└── web.config
```

---

## Architecture

```text
Browser (Chrome / Edge)
         │
         ▼
    IIS Website
     Port 8080
         │
         ▼
 React Frontend
         │
         ▼
 127.0.0.1:8765
         │
         ▼
 Python Agent
   server.py
```

---

## IIS Deployment

### Step 1 - Install Dependencies

```bash
cd frontend
npm install
```

### Step 2 - Build Frontend

```bash
npm run build
```

This generates:

```text
frontend/dist
```

### Step 3 - Create IIS Website

Point the IIS Physical Path to:

```text
frontend/dist
```

### Step 4 - Copy web.config

Copy:

```text
deployment/web.config
```

into:

```text
frontend/dist
```

### Step 5 - Start Python Agent

```bash
cd backend
python server.py
```

### Step 6 - Open Application

```text
http://localhost:8080
```

---

## Requirements

- Windows 11
- Python 3.x
- Node.js
- IIS
- IIS URL Rewrite Module
- Chrome or Microsoft Edge
