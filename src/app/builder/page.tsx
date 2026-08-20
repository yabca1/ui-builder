"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { BuilderCanvas } from "@/features/builder/components/BuilderCanvas";
import { BuilderToolbar } from "@/features/builder/components/BuilderToolbar";
import { ComponentPalette } from "@/features/builder/components/ComponentPalette";
import { PropertyInspector } from "@/features/builder/components/PropertyInspector";
import { ResizableScreenFrame } from "@/features/builder/components/ResizableScreenFrame";
import { ScreenManager } from "@/features/builder/components/ScreenManager";
import { ThemeManager } from "@/features/builder/components/ThemeManager";
import { ProjectManager } from "@/features/builder/components/ProjectManager";
import { AutosaveManager } from "@/features/builder/components/AutosaveManager";
import { ApisPanel } from "@/features/builder/components/ApisPanel";
import { useActiveScreen, useBuilderStore } from "@/features/builder/store/builder.store";
import { findNode, findParentAndIndex, canInsertNode } from "@/features/builder/utils/node-tree";
import { componentRegistry } from "@/mini-app/registry/component-registry";
import { MiniAppRenderer } from "@/mini-app/renderer/MiniAppRenderer";
import type { ComponentType, MiniAppNode } from "@/mini-app/types/mini-app.types";

function isComponentType(value: string): value is ComponentType {
  return value in componentRegistry;
}

function nodeLabel(node: MiniAppNode) {
  if (node.type === "text" || node.type === "heading" || node.type === "label") {
    return String(node.props.text ?? componentRegistry[node.type].label);
  }

  if (node.type === "button") {
    return String(node.props.label ?? "Button");
  }

  if (node.type === "input" || node.type === "textarea") {
    return String(node.props.placeholder ?? componentRegistry[node.type].label);
  }

  return componentRegistry[node.type].label;
}

function DragGhost({ activeId, screenNodes }: { activeId: string | null; screenNodes: MiniAppNode[] }) {
  if (!activeId) {
    return null;
  }

  if (activeId.startsWith("palette:")) {
    const type = activeId.replace("palette:", "");
    if (!isComponentType(type)) {
      return null;
    }

    return (
      <div className="min-w-40 rounded-xl border border-teal-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 shadow-2xl shadow-slate-900/20 ring-4 ring-teal-100/80">
        {componentRegistry[type].label}
      </div>
    );
  }

  const node = findNode(screenNodes, activeId);
  if (!node) {
    return null;
  }

  return (
    <div className="min-w-44 max-w-64 rounded-xl border border-indigo-200 bg-white p-3 shadow-2xl shadow-slate-900/25 ring-4 ring-indigo-100/80">
      <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-500">
        {componentRegistry[node.type].label}
      </div>
      <div className="truncate text-sm font-semibold text-slate-800">{nodeLabel(node)}</div>
    </div>
  );
}

function PreviewPanel() {
  const miniApp = useBuilderStore((state) => state.miniApp);
  const themeMode = useBuilderStore((state) => state.themeMode);

  return (
    <main className="builder-grid dark:bg-slate-950 flex min-w-0 flex-1 flex-col items-center overflow-auto p-3 sm:p-4 xl:p-6 transition-colors duration-200">
      <div className="mb-4 rounded-full border border-teal-100 dark:border-teal-900/30 bg-white/90 dark:bg-slate-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 shadow-sm">
        Preview
      </div>
      <ResizableScreenFrame className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" contentClassName="overflow-hidden">
        <MiniAppRenderer miniApp={miniApp} themeMode={themeMode} />
      </ResizableScreenFrame>
    </main>
  );
}

type TabType = "projects" | "components" | "screens" | "apis" | "theme" | "settings" | "help";

type ToolRailProps = {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
};

