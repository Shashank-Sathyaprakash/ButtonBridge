// Mirrors backend/server.py PRESET_KEYS exactly — keep these two in sync.
export const PRESETS = [
  { id: "task_view", label: "Task View", keys: "Win+Tab" },
  { id: "desktop_left", label: "Switch Desktop Left", keys: "Ctrl+Win+Left" },
  { id: "desktop_right", label: "Switch Desktop Right", keys: "Ctrl+Win+Right" },
  { id: "copy", label: "Copy", keys: "Ctrl+C" },
  { id: "paste", label: "Paste", keys: "Ctrl+V" },
  { id: "cut", label: "Cut", keys: "Ctrl+X" },
  { id: "undo", label: "Undo", keys: "Ctrl+Z" },
  { id: "redo", label: "Redo", keys: "Ctrl+Y" },
  { id: "browser_tab_next", label: "Next Browser Tab", keys: "Ctrl+Tab" },
  { id: "browser_tab_prev", label: "Previous Browser Tab", keys: "Ctrl+Shift+Tab" },
  { id: "close_tab", label: "Close Tab", keys: "Ctrl+W" },
  { id: "reopen_tab", label: "Reopen Closed Tab", keys: "Ctrl+Shift+T" },
  { id: "volume_up", label: "Volume Up", keys: "Volume Up" },
  { id: "volume_down", label: "Volume Down", keys: "Volume Down" },
  { id: "volume_mute", label: "Mute", keys: "Volume Mute" },
  { id: "media_play_pause", label: "Play / Pause Media", keys: "Media Play/Pause" },
  { id: "snap_left", label: "Window Snap Left", keys: "Win+Left" },
  { id: "snap_right", label: "Window Snap Right", keys: "Win+Right" },
  { id: "show_desktop", label: "Show Desktop", keys: "Win+D" },
  { id: "emoji_picker", label: "Emoji Picker", keys: "Win+." },
  { id: "mic_mute", label: "Teams/Zoom Mic Mute", keys: "Ctrl+Shift+M" },
];

export const INPUT_SLOTS = [
  { key: "middleClick", label: "Middle Click", group: "core" },
  { key: "modeShift", label: "Mode Shift", group: "core", unverified: true },
  { key: "thumbLeft", label: "Thumb Wheel Left", group: "core" },
  { key: "thumbRight", label: "Thumb Wheel Right", group: "core" },
  { key: "forward", label: "Side Forward (Mouse5)", group: "core" },
  { key: "back", label: "Side Back (Mouse4)", group: "core" },
  { key: "gestureTap", label: "Gesture: Single Tap", group: "gesture", unverified: true },
  { key: "gestureUp", label: "Gesture: Hold + Move Up", group: "gesture", unverified: true },
  { key: "gestureDown", label: "Gesture: Hold + Move Down", group: "gesture", unverified: true },
  { key: "gestureLeft", label: "Gesture: Hold + Move Left", group: "gesture", unverified: true },
  { key: "gestureRight", label: "Gesture: Hold + Move Right", group: "gesture", unverified: true },
];

export function presetLabel(id) {
  return PRESETS.find((p) => p.id === id)?.label ?? id;
}

export function presetKeys(id) {
  return PRESETS.find((p) => p.id === id)?.keys ?? "";
}

export function describeMapping(mapping) {
  if (!mapping || mapping.type === "none") return "Unassigned";
  if (mapping.type === "preset") return presetKeys(mapping.id);
  if (mapping.type === "custom") return (mapping.keys || []).join("+");
  return "Unassigned";
}
