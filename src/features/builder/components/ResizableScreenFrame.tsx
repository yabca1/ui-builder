"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { useBuilderStore } from "@/features/builder/store/builder.store";

type ResizeDirection = "n" | "e" | "s" | "w" | "ne" | "nw" | "se" | "sw";

type ResizableScreenFrameProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  isHighlighted?: boolean;
  onClick?: () => void;
};

type DragState = {
  direction: ResizeDirection;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  renderedWidth: number;
  renderedHeight: number;
};

const edgeHandles: Array<{ direction: ResizeDirection; className: string; label: string }> = [
  {
    direction: "n",
    label: "Resize height from top",
    className: "left-8 right-8 top-[-8px] h-4 cursor-ns-resize",
  },
  {
    direction: "s",
    label: "Resize height from bottom",
    className: "bottom-[-8px] left-8 right-8 h-4 cursor-ns-resize",
  },
  {
    direction: "e",
    label: "Resize width from right",
    className: "bottom-8 right-[-8px] top-8 w-4 cursor-ew-resize",
  },
  {
    direction: "w",
    label: "Resize width from left",
    className: "bottom-8 left-[-8px] top-8 w-4 cursor-ew-resize",
  },
];

const cornerHandles: Array<{ direction: ResizeDirection; className: string; label: string }> = [
  {
    direction: "nw",
    label: "Resize from top left",
    className: "left-[-9px] top-[-9px] cursor-nwse-resize",
  },
  {
    direction: "ne",
    label: "Resize from top right",
    className: "right-[-9px] top-[-9px] cursor-nesw-resize",
  },
  {
    direction: "se",
    label: "Resize from bottom right",
    className: "bottom-[-9px] right-[-9px] cursor-nwse-resize",
  },
  {
    direction: "sw",
    label: "Resize from bottom left",
    className: "bottom-[-9px] left-[-9px] cursor-nesw-resize",
  },
];

export function ResizableScreenFrame({
  children,
  className,
  contentClassName,
  isHighlighted,
  onClick,
}: ResizableScreenFrameProps) {
  const screenSize = useBuilderStore((state) => state.screenSize);
  const setScreenSize = useBuilderStore((state) => state.setScreenSize);
  const scaleToFit = useBuilderStore((state) => state.scaleToFit);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [activeDirection, setActiveDirection] = useState<ResizeDirection | null>(null);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      event.preventDefault();
      const scaleX = drag.renderedWidth > 0 ? drag.startWidth / drag.renderedWidth : 1;
      const scaleY = drag.renderedHeight > 0 ? drag.startHeight / drag.renderedHeight : 1;
      const deltaX = (event.clientX - drag.startX) * scaleX;
      const deltaY = (event.clientY - drag.startY) * scaleY;

      let width = drag.startWidth;
      let height = drag.startHeight;

      if (drag.direction.includes("e")) {
        width = drag.startWidth + deltaX;
      }
      if (drag.direction.includes("w")) {
        width = drag.startWidth - deltaX;
      }
      if (drag.direction.includes("s")) {
        height = drag.startHeight + deltaY;
      }
      if (drag.direction.includes("n")) {
        height = drag.startHeight - deltaY;
      }

      setScreenSize({ width, height });
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      setActiveDirection(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [setScreenSize]);

  const startResize = (event: React.PointerEvent<HTMLButtonElement>, direction: ResizeDirection) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      direction,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: screenSize.width,
      startHeight: screenSize.height,
      renderedWidth: rect.width,
      renderedHeight: rect.height,
    };
    setActiveDirection(direction);
    document.body.style.cursor = event.currentTarget.style.cursor;
    document.body.style.userSelect = "none";
  };

  const baseWidth = 390;
  const scaleFactor = scaleToFit ? screenSize.width / baseWidth : 1;

  return (
    <div className="relative shrink-0">
      <div
        ref={frameRef}
        className={clsx(
          "relative shrink-0 rounded-[30px] border-[8px] border-neutral-950 shadow-[0_28px_80px_rgba(15,23,42,0.24)] sm:rounded-[34px] sm:border-[10px]",
          isHighlighted && "bg-indigo-50",
          className,
        )}
        style={{
          width: `${screenSize.width}px`,
          height: `${screenSize.height}px`,
          overflow: scaleToFit ? "hidden" : undefined,
        }}
        onClick={onClick}
      >
        <div
          className={clsx("h-full w-full relative", contentClassName)}
          style={{ width: "100%", height: "100%" }}
        >
          {children}
        </div>
      </div>

      <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-teal-100 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-500 shadow-sm z-30 pointer-events-auto select-none">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setScreenSize({ width: 240, height: 360 });
          }}
          title="Minimize screen size (240 × 360)"
          className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600 transition"
        >
          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14h6v-6M20 10h-6v6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setScreenSize({ width: 390, height: 844 });
          }}
          title="Reset to default size (390 x 844)"
          className="rounded px-1.5 py-0.5 text-[9px] text-slate-400 hover:bg-slate-100 hover:text-teal-600 transition font-bold"
        >
          Reset
        </button>
        <span className="px-1 text-slate-600 font-semibold">
          {screenSize.width} x {screenSize.height}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setScreenSize({ width: 1024, height: 1366 });
          }}
          title="Maximize screen size (1024 × 1366)"
          className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-teal-600 transition"
        >
          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
          </svg>
        </button>
      </div>

      {edgeHandles.map((handle) => (
        <button
          key={handle.direction}
          type="button"
          aria-label={handle.label}
          onPointerDown={(event) => startResize(event, handle.direction)}
          className={clsx(
            "absolute z-40 rounded-full outline-none touch-none",
            "after:absolute after:left-1/2 after:top-1/2 after:block after:h-1.5 after:w-8 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-teal-500/70 after:opacity-0 after:transition",
            "hover:after:opacity-100 focus-visible:after:opacity-100",
            activeDirection === handle.direction && "after:opacity-100",
            handle.className,
          )}
        />
      ))}

      {cornerHandles.map((handle) => (
        <button
          key={handle.direction}
          type="button"
          aria-label={handle.label}
          onPointerDown={(event) => startResize(event, handle.direction)}
          className={clsx(
            "absolute z-50 size-[18px] rounded-full border-2 border-white bg-teal-500 shadow-md outline-none transition touch-none",
            "hover:scale-110 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-teal-200",
            activeDirection === handle.direction && "scale-110 ring-2 ring-teal-200",
            handle.className,
          )}
        />
      ))}
    </div>
  );
}
