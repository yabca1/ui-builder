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

type ToolbarIconName = "preview" | "edit" | "copy" | "import" | "export" | "reset";

function ToolbarIcon({ name }: { name: ToolbarIconName }) {
  const common = {
    className: "size-4 shrink-0",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "preview") {
    return (
      <svg {...common}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  if (name === "copy") {
    return (
      <svg {...common}>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }

  if (name === "import") {
    return (
      <svg {...common}>
        <path d="M12 3v12" />
        <path d="m7 8 5-5 5 5" />
        <path d="M5 21h14" />
        <path d="M5 17v4" />
        <path d="M19 17v4" />
      </svg>
    );
  }

  if (name === "export") {
    return (
      <svg {...common}>
        <path d="M12 21V9" />
        <path d="m7 16 5 5 5-5" />
        <path d="M5 3h14" />
        <path d="M5 3v4" />
        <path d="M19 3v4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 20H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

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
  const themeMode = useBuilderStore((state) => state.themeMode);
  const setMode = useBuilderStore((state) => state.setMode);
  const setScreenSize = useBuilderStore((state) => state.setScreenSize);
  const setScaleToFit = useBuilderStore((state) => state.setScaleToFit);
  const setZoom = useBuilderStore((state) => state.setZoom);
  const setThemeMode = useBuilderStore((state) => state.setThemeMode);
  const resetProject = useBuilderStore((state) => state.resetProject);
  const setProjectName = useBuilderStore((state) => state.setProjectName);
  const setValidationErrors = useBuilderStore((state) => state.setValidationErrors);
  const isSaving = useBuilderStore((state) => state.isSaving);
  const dbStatus = useBuilderStore((state) => state.dbStatus);
  const notification = useBuilderStore((state) => state.notification);
  const setNotification = useBuilderStore((state) => state.setNotification);
  const saveProject = useBuilderStore((state) => state.saveProject);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

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
    <header className="flex min-h-14 flex-col gap-3 border-b border-slate-200/80 bg-white/95 px-3 py-3 text-slate-900 shadow-sm shadow-slate-900/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:py-2 transition-colors duration-200">
      <div className="flex w-full min-w-0 flex-1 items-center gap-3 lg:w-auto">
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="size-3 rounded-full bg-red-400" />
          <span className="size-3 rounded-full bg-yellow-400" />
          <span className="size-3 rounded-full bg-green-400" />
        </div>
        <div className="h-8 min-w-0 max-w-[220px] flex-1 rounded-full bg-slate-100 dark:bg-slate-950 px-4 text-xs font-medium leading-8 text-slate-500 dark:text-slate-400 sm:max-w-[360px]">
          www.builder.local
        </div>
        <div className="hidden shrink-0 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 shadow-sm md:block">
          My Project
        </div>
        <input
          aria-label="Project name"
          value={miniApp.name}
          onChange={(event) => setProjectName(event.target.value)}
          className="w-full min-w-0 max-w-none rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400 focus:border-slate-200 dark:focus:border-slate-700 focus:bg-slate-50 dark:focus:bg-slate-850 sm:text-sm lg:max-w-64"
        />
        {/* Manual Save Button */}
        <button
          type="button"
          onClick={() => saveProject()}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition shrink-0 select-none cursor-pointer"
        >
          {isSaving ? (
            <svg className="animate-spin size-3 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5h10.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
            </svg>
          )}
          Save Project
        </button>
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 ml-1 select-none">
          {isSaving ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
              <svg className="animate-spin size-3 text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : dbStatus === "offline" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-600 border border-rose-100 shadow-sm animate-pulse">
              <span className="size-1.5 rounded-full bg-rose-500" />
              Offline
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 shadow-sm">
              <span className="size-1.5 rounded-full bg-teal-500" />
              Cloud Saved
            </span>
          )}
        </div>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-5 lg:flex lg:w-auto lg:shrink-0 lg:flex-wrap lg:items-center lg:justify-end">
        <div className="col-span-2 flex items-center gap-1.5 sm:col-span-5 lg:col-span-1 lg:w-auto">
          <div className="grid grid-cols-[1fr_72px_72px] gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 w-full lg:w-auto">
            <select
              aria-label="Screen preset"
              value={activePreset}
              onChange={(event) => {
                const preset = screenPresets.find((item) => item.label === event.target.value);
                if (preset && preset.label !== "Custom") {
                  setScreenSize({ width: preset.width, height: preset.height });
                }
              }}
              className="min-w-0 rounded border border-transparent bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 outline-none focus:border-teal-300 dark:focus:border-teal-700"
            >
              {screenPresets.map((preset) => (
                <option key={preset.label} value={preset.label} className="dark:bg-slate-900 dark:text-slate-100">
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
              className="min-w-0 rounded border border-transparent bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 outline-none focus:border-teal-300 dark:focus:border-teal-700"
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
              className="min-w-0 rounded border border-transparent bg-white dark:bg-slate-900 px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 outline-none focus:border-teal-300 dark:focus:border-teal-700"
            />
          </div>

          <button
            type="button"
            onClick={() => setScreenSize({ width: 240, height: 360 })}
            title="Minimize screen size (240 × 360)"
            className="flex items-center justify-center size-8 shrink-0 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition shadow-sm cursor-pointer"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14h6v-6M20 10h-6v6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setScreenSize({ width: 1024, height: 1366 })}
            title="Maximize screen size (1024 × 1366)"
            className="flex items-center justify-center size-8 shrink-0 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition shadow-sm cursor-pointer"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
            </svg>
          </button>

          {/* Theme switcher */}
          <button
            type="button"
            onClick={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
            title={themeMode === "light" ? "Switch Builder to Dark Mode" : "Switch Builder to Light Mode"}
            className="flex items-center justify-center size-8 shrink-0 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition shadow-sm cursor-pointer"
          >
            {themeMode === "light" ? (
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-1.5 shrink-0 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
            <span className="text-slate-400 pl-1 select-none">Zoom</span>
            <select
              aria-label="Zoom Level"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="bg-transparent border-none text-slate-700 dark:text-slate-300 outline-none pr-1 py-1 font-semibold cursor-pointer"
            >
              <option value={0.5} className="dark:bg-slate-900 dark:text-slate-100">50%</option>
              <option value={0.75} className="dark:bg-slate-900 dark:text-slate-100">75%</option>
              <option value={1.0} className="dark:bg-slate-900 dark:text-slate-100">100%</option>
              <option value={1.25} className="dark:bg-slate-900 dark:text-slate-100">125%</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
          title={mode === "edit" ? "Preview app" : "Edit app"}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-100 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:bg-teal-950/60 cursor-pointer"
        >
          <ToolbarIcon name={mode === "edit" ? "preview" : "edit"} />
          {mode === "edit" ? "Preview" : "Edit"}
        </button>
        <button
          type="button"
          onClick={() => runExport("copy")}
          title="Copy project JSON"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800 cursor-pointer"
        >
          <ToolbarIcon name="copy" />
          <span className="hidden sm:inline">Copy JSON</span>
          <span className="sm:hidden">Copy</span>
        </button>
        <button
          type="button"
          onClick={() => setIsImportDialogOpen(true)}
          title="Import JSON"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-900/20 transition hover:bg-indigo-700 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-600 cursor-pointer"
        >
          <ToolbarIcon name="import" />
          <span className="hidden sm:inline">Import JSON</span>
          <span className="sm:hidden">Import</span>
        </button>
        <button
          type="button"
          onClick={() => setIsExportDialogOpen(true)}
          title="Export app"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-sm font-bold text-white shadow-sm shadow-teal-900/20 transition hover:bg-teal-600 dark:bg-teal-600 dark:shadow-none dark:hover:bg-teal-750 cursor-pointer"
        >
          <ToolbarIcon name="export" />
          Export
        </button>
        <button
          type="button"
          onClick={resetProject}
          title="Reset workspace"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-rose-950/20 dark:hover:text-rose-450 cursor-pointer"
        >
          <ToolbarIcon name="reset" />
          Reset
        </button>
      </div>

      <ImportDialog isOpen={isImportDialogOpen} onClose={() => setIsImportDialogOpen(false)} />

      {isExportDialogOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-900 dark:text-slate-100 transition-colors duration-150">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Export Project</h2>
            
            <div className="flex flex-col gap-3 mb-6">
              {/* Option 1: Expo Mini App */}
              <label className={clsx(
                "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition select-none text-left",
                exportTarget === "expo-mini-app" 
                  ? "border-teal-500 dark:border-teal-600 bg-teal-50/30 dark:bg-teal-950/20 ring-2 ring-teal-100 dark:ring-teal-950" 
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850"
              )}>
                <input
                  type="radio"
                  name="exportTarget"
                  checked={exportTarget === "expo-mini-app"}
                  onChange={() => setExportTarget("expo-mini-app")}
                  className="mt-1 text-teal-600 dark:text-teal-400 focus:ring-teal-500"
                />
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    Expo Mini App
                    <span className="rounded-full bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-teal-900/30">Recommended</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-450 mt-0.5 leading-relaxed">
                    Export code designed to be embedded inside an Expo/React Native super app.
                  </div>
                </div>
              </label>

              {/* Option 2: Expo Standalone App */}
              <label className={clsx(
                "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition select-none text-left",
                exportTarget === "expo-standalone" 
                  ? "border-indigo-500 dark:border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20 ring-2 ring-indigo-100 dark:ring-indigo-950" 
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850"
              )}>
                <input
                  type="radio"
                  name="exportTarget"
                  checked={exportTarget === "expo-standalone"}
                  onChange={() => setExportTarget("expo-standalone")}
                  className="mt-1 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Expo Standalone App</div>
                  <div className="text-xs text-slate-500 dark:text-slate-450 mt-0.5 leading-relaxed">
                    Generate a complete Expo application that can run independently.
                  </div>
                </div>
              </label>

              {/* Option 3: React Native CLI */}
              <label className={clsx(
                "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition select-none text-left",
                exportTarget === "react-native-cli" 
                  ? "border-slate-700 dark:border-slate-600 bg-slate-50 dark:bg-slate-950/40 ring-2 ring-slate-100 dark:ring-slate-900/50" 
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850"
              )}>
                <input
                  type="radio"
                  name="exportTarget"
                  checked={exportTarget === "react-native-cli"}
                  onChange={() => setExportTarget("react-native-cli")}
                  className="mt-1 text-slate-800 dark:text-slate-300 focus:ring-slate-700"
                />
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">React Native CLI</div>
                  <div className="text-xs text-slate-500 dark:text-slate-450 mt-0.5 leading-relaxed">
                    Generate a standard React Native project.
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsExportDialogOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleExportZip()}
                disabled={isExporting}
                className="rounded-lg bg-teal-600 dark:bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 dark:hover:bg-teal-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-550 cursor-pointer transition-colors"
              >
                {isExporting ? "Exporting..." : "Export ZIP"}
              </button>
            </div>
          </div>
        </div>
      )}
      {notification && (
        <div
          onClick={() => setNotification(null)}
          className={clsx(
            "fixed bottom-4 right-4 z-[999] flex cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold shadow-xl border transition animate-bounce",
            notification.type === "success" && "bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-400 border-teal-200 dark:border-teal-900/40",
            notification.type === "error" && "bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-900/40",
            notification.type === "info" && "bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-900/40"
          )}
        >
          <span className="text-sm">
            {notification.type === "success" ? "✓" : notification.type === "error" ? "⚠" : "ℹ"}
          </span>
          {notification.message}
        </div>
      )}
    </header>
  );
}
