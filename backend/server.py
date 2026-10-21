#!/usr/bin/env python3
"""
MX Remapper Agent
==================
Zero-dependency Windows 11 background agent that remaps buttons on a
Logitech MX Master 2S (or any mouse exposing the same message set)
without installing Logi Options+.

Standard library ONLY: ctypes, ctypes.wintypes, http.server, json,
threading, socketserver, argparse, time, sys, os, collections, uuid.

----------------------------------------------------------------------
WHAT THIS CAN AND CANNOT SEE (read this before relying on it)
----------------------------------------------------------------------
Windows' generic HID mouse class driver (the one that's active when
Logi Options+ is NOT installed) exposes a small, fixed set of events
through WH_MOUSE_LL:

    - Left / Right / Middle click        -> WM_LBUTTONDOWN / WM_RBUTTONDOWN / WM_MBUTTONDOWN
    - Back / Forward side buttons        -> WM_XBUTTONDOWN (XBUTTON1 / XBUTTON2)
    - Vertical wheel                     -> WM_MOUSEWHEEL
    - Horizontal wheel tilt              -> WM_MOUSEHWHEEL

Those four rows are what this script hooks and remaps reliably - no
driver needed, confirmed Win32 behavior.

The MX Master 2S's "Mode Shift" button and the "Gesture" (thumb-rest)
button are NOT in that list. On real hardware, those are read by Logi
Options+ directly from the device's proprietary HID++ reports; the
generic Windows mouse driver may not translate them into ANY
WM_MOUSE*/WM_XBUTTON* message at all, in which case WH_MOUSE_LL simply
never fires for them - there's nothing this script (or any
WH_MOUSE_LL-based tool) can do about that, short of writing a raw HID
report parser against Logitech's HID++ 2.0 protocol, which is out of
scope for a zero-dependency stdlib script and which I have not
verified against your specific firmware.

THIS IS WHY --diagnose EXISTS. Run:

    python server.py --diagnose

then press Mode Shift and the Gesture button on the mouse. Watch the
console:
  - If you see an XBUTTON event with an unfamiliar xbutton id, or any
    mouse event at all, this script's EXTRA_XBUTTON handling below can
    probably be extended to cover it.
  - If NOTHING prints when you press those two buttons, the generic
    driver is not surfacing them as mouse messages, and remapping them
    this way is not possible without reverse-engineering the raw HID
    report stream (e.g. with a USB sniffer) - that's a separate,
    larger project.

The config UI will still let you assign actions to Mode Shift and
Gesture for when/if a signal is found; until then those two mappings
are inert. Everything else in this file (Middle Click, Back, Forward,
horizontal wheel left/right) is fully functional today.
----------------------------------------------------------------------

Run:
    python server.py                 # normal operation
    python server.py --diagnose      # print every raw mouse/keyboard event, remap nothing
    python server.py --port 8765     # change the HTTP port (default 8765)
    python server.py --no-suppress   # old behaviour: run actions but ALSO let Windows
                                     # deliver the original click/scroll (troubleshooting)

WHAT "REMAPPED" MEANS HERE
A button/wheel direction whose mapping is a preset or custom shortcut is
CONSUMED: the low-level hook returns 1 without calling CallNextHookEx, so
Windows and the foreground app never see the original event (no Browser
Back/Forward, no middle-click, no horizontal scroll). A mapping of "None",
or one the agent cannot execute, is left alone and passes through untouched.
Button-up events are swallowed iff the matching button-down was swallowed.
"""

import argparse
import ctypes
import ctypes.wintypes as wintypes
import json
import os
import queue
import sys
import threading
import time
import uuid
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

if os.name != "nt":
    print("This agent uses Win32 low-level hooks and only runs on Windows.")
    sys.exit(1)

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

# ----------------------------------------------------------------------
# Win32 constants
# ----------------------------------------------------------------------
WH_MOUSE_LL = 14
WH_KEYBOARD_LL = 13

