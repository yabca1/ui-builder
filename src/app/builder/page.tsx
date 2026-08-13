"use client";

import { useState } from "react";
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { BuilderCanvas } from "@/features/builder/components/BuilderCanvas";
import { BuilderToolbar } from "@/features/builder/components/BuilderToolbar";
import { ComponentPalette } from "@/features/builder/components/ComponentPalette";
import { PropertyInspector } from "@/features/builder/components/PropertyInspector";
import { ResizableScreenFrame } from "@/features/builder/components/ResizableScreenFrame";
import { ScreenManager } from "@/features/builder/components/ScreenManager";
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

  return (
    <main className="builder-grid flex min-w-0 flex-1 flex-col items-center overflow-auto p-3 sm:p-4 xl:p-6">
      <div className="mb-4 rounded-full border border-teal-100 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
        Preview
      </div>
      <ResizableScreenFrame className="bg-white" contentClassName="overflow-hidden">
        <MiniAppRenderer miniApp={miniApp} />
      </ResizableScreenFrame>
    </main>
  );
}

type TabType = "components" | "screens" | "settings" | "help";

type ToolRailProps = {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
};

function ToolRail({ activeTab, setActiveTab }: ToolRailProps) {
  const tabs = [
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
    <nav className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-200 bg-slate-50/80 px-2 py-2 xl:w-16 xl:flex-col xl:border-r xl:border-b-0 xl:px-0 xl:py-4 select-none">
      <div className="mb-0 grid size-10 shrink-0 place-items-center rounded-xl bg-teal-600 text-base font-black text-white shadow-sm xl:mb-6">
        RN
      </div>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center size-12 shrink-0 rounded-xl transition gap-1 ${
              isActive
                ? "bg-teal-600 text-white shadow-md shadow-teal-900/10"
                : "text-slate-500 hover:bg-white hover:text-teal-700"
            }`}
            aria-label={tab.label}
            title={tab.label}
          >
            {tab.icon}
            <span className="text-[9px] font-medium leading-none">{tab.label}</span>
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
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Project Settings</h2>
      
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500">
        App Name
        <input
          value={miniApp.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500">
        App Version
        <input
          value={miniApp.version || "1.0.0"}
          onChange={(e) => updateAppVersion(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500">
        Entry Screen
        <select
          value={miniApp.entryScreenId}
          onChange={(e) => setEntryScreen(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        >
          {miniApp.screens.map((screen) => (
            <option key={screen.id} value={screen.id}>
              {screen.name}
            </option>
          ))}
        </select>
      </label>

      <div className="border-t border-slate-200 pt-4 mt-2">
        <button
          type="button"
          onClick={resetProject}
          className="w-full rounded-lg border border-rose-200 bg-white py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50"
        >
          Reset Entire Workspace
        </button>
      </div>
    </div>
  );
}

function HelpGuidePanel() {
  return (
    <div className="flex flex-col gap-4 p-4 text-slate-700">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Cheatsheet Guide</h2>
      <div className="flex flex-col gap-3 text-xs leading-relaxed">
        <div className="p-3 bg-teal-50 rounded-lg border border-teal-100/60">
          <p className="font-bold text-teal-800 mb-1">🧩 Drop Components</p>
          <p className="text-teal-900/80">Drag components from the Palette and drop them onto the center Phone Canvas.</p>
        </div>
        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100/60">
          <p className="font-bold text-indigo-800 mb-1">⚙️ Custom Styling</p>
          <p className="text-indigo-900/80">Select any element on the Canvas to adjust its custom properties in the Inspector.</p>
        </div>
        <div className="p-3 bg-violet-50 rounded-lg border border-violet-100/60">
          <p className="font-bold text-violet-800 mb-1">📄 Multiple Screens</p>
          <p className="text-violet-900/80">Create new pages under the Screens tab, and use button Navigate actions to route between them.</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="font-bold text-slate-800 mb-1">⚡ Interactive Preview</p>
          <p className="text-slate-900/80">Switch to Preview mode in the toolbar to test sliders, switches, and checkboxes live.</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100/60">
          <p className="font-bold text-emerald-800 mb-1">📱 Export React Native</p>
          <p className="text-emerald-900/80">Click Export RN or Export Expo to download a ready-to-run mobile template.</p>
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
      <div className="flex min-h-screen flex-col overflow-auto bg-[#f3f7f5] xl:h-screen xl:min-h-0 xl:overflow-hidden">
        <BuilderToolbar />
        <div className="flex min-h-0 flex-1 flex-col overflow-visible xl:flex-row xl:overflow-hidden">
          <ToolRail activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="w-full shrink-0 border-b border-slate-200 bg-white/95 xl:w-[300px] xl:overflow-auto xl:border-r xl:border-b-0">
            {activeTab === "components" && <ComponentPalette />}
            {activeTab === "screens" && (
              <div className="p-4">
                <ScreenManager />
              </div>
            )}
            {activeTab === "settings" && <AppSettingsPanel />}
            {activeTab === "help" && <HelpGuidePanel />}
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
