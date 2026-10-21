import React, { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, X } from "lucide-react";

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

function normalizeKey(e) {
  if (e.key === "Control") return "CTRL";
  if (e.key === "Shift") return "SHIFT";
  if (e.key === "Alt") return "ALT";
  if (e.key === "Meta") return "WIN";
  if (e.key === " ") return "SPACE";
  if (e.key.length === 1) return e.key.toUpperCase();
  return e.key.toUpperCase();
}

/**
 * Click-to-record box. Captures every keydown while focused/recording
 * and renders the held chord live; commits on first non-modifier key
 * release (so "Ctrl+Alt+Shift+K" records as one chord, not four).
 */
export default function ShortcutRecorder({ value = [], onChange }) {
  const [recording, setRecording] = useState(false);
  const [live, setLive] = useState([]);
  const containerRef = useRef(null);

  const stop = useCallback(() => setRecording(false), []);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      const key = normalizeKey(e);
      setLive((prev) => (prev.includes(key) ? prev : [...prev, key]));
    };

    const handleKeyUp = (e) => {
      e.preventDefault();
      // Commit once a non-modifier key has been pressed and is released.
      if (!MODIFIER_KEYS.has(e.key)) {
        setLive((prev) => {
          if (prev.length > 0) {
            onChange(prev);
          }
          return prev;
        });
        setRecording(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [recording, onChange]);

  const startRecording = () => {
    setLive([]);
    setRecording(true);
    containerRef.current?.focus();
  };

  const display = recording ? live : value;

  return (
    <div className="flex items-center gap-2">
      <div
        ref={containerRef}
        tabIndex={0}
        onClick={startRecording}
        className={`flex-1 min-h-[2.5rem] rounded-lg border px-3 py-2 flex items-center gap-1 cursor-text transition-colors ${
          recording
            ? "border-accent bg-graphite-800 ring-2 ring-accent/40"
            : "border-graphite-600 bg-graphite-800 hover:border-graphite-500"
        }`}
      >
        {display.length === 0 ? (
          <span className="text-sm text-graphite-500">
            {recording ? "Press keys…" : "Click to record a shortcut"}
          </span>
        ) : (
          display.map((k, i) => (
            <React.Fragment key={k + i}>
              {i > 0 && <span className="text-graphite-500 text-xs">+</span>}
              <kbd className="px-1.5 py-0.5 rounded bg-graphite-700 text-xs font-mono text-gray-100 border border-graphite-500">
                {k}
              </kbd>
            </React.Fragment>
          ))
        )}
        {recording && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
      </div>
      {recording ? (
        <button
          onClick={stop}
          className="shrink-0 p-2 rounded-lg bg-graphite-700 hover:bg-graphite-600 text-gray-300"
          title="Cancel recording"
        >
          <X size={16} />
        </button>
      ) : (
        <button
          onClick={startRecording}
          className="shrink-0 p-2 rounded-lg bg-graphite-700 hover:bg-graphite-600 text-gray-300"
          title="Record new shortcut"
        >
          <Keyboard size={16} />
        </button>
      )}
    </div>
  );
}