WM_MOUSEMOVE = 0x0200
WM_LBUTTONDOWN = 0x0201
WM_LBUTTONUP = 0x0202
WM_RBUTTONDOWN = 0x0204
WM_RBUTTONUP = 0x0205
WM_MBUTTONDOWN = 0x0207
WM_MBUTTONUP = 0x0208
WM_MOUSEWHEEL = 0x020A
WM_MOUSEHWHEEL = 0x020E
WM_XBUTTONDOWN = 0x020B
WM_XBUTTONUP = 0x020C

WM_KEYDOWN = 0x0100
WM_KEYUP = 0x0101
WM_SYSKEYDOWN = 0x0104
WM_SYSKEYUP = 0x0105

XBUTTON1 = 0x0001
XBUTTON2 = 0x0002

LLMHF_INJECTED = 0x00000001  # used to ignore events we ourselves synthesize

INPUT_MOUSE = 0
INPUT_KEYBOARD = 1
INPUT_HARDWARE = 2

KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_UNICODE = 0x0004

VK_SHIFT = 0x10
VK_CONTROL = 0x11
VK_MENU = 0x12  # Alt
VK_LWIN = 0x5B

HC_ACTION = 0

# Navigation-cluster keys must be sent with KEYEVENTF_EXTENDEDKEY, otherwise
# some apps read them as the numeric-keypad versions.
EXTENDED_VKS = {0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x2D, 0x2E}

# Virtual-key lookup for named keys used by presets / recorder output.
VK_MAP = {
    "CTRL": VK_CONTROL, "CONTROL": VK_CONTROL,
    "SHIFT": VK_SHIFT,
    "ALT": VK_MENU, "MENU": VK_MENU,
    "WIN": VK_LWIN, "LWIN": VK_LWIN, "META": VK_LWIN,
    "TAB": 0x09, "ENTER": 0x0D, "RETURN": 0x0D, "ESC": 0x1B, "ESCAPE": 0x1B,
    "SPACE": 0x20, "BACKSPACE": 0x08, "DELETE": 0x2E, "DEL": 0x2E,
    "LEFT": 0x25, "UP": 0x26, "RIGHT": 0x27, "DOWN": 0x28,
    "PERIOD": 0xBE, ".": 0xBE, "COMMA": 0xBC, ",": 0xBC,
    # The browser recorder emits e.key.upper(), i.e. "ARROWLEFT", not "LEFT".
    "ARROWLEFT": 0x25, "ARROWUP": 0x26, "ARROWRIGHT": 0x27, "ARROWDOWN": 0x28,
    "HOME": 0x24, "END": 0x23, "PAGEUP": 0x21, "PAGEDOWN": 0x22, "INSERT": 0x2D,
    # unshifted punctuation (US layout virtual-key codes)
    "-": 0xBD, "=": 0xBB, "[": 0xDB, "]": 0xDD, ";": 0xBA, "'": 0xDE,
    "/": 0xBF, "\\": 0xDC, "`": 0xC0,
    "VOLUME_UP": 0xAF, "VOLUME_DOWN": 0xAE, "VOLUME_MUTE": 0xAD,
    "MEDIA_PLAY_PAUSE": 0xB3, "MEDIA_NEXT": 0xB0, "MEDIA_PREV": 0xB1,
}
for i in range(26):
    VK_MAP[chr(ord("A") + i)] = 0x41 + i
for i in range(10):
    VK_MAP[str(i)] = 0x30 + i
for i in range(1, 13):
    VK_MAP[f"F{i}"] = 0x6F + i  # F1=0x70 ... matches 0x6F+1

MODIFIER_NAMES = {"CTRL", "CONTROL", "SHIFT", "ALT", "MENU", "WIN", "LWIN", "META"}


def vk_for(token):
    token = token.strip().upper()
    if token not in VK_MAP:
        raise ValueError(f"Unknown key token in shortcut: {token!r}")
    return VK_MAP[token]


