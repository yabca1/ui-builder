"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { componentRegistry } from "@/mini-app/registry/component-registry";
import type { ComponentType } from "@/mini-app/types/mini-app.types";

const categoryLabels: Record<(typeof componentRegistry)[ComponentType]["category"], string> = {
  layout: "Layout",
  typography: "Typography",
  forms: "Forms",
  media: "Media",
  feedback: "Feedback",
  interactive: "Interactive",
};

const categoryOrder = ["layout", "typography", "forms", "media", "feedback", "interactive"] as const;

function PaletteItem({ type }: { type: ComponentType }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `palette:${type}`,
    data: { type, source: "palette" },
  });
  const definition = componentRegistry[type];

  return (
    <button
      ref={setNodeRef}
      type="button"
      className="flex h-9 w-full cursor-grab items-center justify-between rounded-md border border-transparent bg-white dark:bg-slate-900 px-2.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-350 transition hover:border-teal-200 dark:hover:border-teal-800 hover:bg-teal-50/60 dark:hover:bg-slate-800 hover:text-teal-800 dark:hover:text-teal-400 active:cursor-grabbing"
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      {...listeners}
      {...attributes}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="grid size-5 shrink-0 place-items-center rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[10px] uppercase text-slate-500 dark:text-slate-400">
          {definition.icon.slice(0, 1)}
        </span>
        <span className="truncate">{definition.label}</span>
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">drag</span>
    </button>
  );
}

export function ComponentPalette() {
  const [search, setSearch] = useState("");
  
  const types = (Object.keys(componentRegistry) as ComponentType[])
    .filter((type) =>
      componentRegistry[type].label.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const labelA = componentRegistry[a].label.toLowerCase();
      const labelB = componentRegistry[b].label.toLowerCase();
      return labelA.localeCompare(labelB);
    });

  const groupedTypes = categoryOrder
    .map((category) => ({
      category,
      types: types.filter((type) => componentRegistry[type].category === category),
    }))
    .filter((group) => group.types.length > 0);

  return (
    <section className="p-3 sm:p-4">
      <input
        aria-label="Search components"
        placeholder="Search components..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 focus:border-teal-300 dark:focus:border-teal-700 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900/20"
      />
      <div className="flex flex-col gap-4">
        {groupedTypes.map((group) => (
          <div key={group.category}>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-450">
              {categoryLabels[group.category]}
            </h2>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5 xl:flex xl:flex-col">
              {group.types.map((type) => (
                <PaletteItem key={type} type={type} />
              ))}
            </div>
          </div>
        ))}
        {types.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-6 text-center text-xs font-medium text-slate-400 dark:text-slate-550 animate-pulse">
            No components found
          </p>
        )}
      </div>
    </section>
  );
}
