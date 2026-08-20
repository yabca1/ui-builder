"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { useBuilderStore } from "@/features/builder/store/builder.store";
import { validateImportJson } from "@/mini-app/schema/mini-app.validator";
import type { MiniApp, MiniAppNode, ScreenDefinition } from "@/mini-app/types/mini-app.types";
import { defaultRadius, defaultShadows, defaultSpacing, defaultTypography } from "@/mini-app/registry/theme-presets";

type ImportDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const [jsonText, setJsonText] = useState("");
  const [importMode, setImportMode] = useState<"replace" | "add">("replace");
  const [validationResult, setValidationResult] = useState<{
    status: "idle" | "valid" | "invalid";
    errors: { path: string; message: string }[];
  }>({ status: "idle", errors: [] });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const importProject = useBuilderStore((state) => state.importProject);
  const importScreen = useBuilderStore((state) => state.importScreen);
  const importComponents = useBuilderStore((state) => state.importComponents);
  const currentProject = useBuilderStore((state) => state.miniApp);

  if (!isOpen || typeof document === "undefined") return null;

  const handleLoadExample = () => {
    const example = {
      schemaVersion: 1,
      id: "json-dark-green-demo",
      name: "JSON Demo",
      version: "1.0.0",
      entryScreenId: "home",
      theme: {
        name: "dark-green",
        light: {
          colors: {
            primary: "#22c55e",
            secondary: "#06b6d4",
            success: "#10b981",
            warning: "#f59e0b",
            danger: "#ef4444",
            background: "#0f172a",
            surface: "#111827",
            card: "#1e293b",
            border: "#334155",
            text: "#f8fafc",
            mutedText: "#cbd5e1",
          },
          spacing: defaultSpacing,
          radius: defaultRadius,
          shadows: defaultShadows,
          typography: defaultTypography,
        },
        dark: {
          colors: {
            primary: "#86efac",
            secondary: "#67e8f9",
            success: "#34d399",
            warning: "#fbbf24",
            danger: "#f87171",
            background: "#020617",
            surface: "#0f172a",
            card: "#111827",
            border: "#1e293b",
            text: "#ffffff",
            mutedText: "#94a3b8",
          },
          spacing: defaultSpacing,
          radius: defaultRadius,
          shadows: defaultShadows,
          typography: defaultTypography,
        },
      },
      screens: [
        {
          id: "home",
          name: "Home",
          nodes: [
            {
              id: "root",
              type: "column",
              style: {
                padding: 16,
                gap: { type: "theme", token: "md" },
                backgroundColor: { type: "theme", token: "background" },
              },
              children: [
                {
                  id: "heading",
                  type: "heading",
                  props: {
                    text: "Dark Green Import",
                  },
                  style: { color: { type: "theme", token: "text" } },
                },
                {
                  id: "intro",
                  type: "text",
                  props: { text: "Rows, cards, images, direct colors, theme tokens, and navigation all use normal builder state." },
                  style: { color: { type: "theme", token: "mutedText" } },
                },
                {
                  id: "email-input",
                  type: "input",
                  props: { placeholder: "Email address" },
                  style: {
                    backgroundColor: "#111827",
                    textColor: "#f8fafc",
                    borderColor: { type: "theme", token: "secondary" },
                  },
                },
                {
                  id: "profile-card",
                  type: "card",
                  style: {
                    backgroundColor: { type: "theme", token: "card" },
                    borderColor: { type: "theme", token: "border" },
                    gap: 12,
                  },
                  children: [
                    {
                      id: "profile-row",
                      type: "row",
                      style: { gap: 12, alignItems: "center" },
                      children: [
                        {
                          id: "profile-image",
                          type: "image",
                          props: {
                            src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160",
                            alt: "Profile photo",
                          },
                          style: { width: 72, height: 72, borderRadius: 36 },
                        },
                        {
                          id: "profile-copy",
                          type: "column",
                          style: { gap: 4, padding: 0 },
                          children: [
                            {
                              id: "profile-name",
                              type: "heading",
                              props: { text: "John Doe", level: 2 },
                              style: { color: "#ffffff", fontSize: 20 },
                            },
                            {
                              id: "profile-email",
                              type: "text",
                              props: { text: "john@example.com" },
                              style: { color: { type: "theme", token: "secondary" } },
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: "inside-card-button",
                      type: "button",
                      props: { label: "Card Button" },
                      style: { backgroundColor: "#ef4444", textColor: "#ffffff" },
                    },
                  ],
                },
                {
                  id: "details-button",
                  type: "button",
                  props: {
                    label: "View Details",
                  },
                  style: {
                    backgroundColor: { type: "theme", token: "primary" },
                    textColor: "#052e16",
                  },
                  events: {
                    onPress: { type: "navigate", screenId: "details" },
                  },
                },
              ],
            },
          ],
        },
        {
          id: "details",
          name: "Details",
          nodes: [
            {
              id: "details-root",
              type: "column",
              style: {
                padding: 16,
                gap: 12,
                backgroundColor: { type: "theme", token: "background" },
              },
              children: [
                {
                  id: "details-heading",
                  type: "heading",
                  props: { text: "Details" },
                  style: { color: { type: "theme", token: "text" } },
                },
                {
                  id: "details-text",
                  type: "text",
                  props: { text: "Preview navigation starts from entryScreenId and Go Back returns home." },
                  style: { color: { type: "theme", token: "mutedText" } },
                },
                {
                  id: "back-button",
                  type: "button",
                  props: { label: "Go Back" },
                  style: { backgroundColor: { type: "theme", token: "secondary" }, textColor: "#083344" },
                  events: { onPress: { type: "goBack" } },
                },
              ],
            },
          ],
        },
      ],
    };
    setJsonText(JSON.stringify(example, null, 2));
    setValidationResult({ status: "idle", errors: [] });
  };

  const handleLoadComponentExample = (type: "image" | "button" | "card" | "list") => {
    const examples = {
      image: {
        type: "image",
        props: {
          sourceUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=320",
          alt: "Example image",
        },
        style: { width: 280, height: 160, borderRadius: 12 },
      },
      button: {
        type: "button",
        props: { label: "View Details" },
        style: { backgroundColor: { type: "theme", token: "primary" }, textColor: "#ffffff" },
        events: { onPress: { type: "navigate", screenId: "details" } },
      },
      card: {
        type: "card",
        style: { backgroundColor: { type: "theme", token: "card" }, borderColor: { type: "theme", token: "border" } },
        children: [{ type: "text", props: { text: "Card child content" } }],
      },
      list: {
        type: "list",
        props: {
          title: "Products",
          items: "Starter\nPro\nEnterprise",
          ordered: false,
          showDividers: true,
        },
        style: { color: { type: "theme", token: "text" }, gap: 8 },
      },
    };
    setJsonText(JSON.stringify(examples[type], null, 2));
    setImportMode("add");
    setValidationResult({ status: "idle", errors: [] });
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setValidationResult({ status: "idle", errors: [] });
    } catch (e: any) {
      setValidationResult({
        status: "invalid",
        errors: [{ path: "json", message: `Invalid JSON syntax: ${e.message}` }],
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setJsonText(text);
        setValidationResult({ status: "idle", errors: [] });
      }
    };
    reader.readAsText(file);
  };

  const handleValidateAndRender = () => {
    if (!jsonText.trim()) {
      setValidationResult({
        status: "invalid",
        errors: [{ path: "json", message: "JSON field is empty." }],
      });
      return;
    }

    const result = validateImportJson(jsonText);
    if (!result.isValid) {
      setValidationResult({
        status: "invalid",
        errors: result.errors,
      });
      return;
    }

    if (importMode === "replace") {
      if (result.type !== "project") {
        setValidationResult({
          status: "invalid",
          errors: [
            {
              path: "mode",
              message: `Cannot replace project with a ${result.type}. Use "Add to Screen" mode.`,
            },
          ],
        });
        return;
      }

      const hasScreens = currentProject.screens.length > 0;
      if (hasScreens) {
        const confirmReplace = window.confirm(
          "Are you sure you want to replace the current project? This will discard your existing canvas layout."
        );
        if (!confirmReplace) return;
      }

      importProject(result.data as MiniApp);
    } else {
      if (result.type === "project") {
        const app = result.data as MiniApp;
        app.screens.forEach((screen) => {
          importScreen(screen);
        });
      } else if (result.type === "screen") {
        importScreen(result.data as ScreenDefinition);
      } else if (result.type === "components") {
        importComponents(result.data as MiniAppNode[]);
      }
    }

    setValidationResult({ status: "valid", errors: [] });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-slate-900/60 px-3 py-6 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Import JSON Definition</h2>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-semibold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
          Paste your JSON code below or upload a <strong>.json</strong> file to load a project, screen, or individual component(s).
        </p>

        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            if (validationResult.status !== "idle") {
              setValidationResult({ status: "idle", errors: [] });
            }
          }}
          placeholder={`{\n  "schemaVersion": 1,\n  "name": "My App",\n  "screens": [...]\n}`}
          className="w-full flex-1 min-h-[220px] font-mono text-xs p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-300 dark:focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 outline-none resize-none transition overflow-y-auto"
        />

        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            Upload JSON File
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={handleFormatJson}
            disabled={!jsonText.trim()}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            Format
          </button>
          <button
            type="button"
            onClick={handleLoadExample}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Load Example
          </button>
          <div className="flex items-center gap-1">
            {(["image", "button", "card", "list"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleLoadComponentExample(type)}
                className="px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[11px] font-semibold shadow-sm transition capitalize cursor-pointer"
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl mt-4">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Import Mode</h4>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "replace"}
                onChange={() => setImportMode("replace")}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Replace Current Project
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="radio"
                name="importMode"
                checked={importMode === "add"}
                onChange={() => setImportMode("add")}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              Add to Project (Appends screens / inserts components)
            </label>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto max-h-[120px] pr-1">
          {validationResult.status === "valid" && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 rounded-lg text-xs font-semibold">
              ✓ Schema validation successful! Project rendering...
            </div>
          )}
          {validationResult.status === "invalid" && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-450 rounded-lg text-xs animate-pulse">
              <div className="font-bold mb-1.5 text-rose-700 dark:text-rose-400">✕ Validation failed:</div>
              <ul className="list-disc pl-4 flex flex-col gap-1">
                {validationResult.errors.map((err, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="font-semibold font-mono text-[11px] bg-rose-100 dark:bg-rose-900/40 px-1 py-0.5 rounded text-rose-900 dark:text-rose-300 mr-1">
                      {err.path}
                    </span>
                    {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleValidateAndRender}
            className="rounded-lg bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 transition cursor-pointer"
          >
            Validate & Render
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