# ----------------------------------------------------------------------
# ctypes structures
# ----------------------------------------------------------------------
LRESULT = ctypes.c_ssize_t
LPARAM = ctypes.c_ssize_t
WPARAM = ctypes.c_size_t
HOOKPROC = ctypes.WINFUNCTYPE(LRESULT, ctypes.c_int, WPARAM, LPARAM)


class MSLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("pt", wintypes.POINT),
        ("mouseData", wintypes.DWORD),
        ("flags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_void_p),
    ]


class KBDLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("vkCode", wintypes.DWORD),
        ("scanCode", wintypes.DWORD),
        ("flags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_void_p),
    ]


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_void_p),
    ]


class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_void_p),
    ]


class INPUT_UNION(ctypes.Union):
    _fields_ = [("ki", KEYBDINPUT), ("mi", MOUSEINPUT)]


class INPUT(ctypes.Structure):
    _fields_ = [("type", wintypes.DWORD), ("union", INPUT_UNION)]


user32.SetWindowsHookExW.restype = wintypes.HHOOK
user32.SetWindowsHookExW.argtypes = [ctypes.c_int, HOOKPROC, wintypes.HINSTANCE, wintypes.DWORD]
user32.CallNextHookEx.restype = LRESULT
user32.CallNextHookEx.argtypes = [wintypes.HHOOK, ctypes.c_int, WPARAM, LPARAM]
user32.UnhookWindowsHookEx.argtypes = [wintypes.HHOOK]
user32.GetMessageW.argtypes = [ctypes.c_void_p, wintypes.HWND, wintypes.UINT, wintypes.UINT]
user32.SendInput.argtypes = [wintypes.UINT, ctypes.POINTER(INPUT), ctypes.c_int]

# ----------------------------------------------------------------------
# State: config, event log, de-bounce
# ----------------------------------------------------------------------
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mx_remapper_config.json")

DEFAULT_CONFIG = {
    "activeProfile": "Default OS",
    "profiles": {
        "Default OS": {
            "middleClick": {"type": "preset", "id": "task_view"},
            "modeShift": {"type": "none"},
            "thumbLeft": {"type": "preset", "id": "desktop_left"},
            "thumbRight": {"type": "preset", "id": "desktop_right"},
            "forward": {"type": "preset", "id": "browser_tab_next"},
            "back": {"type": "preset", "id": "browser_tab_prev"},
            "gestureTap": {"type": "none"},
            "gestureUp": {"type": "none"},
            "gestureDown": {"type": "none"},
            "gestureLeft": {"type": "none"},
            "gestureRight": {"type": "none"},
            "gestureThresholdPx": 40,
        }
    },
}

PRESET_KEYS = {
    "task_view": ["WIN", "TAB"],
    "desktop_left": ["CTRL", "WIN", "LEFT"],
    "desktop_right": ["CTRL", "WIN", "RIGHT"],
    "copy": ["CTRL", "C"],
    "paste": ["CTRL", "V"],
    "cut": ["CTRL", "X"],
    "undo": ["CTRL", "Z"],
    "redo": ["CTRL", "Y"],
    "browser_tab_next": ["CTRL", "TAB"],
    "browser_tab_prev": ["CTRL", "SHIFT", "TAB"],
    "close_tab": ["CTRL", "W"],
    "reopen_tab": ["CTRL", "SHIFT", "T"],
    "volume_up": ["VOLUME_UP"],
    "volume_down": ["VOLUME_DOWN"],
    "volume_mute": ["VOLUME_MUTE"],
    "media_play_pause": ["MEDIA_PLAY_PAUSE"],
    "snap_left": ["WIN", "LEFT"],
    "snap_right": ["WIN", "RIGHT"],
    "show_desktop": ["WIN", "D"],
    "emoji_picker": ["WIN", "PERIOD"],
    "mic_mute": ["CTRL", "SHIFT", "M"],
}

_lock = threading.RLock()
_config = None
_events = deque(maxlen=200)
_diagnose = False
_hook_handles = []
_keep_running = True

