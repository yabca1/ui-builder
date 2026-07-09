"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { MiniAppAction, MiniAppNode } from "@/mini-app/types/mini-app.types";
import { useBuilderStore, useSelectedNode } from "@/features/builder/store/builder.store";

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
      {label}
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 cursor-pointer"
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20",
        props.className
      )}
    />
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string | React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-slate-100 dark:bg-slate-950 p-0.5 w-full">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              "flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition select-none cursor-pointer",
              isActive
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-950">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-[-4px] size-12 cursor-pointer p-0 border-0"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-205 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
        placeholder="#000000"
      />
    </div>
  );
}

function ThemeableColorField({
  label,
  value,
  onChange,
  defaultColor = "#000000",
}: {
  label: string;
  value: unknown;
  onChange: (val: unknown) => void;
  defaultColor?: string;
}) {
  const isToken = value && typeof value === "object" && (value as any).type === "theme";
  const activeToken = isToken ? (value as any).token : "";
  const rawColor = isToken ? defaultColor : (typeof value === "string" ? value : defaultColor);

  const colors = [
    "primary",
    "secondary",
    "success",
    "warning",
    "danger",
    "background",
    "surface",
    "card",
    "border",
    "text",
    "mutedText",
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded">
          <button
            type="button"
            onClick={() => onChange(rawColor)}
            className={clsx(
              "px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer",
              !isToken ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 dark:text-slate-450"
            )}
          >
            Custom
          </button>
          <button
            type="button"
            onClick={() => onChange({ type: "theme", token: "primary" })}
            className={clsx(
              "px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer",
              isToken ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 dark:text-slate-450"
            )}
          >
            Theme
          </button>
        </div>
      </div>
      {isToken ? (
        <select
          value={activeToken}
          onChange={(e) => onChange({ type: "theme", token: e.target.value })}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 cursor-pointer"
        >
          {colors.map((c) => (
            <option key={c} value={c} className="dark:bg-slate-900 dark:text-slate-100">
              Theme {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      ) : (
        <ColorField value={rawColor} onChange={onChange} />
      )}
    </div>
  );
}

function ThemeableSizeField({
  label,
  value,
  onChange,
  tokenType,
  defaultValue = 0,
}: {
  label: string;
  value: unknown;
  onChange: (val: unknown) => void;
  tokenType: "spacing" | "radius" | "typography";
  defaultValue?: number;
}) {
  const isToken = value && typeof value === "object" && (value as any).type === "theme";
  const activeToken = isToken ? (value as any).token : "";
  const rawValue = isToken ? defaultValue : (typeof value === "number" ? value : defaultValue);

  const tokens =
    tokenType === "spacing"
      ? ["xs", "sm", "md", "lg", "xl", "xxl"]
      : tokenType === "radius"
      ? ["sm", "md", "lg", "xl"]
      : ["headingSize", "subheadingSize", "bodySize", "captionSize"];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded">
          <button
            type="button"
            onClick={() => onChange(rawValue)}
            className={clsx(
              "px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer",
              !isToken ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 dark:text-slate-450"
            )}
          >
            Custom
          </button>
          <button
            type="button"
            onClick={() => onChange({ type: "theme", token: tokens[0] })}
            className={clsx(
              "px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer",
              isToken ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 dark:text-slate-450"
            )}
          >
            Theme
          </button>
        </div>
      </div>
      {isToken ? (
        <select
          value={activeToken}
          onChange={(e) => onChange({ type: "theme", token: e.target.value })}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-205 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 cursor-pointer"
        >
          {tokens.map((t) => (
            <option key={t} value={t} className="dark:bg-slate-900 dark:text-slate-100">
              Theme {t}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          value={rawValue === undefined ? "" : rawValue}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-205 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
        />
      )}
    </div>
  );
}

function SizeControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const sizeType =
    value === undefined
      ? "auto"
      : value === "100%"
      ? "fill"
      : "fixed";

  const numVal = typeof value === "number" ? value : 120;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <SegmentedControl
        value={sizeType}
        onChange={(type) => {
          if (type === "auto") onChange(undefined);
          else if (type === "fill") onChange("100%");
          else onChange(numVal);
        }}
        options={[
          { value: "auto", label: "Auto" },
          { value: "fill", label: "Fill" },
          { value: "fixed", label: "Fixed" },
        ]}
      />
      {sizeType === "fixed" && (
        <input
          type="number"
          value={numVal}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
      )}
    </div>
  );
}

function SpacingControl({
  label,
  prefix,
  style,
  onChange,
}: {
  label: string;
  prefix: "padding" | "margin";
  style: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}) {
  const isIndividual =
    style[`${prefix}Top`] !== undefined ||
    style[`${prefix}Right`] !== undefined ||
    style[`${prefix}Bottom`] !== undefined ||
    style[`${prefix}Left`] !== undefined;

  const allVal = style[prefix] !== undefined ? Number(style[prefix]) : "";
  const topVal = style[`${prefix}Top`] !== undefined ? Number(style[`${prefix}Top`]) : 0;
  const rightVal = style[`${prefix}Right`] !== undefined ? Number(style[`${prefix}Right`]) : 0;
  const bottomVal = style[`${prefix}Bottom`] !== undefined ? Number(style[`${prefix}Bottom`]) : 0;
  const leftVal = style[`${prefix}Left`] !== undefined ? Number(style[`${prefix}Left`]) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
        <button
          type="button"
          onClick={() => {
            if (isIndividual) {
              onChange({
                [prefix]: topVal,
                [`${prefix}Top`]: undefined,
                [`${prefix}Right`]: undefined,
                [`${prefix}Bottom`]: undefined,
                [`${prefix}Left`]: undefined,
              });
            } else {
              const base = allVal === "" ? 0 : Number(allVal);
              onChange({
                [prefix]: undefined,
                [`${prefix}Top`]: base,
                [`${prefix}Right`]: base,
                [`${prefix}Bottom`]: base,
                [`${prefix}Left`]: base,
              });
            }
          }}
          className="text-[10px] font-bold text-indigo-500 hover:text-indigo-755 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer select-none"
        >
          {isIndividual ? "All same" : "Individual"}
        </button>
      </div>

      {!isIndividual ? (
        <input
          type="number"
          value={allVal}
          placeholder="Auto"
          onChange={(e) =>
            onChange({
              [prefix]: e.target.value ? Number(e.target.value) : undefined,
              [`${prefix}Top`]: undefined,
              [`${prefix}Right`]: undefined,
              [`${prefix}Bottom`]: undefined,
              [`${prefix}Left`]: undefined,
            })
          }
          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-205 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            Top
            <input
              type="number"
              value={topVal}
              onChange={(e) => onChange({ [`${prefix}Top`]: Number(e.target.value) })}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            Right
            <input
              type="number"
              value={rightVal}
              onChange={(e) => onChange({ [`${prefix}Right`]: Number(e.target.value) })}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            Bottom
            <input
              type="number"
              value={bottomVal}
              onChange={(e) => onChange({ [`${prefix}Bottom`]: Number(e.target.value) })}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            Left
            <input
              type="number"
              value={leftVal}
              onChange={(e) => onChange({ [`${prefix}Left`]: Number(e.target.value) })}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs text-slate-900 dark:text-slate-200 outline-none focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 dark:border-slate-800 py-3.5 flex flex-col gap-3">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 select-none">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function PropertyInspector() {
  const node = useSelectedNode();
  const miniApp = useBuilderStore((state) => state.miniApp);
  const validationErrors = useBuilderStore((state) => state.validationErrors);
  const updateNodeProps = useBuilderStore((state) => state.updateNodeProps);
  const updateNodeStyle = useBuilderStore((state) => state.updateNodeStyle);
  const updateNodeAction = useBuilderStore((state) => state.updateNodeAction);

  const setActionType = (type: "none" | "navigate" | "goBack" | "showAlert" | "showToast" | "setVariable") => {
    if (!node) return;

    if (type === "none") {
      updateNodeAction(node.id, null);
    } else if (type === "navigate") {
      updateNodeAction(node.id, { type: "navigate", screenId: miniApp.screens[0].id });
    } else if (type === "goBack") {
      updateNodeAction(node.id, { type: "goBack" });
    } else if (type === "showAlert") {
      updateNodeAction(node.id, { type: "showAlert", message: "Action Triggered" });
    } else if (type === "showToast") {
      updateNodeAction(node.id, { type: "showToast", message: "Toast notification" });
    } else if (type === "setVariable") {
      updateNodeAction(node.id, { type: "setVariable", variable: "myVar", value: "newValue" });
    }
  };

  const updateAction = (action: MiniAppAction) => {
    if (node) {
      updateNodeAction(node.id, action);
    }
  };

  const hasTypography = node && [
    "text", "heading", "label", "button", "input", "textarea", "badge", "list"
  ].includes(node.type);

  return (
    <aside className="w-full shrink-0 overflow-auto border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 xl:w-80 transition-colors duration-150">
      <div className="mb-5">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 select-none">App Pages</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {miniApp.screens.map((screen) => (
            <div
              key={screen.id}
              className="h-16 w-11 shrink-0 rounded-md border border-teal-200 dark:border-teal-800/40 bg-[linear-gradient(135deg,#dbeafe,#dcfce7)] dark:bg-gradient-to-br dark:from-indigo-950 dark:to-teal-950 p-1 shadow-sm"
              title={screen.name}
            >
              <div className="h-full rounded border border-white/80 dark:border-slate-800/80 bg-white/35 dark:bg-slate-950/20" />
            </div>
          ))}
        </div>
      </div>
      
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-555 dark:text-slate-450 select-none">Properties</h2>
      
      {node ? (
        <div className="flex flex-col">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold capitalize text-slate-800 dark:text-slate-200 mb-2">
            {node.type}
          </div>

          {/* Section 1: Content (Props) */}
          <InspectorSection title="Content">
            {node.type === "text" && (
              <Field label="Text">
                <TextInput value={textValue(node.props.text)} onChange={(e) => updateNodeProps(node.id, { text: e.target.value })} />
              </Field>
            )}

            {node.type === "heading" && (
              <>
                <Field label="Heading Content">
                  <TextInput value={textValue(node.props.text)} onChange={(e) => updateNodeProps(node.id, { text: e.target.value })} />
                </Field>
                <Field label="Heading Level">
                  <SegmentedControl
                    value={String(node.props.level ?? 1)}
                    onChange={(level) => {
                      const levelNum = Number(level);
                      updateNodeProps(node.id, { level: levelNum });
                      // Clear font size override if it is one of the standard sizes
                      // or if it matches the default 24px, to ensure level-based inheritance works.
                      const currentFontSize = node.style?.fontSize;
                      if (
                        currentFontSize === undefined ||
                        currentFontSize === 24 ||
                        currentFontSize === 20 ||
                        currentFontSize === 18 ||
                        currentFontSize === 16
                      ) {
                        const newStyle = { ...node.style };
                        delete newStyle.fontSize;
                        updateNodeStyle(node.id, newStyle);
                      }
                    }}
                    options={[
                      { value: "1", label: "H1" },
                      { value: "2", label: "H2" },
                      { value: "3", label: "H3" },
                      { value: "4", label: "H4" },
                    ]}
                  />
                </Field>
              </>
            )}

            {node.type === "button" && (
              <Field label="Label">
                <TextInput value={textValue(node.props.label)} onChange={(e) => updateNodeProps(node.id, { label: e.target.value })} />
              </Field>
            )}

            {(node.type === "input" || node.type === "textarea") && (
              <>
                <Field label="Placeholder">
                  <TextInput value={textValue(node.props.placeholder)} onChange={(e) => updateNodeProps(node.id, { placeholder: e.target.value })} />
                </Field>
                <Field label="Default Value">
                  <TextInput value={textValue(node.props.defaultValue)} onChange={(e) => updateNodeProps(node.id, { defaultValue: e.target.value })} />
                </Field>
              </>
            )}

            {node.type === "image" && (
              <Field label="Source URL">
                <TextInput value={textValue(node.props.sourceUrl)} onChange={(e) => updateNodeProps(node.id, { sourceUrl: e.target.value })} />
              </Field>
            )}

            {node.type === "card" && (
              <>
                <Field label="Card Title">
                  <TextInput value={textValue(node.props.title)} onChange={(e) => updateNodeProps(node.id, { title: e.target.value })} />
                </Field>
                <Field label="Card Description">
                  <TextInput value={textValue(node.props.description)} onChange={(e) => updateNodeProps(node.id, { description: e.target.value })} />
                </Field>
              </>
            )}

            {node.type === "badge" && (
              <>
                <Field label="Badge Text">
                  <TextInput value={textValue(node.props.text)} onChange={(e) => updateNodeProps(node.id, { text: e.target.value })} />
                </Field>
                <Field label="Variant">
                  <Select value={textValue(node.props.variant) || "default"} onChange={(e) => updateNodeProps(node.id, { variant: e.target.value })}>
                    <option value="default">Default</option>
                    <option value="secondary">Secondary</option>
                    <option value="destructive">Destructive</option>
                    <option value="outline">Outline</option>
                  </Select>
                </Field>
              </>
            )}

            {node.type === "alert" && (
              <>
                <Field label="Alert Title">
                  <TextInput value={textValue(node.props.title)} onChange={(e) => updateNodeProps(node.id, { title: e.target.value })} />
                </Field>
                <Field label="Alert Description">
                  <TextInput value={textValue(node.props.description)} onChange={(e) => updateNodeProps(node.id, { description: e.target.value })} />
                </Field>
                <Field label="Variant">
                  <SegmentedControl
                    value={textValue(node.props.variant) || "default"}
                    onChange={(variant) => updateNodeProps(node.id, { variant })}
                    options={[
                      { value: "default", label: "Default" },
                      { value: "destructive", label: "Destructive" },
                    ]}
                  />
                </Field>
              </>
            )}

            {node.type === "switch" && (
              <>
                <Field label="Switch Label">
                  <TextInput value={textValue(node.props.label)} onChange={(e) => updateNodeProps(node.id, { label: e.target.value })} />
                </Field>
                <Field label="Default Checked">
                  <SegmentedControl
                    value={node.props.checked ? "checked" : "unchecked"}
                    onChange={(val) => updateNodeProps(node.id, { checked: val === "checked" })}
                    options={[
                      { value: "unchecked", label: "Off" },
                      { value: "checked", label: "On" },
                    ]}
                  />
                </Field>
              </>
            )}

            {node.type === "slider" && (
              <>
                <Field label="Slider Label">
                  <TextInput value={textValue(node.props.label)} onChange={(e) => updateNodeProps(node.id, { label: e.target.value })} />
                </Field>
                <Field label="Min Value">
                  <TextInput type="number" value={numberValue(node.props.min, 0)} onChange={(e) => updateNodeProps(node.id, { min: Number(e.target.value) })} />
                </Field>
                <Field label="Max Value">
                  <TextInput type="number" value={numberValue(node.props.max, 100)} onChange={(e) => updateNodeProps(node.id, { max: Number(e.target.value) })} />
                </Field>
                <Field label="Default Value">
                  <TextInput type="number" value={numberValue(node.props.defaultValue, 50)} onChange={(e) => updateNodeProps(node.id, { defaultValue: Number(e.target.value) })} />
                </Field>
              </>
            )}

            {node.type === "progress" && (
              <>
                <Field label="Current Value">
                  <TextInput type="number" value={numberValue(node.props.value, 60)} onChange={(e) => updateNodeProps(node.id, { value: Number(e.target.value) })} />
                </Field>
                <Field label="Max Value">
                  <TextInput type="number" value={numberValue(node.props.max, 100)} onChange={(e) => updateNodeProps(node.id, { max: Number(e.target.value) })} />
                </Field>
              </>
            )}

            {node.type === "avatar" && (
              <>
                <Field label="Source URL">
                  <TextInput value={textValue(node.props.sourceUrl)} onChange={(e) => updateNodeProps(node.id, { sourceUrl: e.target.value })} />
                </Field>
                <Field label="Fallback Initials">
                  <TextInput value={textValue(node.props.fallbackText)} onChange={(e) => updateNodeProps(node.id, { fallbackText: e.target.value })} />
                </Field>
              </>
            )}

            {node.type === "checkbox" && (
              <>
                <Field label="Checkbox Label">
                  <TextInput value={textValue(node.props.label)} onChange={(e) => updateNodeProps(node.id, { label: e.target.value })} />
                </Field>
                <Field label="Default Checked">
                  <SegmentedControl
                    value={node.props.checked ? "checked" : "unchecked"}
                    onChange={(val) => updateNodeProps(node.id, { checked: val === "checked" })}
                    options={[
                      { value: "unchecked", label: "Unchecked" },
                      { value: "checked", label: "Checked" },
                    ]}
                  />
                </Field>
              </>
            )}

            {node.type === "label" && (
              <Field label="Label Text">
                <TextInput value={textValue(node.props.text)} onChange={(e) => updateNodeProps(node.id, { text: e.target.value })} />
              </Field>
            )}

            {node.type === "separator" && (
              <Field label="Orientation">
                <SegmentedControl
                  value={textValue(node.props.orientation) || "horizontal"}
                  onChange={(val) => updateNodeProps(node.id, { orientation: val })}
                  options={[
                    { value: "horizontal", label: "Horizontal" },
                    { value: "vertical", label: "Vertical" },
                  ]}
                />
              </Field>
            )}

            {node.type === "radioGroup" && (
              <>
                <Field label="Group Label">
                  <TextInput value={textValue(node.props.label)} onChange={(e) => updateNodeProps(node.id, { label: e.target.value })} />
                </Field>
                <Field label="Options (one per line)">
                  <TextArea
                    value={textValue(node.props.options)}
                    onChange={(e) => updateNodeProps(node.id, { options: e.target.value })}
                    className="min-h-20"
                  />
                </Field>
                <Field label="Selected Value">
                  <TextInput value={textValue(node.props.selectedValue)} onChange={(e) => updateNodeProps(node.id, { selectedValue: e.target.value })} />
                </Field>
              </>
            )}

            {node.type === "accordion" && (
              <>
                <Field label="Item Title">
                  <TextInput value={textValue(node.props.title)} onChange={(e) => updateNodeProps(node.id, { title: e.target.value })} />
                </Field>
                <Field label="Item Description">
                  <TextInput value={textValue(node.props.description)} onChange={(e) => updateNodeProps(node.id, { description: e.target.value })} />
                </Field>
              </>
            )}

            {node.type === "tabs" && (
              <>
                <Field label="Tabs (one per line)">
                  <TextArea
                    value={textValue(node.props.tabs)}
                    onChange={(e) => updateNodeProps(node.id, { tabs: e.target.value })}
                    className="min-h-20"
                  />
                </Field>
                <Field label="Active Tab">
                  <TextInput value={textValue(node.props.activeTab)} onChange={(e) => updateNodeProps(node.id, { activeTab: e.target.value })} />
                </Field>
              </>
            )}

            {node.type === "aspectRatio" && (
              <Field label="Aspect Ratio (width / height)">
                <TextInput type="number" step="0.01" value={numberValue(node.props.ratio, 1.77)} onChange={(e) => updateNodeProps(node.id, { ratio: Number(e.target.value) })} />
              </Field>
            )}

            {node.type === "shape" && (
              <Field label="Shape Type">
                <Select
                  value={textValue(node.props.shapeType) || "rectangle"}
                  onChange={(e) => updateNodeProps(node.id, { shapeType: e.target.value })}
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="ellipse">Ellipse</option>
                  <option value="triangle">Triangle</option>
                  <option value="star">Star</option>
                  <option value="line">Line</option>
                </Select>
              </Field>
            )}

            {node.type === "pagination" && (
              <>
                <Field label="Current Page">
                  <TextInput type="number" value={numberValue(node.props.currentPage, 1)} onChange={(e) => updateNodeProps(node.id, { currentPage: Number(e.target.value) })} />
                </Field>
                <Field label="Total Pages">
                  <TextInput type="number" value={numberValue(node.props.totalPages, 5)} onChange={(e) => updateNodeProps(node.id, { totalPages: Number(e.target.value) })} />
                </Field>
                <Field label="Show Ellipsis">
                  <SegmentedControl
                    value={node.props.showEllipsis !== false ? "show" : "hide"}
                    onChange={(val) => updateNodeProps(node.id, { showEllipsis: val === "show" })}
                    options={[
                      { value: "show", label: "Yes" },
                      { value: "hide", label: "No" },
                    ]}
                  />
                </Field>
              </>
            )}
            {node.type === "list" && (
              <>
                <Field label="List Title">
                  <TextInput value={textValue(node.props.title)} onChange={(e) => updateNodeProps(node.id, { title: e.target.value })} />
                </Field>
                <Field label="List Items (one per line)">
                  <TextArea
                    value={textValue(node.props.items)}
                    onChange={(e) => updateNodeProps(node.id, { items: e.target.value })}
                    className="min-h-24"
                  />
                </Field>
                <Field label="List Style">
                  <SegmentedControl
                    value={node.props.ordered ? "ordered" : "unordered"}
                    onChange={(val) => updateNodeProps(node.id, { ordered: val === "ordered" })}
                    options={[
                      { value: "unordered", label: "Bulleted" },
                      { value: "ordered", label: "Numbered" },
                    ]}
                  />
                </Field>
                <Field label="Show Dividers">
                  <SegmentedControl
                    value={node.props.showDividers ? "yes" : "no"}
                    onChange={(val) => updateNodeProps(node.id, { showDividers: val === "yes" })}
                    options={[
                      { value: "no", label: "No" },
                      { value: "yes", label: "Yes" },
                    ]}
                  />
                </Field>
              </>
            )}
          </InspectorSection>

          {/* Section 2: Size & Layout */}
          <InspectorSection title="Size & Layout">
            <div className="grid grid-cols-2 gap-3">
              <SizeControl label="Width" value={node.style?.width} onChange={(val) => updateNodeStyle(node.id, { width: val })} />
              <SizeControl label="Height" value={node.style?.height} onChange={(val) => updateNodeStyle(node.id, { height: val })} />
            </div>

            {node.type === "container" && (
              <Field label="Layout direction">
                <SegmentedControl
                  value={textValue(node.style?.direction) || "vertical"}
                  onChange={(val) => updateNodeStyle(node.id, { direction: val })}
                  options={[
                    { value: "vertical", label: "Vertical" },
                    { value: "horizontal", label: "Horizontal" },
                  ]}
                />
              </Field>
            )}

            {node.type === "row" && (
              <Field label="Flex Wrap">
                <SegmentedControl
                  value={textValue(node.style?.flexWrap) || "nowrap"}
                  onChange={(val) => updateNodeStyle(node.id, { flexWrap: val })}
                  options={[
                    { value: "nowrap", label: "No Wrap" },
                    { value: "wrap", label: "Wrap" },
                  ]}
                />
              </Field>
            )}

            {["container", "row", "column"].includes(node.type) && (
              <>
                <Field label="Alignment">
                  <Select value={textValue(node.style?.alignment) || "stretch"} onChange={(e) => updateNodeStyle(node.id, { alignment: e.target.value })}>
                    <option value="stretch">Stretch</option>
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="flex-end">End</option>
                  </Select>
                </Field>
                <Field label="Justification">
                  <Select value={textValue(node.style?.justifyContent) || "start"} onChange={(e) => updateNodeStyle(node.id, { justifyContent: e.target.value })}>
                    <option value="start">Start</option>
                    <option value="center">Center</option>
                    <option value="end">End</option>
                    <option value="space-between">Space Between</option>
                    <option value="space-around">Space Around</option>
                  </Select>
                </Field>
              </>
            )}

            {node.type === "card" && (
              <Field label="Layout direction">
                <SegmentedControl
                  value={textValue(node.style?.direction) || "vertical"}
                  onChange={(val) => updateNodeStyle(node.id, { direction: val })}
                  options={[
                    { value: "vertical", label: "Vertical" },
                    { value: "horizontal", label: "Horizontal" },
                  ]}
                />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3 mt-1">
              <Field label="Flex Grow">
                <TextInput type="number" value={node.style?.flex !== undefined ? String(node.style.flex) : ""} placeholder="None" onChange={(e) => updateNodeStyle(node.id, { flex: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
              <Field label="Position">
                <SegmentedControl
                  value={textValue(node.style?.position) || "relative"}
                  onChange={(val) => updateNodeStyle(node.id, { position: val })}
                  options={[
                    { value: "relative", label: "Relative" },
                    { value: "absolute", label: "Absolute" },
                  ]}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <Field label="Min Width">
                <TextInput type="number" value={node.style?.minWidth !== undefined ? String(node.style.minWidth) : ""} placeholder="None" onChange={(e) => updateNodeStyle(node.id, { minWidth: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
              <Field label="Min Height">
                <TextInput type="number" value={node.style?.minHeight !== undefined ? String(node.style.minHeight) : ""} placeholder="None" onChange={(e) => updateNodeStyle(node.id, { minHeight: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
            </div>
          </InspectorSection>

          {/* Section 3: Spacing */}
          <InspectorSection title="Spacing">
            <SpacingControl label="Padding" prefix="padding" style={node.style ?? {}} onChange={(updates) => updateNodeStyle(node.id, updates)} />
            <SpacingControl label="Margin" prefix="margin" style={node.style ?? {}} onChange={(updates) => updateNodeStyle(node.id, updates)} />
            {["container", "row", "column", "card", "scrollArea", "list"].includes(node.type) && (
              <ThemeableSizeField
                label="Gap / Spacing"
                value={node.style?.gap}
                tokenType="spacing"
                defaultValue={8}
                onChange={(val) => updateNodeStyle(node.id, { gap: val })}
              />
            )}
          </InspectorSection>

          {/* Section 4: Typography (Conditionally rendered) */}
          {hasTypography && (
            <InspectorSection title="Typography">
              <Field label="Font family">
                <Select value={textValue(node.style?.fontFamily) || "sans-serif"} onChange={(e) => updateNodeStyle(node.id, { fontFamily: e.target.value })}>
                  <option value="sans-serif">System Sans-Serif</option>
                  <option value="serif">Serif (Georgia)</option>
                  <option value="monospace">Monospace (Consolas)</option>
                </Select>
              </Field>
              <ThemeableSizeField
                label="Font size"
                value={node.style?.fontSize}
                tokenType="typography"
                defaultValue={node.type === "heading" ? 24 : 16}
                onChange={(val) => updateNodeStyle(node.id, { fontSize: val })}
              />
              <Field label="Font weight">
                <Select value={textValue(node.style?.fontWeight) || "400"} onChange={(e) => updateNodeStyle(node.id, { fontWeight: e.target.value })}>
                  <option value="400">Regular</option>
                  <option value="500">Medium</option>
                  <option value="600">Semi-bold</option>
                  <option value="700">Bold</option>
                </Select>
              </Field>
              <Field label="Text align">
                <SegmentedControl
                  value={textValue(node.style?.textAlign) || "left"}
                  onChange={(val) => updateNodeStyle(node.id, { textAlign: val })}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                  ]}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Line height (px)">
                  <TextInput type="number" value={node.style?.lineHeight !== undefined ? String(node.style.lineHeight) : ""} placeholder="Auto" onChange={(e) => updateNodeStyle(node.id, { lineHeight: e.target.value ? Number(e.target.value) : undefined })} />
                </Field>
                <Field label="Letter spacing (px)">
                  <TextInput type="number" step="0.5" value={node.style?.letterSpacing !== undefined ? String(node.style.letterSpacing) : ""} placeholder="0" onChange={(e) => updateNodeStyle(node.id, { letterSpacing: e.target.value ? Number(e.target.value) : undefined })} />
                </Field>
              </div>
              <ThemeableColorField
                label="Text Color"
                value={node.style?.color || (node.type === "button" ? node.style?.textColor : undefined)}
                defaultColor="#111827"
                onChange={(val) => updateNodeStyle(node.id, node.type === "button" ? { textColor: val } : { color: val })}
              />
            </InspectorSection>
          )}

          {/* Section 5: Background & Border */}
          <InspectorSection title="Background & Border">
            {node.type !== "text" && node.type !== "label" && node.type !== "heading" && node.type !== "separator" && (
              <ThemeableColorField
                label="Background Color"
                value={node.style?.backgroundColor}
                defaultColor={node.type === "button" ? "#2563eb" : "#ffffff"}
                onChange={(val) => updateNodeStyle(node.id, { backgroundColor: val })}
              />
            )}

            {node.type === "separator" && (
              <ThemeableColorField
                label="Line Color"
                value={node.style?.color}
                defaultColor="#e4e4e7"
                onChange={(val) => updateNodeStyle(node.id, { color: val })}
              />
            )}

            <Field label="Border Width">
              <TextInput type="number" value={node.style?.borderWidth !== undefined ? String(node.style.borderWidth) : ""} placeholder="0" onChange={(e) => updateNodeStyle(node.id, { borderWidth: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
            <ThemeableSizeField
              label="Border Radius"
              value={node.style?.borderRadius}
              tokenType="radius"
              defaultValue={0}
              onChange={(val) => updateNodeStyle(node.id, { borderRadius: val })}
            />

            <ThemeableColorField
              label="Border Color"
              value={node.style?.borderColor}
              defaultColor="#e4e4e7"
              onChange={(val) => updateNodeStyle(node.id, { borderColor: val })}
            />

            {node.type === "separator" && (
              <Field label="Thickness (px)">
                <TextInput type="number" value={node.style?.thickness !== undefined ? String(node.style.thickness) : "1"} onChange={(e) => updateNodeStyle(node.id, { thickness: Number(e.target.value) })} />
              </Field>
            )}
          </InspectorSection>

          {/* Section 6: Appearance */}
          <InspectorSection title="Appearance">
            <Field label="Opacity (0-1)">
              <TextInput type="number" step="0.1" min="0" max="1" value={node.style?.opacity !== undefined ? String(node.style.opacity) : ""} placeholder="1.0" onChange={(e) => updateNodeStyle(node.id, { opacity: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
          </InspectorSection>

          {/* Section 7: Actions */}
          {node && (
            <InspectorSection title="Actions">
              <Field label="On Press trigger">
                <Select value={node.events?.onPress?.type ?? "none"} onChange={(e) => setActionType(e.target.value as any)}>
                  <option value="none">None</option>
                  <option value="navigate">Navigate to Screen</option>
                  <option value="goBack">Go Back</option>
                  <option value="showAlert">Show Alert Notification</option>
                  <option value="showToast">Show Toast Notification</option>
                  <option value="setVariable">Set State Variable</option>
                </Select>
              </Field>

              {node.events?.onPress?.type === "navigate" && (
                <Field label="Target screen">
                  <Select value={node.events.onPress.screenId} onChange={(e) => updateAction({ type: "navigate", screenId: e.target.value })}>
                    {miniApp.screens.map((screen) => (
                      <option key={screen.id} value={screen.id}>
                        {screen.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {node.events?.onPress?.type === "showAlert" && (
                <Field label="Alert message">
                  <TextInput value={node.events.onPress.message} onChange={(e) => updateAction({ type: "showAlert", message: e.target.value })} />
                </Field>
              )}

              {node.events?.onPress?.type === "showToast" && (
                <Field label="Toast message">
                  <TextInput value={node.events.onPress.message} onChange={(e) => updateAction({ type: "showToast", message: e.target.value })} />
                </Field>
              )}

              {node.events?.onPress?.type === "setVariable" && (
                <div className="flex flex-col gap-3">
                  <Field label="Variable name">
                    <TextInput value={node.events.onPress.variable} onChange={(e) => updateAction({ type: "setVariable", variable: e.target.value, value: node.events?.onPress?.type === "setVariable" ? node.events.onPress.value : "" })} />
                  </Field>
                  <Field label="Value to set">
                    <TextInput value={String(node.events.onPress.value ?? "")} onChange={(e) => updateAction({ type: "setVariable", variable: node.events?.onPress?.type === "setVariable" ? node.events.onPress.variable : "myVar", value: e.target.value })} />
                  </Field>
                </div>
              )}
            </InspectorSection>
          )}

        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-6 text-center text-sm font-semibold text-slate-400 dark:text-slate-500 select-none">
          Select a component on the canvas to configure properties.
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="mt-5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4">
          <div className="mb-2 text-sm font-bold text-rose-700 dark:text-rose-400 select-none">Validation errors</div>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-rose-600 dark:text-rose-450 leading-relaxed">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
