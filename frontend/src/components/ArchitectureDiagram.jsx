import React from "react";

export default function ArchitectureDiagram() {
  const box = (x, y, w, h, label, sub, color = "#2d313b") => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={color} stroke="#454b54" strokeWidth="1.5" />
      <text x={x + w / 2} y={y + h / 2 - (sub ? 6 : -4)} textAnchor="middle" fill="#e5e7eb" fontSize="13" fontWeight="600">
        {label}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fill="#9ca3af" fontSize="10.5" fontFamily="ui-monospace, monospace">
          {sub}
        </text>
      )}
    </g>
  );

  const arrow = (x1, y1, x2, y2, label) => (
    <g>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#6ee7b7" />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6ee7b7" strokeWidth="1.75" markerEnd="url(#arrowhead)" />
      {label && (
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" fill="#6ee7b7" fontSize="10.5" fontFamily="ui-monospace, monospace">
          {label}
        </text>
      )}
    </g>
  );

  return (
    <svg viewBox="0 0 640 340" className="w-full h-auto">
      {box(30, 40, 170, 70, "Browser", "Chrome / Edge on client PC")}
      {box(30, 200, 170, 70, "Local Python Agent", "server.py : 8765", "#1f2937")}
      {box(430, 40, 180, 70, "IIS Site", "inetmgr : 8080", "#1f2937")}
      {box(430, 200, 180, 70, "Static Files", "dist/ (React build)")}

      {arrow(200, 65, 430, 65, "GET /")}
      {arrow(430, 90, 200, 90, "index.html + assets")}

      {arrow(115, 110, 115, 200, "")}
      <text x="128" y="160" fill="#9ca3af" fontSize="10" fontFamily="ui-monospace, monospace">fetch()</text>

      {arrow(200, 230, 430, 230, "")}
      <text x="315" y="222" textAnchor="middle" fill="#6b7280" fontSize="9.5">served once, loaded into browser</text>

      <line x1="115" y1="110" x2="115" y2="200" stroke="#6ee7b7" strokeWidth="1.75" markerEnd="url(#arrowhead)" />
      <text x="40" y="150" fill="#9ca3af" fontSize="10" fontFamily="ui-monospace, monospace">
        GET/POST /config
      </text>
      <text x="40" y="165" fill="#9ca3af" fontSize="10" fontFamily="ui-monospace, monospace">
        GET /events, POST /test
      </text>
      <text x="40" y="180" fill="#6b7280" fontSize="9.5">
        127.0.0.1:8765 — PNA headers required
      </text>

      <rect x="230" y="290" width="180" height="34" rx="8" fill="#101418" stroke="#454b54" />
      <text x="320" y="311" textAnchor="middle" fill="#9ca3af" fontSize="10.5">
        Same machine, two local servers
      </text>
    </svg>
  );
}