# --- suppression / hook state -----------------------------------------
# The hook callback must return FAST (Windows silently unhooks a low-level
# hook that is too slow), so it takes no locks and does no SendInput: it
# reads the immutable-by-convention `_routes` snapshot and queues the action.
_suppress = True            # --no-suppress sets this False
_routes = {}                # slot name -> mapping, snapshot of the active profile
_swallowed = set()          # ("x",1) / ("m",0): buttons whose DOWN we consumed
_action_q = queue.SimpleQueue()
_stats = {
    "mouse_events_seen": 0,
    "xbutton_events_seen": 0,       # down+up, injected or not
    "xbutton_injected_ignored": 0,  # synthesized by other software -> we ignore them
    "actions_queued": 0,
    "events_consumed": 0,           # swallowed, never reached Windows/apps
    "hook_errors": 0,
    "last_xbutton": None,           # raw details of the latest XBUTTON event
}


def load_config():
    global _config
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                _config = json.load(f)
                return
        except (json.JSONDecodeError, OSError):
            pass
    _config = json.loads(json.dumps(DEFAULT_CONFIG))
    save_config()


def save_config():
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(_config, f, indent=2)


def active_profile():
    return _config["profiles"][_config["activeProfile"]]


def is_mapped(mapping):
    """True only for a mapping the agent can actually execute. Anything else
    (None, unknown preset id, empty custom chord) fails OPEN: the original
    Windows behaviour is kept rather than the button silently doing nothing."""
    if not isinstance(mapping, dict):
        return False
    kind = mapping.get("type")
    if kind == "preset":
        return mapping.get("id") in PRESET_KEYS
    if kind == "custom":
        return bool(mapping.get("keys"))
    return False


def rebuild_routes():
    """Publish a fresh slot->mapping snapshot for the hook (atomic swap)."""
    global _routes
    try:
        _routes = dict(active_profile())
    except Exception as exc:  # e.g. activeProfile names a missing profile
        _routes = {}
        log_event("error", f"rebuild_routes failed, nothing will be consumed: {exc}")


def log_event(kind, detail):
    _events.append({
        "id": str(uuid.uuid4()),
        "ts": time.time(),
        "kind": kind,
        "detail": detail,
    })


# ----------------------------------------------------------------------
# Action execution (SendInput)
# ----------------------------------------------------------------------
def send_vk(vk, key_up=False):
    flags = KEYEVENTF_KEYUP if key_up else 0
    if vk in EXTENDED_VKS:
        flags |= KEYEVENTF_EXTENDEDKEY
    inp = INPUT(type=INPUT_KEYBOARD, union=INPUT_UNION(ki=KEYBDINPUT(
        wVk=vk, wScan=0, dwFlags=flags, time=0, dwExtraInfo=None)))
    user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))


def send_chord(tokens):
    """Press every token down in order, then release in reverse order."""
    try:
        vks = [vk_for(t) for t in tokens]
        for vk in vks:
            send_vk(vk, key_up=False)
            time.sleep(0.004)
        for vk in reversed(vks):
            send_vk(vk, key_up=True)
            time.sleep(0.004)
        return True
    except Exception as exc:
        log_event("error", f"send_chord failed for {tokens}: {exc}")
        return False


def run_action(mapping, source_label):
    """mapping: {'type': 'preset'|'custom'|'none', 'id'|'keys': ...}"""
    if not mapping or mapping.get("type") == "none":
        return
    if mapping["type"] == "preset":
        keys = PRESET_KEYS.get(mapping.get("id"))
        if not keys:
            log_event("error", f"Unknown preset id: {mapping.get('id')}")
            return
        if send_chord(keys):
            log_event("action", f"{source_label} -> preset:{mapping['id']} ({'+'.join(keys)})")
    elif mapping["type"] == "custom":
        keys = mapping.get("keys", [])
        if not keys:
            return
        if send_chord(keys):
            log_event("action", f"{source_label} -> custom:{'+'.join(keys)}")


