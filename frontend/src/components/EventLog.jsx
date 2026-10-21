import React from "react";
import { Activity, Wifi, WifiOff } from "lucide-react";

export default function EventLog({ events, online }) {
  return (
    <div className="rounded-xl border border-graphite-700 bg-graphite-900/60 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-graphite-700">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
          <Activity size={14} /> Live Hardware Log
        </div>
        <div
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
            online
              ? "text-accent border-accent/40 bg-accent/10"
              : "text-amber-300 border-amber-700/50 bg-amber-900/20"
          }`}
        >
          {online ? <Wifi size={11} /> : <WifiOff size={11} />}
          {online ? "Agent connected" : "Agent offline"}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[140px] max-h-[280px]">
        {events.length === 0 ? (
          <p className="text-xs text-graphite-500 px-2 py-4 text-center">
            {online
              ? "Press a button on the mouse, or use Animate & Test, to see events here."
              : "Start server.py on this machine to see live hardware events."}
          </p>
        ) : (
          events
            .slice()
            .reverse()
            .map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-graphite-800/70"
              >
                <span className="text-gray-300">{e.detail}</span>
                <span className="text-graphite-500 font-mono">
                  {new Date(e.ts * 1000).toLocaleTimeString()}
                </span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
