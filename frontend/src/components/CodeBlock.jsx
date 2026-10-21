import React, { useState } from "react";
import { Copy, Check, Download } from "lucide-react";

export default function CodeBlock({ code, filename, language = "text" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard API unavailable — user can still select-all manually */
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-graphite-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-graphite-800 border-b border-graphite-700">
        <span className="text-xs font-mono text-gray-400">{filename}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-graphite-700 hover:bg-graphite-600 text-gray-200"
          >
            {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25"
          >
            <Download size={12} /> Download
          </button>
        </div>
      </div>
      <pre className="overflow-auto max-h-[520px] p-4 text-xs leading-relaxed bg-graphite-950 text-gray-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}