def action_worker():
    """Executes queued actions off the hook thread (SendInput + its 4 ms key
    delays would otherwise run inside the hook callback)."""
    while True:
        mapping, label = _action_q.get()
        try:
            run_action(mapping, label)
        except Exception as exc:
            log_event("error", f"action {label} failed: {exc}")


# ----------------------------------------------------------------------
# Gesture tracking (thumb-rest hold + swipe)
# ----------------------------------------------------------------------
class GestureState:
    def __init__(self):
        self.active = False
        self.start_x = 0
        self.start_y = 0
        self.fired = False

    def begin(self, x, y):
        self.active = True
        self.start_x = x
        self.start_y = y
        self.fired = False

    def move(self, x, y):
        if not self.active or self.fired:
            return
        profile = active_profile()
        threshold = profile.get("gestureThresholdPx", 40)
        dx = x - self.start_x
        dy = y - self.start_y
        if abs(dx) < threshold and abs(dy) < threshold:
            return
        if abs(dx) > abs(dy):
            direction = "gestureRight" if dx > 0 else "gestureLeft"
        else:
            direction = "gestureDown" if dy > 0 else "gestureUp"
        self.fired = True
        run_action(profile.get(direction), f"gesture:{direction}")

    def end(self):
        if self.active and not self.fired:
            run_action(active_profile().get("gestureTap"), "gesture:tap")
        self.active = False
        self.fired = False


gesture_state = GestureState()

# ----------------------------------------------------------------------
# Hook procedures
# ----------------------------------------------------------------------
# NOTE: There is no confirmed, documented WM_* message for the MX Master
# 2S "Mode Shift" or "Gesture" buttons on the generic Windows driver.
# EXTRA_XBUTTON_IDS below is where you'd add an xbutton id if --diagnose
# reveals one; it is empty by default because I have not verified one.
EXTRA_XBUTTON_IDS = {}  # e.g. {4: "modeShift"} if diagnose reveals xbutton id 4


@HOOKPROC
def low_level_mouse_proc(nCode, wParam, lParam):
    if nCode == HC_ACTION:
        try:
            info = ctypes.cast(lParam, ctypes.POINTER(MSLLHOOKSTRUCT)).contents
            if handle_mouse_message(wParam, info):
                # CONSUMED. Returning non-zero WITHOUT calling CallNextHookEx is
                # what stops Windows / the foreground app from ever seeing it.
                return 1
        except Exception as exc:  # never let a bug break the user's mouse
            _stats["hook_errors"] += 1
            _events.append({"id": str(uuid.uuid4()), "ts": time.time(),
                            "kind": "error", "detail": f"hook error: {exc!r}"})
    return user32.CallNextHookEx(None, nCode, wParam, lParam)


@HOOKPROC
def low_level_keyboard_proc(nCode, wParam, lParam):
    # Only installed in --diagnose mode; observation only.
    if nCode == HC_ACTION and _diagnose:
        info = ctypes.cast(lParam, ctypes.POINTER(KBDLLHOOKSTRUCT)).contents
        if not (info.flags & LLMHF_INJECTED):
            print(f"[diagnose][kbd] msg=0x{wParam:04X} vk=0x{info.vkCode:02X} "
                  f"scan=0x{info.scanCode:02X} flags=0x{info.flags:02X}")
    return user32.CallNextHookEx(None, nCode, wParam, lParam)


def _press(slot, label, up_key=None):
    """A button-down / wheel-notch for `slot`. Returns True if CONSUMED."""
    mapping = _routes.get(slot)
    log_event("input", label)
    if _diagnose or not is_mapped(mapping):
        return False                      # unmapped -> Windows handles it normally
    _action_q.put((mapping, slot))
    _stats["actions_queued"] += 1
    if not _suppress:
        return False                      # observe-only mode: run action AND pass through
    if up_key is not None:
        _swallowed.add(up_key)            # remember to swallow the matching UP
    _stats["events_consumed"] += 1
    return True


def _release(up_key):
    """A button-up. Swallow it iff we swallowed its down (keeps Windows' view
    of the button state consistent, even if the profile changed in between)."""
    if up_key in _swallowed:
        _swallowed.discard(up_key)
        _stats["events_consumed"] += 1
        return True
    return False


