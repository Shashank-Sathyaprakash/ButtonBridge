import React, { useCallback, useEffect, useRef, useState } from "react";
import { MousePointerClick, Terminal, Server, AlertTriangle } from "lucide-react";
import ConfigTab from "./components/ConfigTab.jsx";
import BackendTab from "./components/BackendTab.jsx";
import IISTab from "./components/IISTab.jsx";
import {
  DEFAULT_CONFIG,
  fetchConfig,
  saveConfig,
  fetchEvents,
  triggerTest,
} from "./lib/api.js";

const TABS = [
  { id: "config", label: "Configurator", icon: MousePointerClick },
  { id: "backend", label: "Python Backend", icon: Terminal },
  { id: "iis", label: "IIS Hosting Guide", icon: Server },
];

const GESTURE_SEQUENCE = ["gestureTap", "gestureUp", "gestureDown", "gestureLeft", "gestureRight"];
const TOUR_SEQUENCE = ["middleClick", "modeShift", "thumbLeft", "thumbRight", "back", "forward", ...GESTURE_SEQUENCE];

export default function App() {
  const [activeTab, setActiveTab] = useState("config");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [online, setOnline] = useState(false);
  const [events, setEvents] = useState([]);
  const [autoTour, setAutoTour] = useState(false);
  // Which input is "selected" — drives both the highlighted pin/glow on
  // the 3D model and which row's mapping "Animate & Test Input" fires.
  const [focusedSlot, setFocusedSlot] = useState("middleClick");

  const sinceRef = useRef(0);
  const tourIndexRef = useRef(0);

  // initial config load
  useEffect(() => {
    (async () => {
      const { config: loaded, online: isOnline } = await fetchConfig();
      setConfig(loaded);
      setOnline(isOnline);
    })();
  }, []);

  // poll live hardware events from the agent
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const { events: newEvents, serverTime } = await fetchEvents(sinceRef.current);
      if (cancelled) return;
      if (newEvents.length > 0) {
        setEvents((prev) => [...prev, ...newEvents].slice(-100));
        sinceRef.current = serverTime;
        // highlight the most recent incoming hardware event on the model
        const last = newEvents[newEvents.length - 1];
        const target = detailToTarget(last.detail);
        if (target) setFocusedSlot(target);
        setOnline(true);
      }
    };
    const id = setInterval(poll, 900);
    poll();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // auto-tour: cycle the selected/highlighted input on a timer so every
  // mapping gets a turn in the spotlight without the person clicking through
  useEffect(() => {
    if (!autoTour) return;
    const id = setInterval(() => {
      const target = TOUR_SEQUENCE[tourIndexRef.current % TOUR_SEQUENCE.length];
      tourIndexRef.current += 1;
      setFocusedSlot(target);
    }, 1100);
    return () => clearInterval(id);
  }, [autoTour]);

  const profile = config.profiles[config.activeProfile];

  const persist = useCallback(async (nextConfig) => {
    setConfig(nextConfig);
    const ok = await saveConfig(nextConfig);
    setOnline(ok || online);
  }, [online]);

  const onChangeMapping = (key, mapping) => {
    const next = structuredClone(config);
    next.profiles[next.activeProfile][key] = mapping;
    persist(next);
  };

  const onChangeThreshold = (px) => {
    const next = structuredClone(config);
    next.profiles[next.activeProfile].gestureThresholdPx = px;
    persist(next);
  };

  const onSelectProfile = (name) => {
    const next = structuredClone(config);
    next.activeProfile = name;
    persist(next);
  };

  const onAddProfile = (name) => {
    const next = structuredClone(config);
    next.profiles[name] = {
      middleClick: { type: "none" }, modeShift: { type: "none" },
      thumbLeft: { type: "none" }, thumbRight: { type: "none" },
      forward: { type: "none" }, back: { type: "none" },
      gestureTap: { type: "none" }, gestureUp: { type: "none" },
      gestureDown: { type: "none" }, gestureLeft: { type: "none" }, gestureRight: { type: "none" },
      gestureThresholdPx: 40,
    };
    next.activeProfile = name;
    persist(next);
  };

  const onDuplicateProfile = (name) => {
    const next = structuredClone(config);
    next.profiles[name] = structuredClone(next.profiles[next.activeProfile]);
    next.activeProfile = name;
    persist(next);
  };

  const onDeleteProfile = (name) => {
    const next = structuredClone(config);
    delete next.profiles[name];
    next.activeProfile = Object.keys(next.profiles)[0];
    persist(next);
  };

  const onImport = (parsed) => {
    if (!parsed || typeof parsed !== "object" || !parsed.profiles || !parsed.activeProfile) {
      alert("Expected a JSON file with { activeProfile, profiles } — export one from here first to see the shape.");
      return;
    }
    persist(parsed);
  };

  const onExport = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mx-remapper-profiles.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onTest = async (inputId) => {
    setFocusedSlot(inputId);
    const ok = await triggerTest(inputId);
    if (!ok) setOnline(false);
  };

  const onAnimateAll = () => onTest(focusedSlot);

  return (
    <div className="min-h-screen bg-graphite-950 text-gray-100">
      <header className="border-b border-graphite-700 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">MX Remapper</h1>
          <p className="text-xs text-graphite-500">Logitech MX Master 2S button remapping — no Logi Options+ required</p>
        </div>
        {!online && (
          <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-900/20 border border-amber-700/40 px-2.5 py-1 rounded-full">
            <AlertTriangle size={12} /> Agent offline — editing locally
          </div>
        )}
      </header>

      <nav className="px-4 sm:px-6 pt-3 flex gap-1 border-b border-graphite-800">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-t-lg border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-accent text-accent bg-graphite-900/60"
                  : "border-transparent text-graphite-400 hover:text-gray-200"
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </nav>

      <main className="p-4 sm:p-6">
        {activeTab === "config" && (
          <ConfigTab
            config={config}
            profile={profile}
            onChangeMapping={onChangeMapping}
            onSelectProfile={onSelectProfile}
            onAddProfile={onAddProfile}
            onDuplicateProfile={onDuplicateProfile}
            onDeleteProfile={onDeleteProfile}
            onImport={onImport}
            onExport={onExport}
            onTest={onTest}
            focusedSlot={focusedSlot}
            onFocusSlot={setFocusedSlot}
            autoTour={autoTour}
            onToggleAutoTour={setAutoTour}
            onAnimateAll={onAnimateAll}
            events={events}
            online={online}
            gestureThreshold={profile.gestureThresholdPx}
            onChangeThreshold={onChangeThreshold}
          />
        )}
        {activeTab === "backend" && <BackendTab />}
        {activeTab === "iis" && <IISTab />}
      </main>
    </div>
  );
}

function detailToTarget(detail) {
  if (!detail) return null;
  if (detail.startsWith("Middle Click")) return "middleClick";
  if (detail.startsWith("Back")) return "back";
  if (detail.startsWith("Forward")) return "forward";
  if (detail.startsWith("Thumb Wheel Left")) return "thumbLeft";
  if (detail.startsWith("Thumb Wheel Right")) return "thumbRight";
  return null;
}
