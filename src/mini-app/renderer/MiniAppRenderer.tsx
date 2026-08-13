"use client";

import { useMemo, useState, useEffect } from "react";
import type { MiniApp, MiniAppAction, MiniAppNode } from "@/mini-app/types/mini-app.types";
import { clsx } from "clsx";
import { resolveNodeTheme, themePresets } from "@/mini-app/registry/theme-presets";

type MiniAppRendererProps = {
  miniApp: MiniApp;
  themeMode?: "light" | "dark";
};

type RenderNodeProps = {
  node: MiniAppNode;
  runAction: (action: MiniAppAction | undefined) => void;
};

function numberStyle(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function stringStyle(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function resolveRendererStyles(style: Record<string, any> | undefined, nodeType: string): React.CSSProperties {
  if (!style) return {};
  const cssStyle: React.CSSProperties = {};

  if (style.width !== undefined) {
    cssStyle.width = typeof style.width === "number" ? `${style.width}px` : style.width;
  }
  if (style.height !== undefined) {
    cssStyle.height = typeof style.height === "number" ? `${style.height}px` : style.height;
  }

  if (style.minWidth !== undefined) cssStyle.minWidth = `${style.minWidth}px`;
  if (style.maxWidth !== undefined) cssStyle.maxWidth = `${style.maxWidth}px`;
  if (style.minHeight !== undefined) cssStyle.minHeight = `${style.minHeight}px`;
  if (style.maxHeight !== undefined) cssStyle.maxHeight = `${style.maxHeight}px`;

  if (style.margin !== undefined) {
    cssStyle.margin = `${style.margin}px`;
  } else {
    if (style.marginTop !== undefined) cssStyle.marginTop = `${style.marginTop}px`;
    if (style.marginRight !== undefined) cssStyle.marginRight = `${style.marginRight}px`;
    if (style.marginBottom !== undefined) cssStyle.marginBottom = `${style.marginBottom}px`;
    if (style.marginLeft !== undefined) cssStyle.marginLeft = `${style.marginLeft}px`;
  }

  const isContainerType = ["container", "row", "column", "card", "scrollArea", "accordion", "tabs", "aspectRatio"].includes(nodeType);
  if (!isContainerType) {
    if (style.padding !== undefined) {
      cssStyle.padding = `${style.padding}px`;
    } else {
      if (style.paddingTop !== undefined) cssStyle.paddingTop = `${style.paddingTop}px`;
      if (style.paddingRight !== undefined) cssStyle.paddingRight = `${style.paddingRight}px`;
      if (style.paddingBottom !== undefined) cssStyle.paddingBottom = `${style.paddingBottom}px`;
      if (style.paddingLeft !== undefined) cssStyle.paddingLeft = `${style.paddingLeft}px`;
    }
  }

  if (style.flex !== undefined) cssStyle.flex = style.flex;
  if (style.opacity !== undefined) cssStyle.opacity = style.opacity;
  if (style.position !== undefined) cssStyle.position = style.position as any;

  return cssStyle;
}

function RenderSwitch({ node }: { node: MiniAppNode }) {
  const [checked, setChecked] = useState(Boolean(node.props.checked));

  useEffect(() => {
    setChecked(Boolean(node.props.checked));
  }, [node.props.checked]);

  return (
    <div className="flex items-center space-x-2 py-1.5 cursor-pointer select-none" onClick={() => setChecked(!checked)}>
      <div
        className={clsx(
          "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200",
          checked ? "bg-zinc-900" : "bg-zinc-200"
        )}
      >
        <span
          className={clsx(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </div>
      <span className="text-sm font-medium leading-none text-zinc-900">
        {String(node.props.label ?? "Toggle state")}
      </span>
    </div>
  );
}

function RenderCheckbox({ node }: { node: MiniAppNode }) {
  const [checked, setChecked] = useState(Boolean(node.props.checked));

  useEffect(() => {
    setChecked(Boolean(node.props.checked));
  }, [node.props.checked]);

  return (
    <div className="flex items-center space-x-2 py-1.5 cursor-pointer select-none" onClick={() => setChecked(!checked)}>
      <div
        className={clsx(
          "h-4 w-4 shrink-0 rounded-sm border border-zinc-300 transition-colors",
          checked ? "bg-zinc-900 border-zinc-900 text-white flex items-center justify-center" : "bg-white"
        )}
      >
        {checked && (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-white">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span className="text-sm font-medium leading-none text-zinc-900">
        {String(node.props.label ?? "Accept terms")}
      </span>
    </div>
  );
}

function RenderSlider({ node }: { node: MiniAppNode }) {
  const min = typeof node.props.min === "number" ? node.props.min : 0;
  const max = typeof node.props.max === "number" ? node.props.max : 100;
  const [val, setVal] = useState(typeof node.props.defaultValue === "number" ? node.props.defaultValue : 50);

  useEffect(() => {
    setVal(typeof node.props.defaultValue === "number" ? node.props.defaultValue : 50);
  }, [node.props.defaultValue]);

  const percentage = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));

  return (
    <div className="w-full py-2 select-none">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-700">{String(node.props.label ?? "Slider")}</span>
        <span className="text-xs text-zinc-500 font-mono">{val}</span>
      </div>
      <div className="relative flex w-full touch-none select-none items-center py-1">
        <input
          type="range"
          min={min}
          max={max}
          value={val}
          onChange={(e) => setVal(Number(e.target.value))}
          className="absolute w-full h-2 opacity-0 cursor-pointer z-10"
        />
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-zinc-100">
          <div
            className="absolute h-full bg-zinc-900"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className="absolute h-5 w-5 rounded-full border border-zinc-200 bg-white shadow-sm pointer-events-none"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    </div>
  );
}

function RenderRadioGroup({ node }: { node: MiniAppNode }) {
  const optionsText = stringStyle(node.props.options) ?? "Option A\nOption B";
  const options = optionsText.split("\n").filter(Boolean);
  const [selected, setSelected] = useState(stringStyle(node.props.selectedValue) ?? options[0] ?? "");

  useEffect(() => {
    setSelected(stringStyle(node.props.selectedValue) ?? options[0] ?? "");
  }, [node.props.selectedValue]);

  return (
    <div className="flex flex-col gap-2 py-1 select-none w-full">
      <span className="text-xs font-semibold text-zinc-500">{String(node.props.label ?? "Radio Group")}</span>
      {options.map((option, idx) => (
        <div key={idx} className="flex items-center space-x-2 cursor-pointer" onClick={() => setSelected(option)}>
          <div
            className={clsx(
              "h-4 w-4 rounded-full border border-zinc-300 flex items-center justify-center transition-colors",
              selected === option ? "border-zinc-900 bg-white" : "bg-white"
            )}
          >
            {selected === option && <div className="h-2 w-2 rounded-full bg-zinc-900" />}
          </div>
          <span className="text-sm text-zinc-900">{option}</span>
        </div>
      ))}
    </div>
  );
}

function RenderAccordion({ node, runAction }: { node: MiniAppNode; runAction: (action: MiniAppAction | undefined) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-zinc-200 bg-white rounded-lg w-full overflow-hidden select-none">
      <div
        className="flex justify-between items-center px-4 py-3 bg-zinc-50/50 hover:bg-zinc-50 border-b border-zinc-100 font-semibold text-zinc-700 text-sm cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span>{String(node.props.title ?? "Accordion Item")}</span>
        <span className={clsx("transition-transform duration-200", expanded && "rotate-180")}>▼</span>
      </div>
      {expanded && (
        <div className="p-4 flex flex-col gap-2 border-t border-zinc-100 bg-white">
          {node.children && node.children.length > 0 ? (
            node.children.map((child) => (
              <RenderNode key={child.id} node={child} runAction={runAction} />
            ))
          ) : (
            <p className="text-xs text-zinc-500">{String(node.props.description ?? "")}</p>
          )}
        </div>
      )}
    </div>
  );
}

function RenderTabs({ node, runAction }: { node: MiniAppNode; runAction: (action: MiniAppAction | undefined) => void }) {
  const tabsText = stringStyle(node.props.tabs) ?? "Tab 1\nTab 2";
  const tabs = tabsText.split("\n").filter(Boolean);
  const [activeTab, setActiveTab] = useState(stringStyle(node.props.activeTab) ?? tabs[0] ?? "");

  useEffect(() => {
    setActiveTab(stringStyle(node.props.activeTab) ?? tabs[0] ?? "");
  }, [node.props.activeTab]);

  const activeIdx = tabs.indexOf(activeTab);

  return (
    <div className="flex flex-col border border-zinc-200 bg-white rounded-lg w-full overflow-hidden">
      <div className="flex border-b border-zinc-200 bg-zinc-50/50 p-1 gap-1">
        {tabs.map((tab, idx) => (
          <span
            key={idx}
            className={clsx(
              "px-3 py-1.5 text-xs font-semibold rounded-md border transition cursor-pointer select-none",
              activeTab === tab
                ? "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="p-4 flex flex-col gap-2 bg-white min-h-16">
        {node.children && node.children.length > 0 ? (
          node.children.map((child, idx) => {
            if (node.children && node.children.length === tabs.length) {
              return idx === activeIdx ? (
                <RenderNode key={child.id} node={child} runAction={runAction} />
              ) : null;
            }
            return <RenderNode key={child.id} node={child} runAction={runAction} />;
          })
        ) : (
          <p className="text-xs text-zinc-500 text-center py-2">Content for {activeTab}</p>
        )}
      </div>
    </div>
  );
}

function RenderPagination({ node }: { node: MiniAppNode }) {
  const defaultPage = typeof node.props.currentPage === "number" ? node.props.currentPage : 1;
  const [cur, setCur] = useState(defaultPage);
  const total = typeof node.props.totalPages === "number" ? node.props.totalPages : 5;
  const showEllipsis = node.props.showEllipsis !== false;

  useEffect(() => {
    setCur(typeof node.props.currentPage === "number" ? node.props.currentPage : 1);
  }, [node.props.currentPage]);

  const pages: (number | string)[] = [];
  if (total <= 4) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (cur > 2) {
      if (showEllipsis) {
        pages.push("...");
      } else {
        pages.push(cur - 1);
      }
    } else if (cur === 2 && total > 2) {
      pages.push(2);
    }
    
    if (cur > 2 && cur < total - 1) {
      pages.push(cur);
    }

    if (cur < total - 1) {
      if (showEllipsis) {
        pages.push("...");
      } else {
        pages.push(cur + 1);
      }
    } else if (cur === total - 1 && total > 2 && cur > 2) {
      pages.push(total - 1);
    }
    
    if (total > 1) {
      pages.push(total);
    }
  }

  const finalPages = Array.from(new Set(pages.map(String))).map(p => p === "..." ? "..." : Number(p));

  const handlePageChange = (p: number | string) => {
    if (typeof p === "number") {
      setCur(p);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5 py-2 w-full select-none">
      <button
        type="button"
        disabled={cur <= 1}
        onClick={() => setCur(Math.max(1, cur - 1))}
        className="px-2 py-1.5 text-xs font-semibold rounded border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &lt; Prev
      </button>
      {finalPages.map((p, idx) => {
        const isActive = p === cur;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handlePageChange(p)}
            className={clsx(
              "min-w-[28px] h-7 px-1 text-xs font-semibold rounded border transition flex items-center justify-center",
              isActive
                ? "bg-zinc-900 border-zinc-900 text-white shadow-sm"
                : p === "..."
                ? "border-transparent bg-transparent text-zinc-400 cursor-default"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            )}
          >
            {p}
          </button>
        );
      })}
      <button
        type="button"
        disabled={cur >= total}
        onClick={() => setCur(Math.min(total, cur + 1))}
        className="px-2 py-1.5 text-xs font-semibold rounded border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next &gt;
      </button>
    </div>
  );
}

function RenderNode({ node, runAction }: RenderNodeProps) {
  const style = node.style ?? {};

  if (["container", "row", "column"].includes(node.type)) {
    const direction: "row" | "column" =
      node.type === "row"
        ? "row"
        : node.type === "column"
          ? "column"
          : stringStyle(style.direction) === "horizontal" ? "row" : "column";

    const hasManyChildren = (node.children ?? []).length >= 2;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: direction,
          alignItems: stringStyle(style.alignItems) ?? stringStyle(style.alignment) ?? (node.type === "row" ? "center" : "stretch"),
          justifyContent: stringStyle(style.justifyContent) ?? "flex-start",
          gap: numberStyle(style.gap),
          padding: numberStyle(style.padding),
          backgroundColor: stringStyle(style.backgroundColor),
          borderRadius: numberStyle(style.borderRadius),
          flexWrap: node.type === "row" ? (stringStyle(style.flexWrap) as React.CSSProperties["flexWrap"]) : undefined,
          overflowX: hasManyChildren && direction === "row" ? "auto" : undefined,
          overflowY: hasManyChildren && direction === "column" ? "auto" : undefined,
          maxWidth: "100%",
          width: numberStyle(style.width),
          height: numberStyle(style.height),
          minWidth: numberStyle(style.minWidth),
          minHeight: numberStyle(style.minHeight) ?? (["row", "column"].includes(node.type) ? undefined : 48),
          margin: numberStyle(style.margin),
          opacity: numberStyle(style.opacity),
          flexShrink: 0,
        }}
      >
        {(node.children ?? []).map((child) => (
          <RenderNode key={child.id} node={child} runAction={runAction} />
        ))}
      </div>
    );
  }

  if (node.type === "card") {
    const direction = stringStyle(style.direction) === "horizontal" ? "row" : "column";
    const children = node.children ?? [];
    return (
      <div
        className="flex flex-col border shadow-sm overflow-hidden w-full"
        style={{
          backgroundColor: stringStyle(style.backgroundColor) ?? "#ffffff",
          borderRadius: numberStyle(style.borderRadius) ?? 12,
          borderColor: stringStyle(style.borderColor) ?? "#e4e4e7",
          borderWidth: numberStyle(style.borderWidth) ?? 1,
        }}
      >
        {children.length === 0 ? (
          <div className="border-b border-zinc-100 p-4">
            <h3 className="text-sm font-semibold tracking-tight text-zinc-900">
              {String(node.props.title ?? "Card Title")}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              {String(node.props.description ?? "Card Description")}
            </p>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: direction,
            gap: numberStyle(style.gap),
            padding: numberStyle(style.padding) ?? 16,
            overflowX: direction === "row" ? "auto" : undefined,
            maxWidth: "100%",
          }}
        >
          {children.map((child) => (
            <RenderNode key={child.id} node={child} runAction={runAction} />
          ))}
        </div>
      </div>
    );
  }

  if (node.type === "text") {
    return (
      <div
        style={{
          fontSize: numberStyle(style.fontSize) ?? 16,
          fontWeight: stringStyle(style.fontWeight),
          color: stringStyle(style.color),
          textAlign: stringStyle(style.textAlign) as React.CSSProperties["textAlign"],
          fontFamily: stringStyle(style.fontFamily),
          lineHeight: numberStyle(style.lineHeight) ? `${style.lineHeight}px` : undefined,
          letterSpacing: numberStyle(style.letterSpacing) ? `${style.letterSpacing}px` : undefined,
          flexShrink: 0,
          ...resolveRendererStyles(style, "text"),
        }}
      >
        {String(node.props.text ?? "")}
      </div>
    );
  }

  if (node.type === "heading") {
    const level = typeof node.props.level === "number" ? node.props.level : 1;
    const size = level === 1 ? 24 : level === 2 ? 20 : level === 3 ? 18 : 16;
    const textStyle = {
      fontSize: numberStyle(style.fontSize) ?? size,
      fontWeight: stringStyle(style.fontWeight) ?? "700",
      color: stringStyle(style.color) ?? "#111827",
      textAlign: stringStyle(style.textAlign) as React.CSSProperties["textAlign"],
      fontFamily: stringStyle(style.fontFamily) ?? "sans-serif",
      lineHeight: numberStyle(style.lineHeight) ? `${style.lineHeight}px` : undefined,
      letterSpacing: numberStyle(style.letterSpacing) ? `${style.letterSpacing}px` : undefined,
      flexShrink: 0,
      ...resolveRendererStyles(style, "heading"),
    };
    if (level === 1) return <h1 style={textStyle}>{String(node.props.text ?? "")}</h1>;
    if (level === 2) return <h2 style={textStyle}>{String(node.props.text ?? "")}</h2>;
    if (level === 3) return <h3 style={textStyle}>{String(node.props.text ?? "")}</h3>;
    return <h4 style={textStyle}>{String(node.props.text ?? "")}</h4>;
  }

  if (node.type === "button") {
    return (
      <button
        type="button"
        onClick={() => runAction(node.events?.onPress)}
        style={{
          backgroundColor: stringStyle(style.backgroundColor) ?? "#2563eb",
          color: stringStyle(style.textColor) ?? "#ffffff",
          borderRadius: numberStyle(style.borderRadius) ?? 10,
          borderWidth: numberStyle(style.borderWidth) ?? 0,
          borderColor: stringStyle(style.borderColor) ?? "transparent",
          fontSize: numberStyle(style.fontSize) ?? 14,
          fontWeight: stringStyle(style.fontWeight) ?? "600",
          minHeight: numberStyle(style.minHeight) ?? 44,
          fontFamily: stringStyle(style.fontFamily),
          borderStyle: style.borderWidth ? "solid" : "none",
          cursor: "pointer",
          flexShrink: 0,
          ...resolveRendererStyles(style, "button"),
        }}
      >
        {String(node.props.label ?? "Button")}
      </button>
    );
  }

  if (node.type === "input") {
    return (
      <input
        placeholder={String(node.props.placeholder ?? "")}
        defaultValue={String(node.props.defaultValue ?? "")}
        style={{
          backgroundColor: stringStyle(style.backgroundColor) ?? "#ffffff",
          color: stringStyle(style.textColor) ?? "#000000",
          borderRadius: numberStyle(style.borderRadius) ?? 10,
          borderWidth: numberStyle(style.borderWidth) ?? 1,
          borderColor: stringStyle(style.borderColor) ?? "#cbd5e1",
          width: "100%",
          minWidth: 140,
          flexShrink: 0,
          borderStyle: "solid",
          fontSize: numberStyle(style.fontSize) ?? 14,
          minHeight: numberStyle(style.minHeight) ?? 44,
          ...resolveRendererStyles(style, "input"),
        }}
      />
    );
  }

  if (node.type === "image") {
    const src =
      stringStyle(node.props.sourceUrl) ??
      stringStyle(node.props.source) ??
      stringStyle(node.props.src) ??
      stringStyle(node.props.url) ??
      stringStyle(node.props.imageUrl);
    if (!src) {
      return (
        <div
          className="flex flex-col items-center justify-center bg-zinc-100 text-zinc-400 border border-dashed border-zinc-300 shadow-sm"
          style={{
            width: numberStyle(style.width) ?? 280,
            height: numberStyle(style.height) ?? 160,
            borderRadius: numberStyle(style.borderRadius) ?? 10,
            flexShrink: 0,
            ...resolveRendererStyles(style, "image"),
          }}
        >
          <svg className="size-8 mb-1.5 opacity-60 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-xs font-semibold">No Image URL</span>
        </div>
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        style={{
          width: numberStyle(style.width) ?? 280,
          height: numberStyle(style.height) ?? 160,
          objectFit: "cover",
          borderRadius: numberStyle(style.borderRadius) ?? 10,
          flexShrink: 0,
          ...resolveRendererStyles(style, "image"),
        }}
      />
    );
  }

  if (node.type === "badge") {
    const variant = stringStyle(node.props.variant) ?? "default";
    let variantClasses = "bg-zinc-900 text-zinc-50";
    if (variant === "secondary") variantClasses = "bg-zinc-100 text-zinc-900";
    if (variant === "destructive") variantClasses = "bg-red-500 text-zinc-50";
    if (variant === "outline") variantClasses = "border border-zinc-200 text-zinc-900 bg-white";

    return (
      <div className="flex">
        <span
          className={clsx("inline-flex items-center px-2.5 py-0.5 text-xs font-semibold transition-colors", variantClasses)}
          style={{
            borderRadius: numberStyle(style.borderRadius) ?? 9999,
          }}
        >
          {String(node.props.text ?? "Badge")}
        </span>
      </div>
    );
  }

  if (node.type === "alert") {
    const variant = stringStyle(node.props.variant) ?? "default";
    const isDestructive = variant === "destructive";

    return (
      <div
        className={clsx(
          "relative w-full p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-zinc-950",
          isDestructive
            ? "border border-red-200 bg-red-50 text-red-900"
            : "border border-zinc-200 bg-white text-zinc-950"
        )}
        style={{
          borderRadius: numberStyle(style.borderRadius) ?? 8,
        }}
      >
        {isDestructive ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-600">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-zinc-900">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
        <h5 className="mb-1 font-semibold leading-none tracking-tight text-sm">
          {String(node.props.title ?? "Alert Title")}
        </h5>
        <div className="text-xs opacity-90 leading-relaxed">
          {String(node.props.description ?? "Alert description goes here.")}
        </div>
      </div>
    );
  }

  if (node.type === "switch") {
    return <RenderSwitch node={node} />;
  }

  if (node.type === "slider") {
    return <RenderSlider node={node} />;
  }

  if (node.type === "progress") {
    const value = typeof node.props.value === "number" ? node.props.value : 60;
    const max = typeof node.props.max === "number" ? node.props.max : 100;
    const percentage = Math.max(0, Math.min(100, (value / max) * 100));

    return (
      <div className="w-full py-2">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full bg-zinc-900 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  if (node.type === "avatar") {
    const size = numberStyle(style.size) ?? 40;
    const src =
      stringStyle(node.props.sourceUrl) ??
      stringStyle(node.props.source) ??
      stringStyle(node.props.src) ??
      stringStyle(node.props.url) ??
      stringStyle(node.props.imageUrl);
    return (
      <div
        className="relative flex shrink-0 overflow-hidden rounded-full bg-zinc-100"
        style={{ width: size, height: size }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="avatar"
            className="aspect-square h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">
            {String(node.props.fallbackText ?? "CN")}
          </div>
        )}
      </div>
    );
  }

  if (node.type === "checkbox") {
    return <RenderCheckbox node={node} />;
  }

  if (node.type === "textarea") {
    return (
      <textarea
        placeholder={String(node.props.placeholder ?? "")}
        defaultValue={String(node.props.defaultValue ?? "")}
        style={{
          backgroundColor: stringStyle(style.backgroundColor) ?? "#ffffff",
          color: stringStyle(style.textColor) ?? "#000000",
          borderRadius: numberStyle(style.borderRadius) ?? 10,
          borderWidth: numberStyle(style.borderWidth) ?? 1,
          borderColor: stringStyle(style.borderColor) ?? "#cbd5e1",
          width: "100%",
          minHeight: 80,
          borderStyle: "solid",
          fontSize: numberStyle(style.fontSize) ?? 14,
          ...resolveRendererStyles(style, "textarea"),
        }}
      />
    );
  }

  if (node.type === "label") {
    return (
      <label
        style={{
          fontSize: numberStyle(style.fontSize) ?? 14,
          fontWeight: stringStyle(style.fontWeight) ?? "500",
          color: stringStyle(style.color) ?? "#374151",
          fontFamily: stringStyle(style.fontFamily) ?? "sans-serif",
          ...resolveRendererStyles(style, "label"),
        }}
      >
        {String(node.props.text ?? "")}
      </label>
    );
  }

  if (node.type === "separator") {
    const isHorizontal = stringStyle(node.props.orientation) === "horizontal";
    const thickness = numberStyle(style.thickness) ?? 1;
    return (
      <div
        style={{
          height: isHorizontal ? thickness : "100%",
          width: isHorizontal ? "100%" : thickness,
          minHeight: isHorizontal ? undefined : 20,
          backgroundColor: stringStyle(style.color) ?? "#e4e4e7",
          ...resolveRendererStyles(style, "separator"),
        }}
      />
    );
  }

  if (node.type === "radioGroup") {
    return <RenderRadioGroup node={node} />;
  }

  if (node.type === "accordion") {
    return <RenderAccordion node={node} runAction={runAction} />;
  }

  if (node.type === "tabs") {
    return <RenderTabs node={node} runAction={runAction} />;
  }

  if (node.type === "skeleton") {
    return (
      <div
        className="animate-pulse bg-zinc-200"
        style={{
          width: numberStyle(style.width) ?? 200,
          height: numberStyle(style.height) ?? 20,
          borderRadius: numberStyle(style.borderRadius) ?? 4,
        }}
      />
    );
  }

  if (node.type === "scrollArea") {
    return (
      <div
        className="overflow-y-auto w-full p-1"
        style={{
          height: numberStyle(style.height) ?? 200,
        }}
      >
        <div className="flex flex-col gap-2">
          {(node.children ?? []).map((child) => (
            <RenderNode key={child.id} node={child} runAction={runAction} />
          ))}
        </div>
      </div>
    );
  }

  if (node.type === "aspectRatio") {
    const ratio = typeof node.props.ratio === "number" ? node.props.ratio : 1.77;
    return (
      <div
        className="w-full relative overflow-hidden"
        style={{
          aspectRatio: ratio,
        }}
      >
        <div className="absolute inset-0 flex flex-col gap-2">
          {(node.children ?? []).map((child) => (
            <RenderNode key={child.id} node={child} runAction={runAction} />
          ))}
        </div>
      </div>
    );
  }

  if (node.type === "pagination") {
    return <RenderPagination node={node} />;
  }

  if (node.type === "list") {
    const title = stringStyle(node.props.title) ?? "";
    const itemsText = stringStyle(node.props.items) ?? "Item 1\nItem 2\nItem 3";
    const items = itemsText.split("\n").filter(Boolean);
    const ordered = node.props.ordered === true;
    const showDividers = node.props.showDividers === true;
    const fontSize = numberStyle(style.fontSize) ?? 14;
    const fontWeight = stringStyle(style.fontWeight) ?? "400";
    const color = stringStyle(style.color) ?? "#111827";
    const fontFamily = stringStyle(style.fontFamily) ?? "sans-serif";
    const gap = style.gap !== undefined ? Number(style.gap) : 8;

    return (
      <div
        className="w-full flex flex-col"
        style={{
          backgroundColor: stringStyle(style.backgroundColor),
          borderRadius: numberStyle(style.borderRadius),
          borderWidth: numberStyle(style.borderWidth),
          borderColor: stringStyle(style.borderColor),
          borderStyle: style.borderWidth ? "solid" : undefined,
          flexShrink: 0,
          ...resolveRendererStyles(style, "list"),
        }}
      >
        {title ? (
          <h4
            className="font-semibold mb-2"
            style={{
              fontSize: fontSize + 2,
              color,
              fontFamily,
            }}
          >
            {title}
          </h4>
        ) : null}
        <div className="flex flex-col" style={{ gap: showDividers ? 0 : gap }}>
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col w-full">
              <div
                className="flex items-start"
                style={{
                  paddingTop: showDividers && idx > 0 ? gap : 0,
                  paddingBottom: showDividers && idx < items.length - 1 ? gap : 0,
                }}
              >
                {ordered ? (
                  <span
                    className="font-medium mr-2 shrink-0 select-none"
                    style={{ fontSize, color, opacity: 0.6, fontFamily }}
                  >
                    {idx + 1}.
                  </span>
                ) : (
                  <span
                    className="mr-2 shrink-0 select-none"
                    style={{ fontSize, color, opacity: 0.5, fontFamily }}
                  >
                    •
                  </span>
                )}
                <span
                  style={{
                    fontSize,
                    fontWeight,
                    color,
                    fontFamily,
                    flex: 1,
                  }}
                >
                  {item}
                </span>
              </div>
              {showDividers && idx < items.length - 1 ? (
                <div
                  className="w-full h-px"
                  style={{
                    backgroundColor: "#e4e4e7",
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export function MiniAppRenderer({ miniApp, themeMode = "light" }: MiniAppRendererProps) {
  const [currentScreenId, setCurrentScreenId] = useState(miniApp.entryScreenId);
  const [history, setHistory] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCurrentScreenId(miniApp.entryScreenId);
    setHistory([]);
  }, [miniApp.id, miniApp.entryScreenId]);

  const resolvedMiniApp = useMemo(() => {
    const theme = miniApp.theme ?? themePresets.default;
    return {
      ...miniApp,
      screens: miniApp.screens.map((screen) => ({
        ...screen,
        nodes: screen.nodes.map((node) => resolveNodeTheme(node, theme, themeMode)),
      })),
    };
  }, [miniApp, themeMode]);

  const activeTheme = useMemo(() => {
    const theme = miniApp.theme ?? themePresets.default;
    return theme[themeMode] ?? theme.light;
  }, [miniApp.theme, themeMode]);

  const screen = useMemo(
    () => resolvedMiniApp.screens.find((candidate) => candidate.id === currentScreenId) ?? resolvedMiniApp.screens[0],
    [currentScreenId, resolvedMiniApp.screens],
  );

  const runAction = (action: MiniAppAction | undefined) => {
    if (!action) {
      return;
    }

    if (action.type === "navigate") {
      setHistory((previous) => [...previous, currentScreenId]);
      setCurrentScreenId(action.screenId);
      return;
    }

    if (action.type === "goBack") {
      setHistory((previous) => {
        const next = [...previous];
        const previousScreenId = next.pop();
        if (previousScreenId) {
          setCurrentScreenId(previousScreenId);
        }
        return next;
      });
      return;
    }

    if (action.type === "showToast" || action.type === "showAlert") {
      setToast(action.message);
      window.setTimeout(() => setToast(null), 2200);
    }
  };

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden p-5 transition-colors duration-200"
      style={{
        backgroundColor: activeTheme.colors.background,
        color: activeTheme.colors.text,
      }}
    >
      <div
        className="mb-4 text-xs font-semibold uppercase tracking-wide shrink-0 transition-colors"
        style={{ color: activeTheme.colors.mutedText }}
      >
        {screen?.name}
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-0.5">
        {screen?.nodes.map((node) => <RenderNode key={node.id} node={node} runAction={runAction} />)}
      </div>
      {toast ? (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