def handle_mouse_message(wParam, info):
    """Runs INSIDE the hook callback. Returns True to consume the event."""
    if wParam == WM_MOUSEMOVE:            # hot path (~1000/s): do almost nothing
        if gesture_state.active:
            gesture_state.move(info.pt.x, info.pt.y)
        return False

    _stats["mouse_events_seen"] += 1
    high = (info.mouseData >> 16) & 0xFFFF
    wheel_delta = ctypes.c_short(high).value
    injected = bool(info.flags & LLMHF_INJECTED)
    is_x = wParam in (WM_XBUTTONDOWN, WM_XBUTTONUP)

    if is_x:
        _stats["xbutton_events_seen"] += 1
        _stats["last_xbutton"] = {
            "msg": "down" if wParam == WM_XBUTTONDOWN else "up",
            "xbutton_id": high, "injected": injected, "flags": info.flags,
            "ts": time.time(),
        }
        if injected:
            _stats["xbutton_injected_ignored"] += 1

    if _diagnose:
        print(f"[diagnose][mouse] msg=0x{wParam:04X} mouseData=0x{info.mouseData:08X} "
              f"high=0x{high:04X} flags=0x{info.flags:04X} "
              f"{'INJECTED(by other software) ' if injected else ''}"
              f"pt=({info.pt.x},{info.pt.y})")

    if injected:                          # synthesized by someone else: never touch
        return False

    if wParam == WM_MBUTTONDOWN:
        return _press("middleClick", "Middle Click", up_key=("m", 0))
    if wParam == WM_MBUTTONUP:
        return _release(("m", 0))

    if wParam == WM_XBUTTONDOWN:
        if high == XBUTTON1:
            return _press("back", "Back (XBUTTON1)", up_key=("x", high))
        if high == XBUTTON2:
            return _press("forward", "Forward (XBUTTON2)", up_key=("x", high))
        if high in EXTRA_XBUTTON_IDS:
            key = EXTRA_XBUTTON_IDS[high]
            return _press(key, f"Extra XBUTTON id={high} -> {key}", up_key=("x", high))
        log_event("input", f"Unrecognized XBUTTON id={high}")
        return False
    if wParam == WM_XBUTTONUP:
        return _release(("x", high))

    if wParam == WM_MOUSEHWHEEL:
        if wheel_delta > 0:
            return _press("thumbRight", "Thumb Wheel Right")
        if wheel_delta < 0:
            return _press("thumbLeft", "Thumb Wheel Left")
    return False

    # Mode Shift / Gesture: no confirmed WM_* code exists on the generic
    # driver (see the docstring). Populate EXTRA_XBUTTON_IDS after --diagnose
    # if a real id shows up; gesture hold/release would additionally need the
    # matching UP wired to gesture_state.begin()/.end().


def hook_thread_main():
    mouse_hook = user32.SetWindowsHookExW(WH_MOUSE_LL, low_level_mouse_proc, None, 0)
    # The keyboard hook only prints in --diagnose; installing it otherwise just
    # adds latency and a second thing that can be silently unhooked.
    kbd_hook = (user32.SetWindowsHookExW(WH_KEYBOARD_LL, low_level_keyboard_proc, None, 0)
                if _diagnose else True)
    if not mouse_hook or not kbd_hook:
        print("ERROR: SetWindowsHookExW failed. Run from an elevated/interactive "
              "session (hooks require an active desktop + message loop).")
        os._exit(1)
    _hook_handles.extend(h for h in (mouse_hook, kbd_hook) if h is not True)
    print(f"Hooks installed (mouse={bool(mouse_hook)}, keyboard={'diagnose-only' if not _diagnose else bool(kbd_hook)}). "
          f"Suppress original events for remapped buttons: {_suppress and not _diagnose}.")
    msg = wintypes.MSG()
    while _keep_running:
        ret = user32.GetMessageW(ctypes.byref(msg), None, 0, 0)
        if ret == 0 or ret == -1:
            break
        user32.TranslateMessage(ctypes.byref(msg))
        user32.DispatchMessageW(ctypes.byref(msg))
    for h in _hook_handles:
        user32.UnhookWindowsHookEx(h)


