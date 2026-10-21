import React from "react";
import { Terminal, AlertTriangle, PlayCircle } from "lucide-react";
import CodeBlock from "./CodeBlock.jsx";
import serverPySource from "../assets/server_py_source.txt?raw";

export default function BackendTab() {
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 flex gap-3">
        <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300">Mode Shift &amp; Gesture button reliability isn't guaranteed.</strong>{" "}
          Middle Click, Back/Forward, and horizontal wheel tilt use standard Windows mouse
          messages and this agent remaps them directly. Mode Shift and the thumb-rest Gesture
          button are Logitech-proprietary — without Logi Options+, the generic Windows driver
          may not surface them as any hookable event. Run with <code className="px-1 py-0.5 rounded bg-graphite-800 font-mono text-xs">--diagnose</code>{" "}
          first (steps below) to find out what your hardware actually sends.
        </div>
      </div>

      <div className="rounded-xl border border-graphite-700 bg-graphite-900/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3">
          <Terminal size={15} /> Setup
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
          <li>
            Confirm Python 3.9+ is installed:{" "}
            <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">python --version</code>
          </li>
          <li>Download <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">server.py</code> below to any folder (no pip installs needed — stdlib only).</li>
          <li>
            Run a diagnostic pass first:{" "}
            <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">python server.py --diagnose</code>
            , then press every button on the mouse and watch the console.
          </li>
          <li>
            Start it for real: <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">python server.py</code>{" "}
            (leave this window running in the background — it hosts the HTTP API this page talks to on{" "}
            <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">127.0.0.1:8765</code>).
          </li>
          <li>
            Optional: schedule it to launch at sign-in via Task Scheduler → Create Task →
            trigger "At log on" → action <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">pythonw.exe server.py</code>.
          </li>
        </ol>
        <div className="mt-3 flex items-center gap-2 text-xs text-graphite-400">
          <PlayCircle size={14} />
          Low-level hooks require an interactive desktop session — this won't work as a
          Windows Service running under SYSTEM.
        </div>
      </div>

      <CodeBlock code={serverPySource} filename="server.py" language="python" />
    </div>
  );
}
