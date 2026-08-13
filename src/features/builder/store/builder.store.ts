"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ComponentType, MiniApp, MiniAppAction, MiniAppNode } from "@/mini-app/types/mini-app.types";
import { canInsertNode, cloneNode, findNode, findParentAndIndex, insertNode, isDescendant, makeNode, removeNode, updateNode } from "@/features/builder/utils/node-tree";

type EditorMode = "edit" | "preview";

export type ScreenSize = {
  width: number;
  height: number;
};

type BuilderState = {
  miniApp: MiniApp;
  activeScreenId: string;
  screenSize: ScreenSize;
  scaleToFit: boolean;
  selectedNodeId: string | null;
  mode: EditorMode;
  validationErrors: string[];
  activeDragId: string | null;
  activeOverId: string | null;
  zoom: number;
  setActiveDragId: (id: string | null) => void;
  setActiveOverId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setMode: (mode: EditorMode) => void;
  setValidationErrors: (errors: string[]) => void;
  setScreenSize: (screenSize: ScreenSize) => void;
  setScaleToFit: (scaleToFit: boolean) => void;
  selectNode: (nodeId: string | null) => void;
  setProjectName: (name: string) => void;
  createScreen: () => void;
  renameScreen: (screenId: string, name: string) => void;
  deleteScreen: (screenId: string) => void;
  setEntryScreen: (screenId: string) => void;
  switchScreen: (screenId: string) => void;
  addNode: (type: ComponentType, parentId: string | null, index?: number) => void;
  moveNode: (nodeId: string, parentId: string | null, index: number) => void;
  duplicateNode: (nodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeProps: (nodeId: string, props: Record<string, unknown>) => void;
  updateNodeStyle: (nodeId: string, style: Record<string, unknown>) => void;
  updateNodeAction: (nodeId: string, action: MiniAppAction | null) => void;
  resetProject: () => void;
};

function sampleMiniApp(): MiniApp {
  const homeContainer = makeNode("container");
  const welcome = makeNode("text");
  const emailInput = makeNode("input");
  const openProfile = makeNode("button");
  const profileContainer = makeNode("container");
  const profileTitle = makeNode("text");
  const goHome = makeNode("button");

  welcome.props = { text: "Welcome" };
  welcome.style = { ...welcome.style, fontSize: 28, fontWeight: "700", textAlign: "center" };
  emailInput.props = { placeholder: "Email", defaultValue: "" };
  openProfile.props = { label: "Open Profile" };
  openProfile.events = { onPress: { type: "navigate", screenId: "profile" } };

  homeContainer.children = [welcome, emailInput, openProfile];
  homeContainer.style = { ...homeContainer.style, gap: 16, alignment: "stretch" };

  profileTitle.props = { text: "Profile" };
  profileTitle.style = { ...profileTitle.style, fontSize: 28, fontWeight: "700", textAlign: "center" };
  goHome.props = { label: "Go Home" };
  goHome.events = { onPress: { type: "goBack" } };
  profileContainer.children = [profileTitle, goHome];
  profileContainer.style = { ...profileContainer.style, gap: 16, alignment: "stretch" };

  return {
    id: "sample-mini-app",
    name: "Sample Mini App",
    version: "1.0.0",
    entryScreenId: "home",
    screens: [
      {
        id: "home",
        name: "Home",
        nodes: [homeContainer],
      },
      {
        id: "profile",
        name: "Profile",
        nodes: [profileContainer],
      },
    ],
  };
}

const defaultScreenSize: ScreenSize = {
  width: 390,
  height: 844,
};

function clampScreenSize(screenSize: ScreenSize): ScreenSize {
  const width = Number.isFinite(screenSize.width) ? screenSize.width : defaultScreenSize.width;
  const height = Number.isFinite(screenSize.height) ? screenSize.height : defaultScreenSize.height;

  return {
    width: Math.max(240, Math.min(1024, Math.round(width))),
    height: Math.max(360, Math.min(1366, Math.round(height))),
  };
}

function updateCurrentScreen(miniApp: MiniApp, activeScreenId: string, updater: (nodes: MiniAppNode[]) => MiniAppNode[]): MiniApp {
  return {
    ...miniApp,
    screens: miniApp.screens.map((screen) =>
      screen.id === activeScreenId ? { ...screen, nodes: updater(screen.nodes) } : screen,
    ),
  };
}

function activeScreen(miniApp: MiniApp, activeScreenId: string) {
  return miniApp.screens.find((screen) => screen.id === activeScreenId) ?? miniApp.screens[0];
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set) => ({
      miniApp: sampleMiniApp(),
      activeScreenId: "home",
      screenSize: defaultScreenSize,
      scaleToFit: true,
      selectedNodeId: null,
      mode: "edit",
      validationErrors: [],
      activeDragId: null,
      activeOverId: null,
      zoom: 1.0,
      setActiveDragId: (activeDragId) => set({ activeDragId }),
      setActiveOverId: (activeOverId) => set({ activeOverId }),
      setZoom: (zoom) => set({ zoom }),
      setMode: (mode) => set({ mode }),
      setValidationErrors: (validationErrors) => set({ validationErrors }),
      setScreenSize: (screenSize) => set({ screenSize: clampScreenSize(screenSize) }),
      setScaleToFit: (scaleToFit) => set({ scaleToFit }),
      selectNode: (selectedNodeId) => set({ selectedNodeId }),
      setProjectName: (name) =>
        set((state) => ({
          miniApp: { ...state.miniApp, name },
        })),
      createScreen: () => {
        const id = `screen-${crypto.randomUUID().slice(0, 8)}`;
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            screens: [...state.miniApp.screens, { id, name: "New Screen", nodes: [] }],
          },
          activeScreenId: id,
          selectedNodeId: null,
        }));
      },
      renameScreen: (screenId, name) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            screens: state.miniApp.screens.map((screen) => (screen.id === screenId ? { ...screen, name } : screen)),
          },
        })),
      deleteScreen: (screenId) =>
        set((state) => {
          if (state.miniApp.screens.length === 1) {
            return state;
          }

          const screens = state.miniApp.screens.filter((screen) => screen.id !== screenId);
          const nextEntryScreenId = state.miniApp.entryScreenId === screenId ? screens[0].id : state.miniApp.entryScreenId;
          const activeScreenId = state.activeScreenId === screenId ? screens[0].id : state.activeScreenId;

          return {
            miniApp: { ...state.miniApp, screens, entryScreenId: nextEntryScreenId },
            activeScreenId,
            selectedNodeId: null,
          };
        }),
      setEntryScreen: (screenId) =>
        set((state) => ({
          miniApp: { ...state.miniApp, entryScreenId: screenId },
          selectedNodeId: null,
        })),
      switchScreen: (screenId) =>
        set({ activeScreenId: screenId, selectedNodeId: null }),
      addNode: (type, parentId, index) =>
        set((state) => {
          const screen = activeScreen(state.miniApp, state.activeScreenId);
          const node = makeNode(type);
          if (!canInsertNode(screen.nodes, parentId, node)) {
            return state;
          }

          return {
            miniApp: updateCurrentScreen(state.miniApp, state.activeScreenId, (nodes) =>
              insertNode(nodes, parentId, index ?? (parentId ? findNode(nodes, parentId)?.children?.length ?? 0 : screen.nodes.length), node),
            ),
            selectedNodeId: node.id,
          };
        }),
      moveNode: (nodeId, parentId, index) =>
        set((state) => {
          const screen = activeScreen(state.miniApp, state.activeScreenId);

          if (parentId === nodeId || (parentId && isDescendant(screen.nodes, nodeId, parentId))) {
            return state;
          }

          const currentLocation = findParentAndIndex(screen.nodes, nodeId);
          if (!currentLocation) {
            return state;
          }

          const removedResult = removeNode(screen.nodes, nodeId);
          if (!removedResult.removed) {
            return state;
          }
          const removedNode = removedResult.removed;

          const adjustedIndex = index;
          if (!canInsertNode(removedResult.nodes, parentId, removedNode)) {
            return state;
          }

          return {
            miniApp: updateCurrentScreen(state.miniApp, state.activeScreenId, () =>
              insertNode(removedResult.nodes, parentId, adjustedIndex, removedNode),
            ),
          };
        }),
      duplicateNode: (nodeId) =>
        set((state) => {
          const screen = activeScreen(state.miniApp, state.activeScreenId);
          const node = findNode(screen.nodes, nodeId);
          const location = findParentAndIndex(screen.nodes, nodeId);
          if (!node || !location) {
            return state;
          }

          const duplicated = cloneNode(node);
          return {
            miniApp: updateCurrentScreen(state.miniApp, state.activeScreenId, (nodes) =>
              insertNode(nodes, location.parentId, location.index + 1, duplicated),
            ),
            selectedNodeId: duplicated.id,
          };
        }),
      deleteNode: (nodeId) =>
        set((state) => ({
          miniApp: updateCurrentScreen(state.miniApp, state.activeScreenId, (nodes) => removeNode(nodes, nodeId).nodes),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        })),
      updateNodeProps: (nodeId, props) =>
        set((state) => ({
          miniApp: updateCurrentScreen(state.miniApp, state.activeScreenId, (nodes) =>
            updateNode(nodes, nodeId, (node) => ({ ...node, props: { ...node.props, ...props } })),
          ),
        })),
      updateNodeStyle: (nodeId, style) =>
        set((state) => ({
          miniApp: updateCurrentScreen(state.miniApp, state.activeScreenId, (nodes) =>
            updateNode(nodes, nodeId, (node) => ({ ...node, style: { ...node.style, ...style } })),
          ),
        })),
      updateNodeAction: (nodeId, action) =>
        set((state) => ({
          miniApp: updateCurrentScreen(state.miniApp, state.activeScreenId, (nodes) =>
            updateNode(nodes, nodeId, (node) => ({
              ...node,
              events: action ? { ...node.events, onPress: action } : undefined,
            })),
          ),
        })),
      resetProject: () => {
        localStorage.removeItem("mini-app-builder");
        set({
          miniApp: sampleMiniApp(),
          activeScreenId: "home",
          screenSize: defaultScreenSize,
          scaleToFit: true,
          selectedNodeId: null,
          mode: "edit",
          validationErrors: [],
          activeDragId: null,
          activeOverId: null,
          zoom: 1.0,
        });
      },
    }),
    {
      name: "mini-app-builder",
      partialize: (state) => ({ miniApp: state.miniApp, screenSize: state.screenSize, scaleToFit: state.scaleToFit, zoom: state.zoom }),
    },
  ),
);

export function useSelectedNode() {
  return useBuilderStore((state) => {
    const screen = activeScreen(state.miniApp, state.activeScreenId);
    return state.selectedNodeId ? findNode(screen.nodes, state.selectedNodeId) : null;
  });
}

export function useActiveScreen() {
  return useBuilderStore((state) => activeScreen(state.miniApp, state.activeScreenId));
}
