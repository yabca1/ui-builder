"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";
import { componentRegistry } from "@/mini-app/registry/component-registry";
import type { MiniAppNode, ComponentType } from "@/mini-app/types/mini-app.types";
import { useActiveScreen, useBuilderStore } from "@/features/builder/store/builder.store";
import { ResizableScreenFrame } from "@/features/builder/components/ResizableScreenFrame";
import { findNode, canInsertNode } from "@/features/builder/utils/node-tree";
import { resolveNodeTheme, themePresets } from "@/mini-app/registry/theme-presets";

const containerTypes = ["container", "row", "column", "card", "scrollArea", "accordion", "tabs", "aspectRatio"];

function valueAsString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function valueAsNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function resolveEditorStyles(style: Record<string, any> | undefined, nodeType: string, parentDirection: "row" | "column"): React.CSSProperties {
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

  if (style.flex !== undefined) cssStyle.flex = style.flex;
  if (style.opacity !== undefined) cssStyle.opacity = style.opacity;
  if (style.position !== undefined) cssStyle.position = style.position as any;

  return cssStyle;
}

function NodePreview({ node }: { node: MiniAppNode }) {
  const style = node.style ?? {};

  if (node.type === "text") {
    return (
      <div
        style={{
          fontSize: valueAsNumber(style.fontSize, 16),
          fontWeight: valueAsString(style.fontWeight, "400"),
          color: valueAsString(style.color, "#111827"),
          textAlign: valueAsString(style.textAlign, "left") as React.CSSProperties["textAlign"],
          fontFamily: valueAsString(style.fontFamily, "sans-serif"),
          lineHeight: style.lineHeight ? `${style.lineHeight}px` : undefined,
          letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
          backgroundColor: valueAsString(style.backgroundColor, "transparent"),
          borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
          borderWidth: style.borderWidth ? `${style.borderWidth}px` : undefined,
          borderColor: valueAsString(style.borderColor, "transparent"),
          borderStyle: style.borderWidth ? "solid" : undefined,
        }}
      >
        {valueAsString(node.props.text, "Text")}
      </div>
    );
  }

  if (node.type === "button") {
    return (
      <div
        className="text-center font-semibold shadow-sm flex items-center justify-center"
        style={{
          backgroundColor: valueAsString(style.backgroundColor, "#2563eb"),
          color: valueAsString(style.textColor, "#ffffff"),
          borderRadius: valueAsNumber(style.borderRadius, 10),
          padding: valueAsNumber(style.padding, 12),
          borderWidth: valueAsNumber(style.borderWidth, 0),
          borderColor: valueAsString(style.borderColor, "transparent"),
          borderStyle: style.borderWidth ? "solid" : undefined,
          fontFamily: valueAsString(style.fontFamily, "sans-serif"),
          fontSize: valueAsNumber(style.fontSize, 14),
          fontWeight: valueAsString(style.fontWeight, "600"),
          minHeight: valueAsNumber(style.minHeight, 44),
          width: "100%",
        }}
      >
        {valueAsString(node.props.label, "Button")}
      </div>
    );
  }

  if (node.type === "input") {
    return (
      <div
        className="rounded-lg shadow-sm px-3 py-2 text-sm text-slate-400 flex items-center"
        style={{
          backgroundColor: valueAsString(style.backgroundColor, "#ffffff"),
          color: valueAsString(style.textColor, "#94a3b8"),
          borderRadius: valueAsNumber(style.borderRadius, 10),
          borderWidth: valueAsNumber(style.borderWidth, 1),
          borderColor: valueAsString(style.borderColor, "#cbd5e1"),
          borderStyle: "solid",
          fontSize: valueAsNumber(style.fontSize, 14),
          minHeight: valueAsNumber(style.minHeight, 44),
          width: "100%",
        }}
      >
        {valueAsString(node.props.placeholder, "Enter text")}
      </div>
    );
  }

  if (node.type === "image") {
    const src =
      valueAsString(node.props.sourceUrl) ||
      valueAsString(node.props.source) ||
      valueAsString(node.props.src) ||
      valueAsString(node.props.url) ||
      valueAsString(node.props.imageUrl);
    if (!src) {
      return (
        <div
          className="flex flex-col items-center justify-center bg-slate-100 text-slate-400 border border-dashed border-slate-300 shadow-sm"
          style={{
            width: valueAsNumber(style.width, 280),
            height: valueAsNumber(style.height, 160),
            borderRadius: valueAsNumber(style.borderRadius, 10),
          }}
        >
          <svg className="size-8 mb-1.5 opacity-60 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        className="max-w-full object-cover shadow-sm"
        style={{
          width: valueAsNumber(style.width, 280),
          height: valueAsNumber(style.height, 160),
          borderRadius: valueAsNumber(style.borderRadius, 10),
        }}
      />
    );
  }

  if (node.type === "badge") {
    const variant = valueAsString(node.props.variant, "default");
    let variantClasses = "bg-zinc-900 text-zinc-50";
    if (variant === "secondary") variantClasses = "bg-zinc-100 text-zinc-900";
    if (variant === "destructive") variantClasses = "bg-red-500 text-zinc-50";
    if (variant === "outline") variantClasses = "border border-zinc-200 text-zinc-900 bg-white";

    return (
      <div className="flex">
        <span
          className={clsx("inline-flex items-center px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2", variantClasses)}
          style={{
            borderRadius: valueAsNumber(style.borderRadius, 9999),
          }}
        >
          {valueAsString(node.props.text, "Badge")}
        </span>
      </div>
    );
  }

  if (node.type === "shape") {
    const shapeType = valueAsString(node.props.shapeType, "rectangle");
    const width = valueAsNumber(style.width, 100);
    const height = valueAsNumber(style.height, 100);
    const bg = valueAsString(style.backgroundColor, "#3b82f6");
    const stroke = valueAsString(style.borderColor, "transparent");
    const strokeWidth = valueAsNumber(style.borderWidth, 0);
    const rx = valueAsNumber(style.borderRadius, 0);

    let svgContent = null;
    if (shapeType === "rectangle") {
      svgContent = (
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={Math.max(1, width - strokeWidth)}
          height={Math.max(1, height - strokeWidth)}
          rx={rx}
          ry={rx}
          fill={bg}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    } else if (shapeType === "ellipse") {
      svgContent = (
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={Math.max(1, (width - strokeWidth) / 2)}
          ry={Math.max(1, (height - strokeWidth) / 2)}
          fill={bg}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    } else if (shapeType === "triangle") {
      const p1 = `${width / 2},${strokeWidth}`;
      const p2 = `${width - strokeWidth},${height - strokeWidth}`;
      const p3 = `${strokeWidth},${height - strokeWidth}`;
      svgContent = (
        <polygon
          points={`${p1} ${p2} ${p3}`}
          fill={bg}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    } else if (shapeType === "star") {
      const cx = width / 2;
      const cy = height / 2;
      const spikes = 5;
      const outerRadius = Math.max(1, (Math.min(width, height) - strokeWidth) / 2);
      const innerRadius = outerRadius * 0.4;
      
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;
      const points: string[] = [];

      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        points.push(`${x},${y}`);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        points.push(`${x},${y}`);
        rot += step;
      }

      svgContent = (
        <polygon
          points={points.join(" ")}
          fill={bg}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    } else if (shapeType === "line") {
      svgContent = (
        <line
          x1={strokeWidth}
          y1={height / 2}
          x2={width - strokeWidth}
          y2={height / 2}
          stroke={bg}
          strokeWidth={Math.max(1, strokeWidth || 2)}
          strokeLinecap="round"
        />
      );
    }

    return (
      <svg
        width={width}
        height={height}
        style={{
          width,
          height,
          opacity: style.opacity !== undefined ? Number(style.opacity) : 1,
        }}
      >
        {svgContent}
      </svg>
    );
  }

  if (node.type === "alert") {
    const variant = valueAsString(node.props.variant, "default");
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
          borderRadius: valueAsNumber(style.borderRadius, 8),
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
          {valueAsString(node.props.title, "Alert Title")}
        </h5>
        <div className="text-xs opacity-90 leading-relaxed">
          {valueAsString(node.props.description, "Alert description goes here.")}
        </div>
      </div>
    );
  }

  if (node.type === "switch") {
    const checked = Boolean(node.props.checked);
    return (
      <div className="flex items-center space-x-2 py-1">
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
          {valueAsString(node.props.label, "Toggle state")}
        </span>
      </div>
    );
  }

  if (node.type === "slider") {
    const min = valueAsNumber(node.props.min, 0);
    const max = valueAsNumber(node.props.max, 100);
    const val = valueAsNumber(node.props.defaultValue, 50);
    const percentage = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));

    return (
      <div className="w-full py-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-700">{valueAsString(node.props.label, "Slider")}</span>
          <span className="text-xs text-zinc-500 font-mono">{val}</span>
        </div>
        <div className="relative flex w-full touch-none select-none items-center py-1">
          <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-zinc-100">
            <div
              className="absolute h-full bg-zinc-900"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div
            className="absolute h-5 w-5 rounded-full border border-zinc-200 bg-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
            style={{ left: `calc(${percentage}% - 10px)` }}
          />
        </div>
      </div>
    );
  }

  if (node.type === "progress") {
    const value = valueAsNumber(node.props.value, 60);
    const max = valueAsNumber(node.props.max, 100);
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
    const size = valueAsNumber(style.size, 40);
    const src =
      valueAsString(node.props.sourceUrl) ||
      valueAsString(node.props.source) ||
      valueAsString(node.props.src) ||
      valueAsString(node.props.url) ||
      valueAsString(node.props.imageUrl);
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
            {valueAsString(node.props.fallbackText, "CN")}
          </div>
        )}
      </div>
    );
  }

  if (node.type === "checkbox") {
    const checked = Boolean(node.props.checked);
    return (
      <div className="flex items-center space-x-2 py-1">
        <div
          className={clsx(
            "h-4 w-4 shrink-0 rounded-sm border border-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50",
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
          {valueAsString(node.props.label, "Checkbox Label")}
        </span>
      </div>
    );
  }

  if (node.type === "textarea") {
    return (
      <div
        className="rounded-lg shadow-sm px-3 py-2 text-sm text-slate-400 min-h-20 w-full"
        style={{
          backgroundColor: valueAsString(style.backgroundColor, "#ffffff"),
          color: valueAsString(style.textColor, "#94a3b8"),
          borderRadius: valueAsNumber(style.borderRadius, 10),
          borderWidth: valueAsNumber(style.borderWidth, 1),
          borderColor: valueAsString(style.borderColor, "#cbd5e1"),
          borderStyle: "solid",
        }}
      >
        {valueAsString(node.props.placeholder, "Type your message here...")}
      </div>
    );
  }

  if (node.type === "label") {
    return (
      <label
        style={{
          fontSize: valueAsNumber(style.fontSize, 14),
          fontWeight: valueAsString(style.fontWeight, "500"),
          color: valueAsString(style.color, "#374151"),
          fontFamily: valueAsString(style.fontFamily, "sans-serif"),
        }}
      >
        {valueAsString(node.props.text, "Form Label")}
      </label>
    );
  }

  if (node.type === "heading") {
    const level = valueAsNumber(node.props.level, 1);
    const size = level === 1 ? 24 : level === 2 ? 20 : level === 3 ? 18 : 16;
    const styleFontSize = style.fontSize;
    const finalSize = (styleFontSize === 24 && level !== 1) ? size : valueAsNumber(styleFontSize, size);
    return (
      <div
        style={{
          fontSize: finalSize,
          fontWeight: valueAsString(style.fontWeight, "700"),
          color: valueAsString(style.color, "#111827"),
          textAlign: valueAsString(style.textAlign, "left") as React.CSSProperties["textAlign"],
          fontFamily: valueAsString(style.fontFamily, "sans-serif"),
          lineHeight: style.lineHeight ? `${style.lineHeight}px` : undefined,
          letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
        }}
      >
        {valueAsString(node.props.text, "Heading Content")}
      </div>
    );
  }

  if (node.type === "separator") {
    const isHorizontal = valueAsString(node.props.orientation, "horizontal") === "horizontal";
    const thickness = valueAsNumber(style.thickness, 1);
    const color = valueAsString(style.color, "#e4e4e7");
    return (
      <div
        style={{
          height: isHorizontal ? thickness : "100%",
          width: isHorizontal ? "100%" : thickness,
          minHeight: isHorizontal ? undefined : 20,
          backgroundColor: color,
        }}
      />
    );
  }

  if (node.type === "radioGroup") {
    const label = valueAsString(node.props.label, "Radio Label");
    const optionsText = valueAsString(node.props.options, "Option A\nOption B");
    const options = optionsText.split("\n").filter(Boolean);
    const selected = valueAsString(node.props.selectedValue, options[0] || "");

    return (
      <div className="flex flex-col gap-2 py-1 w-full">
        <span className="text-xs font-semibold text-zinc-500">{label}</span>
        {options.map((option, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <div
              className={clsx(
                "h-4 w-4 rounded-full border border-zinc-300 flex items-center justify-center",
                selected === option ? "border-zinc-900" : ""
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

  if (node.type === "pagination") {
    const cur = typeof node.props.currentPage === "number" ? node.props.currentPage : 1;
    const total = typeof node.props.totalPages === "number" ? node.props.totalPages : 5;
    const showEllipsis = node.props.showEllipsis !== false;

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

    // Deduplicate pages list
    const finalPages = Array.from(new Set(pages.map(String))).map(p => p === "..." ? "..." : Number(p));

    return (
      <div className="flex items-center justify-center gap-1.5 py-2 w-full select-none">
        <button
          type="button"
          className="px-2 py-1.5 text-xs font-semibold rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          &lt; Prev
        </button>
        {finalPages.map((p, idx) => {
          const isActive = p === cur;
          return (
            <button
              key={idx}
              type="button"
              className={clsx(
                "min-w-[28px] h-7 px-1 text-xs font-semibold rounded border transition flex items-center justify-center",
                isActive
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                  : p === "..."
                  ? "border-transparent bg-transparent text-slate-400 cursor-default"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          className="px-2 py-1.5 text-xs font-semibold rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          Next &gt;
        </button>
      </div>
    );
  }

  if (node.type === "skeleton") {
    return (
      <div
        className="animate-pulse bg-slate-200"
        style={{
          width: valueAsNumber(style.width, 200),
          height: valueAsNumber(style.height, 20),
          borderRadius: valueAsNumber(style.borderRadius, 4),
        }}
      />
    );
  }

  if (node.type === "list") {
    const title = valueAsString(node.props.title, "");
    const itemsText = valueAsString(node.props.items, "Item 1\nItem 2\nItem 3");
    const items = itemsText.split("\n").filter(Boolean);
    const ordered = node.props.ordered === true;
    const showDividers = node.props.showDividers === true;
    const fontSize = valueAsNumber(style.fontSize, 14);
    const fontWeight = valueAsString(style.fontWeight, "400");
    const color = valueAsString(style.color, "#111827");
    const fontFamily = valueAsString(style.fontFamily, "sans-serif");
    const gap = style.gap !== undefined ? Number(style.gap) : 8;

    return (
      <div
        className="w-full flex flex-col"
        style={{
          backgroundColor: valueAsString(style.backgroundColor, "transparent"),
          borderRadius: style.borderRadius ? Number(style.borderRadius) : undefined,
          borderWidth: style.borderWidth ? Number(style.borderWidth) : undefined,
          borderColor: style.borderColor ? String(style.borderColor) : undefined,
          borderStyle: style.borderWidth ? "solid" : undefined,
          padding: style.padding ? Number(style.padding) : undefined,
          margin: style.margin ? Number(style.margin) : undefined,
          opacity: style.opacity ? Number(style.opacity) : undefined,
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

function SortableNode({
  node,
  depth = 0,
  parentDirection = "column",
}: {
  node: MiniAppNode;
  depth?: number;
  parentDirection?: "row" | "column";
}) {
  const selectedNodeId = useBuilderStore((state) => state.selectedNodeId);
  const selectNode = useBuilderStore((state) => state.selectNode);
  const duplicateNode = useBuilderStore((state) => state.duplicateNode);
  const deleteNode = useBuilderStore((state) => state.deleteNode);
  const activeDragId = useBuilderStore((state) => state.activeDragId);
  const activeOverId = useBuilderStore((state) => state.activeOverId);
  const updateNodeStyle = useBuilderStore((state) => state.updateNodeStyle);
  const screen = useActiveScreen();

  const handleResizeStart = (e: React.MouseEvent, direction: "width" | "height" | "both") => {
    e.stopPropagation();
    e.preventDefault();

    const container = e.currentTarget.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const updates: Record<string, any> = {};

      if (direction === "width" || direction === "both") {
        updates.width = Math.max(20, Math.round(startWidth + deltaX));
      }
      if (direction === "height" || direction === "both") {
        updates.height = Math.max(20, Math.round(startHeight + deltaY));
      }

      updateNodeStyle(node.id, updates);
    };

    const handleResizeEnd = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleResizeEnd);
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: { source: "node" },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:container:${node.id}`,
    disabled: !componentRegistry[node.type].canHaveChildren,
  });

  const definition = componentRegistry[node.type];
  const isSelected = selectedNodeId === node.id;
  const nodeStyle = node.style ?? {};
  const direction =
    node.type === "row"
      ? "row"
      : node.type === "column"
        ? "column"
        : valueAsString(nodeStyle.direction, "vertical") === "horizontal" ? "row" : "column";
  const canHaveChildren = definition.canHaveChildren;
  const children = node.children ?? [];

  // Check drop target validity
  let isDropValid = true;
  if (activeDragId && isOver) {
    let nodeToInsert: MiniAppNode | null = null;
    if (activeDragId.startsWith("palette:")) {
      const type = activeDragId.replace("palette:", "") as ComponentType;
      nodeToInsert = { id: "temp-drag-id", type, props: {} };
    } else {
      nodeToInsert = findNode(screen.nodes, activeDragId);
    }
    if (nodeToInsert) {
      isDropValid = canInsertNode(screen.nodes, node.id, nodeToInsert);
    }
  }

  const isInsertionIndicatorActive = activeOverId === node.id && activeDragId !== node.id;

  const resolvedStyles = resolveEditorStyles(node.style, node.type, parentDirection);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        ...resolvedStyles,
      }}
      className={clsx(
        "group relative box-border rounded-lg border border-transparent bg-transparent p-0 transition",
        parentDirection === "row" ? "min-w-32 shrink-0" : (nodeStyle.width !== undefined ? "" : "w-full"),
        isDragging && "pointer-events-none",
      )}
      onClick={(event) => {
        event.stopPropagation();
        selectNode(node.id);
      }}
    >
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 z-20 transition",
          isSelected
            ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white"
            : "opacity-0 ring-1 ring-teal-400/80 group-hover:opacity-100",
        )}
        style={{
          borderRadius: nodeStyle.borderRadius !== undefined ? `${nodeStyle.borderRadius}px` : "8px",
        }}
      />

      {isInsertionIndicatorActive && (
        <div
          className={clsx(
            "absolute bg-indigo-500 z-30 pointer-events-none transition-all",
            parentDirection === "row"
              ? "left-0 top-0 bottom-0 w-1 rounded-full shadow-md shadow-indigo-500/50"
              : "top-0 left-0 right-0 h-1 rounded-full shadow-md shadow-indigo-500/50"
          )}
        />
      )}

      {isSelected && (
        <div className="absolute right-2 -top-3 z-30 flex items-center gap-1 rounded-md border border-indigo-600 bg-indigo-600 p-0.5 text-white shadow-md pointer-events-auto">
          <span
            className="cursor-grab rounded bg-indigo-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-100 hover:bg-indigo-800 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            {definition.label}
          </span>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold hover:bg-indigo-700"
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(node.id);
            }}
          >
            Copy
          </button>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold hover:bg-indigo-700 text-rose-200"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(node.id);
            }}
          >
            Delete
          </button>
        </div>
      )}

      {canHaveChildren && containerTypes.includes(node.type) ? (
        <div
          className={clsx(
            "w-full",
            node.type === "scrollArea" ? "overflow-hidden" : "overflow-visible",
            direction === "row" && "overflow-x-auto",
            ["container", "row", "column"].includes(node.type) && "flex rounded-lg border border-dashed border-slate-200",
            node.type === "card" && "flex flex-col border border-slate-200 shadow-sm bg-white rounded-xl",
            node.type === "scrollArea" && "flex flex-col border border-slate-200 bg-slate-50/50 rounded-lg overflow-y-auto",
            node.type === "accordion" && "flex flex-col border border-slate-200 bg-white rounded-lg",
            node.type === "tabs" && "flex flex-col border border-slate-200 bg-white rounded-lg",
            node.type === "aspectRatio" && "flex flex-col border border-dashed border-slate-200 bg-slate-50/50 rounded-lg"
          )}
          style={{
            height: node.type === "scrollArea" ? valueAsNumber(nodeStyle.height, 200) : undefined,
            minHeight: definition.minEditorSize?.height,
            aspectRatio: node.type === "aspectRatio" ? valueAsNumber(node.props.ratio, 1.77) : undefined,
            backgroundColor: ["container", "row", "column", "card"].includes(node.type) ? valueAsString(nodeStyle.backgroundColor, "transparent") : undefined,
            borderRadius: ["container", "row", "column", "card"].includes(node.type) ? valueAsNumber(nodeStyle.borderRadius, 0) : undefined,
            borderColor: node.type === "card" ? valueAsString(nodeStyle.borderColor, "#e4e4e7") : undefined,
            borderWidth: node.type === "card" ? valueAsNumber(nodeStyle.borderWidth, 1) : undefined,
          }}
        >
          {node.type === "card" && children.length === 0 && (
            <div className="border-b border-slate-100 p-4">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                {valueAsString(node.props.title, "Card Title")}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {valueAsString(node.props.description, "Card Description")}
              </p>
            </div>
          )}
          {node.type === "accordion" && (
            <div className="flex justify-between items-center px-4 py-3 bg-slate-50/80 border-b border-slate-100 font-semibold text-slate-700 text-xs select-none">
              <span>{valueAsString(node.props.title, "Accordion Item")}</span>
              <span>▼</span>
            </div>
          )}
          {node.type === "tabs" && (
            <div className="flex border-b border-slate-200 bg-slate-50/50 p-1 gap-1">
              {valueAsString(node.props.tabs, "Tab 1\nTab 2")
                .split("\n")
                .filter(Boolean)
                .map((tab, idx) => (
                  <span
                    key={idx}
                    className={clsx(
                      "px-3 py-1.5 text-xs font-semibold rounded-md border transition cursor-pointer",
                      idx === 0
                        ? "bg-white border-slate-200 text-slate-900 shadow-sm"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    )}
                  >
                    {tab}
                  </span>
                ))}
            </div>
          )}
          <div
            ref={setDropRef}
            className={clsx(
              "relative flex grow w-full box-border",
              direction === "row" ? "overflow-x-auto overflow-y-visible" : "overflow-visible",
              isOver ? (isDropValid ? "bg-teal-50/80 outline outline-2 outline-teal-400 outline-offset-[-2px]" : "bg-rose-50/80 outline outline-2 outline-rose-400 outline-offset-[-2px]") : ""
            )}
            style={{
              flexDirection: direction,
              gap: valueAsNumber(nodeStyle.gap, 12),
              padding: ["container", "row", "column", "card"].includes(node.type) ? valueAsNumber(nodeStyle.padding, 8) : 8,
              marginLeft: depth ? 4 : 0,
              minHeight: Math.max(48, definition.minEditorSize?.height ?? 48),
            }}
          >
            <SortableContext items={children.map((child) => child.id)} strategy={rectSortingStrategy}>
              {children.length === 0 ? (
                <div className="grid min-h-12 w-full place-items-center rounded-md border border-dashed border-slate-300 bg-white/70 px-3 py-4 text-center text-xs font-semibold text-slate-400">
                  Drop components here
                </div>
              ) : (
                children.map((child) => (
                  <SortableNode key={child.id} node={child} depth={depth + 1} parentDirection={direction} />
                ))
              )}
            </SortableContext>
          </div>
        </div>
      ) : (
        <div className="min-w-0 max-w-full overflow-hidden rounded-md bg-white">
          <NodePreview node={node} />
        </div>
      )}
      {isSelected && (
        <>
          {/* Edge drag zones (larger hit area) */}
          <div
            className="absolute -right-1 top-0 bottom-0 w-2.5 cursor-ew-resize z-30"
            onMouseDown={(e) => handleResizeStart(e, "width")}
          />
          <div
            className="absolute -bottom-1 left-0 right-0 h-2.5 cursor-ns-resize z-30"
            onMouseDown={(e) => handleResizeStart(e, "height")}
          />
          <div
            className="absolute -bottom-1 -right-1 size-3.5 cursor-nwse-resize z-30"
            onMouseDown={(e) => handleResizeStart(e, "both")}
          />

          {/* Visual handles */}
          <div className="pointer-events-none absolute -right-[4px] top-1/2 -translate-y-1/2 size-2 rounded-full border border-indigo-600 bg-white shadow-sm z-40" />
          <div className="pointer-events-none absolute -bottom-[4px] left-1/2 -translate-x-1/2 size-2 rounded-full border border-indigo-600 bg-white shadow-sm z-40" />
          <div className="pointer-events-none absolute -bottom-[4px] -right-[4px] size-2 rounded-full border border-indigo-600 bg-white shadow-sm z-40" />
        </>
      )}
    </div>
  );
}

export function BuilderCanvas() {
  const screen = useActiveScreen();
  const selectNode = useBuilderStore((state) => state.selectNode);
  const zoom = useBuilderStore((state) => state.zoom);
  const screenSize = useBuilderStore((state) => state.screenSize);
  const miniApp = useBuilderStore((state) => state.miniApp);
  const themeMode = useBuilderStore((state) => state.themeMode);
  const { setNodeRef, isOver } = useDroppable({ id: "drop:canvas" });

  const resolvedNodes = useMemo(() => {
    const theme = (miniApp.theme && Object.keys(miniApp.theme).length > 0) ? miniApp.theme : themePresets.default;
    return screen.nodes.map((node) => resolveNodeTheme(node, theme, themeMode));
  }, [screen.nodes, miniApp.theme, themeMode]);

  const activeTheme = useMemo(() => {
    const theme = (miniApp.theme && Object.keys(miniApp.theme).length > 0) ? miniApp.theme : themePresets.default;
    return theme[themeMode] ?? theme.light;
  }, [miniApp.theme, themeMode]);

  return (
    <main className="builder-grid flex min-w-0 flex-1 flex-col items-center overflow-auto bg-slate-100/70 dark:bg-slate-950/20 p-4 sm:p-6 xl:p-8 transition-colors duration-150">
      <div className="mb-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 shadow-sm select-none">
        {screen.name}
      </div>
      <div
        className="flex items-center justify-center p-8 shrink-0 transition-all"
        style={{
          width: `${screenSize.width * zoom}px`,
          height: `${screenSize.height * zoom}px`,
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            width: `${screenSize.width}px`,
            height: `${screenSize.height}px`,
            transition: "transform 0.15s ease-out",
          }}
          className="shrink-0"
        >
          <ResizableScreenFrame
            className="transition-colors duration-200"
            contentClassName="overflow-auto p-4"
            isHighlighted={isOver}
            onClick={() => selectNode(null)}
          >
            <div ref={setNodeRef} className="min-h-full transition-colors duration-200" style={{ backgroundColor: activeTheme.colors.background }}>
              <SortableContext items={resolvedNodes.map((node) => node.id)} strategy={rectSortingStrategy}>
                <div className="flex min-h-full flex-col gap-3">
                  {resolvedNodes.length === 0 ? (
                    <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 text-sm font-semibold text-slate-400 dark:text-slate-500">
                      Drop components here
                    </div>
                  ) : (
                    resolvedNodes.map((node) => <SortableNode key={node.id} node={node} />)
                  )}
                </div>
              </SortableContext>
            </div>
          </ResizableScreenFrame>
        </div>
      </div>
    </main>
  );
}
