"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { exportMiniApp } from "@/mini-app/exporter/export-mini-app";
import { createProjectZip } from "@/mini-app/exporter/react-native/zip";
import { useBuilderStore } from "@/features/builder/store/builder.store";
import type { ExportTarget } from "@/mini-app/types/mini-app.types";
import { ImportDialog } from "@/features/builder/components/ImportDialog";

const screenPresets = [
  { label: "iPhone", width: 390, height: 844 },
  { label: "Android", width: 360, height: 800 },
  { label: "Small", width: 320, height: 568 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Custom", width: 0, height: 0 },
];

const screenSizeLimits = {
  width: { min: 240, max: 1024 },
  height: { min: 360, max: 1366 },
};

function downloadJson(json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mini-app.json";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function BuilderToolbar() {
  const miniApp = useBuilderStore((state) => state.miniApp);
  const mode = useBuilderStore((state) => state.mode);
  const screenSize = useBuilderStore((state) => state.screenSize);
  const scaleToFit = useBuilderStore((state) => state.scaleToFit);
  const zoom = useBuilderStore((state) => state.zoom);
  const setMode = useBuilderStore((state) => state.setMode);
  const setScreenSize = useBuilderStore((state) => state.setScreenSize);
  const setScaleToFit = useBuilderStore((state) => state.setScaleToFit);
  const setZoom = useBuilderStore((state) => state.setZoom);
  const resetProject = useBuilderStore((state) => state.resetProject);
  const setProjectName = useBuilderStore((state) => state.setProjectName);
  const setValidationErrors = useBuilderStore((state) => state.setValidationErrors);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<ExportTarget>("expo-mini-app");
  const [isExporting, setIsExporting] = useState(false);
  const [draftScreenSize, setDraftScreenSize] = useState({
    width: String(screenSize.width),
    height: String(screenSize.height),
  });

  useEffect(() => {
    setDraftScreenSize({
      width: String(screenSize.width),
      height: String(screenSize.height),
    });
  }, [screenSize.width, screenSize.height]);

  const runExport = (variant: "download" | "copy") => {
    const result = exportMiniApp(miniApp);
    if (!result.ok) {
      setValidationErrors(result.errors);
      return;
    }

    setValidationErrors([]);
    if (variant === "download") {
      downloadJson(result.json);
    } else {
      void navigator.clipboard.writeText(result.json);
    }
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const result = await createProjectZip(miniApp, exportTarget);
      if (!result.ok) {
        setValidationErrors(result.errors);
        setIsExportDialogOpen(false);
        return;
      }

      setValidationErrors([]);
      downloadBlob(result.blob, result.filename);
      setIsExportDialogOpen(false);
    } catch (err: any) {
      setValidationErrors([err?.message || "An unexpected error occurred during export."]);
    } finally {
      setIsExporting(false);
    }
  };

  const activePreset =
    screenPresets.find((preset) => preset.width === screenSize.width && preset.height === screenSize.height)?.label ??
    "Custom";

  const updateDraftScreenSize = (dimension: "width" | "height", value: string) => {
    if (/^\d*$/.test(value)) {
      setDraftScreenSize((current) => ({ ...current, [dimension]: value }));
    }
  };

  const commitDraftScreenSize = (dimension: "width" | "height") => {
    const value = draftScreenSize[dimension];
    if (!value) {
      setDraftScreenSize((current) => ({ ...current, [dimension]: String(screenSize[dimension]) }));
      return;
    }

    setScreenSize({ ...screenSize, [dimension]: Number(value) });
  };

  return (
    <header className="flex min-h-14 flex-col gap-3 border-b border-slate-200 bg-white px-3 py-3 text-slate-900 shadow-sm sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:py-2">
      <div className="flex w-full min-w-0 flex-1 items-center gap-3 lg:w-auto">
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="size-3 rounded-full bg-red-400" />
          <span className="size-3 rounded-full bg-yellow-400" />
          <span className="size-3 rounded-full bg-green-400" />
        </div>
        <div className="h-8 min-w-0 max-w-[220px] flex-1 rounded-full bg-slate-100 px-4 text-xs font-medium leading-8 text-slate-500 sm:max-w-[360px]">
          www.builder.local
        </div>
        <div className="hidden shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm md:block">
          My Project
        </div>
        <input
          aria-label="Project name"
          value={miniApp.name}
          onChange={(event) => setProjectName(event.target.value)}
          className="w-full min-w-0 max-w-none rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-200 focus:bg-slate-50 sm:text-sm lg:max-w-64"
        />
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-5 lg:flex lg:w-auto lg:shrink-0 lg:flex-wrap lg:items-center lg:justify-end">
        <div className="col-span-2 flex items-center gap-1.5 sm:col-span-5 lg:col-span-1 lg:w-auto">
          <div className="grid grid-cols-[1fr_72px_72px] gap-2 rounded-md border border-slate-200 bg-slate-50 p-1 w-full lg:w-auto">
            <select
              aria-label="Screen preset"
              value={activePreset}
              onChange={(event) => {
                const preset = screenPresets.find((item) => item.label === event.target.value);
                if (preset && preset.label !== "Custom") {
                  setScreenSize({ width: preset.width, height: preset.height });
                }
              }}
              className="min-w-0 rounded border border-transparent bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-teal-300"
            >
              {screenPresets.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Screen width"
              type="number"
              min={screenSizeLimits.width.min}
              max={screenSizeLimits.width.max}
              value={draftScreenSize.width}
              onChange={(event) => updateDraftScreenSize("width", event.target.value)}
              onBlur={() => commitDraftScreenSize("width")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              className="min-w-0 rounded border border-transparent bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-teal-300"
            />
            <input
              aria-label="Screen height"
              type="number"
              min={screenSizeLimits.height.min}
              max={screenSizeLimits.height.max}
              value={draftScreenSize.height}
              onChange={(event) => updateDraftScreenSize("height", event.target.value)}
              onBlur={() => commitDraftScreenSize("height")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              className="min-w-0 rounded border border-transparent bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-teal-300"
            />
          </div>

          <button
            type="button"
            onClick={() => setScreenSize({ width: 240, height: 360 })}
            title="Minimize screen size (240 × 360)"
            className="flex items-center justify-center size-8 shrink-0 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-teal-600 transition shadow-sm"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14h6v-6M20 10h-6v6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setScreenSize({ width: 1024, height: 1366 })}
            title="Maximize screen size (1024 × 1366)"
            className="flex items-center justify-center size-8 shrink-0 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-teal-600 transition shadow-sm"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5 shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm">
            <span className="text-slate-400 pl-1 select-none">Zoom</span>
            <select
              aria-label="Zoom Level"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="bg-transparent border-none text-slate-700 outline-none pr-1 py-1 font-semibold cursor-pointer"
            >
              <option value={0.5}>50%</option>
              <option value={0.75}>75%</option>
              <option value={1.0}>100%</option>
              <option value={1.25}>125%</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
          className="rounded-md border border-teal-600 bg-white px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
        >
          {mode === "edit" ? "Preview" : "Edit"}
        </button>
        <button
          type="button"
          onClick={() => runExport("copy")}
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <span className="hidden sm:inline">Copy JSON</span>
          <span className="sm:hidden">Copy</span>
        </button>
        <button
          type="button"
          onClick={() => setIsImportDialogOpen(true)}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-900/20 hover:bg-indigo-700 transition"
        >
          Import JSON
        </button>
        <button
          type="button"
          onClick={() => setIsExportDialogOpen(true)}
          className="rounded-md bg-teal-500 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-900/20 hover:bg-teal-600 transition"
        >
          Export
        </button>
        <button
          type="button"
          onClick={resetProject}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"
        >
          Reset
        </button>
      </div>

      <ImportDialog isOpen={isImportDialogOpen} onClose={() => setIsImportDialogOpen(false)} />

      {isExportDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Export Project</h2>
            
            <div className="flex flex-col gap-3 mb-6">
              {/* Option 1: Expo Mini App */}
              <label className={clsx(
                "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition select-none text-left",
                exportTarget === "expo-mini-app" 
                  ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-100" 
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}>
                <input
                  type="radio"
                  name="exportTarget"
                  checked={exportTarget === "expo-mini-app"}
                  onChange={() => setExportTarget("expo-mini-app")}
                  className="mt-1 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    Expo Mini App
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700">Recommended</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Export code designed to be embedded inside an Expo/React Native super app.
                  </div>
                </div>
              </label>

              {/* Option 2: Expo Standalone App */}
              <label className={clsx(
                "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition select-none text-left",
                exportTarget === "expo-standalone" 
                  ? "border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-100" 
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}>
                <input
                  type="radio"
                  name="exportTarget"
                  checked={exportTarget === "expo-standalone"}
                  onChange={() => setExportTarget("expo-standalone")}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-sm text-slate-800">Expo Standalone App</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Generate a complete Expo application that can run independently.
                  </div>
                </div>
              </label>

              {/* Option 3: React Native CLI */}
              <label className={clsx(
                "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition select-none text-left",
                exportTarget === "react-native-cli" 
                  ? "border-slate-700 bg-slate-50 ring-2 ring-slate-100" 
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}>
                <input
                  type="radio"
                  name="exportTarget"
                  checked={exportTarget === "react-native-cli"}
                  onChange={() => setExportTarget("react-native-cli")}
                  className="mt-1 text-slate-800 focus:ring-slate-700"
                />
                <div>
                  <div className="font-bold text-sm text-slate-800">React Native CLI</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Generate a standard React Native project.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsExportDialogOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleExportZip()}
                disabled={isExporting}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500"
              >
                {isExporting ? "Exporting..." : "Export ZIP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
