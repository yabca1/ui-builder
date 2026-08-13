"use client";

import { useBuilderStore } from "@/features/builder/store/builder.store";
import { componentRegistry } from "@/mini-app/registry/component-registry";
import type { MiniAppNode } from "@/mini-app/types/mini-app.types";

function nodeLabel(node: MiniAppNode) {
  if (node.type === "text" || node.type === "heading" || node.type === "label") {
    return String(node.props.text ?? componentRegistry[node.type].label);
  }

  if (node.type === "button") {
    return String(node.props.label ?? componentRegistry[node.type].label);
  }

  return componentRegistry[node.type].label;
}

function LayerNode({ node, depth = 0 }: { node: MiniAppNode; depth?: number }) {
  const selectedNodeId = useBuilderStore((state) => state.selectedNodeId);
  const selectNode = useBuilderStore((state) => state.selectNode);
  const isSelected = selectedNodeId === node.id;
  const hasChildren = Boolean(node.children?.length);

  return (
    <div>
      <button
        type="button"
        onClick={() => selectNode(node.id)}
        className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-semibold transition ${
          isSelected ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <span className="w-3 shrink-0 text-[10px] text-slate-400">{hasChildren ? "v" : ""}</span>
        <span className="shrink-0 text-[10px] uppercase text-slate-400">{componentRegistry[node.type].icon.slice(0, 1)}</span>
        <span className="min-w-0 truncate">{nodeLabel(node)}</span>
      </button>
      {node.children?.map((child) => (
        <LayerNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function ScreenManager() {
  const miniApp = useBuilderStore((state) => state.miniApp);
  const activeScreenId = useBuilderStore((state) => state.activeScreenId);
  const createScreen = useBuilderStore((state) => state.createScreen);
  const renameScreen = useBuilderStore((state) => state.renameScreen);
  const deleteScreen = useBuilderStore((state) => state.deleteScreen);
  const setEntryScreen = useBuilderStore((state) => state.setEntryScreen);
  const switchScreen = useBuilderStore((state) => state.switchScreen);
  const activeScreen = miniApp.screens.find((screen) => screen.id === activeScreenId) ?? miniApp.screens[0];

  return (
    <section className="mt-2">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Screens</h2>
        <button type="button" onClick={createScreen} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800">
          New
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-col">
        {miniApp.screens.map((screen) => (
          <div key={screen.id} className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm shadow-slate-200/70">
            <button
              type="button"
              onClick={() => switchScreen(screen.id)}
              className={`mb-2 w-full rounded-md px-2 py-1.5 text-left text-sm font-semibold ${
                activeScreenId === screen.id ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {screen.name}
            </button>
            <input
              aria-label={`Rename ${screen.name}`}
              value={screen.name}
              onChange={(event) => renameScreen(screen.id, event.target.value)}
              className="mb-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-300 focus:bg-white"
            />
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1 text-xs font-medium text-slate-500">
                <input
                  type="radio"
                  checked={miniApp.entryScreenId === screen.id}
                  onChange={() => setEntryScreen(screen.id)}
                />
                Entry
              </label>
              <button
                type="button"
                disabled={miniApp.screens.length === 1}
                onClick={() => deleteScreen(screen.id)}
                className="rounded px-1.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:text-slate-300"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-slate-200 pt-4">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Layers</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-1">
          {activeScreen.nodes.length === 0 ? (
            <div className="px-2 py-5 text-center text-xs font-medium text-slate-400">No layers yet</div>
          ) : (
            activeScreen.nodes.map((node) => <LayerNode key={node.id} node={node} />)
          )}
        </div>
      </div>
    </section>
  );
}
