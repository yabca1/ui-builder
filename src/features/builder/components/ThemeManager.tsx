"use client";

import React, { useState, useRef } from "react";
import { useBuilderStore } from "@/features/builder/store/builder.store";
import { themePresets } from "@/mini-app/registry/theme-presets";
import { clsx } from "clsx";

export function ThemeManager() {
  const miniApp = useBuilderStore((state) => state.miniApp);
  const themeMode = useBuilderStore((state) => state.themeMode);
  const setThemeMode = useBuilderStore((state) => state.setThemeMode);
  const updateThemeColor = useBuilderStore((state) => state.updateThemeColor);
  const updateThemeSpacing = useBuilderStore((state) => state.updateThemeSpacing);
  const updateThemeRadius = useBuilderStore((state) => state.updateThemeRadius);
  const updateThemeTypography = useBuilderStore((state) => state.updateThemeTypography);
  const applyThemePreset = useBuilderStore((state) => state.applyThemePreset);
  const importTheme = useBuilderStore((state) => state.importTheme);

  const theme = miniApp.theme ?? themePresets.default;
  const activePresetTheme = theme[themeMode] ?? theme.light;

  const [activeSection, setActiveSection] = useState<"colors" | "typography" | "spacing" | "radius" | "io">("colors");
  const [jsonInput, setJsonInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorsList = [
    { key: "primary", label: "Primary Color" },
    { key: "secondary", label: "Secondary Color" },
    { key: "success", label: "Success Color" },
    { key: "warning", label: "Warning Color" },
    { key: "danger", label: "Danger Color" },
    { key: "background", label: "Background" },
    { key: "surface", label: "Surface" },
    { key: "card", label: "Card background" },
    { key: "border", label: "Border Color" },
    { key: "text", label: "Text Color" },
    { key: "mutedText", label: "Muted Text Color" },
  ];

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(theme, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "theme.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        importTheme(result);
      }
    };
    reader.readAsText(file);
  };

  const handleImportText = () => {
    if (!jsonInput.trim()) return;
    importTheme(jsonInput);
    setJsonInput("");
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto px-4 py-2">
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Theme Presets</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {Object.keys(themePresets).map((presetName) => {
            const isSelected = miniApp.theme?.name === presetName || (presetName === "default" && !miniApp.theme);
            return (
              <button
                key={presetName}
                onClick={() => applyThemePreset(presetName)}
                className={clsx(
                  "flex flex-col p-2.5 rounded-xl border text-left transition-all duration-200 hover:shadow-sm",
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500"
                    : "border-slate-200 text-slate-700 bg-white hover:border-slate-300"
                )}
              >
                <span className="text-xs font-bold capitalize text-slate-800 mb-2 block">{presetName}</span>
                <div className="flex w-full h-3.5 rounded-md overflow-hidden border border-slate-100/50 shadow-inner">
                  <div className="flex-1" style={{ backgroundColor: themePresets[presetName].light.colors.primary }} />
                  <div className="flex-1" style={{ backgroundColor: themePresets[presetName].light.colors.secondary }} />
                  <div className="flex-1" style={{ backgroundColor: themePresets[presetName].light.colors.success }} />
                  <div className="flex-1" style={{ backgroundColor: themePresets[presetName].light.colors.background }} />
                  <div className="flex-1" style={{ backgroundColor: themePresets[presetName].light.colors.surface }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-slate-700">Dark Mode Preview</span>
          <span className="text-[10px] text-slate-400">View canvas in dark mode</span>
        </div>
        <button
          onClick={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
          className={clsx(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
            themeMode === "dark" ? "bg-indigo-600" : "bg-slate-200"
          )}
        >
          <span
            className={clsx(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              themeMode === "dark" ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      <div className="border-t border-slate-100 pt-4 flex-1 flex flex-col min-h-0">
        <div className="flex border-b border-slate-200 mb-4 overflow-x-auto shrink-0">
          {(["colors", "typography", "spacing", "radius", "io"] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={clsx(
                "pb-2 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition whitespace-nowrap",
                activeSection === section
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              {section}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {activeSection === "colors" && (
            <div className="flex flex-col gap-3">
              {colorsList.map(({ key, label }) => {
                const colorVal = activePresetTheme.colors[key as keyof typeof activePresetTheme.colors] || "#000000";
                return (
                  <div key={key} className="flex items-center justify-between gap-4 p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition duration-150">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-700">{label}</span>
                      <span className="text-[10px] text-slate-400 font-mono select-all uppercase">{colorVal}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="text"
                        value={colorVal}
                        onChange={(e) => updateThemeColor(themeMode, key, e.target.value)}
                        className="w-20 px-2 py-1.5 text-xs font-mono text-center uppercase border border-slate-200 rounded-lg bg-white outline-none shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      />
                      <div className="relative flex items-center justify-center size-8 rounded-full border border-slate-200/80 shadow-sm overflow-hidden cursor-pointer shrink-0" style={{ backgroundColor: colorVal }}>
                        <input
                          type="color"
                          value={colorVal}
                          onChange={(e) => updateThemeColor(themeMode, key, e.target.value)}
                          className="absolute inset-[-4px] size-12 cursor-pointer p-0 border-0 opacity-0"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeSection === "typography" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Font Family</label>
                <select
                  value={activePresetTheme.typography.fontFamily}
                  onChange={(e) => updateThemeTypography(themeMode, "fontFamily", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer shadow-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="sans-serif">System Sans-Serif</option>
                  <option value="serif">System Serif</option>
                  <option value="monospace">System Monospace</option>
                  <option value="Inter">Inter (Google Fonts)</option>
                  <option value="Outfit">Outfit (Google Fonts)</option>
                </select>
              </div>

              {(["headingSize", "subheadingSize", "bodySize", "captionSize"] as const).map((key) => {
                const min = key === "headingSize" ? 12 : key === "subheadingSize" ? 12 : key === "bodySize" ? 10 : 8;
                const max = key === "headingSize" ? 64 : key === "subheadingSize" ? 48 : key === "bodySize" ? 32 : 24;
                const step = (key === "headingSize" || key === "subheadingSize") ? 2 : 1;
                return (
                  <div key={key} className="flex flex-col gap-1.5 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 capitalize">{key.replace("Size", " Size")}</span>
                      <span className="text-xs font-semibold text-slate-500">{activePresetTheme.typography[key]}px</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={activePresetTheme.typography[key]}
                      onChange={(e) => updateThemeTypography(themeMode, key, Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {activeSection === "spacing" && (
            <div className="flex flex-col gap-4">
              {(["xs", "sm", "md", "lg", "xl", "xxl"] as const).map((key) => (
                <div key={key} className="flex flex-col gap-1.5 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Size {key}</span>
                    <span className="text-xs font-semibold text-slate-500">{activePresetTheme.spacing[key]}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="96"
                    step="4"
                    value={activePresetTheme.spacing[key]}
                    onChange={(e) => updateThemeSpacing(themeMode, key, Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              ))}
            </div>
          )}

          {activeSection === "radius" && (
            <div className="flex flex-col gap-4">
              {(["sm", "md", "lg", "xl"] as const).map((key) => (
                <div key={key} className="flex flex-col gap-1.5 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Radius {key}</span>
                    <span className="text-xs font-semibold text-slate-500">{activePresetTheme.radius[key]}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="2"
                    value={activePresetTheme.radius[key]}
                    onChange={(e) => updateThemeRadius(themeMode, key, Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              ))}
            </div>
          )}

          {activeSection === "io" && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  Export Theme JSON
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  Import File
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".json"
                  className="hidden"
                />
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-bold text-slate-700">Paste Theme JSON</label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`{\n  "light": { ... },\n  "dark": { ... }\n}`}
                  rows={6}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono bg-white outline-none"
                />
                <button
                  onClick={handleImportText}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  Apply Pasted JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
