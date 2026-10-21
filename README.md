MX Remapper
Remap Logitech MX Master 2S buttons on Windows 11 without installing Logi Options+.

MX Remapper consists of:

A React-based configuration UI hosted locally through IIS
A zero-dependency Python background agent (server.py)
Low-level Win32 mouse hooks for button detection
Synthetic keystroke generation for executing shortcuts
Designed for environments where Logi Options+ may be restricted or unavailable.

Features
Local-only architecture
No cloud services
No external database
Zero-dependency Python backend
Browser-based configuration UI
Multiple profiles
JSON import/export
Built-in shortcut presets
Custom shortcut recording
IIS deployment support
Private Network Access (PNA) compatibility for Chrome/Edge
Project Structure
frontend/
    React + Tailwind + lucide-react source (Vite project)

frontend/dist/
    Production build output generated via npm run build

backend/server.py
    Python background agent
    Uses only Python standard library

deployment/web.config
    IIS configuration
    SPA routing support
    Private Network Access headers
Architecture
+---------------------------+
| Chrome / Edge Browser     |
| React Frontend            |
+-------------+-------------+
              |
              |
              v
      HTTP Requests
              |
              |
      127.0.0.1:8765
              |
              v
+---------------------------+
| Local Python Agent        |
| server.py                 |
| Port 8765                 |
+---------------------------+

Frontend Hosting
----------------

+---------------------------+
| IIS Website               |
| Port 8080                 |
| React dist/ files         |
+---------------------------+
Communication Flow
IIS serves the React build as static files.
The browser loads the application from IIS.
The browser communicates directly with the Python Agent running on 127.0.0.1:8765.
The agent listens for mouse events.
Matching shortcuts are executed locally.
Important
The React application does not communicate with the backend through IIS.

Instead, the browser directly calls:

http://127.0.0.1:8765
Therefore the Python Agent must be running on the same machine as the browser.

Supported Inputs
Input	Windows Message	Status
Middle Click	WM_MBUTTONDOWN	✅ Supported
Back Button	WM_XBUTTONDOWN (XBUTTON1)	✅ Supported
Forward Button	WM_XBUTTONDOWN (XBUTTON2)	✅ Supported
Thumb Wheel Left	WM_MOUSEHWHEEL	✅ Supported
Thumb Wheel Right	WM_MOUSEHWHEEL	✅ Supported
Mode Shift Button	Unknown	⚠️ Unverified
Gesture Button	Unknown	⚠️ Unverified
Mode Shift & Gesture Button Limitation
The Mode Shift and Gesture buttons are Logitech-specific controls typically handled through the HID++ 2.0 protocol used by Logi Options+.

When the mouse operates using only the generic Windows HID driver, these controls may not generate standard Windows mouse messages.

As a result:

They may be detectable
They may expose custom button IDs
They may not be visible to Windows at all
Detection depends entirely on the behavior of your hardware and driver combination.

Diagnostic Mode
To determine what your specific device exposes:

cd backend
python server.py --diagnose
Press every mouse button and observe the console output.

If the Mode Shift or Gesture button produces an identifier, it can be mapped by updating the EXTRA_XBUTTON_IDS section in server.py.

If no event appears, those inputs cannot be remapped through standard Win32 mouse hooks on your setup.

Quick Start
1. Start Backend
cd backend
python server.py --diagnose
Verify all desired buttons are detected.

Then start normally:

python server.py
Leave it running.

2. Frontend Development
cd frontend

npm install

npm run dev
Application:

http://localhost:5173
Backend:

http://127.0.0.1:8765
IIS Deployment
Step 1 - Install Dependencies
Navigate to the frontend folder:

cd frontend
Install packages:

npm install
Step 2 - Generate Production Build
Build the application:

npm run build
This generates:

frontend/dist
Step 3 - Create IIS Site
Open:

inetmgr
Create a new IIS Website.

Example:

Site Name:
MX Remapper

Physical Path:
<project>\frontend\dist

Port:
8080
Step 4 - Copy web.config
Copy:

deployment/web.config
into:

frontend/dist
alongside:

index.html
Step 5 - Start Python Agent
cd backend

python server.py
The agent should now listen on:

http://127.0.0.1:8765
Step 6 - Open Application
Browse to:

http://localhost:8080
or

http://<computer-ip>:8080
Available Functionality
Multiple named profiles
JSON import/export
localStorage offline fallback
Automatic profile synchronization
20 built-in OS shortcut presets
Custom shortcut recorder
Mouse input visualization
Live testing via POST /test
Auto-tour animation mode
Gesture swipe threshold configuration
Built-In Shortcut Presets
Includes mappings for:

Task View
Virtual Desktop Left
Virtual Desktop Right
Copy
Paste
Cut
Undo
Redo
Browser Previous Tab
Browser Next Tab
Volume Up
Volume Down
Mute
Media Play/Pause
Window Snap Left
Window Snap Right
Show Desktop
Emoji Picker
Microphone Mute
Additional productivity shortcuts
Private Network Access (PNA)
Modern versions of Chrome and Edge require permission when a webpage communicates with a local service.

MX Remapper supports this by returning:

Access-Control-Allow-Private-Network: true
from:

Python Agent (server.py)
IIS (web.config)
The browser may display a one-time permission prompt during first use.

Accept the request to enable communication with the local Python Agent.

Requirements
Windows 11
Python 3.x
IIS
IIS URL Rewrite Module
Chrome or Microsoft Edge
Disclaimer
This project is an independent utility and is not affiliated with, endorsed by, or supported by Logitech. Any product names referenced are used solely for compatibility and identification purposes.
