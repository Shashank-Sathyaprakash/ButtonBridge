import React from "react";
import { Play, AlertTriangle } from "lucide-react";
import ShortcutRecorder from "./ShortcutRecorder.jsx";
import { PRESETS } from "../lib/presets.js";

export default function MappingRow({ slot, mapping, onChange, onTest, onFocus, focused = false }) {
  const type = mapping?.type ?? "none";

  const setType = (newType) => {
    if (newType === "none") onChange({ type: "none" });
    else if (newType === "preset") onChange({ type: "preset", id: PRESETS[0].id });
    else if (newType === "custom") onChange({ type: "custom", keys: [] });
  };

  return (
    // Selecting is click/focus driven (not hover): clicking anywhere on the row,
    // or focusing any control inside it, makes this the selected input, which
    // highlights its pin on the 3D model. `focused` draws the highlight here.
    <div
      data-slot={slot.key}
      data-focused={focused ? "true" : "false"}
      className={`rounded-xl border p-3 transition-colors ${
        focused
          ? "border-accent bg-accent/10 ring-1 ring-accent/50"
          : "border-graphite-700 bg-graphite-900/60 hover:border-graphite-600"
      }`}
      onClick={onFocus}
      onFocusCapture={onFocus}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">{slot.label}</span>
          {slot.unverified && (
            <span
              title="No confirmed Windows event for this input without Logi Options+ — see Python Backend tab"
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50"
            >
              <AlertTriangle size={10} /> unverified
            </span>
          )}
        </div>
        <button
          onClick={() => onTest(slot.key)}
          className="p-1.5 rounded-md bg-graphite-700 hover:bg-accent/20 hover:text-accent text-gray-300 transition-colors"
          title="Animate & Test Input"
        >
          <Play size={13} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-graphite-800 border border-graphite-600 rounded-lg px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <option value="none">Unassigned</option>
          <option value="preset">OS Preset</option>
          <option value="custom">Custom Shortcut</option>
        </select>

        {type === "preset" && (
          <select
            value={mapping.id}
            onChange={(e) => onChange({ type: "preset", id: e.target.value })}
            className="flex-1 bg-graphite-800 border border-graphite-600 rounded-lg px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.keys})
              </option>
            ))}
          </select>
        )}
      </div>

      {type === "custom" && (
        <div className="mt-2">
          <ShortcutRecorder
            value={mapping.keys || []}
            onChange={(keys) => onChange({ type: "custom", keys })}
          />
        </div>
      )}
    </div>
  );
}