"use client";

import React, { useState, useRef, useEffect } from "react";
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

  // Cloud actions
  const clearTheme = useBuilderStore((state) => state.clearTheme);
  const createTheme = useBuilderStore((state) => state.createTheme);
  const saveProject = useBuilderStore((state) => state.saveProject);
  const isSaving = useBuilderStore((state) => state.isSaving);

  const hasCustomTheme = miniApp.theme && Object.keys(miniApp.theme).length > 0;
  const theme = hasCustomTheme ? miniApp.theme : themePresets.default;
  const activePresetTheme = theme[themeMode] ?? theme.light;

  const [activeSection, setActiveSection] = useState<"colors" | "typography" | "spacing" | "radius" | "io">("colors");
  const [jsonInput, setJsonInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync textarea jsonInput with theme unless the user has it focused
  useEffect(() => {
    if (document.activeElement !== textareaRef.current) {
      setJsonInput(JSON.stringify(theme, null, 2));
    }
  }, [theme]);

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
    try {
      importTheme(jsonInput);
      alert("Theme code applied successfully!");
    } catch (e: any) {
      alert(`Failed to apply theme JSON: ${e.message}`);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(jsonInput);
    alert("Theme code copied to clipboard!");
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto px-4 py-2">
      {/* Cloud Theme Control Panel */}
      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl shadow-sm flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cloud Theme Controls</h3>
          <span className={clsx(
            "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm",
            hasCustomTheme ? "bg-indigo-100 text-indigo-800" : "bg-slate-200 text-slate-600"
          )}>
            {hasCustomTheme ? "Custom Active" : "Default Preset"}
          </span>
        </div>
        
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {hasCustomTheme
            ? "You are editing a custom theme in memory. Changes are not autosaved. Save to sync your styling changes to the cloud database."
            : "No custom theme is configured. The system is falling back to standard styling defaults."}
        </p>

        <div className="flex gap-2 mt-1">
          {hasCustomTheme ? (
            <>
              <button
                type="button"
                onClick={() => saveProject()}
                disabled={isSaving}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold shadow-sm transition duration-150 flex items-center justify-center gap-1.5"
              >
                {isSaving && (
                  <svg className="animate-spin size-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Save Theme
              </button>
              <button
                type="button"
                onClick={() => clearTheme()}
                className="flex-1 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-lg text-xs font-bold transition duration-150"
              >
                Clear Theme
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => createTheme()}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition duration-150"
            >
              Create Custom Theme
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Theme Presets</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {Object.keys(themePresets).map((presetName) => {
            const isSelected = miniApp.theme?.name === presetName || (presetName === "default" && !hasCustomTheme);
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

      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3 rounded-xl transition-colors duration-150">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dark Mode Preview</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">View canvas in dark mode</span>
        </div>
        <button
          onClick={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
          className={clsx(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
            themeMode === "dark" ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
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

      <div className="border-t border-slate-100 dark:border-slate-850 pt-4 flex-1 flex flex-col min-h-0">
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4 overflow-x-auto shrink-0">
          {(["colors", "typography", "spacing", "radius", "io"] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={clsx(
                "pb-2 px-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer",
                activeSection === section
                  ? "border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
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
                  <div key={key} className="flex items-center justify-between gap-4 p-2.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition duration-150">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-355">{label}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono select-all uppercase">{colorVal}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="text"
                        value={colorVal}
                        disabled={!hasCustomTheme}
                        onChange={(e) => updateThemeColor(themeMode, key, e.target.value)}
                        className="w-20 px-2 py-1.5 text-xs font-mono text-center uppercase border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none shadow-sm focus:border-indigo-300 dark:focus:border-indigo-750 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-950"
                      />
                      <div className={clsx(
                        "relative flex items-center justify-center size-8 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden shrink-0",
                        hasCustomTheme ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                      )} style={{ backgroundColor: colorVal }}>
                        <input
                          type="color"
                          value={colorVal}
                          disabled={!hasCustomTheme}
                          onChange={(e) => updateThemeColor(themeMode, key, e.target.value)}
                          className="absolute inset-[-4px] size-12 cursor-pointer p-0 border-0 opacity-0 disabled:cursor-not-allowed"
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
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Font Family</label>
                <select
                  value={activePresetTheme.typography.fontFamily}
                  disabled={!hasCustomTheme}
                  onChange={(e) => updateThemeTypography(themeMode, "fontFamily", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 cursor-pointer shadow-sm outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-950 disabled:cursor-not-allowed"
                >
                  <option value="sans-serif" className="dark:bg-slate-900 dark:text-slate-100">System Sans-Serif</option>
                  <option value="serif" className="dark:bg-slate-900 dark:text-slate-100">System Serif</option>
                  <option value="monospace" className="dark:bg-slate-900 dark:text-slate-100">System Monospace</option>
                  <option value="Inter" className="dark:bg-slate-900 dark:text-slate-100">Inter (Google Fonts)</option>
                  <option value="Outfit" className="dark:bg-slate-900 dark:text-slate-100">Outfit (Google Fonts)</option>
                </select>
              </div>

              {(["headingSize", "subheadingSize", "bodySize", "captionSize"] as const).map((key) => {
                const min = key === "headingSize" ? 12 : key === "subheadingSize" ? 12 : key === "bodySize" ? 10 : 8;
                const max = key === "headingSize" ? 64 : key === "subheadingSize" ? 48 : key === "bodySize" ? 32 : 24;
                const step = (key === "headingSize" || key === "subheadingSize") ? 2 : 1;
                return (
                  <div key={key} className="flex flex-col gap-1.5 p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">{key.replace("Size", " Size")}</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{activePresetTheme.typography[key]}px</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      disabled={!hasCustomTheme}
                      value={activePresetTheme.typography[key]}
                      onChange={(e) => updateThemeTypography(themeMode, key, Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {activeSection === "spacing" && (
            <div className="flex flex-col gap-4">
              {(["xs", "sm", "md", "lg", "xl", "xxl"] as const).map((key) => (
                <div key={key} className="flex flex-col gap-1.5 p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Size {key}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{activePresetTheme.spacing[key]}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="96"
                    step="4"
                    disabled={!hasCustomTheme}
                    value={activePresetTheme.spacing[key]}
                    onChange={(e) => updateThemeSpacing(themeMode, key, Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              ))}
            </div>
          )}

          {activeSection === "radius" && (
            <div className="flex flex-col gap-4">
              {(["sm", "md", "lg", "xl"] as const).map((key) => (
                <div key={key} className="flex flex-col gap-1.5 p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Radius {key}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{activePresetTheme.radius[key]}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="2"
                    disabled={!hasCustomTheme}
                    value={activePresetTheme.radius[key]}
                    onChange={(e) => updateThemeRadius(themeMode, key, Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              ))}
            </div>
          )}

          {activeSection === "io" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Theme JSON Code</label>
                  <button
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40 rounded-md text-[10px] font-bold transition cursor-pointer"
                  >
                    Copy Code
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`{\n  "light": { ... },\n  "dark": { ... }\n}`}
                  rows={10}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-mono bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-300 dark:focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 transition resize-y"
                />
                <button
                  onClick={handleImportText}
                  className="w-full py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Apply Theme Code
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-3.5 mt-2 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">File Backup (Optional)</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-350 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Export JSON File
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-350 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Import JSON File
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportFile}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
