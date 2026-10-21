import React from "react";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import MouseSVG from "./MouseSVG.jsx";
import MappingRow from "./MappingRow.jsx";
import EventLog from "./EventLog.jsx";
import ProfileBar from "./ProfileBar.jsx";
import { INPUT_SLOTS } from "../lib/presets.js";
import { SLOT_TO_MODEL_ID, MODEL_ID_TO_SLOT } from "../lib/modelMap.js";

const CORE_SLOTS = INPUT_SLOTS.filter((s) => s.group === "core");
const GESTURE_SLOTS = INPUT_SLOTS.filter((s) => s.group === "gesture");

export default function ConfigTab({
  config,
  profile,
  onChangeMapping,
  onSelectProfile,
  onAddProfile,
  onDuplicateProfile,
  onDeleteProfile,
  onImport,
  onExport,
  onTest,
  focusedSlot,
  onFocusSlot,
  autoTour,
  onToggleAutoTour,
  onAnimateAll,
  events,
  online,
  gestureThreshold,
  onChangeThreshold,
}) {
  const focusedDef = INPUT_SLOTS.find((s) => s.key === focusedSlot);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      <div className="space-y-4">
        <ProfileBar
          config={config}
          activeProfile={config.activeProfile}
          onSelectProfile={onSelectProfile}
          onAddProfile={onAddProfile}
          onDuplicateProfile={onDuplicateProfile}
          onDeleteProfile={onDeleteProfile}
          onImport={onImport}
          onExport={onExport}
        />

        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-semibold text-gray-200">Hardware Preview</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onAnimateAll}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25"
              >
                <Sparkles size={13} /> Animate &amp; Test Input
              </button>
              <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoTour}
                  onChange={(e) => onToggleAutoTour(e.target.checked)}
                  className="accent-accent"
                />
                Auto-Tour Animations
              </label>
            </div>
          </div>
          {/* MouseSVG renders its own full card (header, 400px canvas,
              quick-select bar) — it's sized by its content, not forced
              into a fixed box, so it can't overflow the row below it. */}
          <MouseSVG
            selectedButton={SLOT_TO_MODEL_ID[focusedSlot] ?? "middle_click"}
            onSelectButton={(modelId) => onFocusSlot(MODEL_ID_TO_SLOT[modelId] ?? "middleClick")}
          />
        </div>

        {/* Whatever is selected (a pin, a quick-select button, or a row below)
            is editable right here, so you never have to scroll away from the
            model to set its action. */}
        {focusedDef && (
          <div data-testid="selected-input-panel">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-graphite-500 mb-2 px-1">
              Selected input
            </h3>
            <MappingRow
              slot={focusedDef}
              mapping={profile[focusedDef.key]}
              onChange={(m) => onChangeMapping(focusedDef.key, m)}
              onTest={onTest}
              onFocus={() => onFocusSlot(focusedDef.key)}
              focused
            />
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-graphite-500 mb-2 px-1">
            Core Inputs
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {CORE_SLOTS.map((slot) => (
              <MappingRow
                key={slot.key}
                slot={slot}
                mapping={profile[slot.key]}
                onChange={(m) => onChangeMapping(slot.key, m)}
                onTest={onTest}
                onFocus={() => onFocusSlot(slot.key)}
                focused={focusedSlot === slot.key}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-graphite-500">
              Thumb-Rest Gesture Button
            </h3>
            <div className="flex items-center gap-2 text-xs text-graphite-400">
              <SlidersHorizontal size={12} />
              Swipe threshold: {gestureThreshold}px
              <input
                type="range"
                min="10"
                max="150"
                value={gestureThreshold}
                onChange={(e) => onChangeThreshold(Number(e.target.value))}
                className="w-28 accent-accent"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {GESTURE_SLOTS.map((slot) => (
              <MappingRow
                key={slot.key}
                slot={slot}
                mapping={profile[slot.key]}
                onChange={(m) => onChangeMapping(slot.key, m)}
                onTest={onTest}
                onFocus={() => onFocusSlot(slot.key)}
                focused={focusedSlot === slot.key}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0">
        <EventLog events={events} online={online} />
      </div>
    </div>
  );
}