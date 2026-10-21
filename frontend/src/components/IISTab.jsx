import React from "react";
import { Globe, ShieldCheck } from "lucide-react";
import CodeBlock from "./CodeBlock.jsx";
import ArchitectureDiagram from "./ArchitectureDiagram.jsx";
import webConfigSource from "../assets/web_config_source.txt?raw";

export default function IISTab() {
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-xl border border-graphite-700 bg-graphite-900/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3">
          <Globe size={15} /> Architecture
        </h3>
        <ArchitectureDiagram />
        <p className="text-xs text-graphite-400 mt-2">
          The React app is static files served by IIS. It never talks to the server.py agent
          through IIS — the browser calls <code className="px-1 py-0.5 rounded bg-graphite-800 font-mono">127.0.0.1:8765</code> directly,
          which is why the agent must run on the same Windows machine as the browser.
        </p>
      </div>

      <div className="rounded-xl border border-graphite-700 bg-graphite-900/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3">
          <ShieldCheck size={15} /> Deploy to IIS
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
          <li>
            Build the frontend: <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">npm install &amp;&amp; npm run build</code>{" "}
            — produces a <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">dist/</code> folder.
          </li>
          <li>
            In <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">inetmgr</code>, create a new site (or application)
            pointing its physical path at that <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">dist/</code> folder,
            bound to port 8080 (or any free port).
          </li>
          <li>
            Install the <strong>URL Rewrite Module</strong> if it isn't already present (required
            for the SPA fallback rule in the web.config below).
          </li>
          <li>
            Copy <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">web.config</code> below into that same
            folder, next to <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">index.html</code>.
          </li>
          <li>
            Browse to <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">http://localhost:8080</code> (or your LAN IP).
            Chrome/Edge will show a one-time Private Network Access confirmation the first time
            the page calls <code className="px-1.5 py-0.5 rounded bg-graphite-800 font-mono text-xs">127.0.0.1:8765</code> — accept it.
          </li>
        </ol>
      </div>

      <CodeBlock code={webConfigSource} filename="web.config" language="xml" />
    </div>
  );
}