# ----------------------------------------------------------------------
# HTTP server: /config, /events, /test
# ----------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    server_version = "MXRemapperAgent/1.0"

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/config"):
            with _lock:
                self._json(200, _config)
        elif self.path.startswith("/events"):
            since = 0
            if "since=" in self.path:
                try:
                    since = float(self.path.split("since=", 1)[1].split("&", 1)[0])
                except ValueError:
                    since = 0
            # The hook appends to _events WITHOUT taking _lock (it must never
            # block), so iterate over an atomic snapshot, not the live deque.
            items = [e for e in list(_events) if e["ts"] > since]
            self._json(200, {"events": items, "serverTime": time.time()})
        elif self.path.startswith("/health"):
            self._json(200, {"ok": True, "diagnose": _diagnose,
                             "suppress": _suppress, "hooks": len(_hook_handles),
                             "stats": dict(_stats)})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b""
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            self._json(400, {"error": "invalid json"})
            return

        if self.path.startswith("/config"):
            with _lock:
                global _config
                if "profiles" in payload and "activeProfile" in payload:
                    _config = payload
                    save_config()
                    rebuild_routes()
                    self._json(200, {"ok": True})
                else:
                    self._json(400, {"error": "expected {activeProfile, profiles}"})

        elif self.path.startswith("/test"):
            target = payload.get("input")
            with _lock:
                profile = active_profile()
                mapping_key = {
                    "middleClick": "middleClick", "modeShift": "modeShift",
                    "thumbLeft": "thumbLeft", "thumbRight": "thumbRight",
                    "forward": "forward", "back": "back",
                    "gestureTap": "gestureTap", "gestureUp": "gestureUp",
                    "gestureDown": "gestureDown", "gestureLeft": "gestureLeft",
                    "gestureRight": "gestureRight",
                }.get(target)
                if mapping_key:
                    run_action(profile.get(mapping_key), f"test:{mapping_key}")
                    log_event("test", f"Simulated {mapping_key}")
                    self._json(200, {"ok": True})
                else:
                    self._json(400, {"error": "unknown input id"})
        else:
            self._json(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        pass  # keep console clean; use --diagnose for verbose output


def http_thread_main(port):
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"HTTP server listening on http://127.0.0.1:{port}  (GET/POST /config, GET /events, POST /test)")
    httpd.serve_forever()


# ----------------------------------------------------------------------
# Entry point
# ----------------------------------------------------------------------
def main():
    global _diagnose, _suppress
    parser = argparse.ArgumentParser(description="MX Remapper background agent")
    parser.add_argument("--diagnose", action="store_true",
                         help="Print every raw mouse/keyboard event; do not fire any mapped action")
    parser.add_argument("--port", type=int, default=8765, help="HTTP port (default 8765)")
    parser.add_argument("--no-suppress", action="store_true",
                         help="Run mapped actions but ALSO let Windows deliver the original "
                              "button/scroll event (the pre-fix behaviour; for troubleshooting)")
    args = parser.parse_args()
    _diagnose = args.diagnose
    _suppress = not args.no_suppress

    load_config()
    rebuild_routes()
    threading.Thread(target=action_worker, daemon=True).start()

    if _diagnose:
        print("=== DIAGNOSE MODE ===")
        print("No actions will be sent. Press every button/wheel direction on the")
        print("mouse, including Mode Shift and the Gesture button, and watch for")
        print("output below. Silence on a press means the generic Windows driver")
        print("is not surfacing that control as a mouse message at all.")
        print("Ctrl+C to stop.\n")

    http_thread = threading.Thread(target=http_thread_main, args=(args.port,), daemon=True)
    http_thread.start()

    try:
        hook_thread_main()  # must run with a message loop; keep on main thread
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()