function ToolRail({ activeTab, setActiveTab }: ToolRailProps) {
  const themeMode = useBuilderStore((state) => state.themeMode);
  const tabs = [
    {
      id: "projects" as TabType,
      label: "Projects",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: "components" as TabType,
      label: "Components",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      id: "screens" as TabType,
      label: "Screens",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 22V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18" />
          <path d="M10 6h4" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
        </svg>
      ),
    },
    {
      id: "apis" as TabType,
      label: "APIs",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
    },
    {
      id: "theme" as TabType,
      label: "Theme",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.02984 19.1713 5.28318 19.2604 5.5228 19.213C6.4784 19.0238 7.424 18.72 8.32 18.318C8.56391 18.2086 8.84752 18.229 9.07222 18.3719C9.99222 18.9572 10.9961 19.3872 12.054 19.6436C12.3146 19.7068 12.5 19.9388 12.5 20.2073V22" />
        </svg>
      ),
    },
    {
      id: "settings" as TabType,
      label: "Settings",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
    {
      id: "help" as TabType,
      label: "Guide",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-200/80 bg-white/70 px-2 py-2 shadow-sm shadow-slate-900/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 xl:w-[72px] xl:flex-col xl:border-r xl:border-b-0 xl:px-0 xl:py-4 select-none transition-colors duration-200">
      <div className="mb-0 grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-[11px] font-black tracking-tight text-white shadow-lg shadow-slate-950/15 ring-1 ring-white/20 dark:bg-white dark:text-slate-950 xl:mb-6">
        UI
      </div>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex size-[54px] xl:size-14 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl transition-all duration-200 ease-out hover:scale-[1.04] active:scale-[0.96] cursor-pointer ${
              isActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-650/20 dark:bg-indigo-500 dark:shadow-indigo-500/10"
                : "text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
            }`}
            aria-label={tab.label}
            title={tab.label}
          >
            {isActive && <span className="absolute left-1 top-1/2 hidden h-6 w-1 -translate-y-1/2 rounded-full bg-white/90 xl:block" />}
            {tab.icon}
            <span className="text-[9px] font-extrabold tracking-wide uppercase leading-none">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function AppSettingsPanel() {
  const miniApp = useBuilderStore((state) => state.miniApp);
  const setProjectName = useBuilderStore((state) => state.setProjectName);
  const setEntryScreen = useBuilderStore((state) => state.setEntryScreen);
  const resetProject = useBuilderStore((state) => state.resetProject);

  const updateAppVersion = (version: string) => {
    useBuilderStore.setState((state) => ({
      miniApp: { ...state.miniApp, version }
    }));
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-slate-700 dark:text-slate-300">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Project Settings</h2>
      
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        App Name
        <input
          value={miniApp.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        App Version
        <input
          value={miniApp.version || "1.0.0"}
          onChange={(e) => updateAppVersion(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        Entry Screen
        <select
          value={miniApp.entryScreenId}
          onChange={(e) => setEntryScreen(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-300 dark:focus:border-indigo-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
        >
          {miniApp.screens.map((screen) => (
            <option key={screen.id} value={screen.id} className="dark:bg-slate-900 dark:text-slate-100">
              {screen.name}
            </option>
          ))}
        </select>
      </label>

      <div className="border-t border-slate-200 dark:border-slate-850 pt-4 mt-2">
        <button
          type="button"
          onClick={resetProject}
          className="w-full rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 shadow-sm transition hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
        >
          Reset Entire Workspace
        </button>
      </div>
    </div>
  );
}

function HelpGuidePanel() {
  return (
    <div className="flex flex-col gap-4 p-4 text-slate-700 dark:text-slate-300">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cheatsheet Guide</h2>
      <div className="flex flex-col gap-3 text-xs leading-relaxed">
        <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-lg border border-teal-100/60 dark:border-teal-900/30">
          <p className="font-bold text-teal-800 dark:text-teal-400 mb-1">🧩 Drop Components</p>
          <p className="text-teal-900/80 dark:text-teal-300/80">Drag components from the Palette and drop them onto the center Phone Canvas.</p>
        </div>
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100/60 dark:border-indigo-900/30">
          <p className="font-bold text-indigo-800 dark:text-indigo-400 mb-1">⚙️ Custom Styling</p>
          <p className="text-indigo-900/80 dark:text-indigo-300/80">Select any element on the Canvas to adjust its custom properties in the Inspector.</p>
        </div>
        <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-100/60 dark:border-violet-900/30">
          <p className="font-bold text-violet-800 dark:text-violet-400 mb-1">📄 Multiple Screens</p>
          <p className="text-violet-900/80 dark:text-violet-300/80">Create new pages under the Screens tab, and use button Navigate actions to route between them.</p>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">⚡ Interactive Preview</p>
          <p className="text-slate-900/80 dark:text-slate-300/80">Switch to Preview mode in the toolbar to test sliders, switches, and checkboxes live.</p>
        </div>
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100/60 dark:border-emerald-900/30">
          <p className="font-bold text-emerald-800 dark:text-emerald-400 mb-1">📱 Export React Native</p>
          <p className="text-emerald-900/80 dark:text-emerald-300/80">Click Export RN or Export Expo to download a ready-to-run mobile template.</p>
        </div>
      </div>
    </div>
  );
}

function BuilderContent() {
  const [activeTab, setActiveTab] = useState<TabType>("components");
  const activeDragId = useBuilderStore((state) => state.activeDragId);
  const setActiveDragId = useBuilderStore((state) => state.setActiveDragId);
  const activeOverId = useBuilderStore((state) => state.activeOverId);
  const setActiveOverId = useBuilderStore((state) => state.setActiveOverId);
  const screen = useActiveScreen();
  const addNode = useBuilderStore((state) => state.addNode);
  const moveNode = useBuilderStore((state) => state.moveNode);
  const mode = useBuilderStore((state) => state.mode);
  const themeMode = useBuilderStore((state) => state.themeMode);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  const resolveDropTarget = (overId: string) => {
    if (overId === "drop:canvas") {
      return { parentId: null, index: screen.nodes.length };
    }

    if (overId.startsWith("drop:container:")) {
      const parentId = overId.replace("drop:container:", "");
      const parent = findNode(screen.nodes, parentId);
      return { parentId, index: parent?.children?.length ?? 0 };
    }

    const location = findParentAndIndex(screen.nodes, overId);
    return location ? { parentId: location.parentId, index: location.index } : null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    const activeId = String(event.active.id);
    setActiveDragId(null);
    if (!overId) {
      return;
    }

    const target = resolveDropTarget(overId);
    if (!target) {
      setActiveOverId(null);
      return;
    }

    // Check validity before inserting
    let nodeToInsert: MiniAppNode;
    if (activeId.startsWith("palette:")) {
      const type = activeId.replace("palette:", "");
      if (isComponentType(type)) {
        nodeToInsert = { id: "temp-drag-id", type, props: {} };
      } else {
        setActiveOverId(null);
        return;
      }
    } else {
      const found = findNode(screen.nodes, activeId);
      if (!found) {
        setActiveOverId(null);
        return;
      }
      nodeToInsert = found;
    }

    if (!canInsertNode(screen.nodes, target.parentId, nodeToInsert)) {
      setActiveOverId(null);
      return;
    }

    if (activeId.startsWith("palette:")) {
      const type = activeId.replace("palette:", "");
      if (isComponentType(type)) {
        addNode(type, target.parentId, target.index);
      }
      setActiveOverId(null);
      return;
    }

    moveNode(activeId, target.parentId, target.index);
    setActiveOverId(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragOver = (event: any) => {
    setActiveOverId(event.over?.id ? String(event.over.id) : null);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setActiveOverId(null);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <AutosaveManager />
      <div className={clsx("flex min-h-screen flex-col overflow-auto bg-[#f3f7f5] dark:bg-slate-950 xl:h-screen xl:min-h-0 xl:overflow-hidden transition-colors duration-200", themeMode === "dark" && "dark")}>
        <BuilderToolbar />
        <div className="flex min-h-0 flex-1 flex-col overflow-visible xl:flex-row xl:overflow-hidden">
          <ToolRail activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="w-full shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 xl:w-[350px] xl:border-r xl:border-b-0 flex flex-col h-full overflow-hidden transition-colors duration-200">
            {activeTab === "projects" && (
              <div className="p-4 overflow-y-auto h-full flex flex-col min-h-0">
                <ProjectManager />
              </div>
            )}
            {activeTab === "components" && (
              <div className="overflow-y-auto h-full">
                <ComponentPalette />
              </div>
            )}
            {activeTab === "screens" && (
              <div className="p-4 overflow-y-auto h-full flex flex-col min-h-0">
                <ScreenManager />
              </div>
            )}
            {activeTab === "apis" && (
              <ApisPanel />
            )}
            {activeTab === "theme" && <ThemeManager />}
            {activeTab === "settings" && (
              <div className="p-4 overflow-y-auto h-full">
                <AppSettingsPanel />
              </div>
            )}
            {activeTab === "help" && (
              <div className="p-4 overflow-y-auto h-full">
                <HelpGuidePanel />
              </div>
            )}
          </div>
          {mode === "edit" ? <BuilderCanvas /> : <PreviewPanel />}
          <PropertyInspector />
        </div>
      </div>
      <DragOverlay dropAnimation={null} zIndex={9999}>
        <DragGhost activeId={activeDragId} screenNodes={screen.nodes} />
      </DragOverlay>
    </DndContext>
  );
}

export default function BuilderPage() {
  return <BuilderContent />;
}
