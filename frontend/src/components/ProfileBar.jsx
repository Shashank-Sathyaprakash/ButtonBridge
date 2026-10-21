import React, { useRef } from "react";
import { Plus, Trash2, Download, Upload, Copy } from "lucide-react";

export default function ProfileBar({
  config,
  activeProfile,
  onSelectProfile,
  onAddProfile,
  onDuplicateProfile,
  onDeleteProfile,
  onImport,
  onExport,
}) {
  const fileRef = useRef(null);
  const profileNames = Object.keys(config.profiles);

  const handleImportClick = () => fileRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        onImport(parsed);
      } catch {
        alert("That file isn't valid JSON for a profile set.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-graphite-700 bg-graphite-900/60">
      <select
        value={activeProfile}
        onChange={(e) => onSelectProfile(e.target.value)}
        className="bg-graphite-800 border border-graphite-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
      >
        {profileNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <button
        onClick={() => {
          const name = prompt("New profile name:");
          if (name && !profileNames.includes(name)) onAddProfile(name);
        }}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-graphite-700 hover:bg-graphite-600 text-gray-200"
        title="New profile"
      >
        <Plus size={13} /> New
      </button>

      <button
        onClick={() => {
          const name = prompt("Duplicate as:", `${activeProfile} copy`);
          if (name && !profileNames.includes(name)) onDuplicateProfile(name);
        }}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-graphite-700 hover:bg-graphite-600 text-gray-200"
        title="Duplicate profile"
      >
        <Copy size={13} /> Duplicate
      </button>

      <button
        onClick={() => {
          if (profileNames.length <= 1) {
            alert("At least one profile must remain.");
            return;
          }
          if (confirm(`Delete profile "${activeProfile}"?`)) onDeleteProfile(activeProfile);
        }}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-graphite-700 hover:bg-red-900/40 hover:text-red-300 text-gray-200"
        title="Delete profile"
      >
        <Trash2 size={13} /> Delete
      </button>

      <div className="flex-1" />

      <button
        onClick={onExport}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-graphite-700 hover:bg-graphite-600 text-gray-200"
        title="Export all profiles as JSON"
      >
        <Download size={13} /> Export
      </button>
      <button
        onClick={handleImportClick}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-graphite-700 hover:bg-graphite-600 text-gray-200"
        title="Import profiles from JSON"
      >
        <Upload size={13} /> Import
      </button>
      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
