"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ComponentType, MiniApp, MiniAppAction, MiniAppNode, MiniAppTheme, ScreenDefinition } from "@/mini-app/types/mini-app.types";
import { canInsertNode, cloneNode, findNode, findParentAndIndex, insertNode, isDescendant, makeNode, removeNode, updateNode } from "@/features/builder/utils/node-tree";
import { themePresets, defaultSpacing, defaultRadius, defaultShadows, defaultTypography } from "@/mini-app/registry/theme-presets";
import { componentRegistry } from "@/mini-app/registry/component-registry";

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
  themeMode: "light" | "dark";
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
  setThemeMode: (mode: "light" | "dark") => void;
  updateThemeColor: (mode: "light" | "dark", token: string, value: string) => void;
  updateThemeSpacing: (mode: "light" | "dark", token: string, value: number) => void;
  updateThemeRadius: (mode: "light" | "dark", token: string, value: number) => void;
  updateThemeTypography: (mode: "light" | "dark", token: string, value: any) => void;
  applyThemePreset: (presetName: string) => void;
  importTheme: (themeJson: string) => void;
  resetProject: () => void;
  importProject: (miniApp: MiniApp) => void;
  importScreen: (screen: ScreenDefinition) => void;
  importComponents: (nodes: MiniAppNode[]) => void;
  
  // Project Persistence additions
  projects: MiniApp[];
  isSaving: boolean;
  isLoadingProject: boolean;
  dbStatus: "online" | "offline";
  dbError: string | null;
  notification: { type: "success" | "error" | "info"; message: string } | null;
  setNotification: (notification: { type: "success" | "error" | "info"; message: string } | null) => void;
  setIsSaving: (isSaving: boolean) => void;
  setIsLoadingProject: (isLoading: boolean) => void;
  setDbStatus: (status: "online" | "offline", error?: string | null) => void;
  fetchProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createNewProject: (name?: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  renameProject: (id: string, newName: string) => Promise<void>;
  clearTheme: () => void;
  createTheme: () => void;
  saveProject: () => Promise<void>;
  addCredential: (credential: any) => void;
  updateCredential: (id: string, credential: any) => void;
  deleteCredential: (id: string) => void;
  addIntegration: (integration: any) => void;
  updateIntegration: (id: string, integration: any) => void;
  deleteIntegration: (id: string) => void;
  addApiPath: (path: any) => void;
  updateApiPath: (id: string, path: any) => void;
  deleteApiPath: (id: string) => void;
  updateScreenOnLoadAction: (screenId: string, action: any | null) => void;
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
  welcome.style = { ...welcome.style, fontSize: 28, fontWeight: "700", textAlign: "center", color: { type: "theme", token: "text" } };
  emailInput.props = { placeholder: "Email", defaultValue: "" };
  emailInput.style = { ...emailInput.style, borderColor: { type: "theme", token: "border" } };
  openProfile.props = { label: "Open Profile" };
  openProfile.style = { ...openProfile.style, backgroundColor: { type: "theme", token: "primary" } };

  homeContainer.children = [welcome, emailInput, openProfile];
  homeContainer.style = { ...homeContainer.style, gap: { type: "theme", token: "md" }, alignment: "stretch", backgroundColor: { type: "theme", token: "background" } };

  profileTitle.props = { text: "Profile" };
  profileTitle.style = { ...profileTitle.style, fontSize: 28, fontWeight: "700", textAlign: "center", color: { type: "theme", token: "text" } };
  goHome.props = { label: "Go Home" };
  goHome.events = { onPress: { type: "goBack" } };
  goHome.style = { ...goHome.style, backgroundColor: { type: "theme", token: "primary" } };
  profileContainer.children = [profileTitle, goHome];
  profileContainer.style = { ...profileContainer.style, gap: { type: "theme", token: "md" }, alignment: "stretch", backgroundColor: { type: "theme", token: "background" } };

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
    theme: themePresets.default,
    credentials: [],
    integrations: [],
    apiPaths: [],
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

function getUniqueScreenName(screens: any[], baseName: string, excludeId?: string): string {
  let name = baseName;
  let count = 1;
  while (screens.some((s) => s.name.toUpperCase() === name.toUpperCase() && s.id !== excludeId)) {
    name = `${baseName} (${count++})`;
  }
  return name;
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
      projects: [],
      isSaving: false,
      isLoadingProject: false,
      dbStatus: "online",
      dbError: null,
      notification: null,
      setNotification: (notification) => set({ notification }),
      setIsSaving: (isSaving) => set({ isSaving }),
      setIsLoadingProject: (isLoadingProject) => set({ isLoadingProject }),
      setDbStatus: (dbStatus, dbError = null) => set({ dbStatus, dbError }),
      activeScreenId: "home",
      screenSize: defaultScreenSize,
      scaleToFit: true,
      selectedNodeId: null,
      mode: "edit",
      validationErrors: [],
      activeDragId: null,
      activeOverId: null,
      zoom: 1.0,
      themeMode: "light",
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
        set((state) => {
          const uniqueName = getUniqueScreenName(state.miniApp.screens, "New Screen");
          return {
            miniApp: {
              ...state.miniApp,
              screens: [...state.miniApp.screens, { id, name: uniqueName, nodes: [] }],
            },
            activeScreenId: id,
            selectedNodeId: null,
          };
        });
      },
      renameScreen: (screenId, name) =>
        set((state) => {
          const uniqueName = getUniqueScreenName(state.miniApp.screens, name, screenId);
          return {
            miniApp: {
              ...state.miniApp,
              screens: state.miniApp.screens.map((screen) => (screen.id === screenId ? { ...screen, name: uniqueName } : screen)),
            },
          };
        }),
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
      setThemeMode: (mode) => set({ themeMode: mode }),
      updateThemeColor: (mode, token, value) =>
        set((state) => {
          const currentTheme = state.miniApp.theme ?? themePresets.default;
          const updatedTheme = {
            ...currentTheme,
            [mode]: {
              ...currentTheme[mode],
              colors: {
                ...currentTheme[mode].colors,
                [token]: value,
              },
            },
          };
          return {
            miniApp: {
              ...state.miniApp,
              theme: updatedTheme,
            },
          };
        }),
      updateThemeSpacing: (mode, token, value) =>
        set((state) => {
          const currentTheme = state.miniApp.theme ?? themePresets.default;
          const updatedTheme = {
            ...currentTheme,
            [mode]: {
              ...currentTheme[mode],
              spacing: {
                ...currentTheme[mode].spacing,
                [token]: Number(value),
              },
            },
          };
          return {
            miniApp: {
              ...state.miniApp,
              theme: updatedTheme,
            },
          };
        }),
      updateThemeRadius: (mode, token, value) =>
        set((state) => {
          const currentTheme = state.miniApp.theme ?? themePresets.default;
          const updatedTheme = {
            ...currentTheme,
            [mode]: {
              ...currentTheme[mode],
              radius: {
                ...currentTheme[mode].radius,
                [token]: Number(value),
              },
            },
          };
          return {
            miniApp: {
              ...state.miniApp,
              theme: updatedTheme,
            },
          };
        }),
      updateThemeTypography: (mode, token, value) =>
        set((state) => {
          const currentTheme = state.miniApp.theme ?? themePresets.default;
          const updatedTheme = {
            ...currentTheme,
            [mode]: {
              ...currentTheme[mode],
              typography: {
                ...currentTheme[mode].typography,
                [token]: token === "fontFamily" ? value : Number(value),
              },
            },
          };
          return {
            miniApp: {
              ...state.miniApp,
              theme: updatedTheme,
            },
          };
        }),
      applyThemePreset: (presetName) =>
        set((state) => {
          const newTheme = themePresets[presetName] ?? themePresets.default;
          return {
            miniApp: {
              ...state.miniApp,
              theme: newTheme,
            },
          };
        }),
      importTheme: (themeJson) =>
        set((state) => {
          const parsed = JSON.parse(themeJson);
          if (!parsed || typeof parsed !== "object") {
            throw new Error("Theme must be a valid JSON object.");
          }
          const defaultTheme = themePresets.default;
          const mergedTheme = {
            name: parsed.name || "custom",
            light: {
              colors: { ...defaultTheme.light.colors, ...parsed.light?.colors },
              spacing: { ...defaultTheme.light.spacing, ...parsed.light?.spacing },
              radius: { ...defaultTheme.light.radius, ...parsed.light?.radius },
              shadows: { ...defaultTheme.light.shadows, ...parsed.light?.shadows },
              typography: { ...defaultTheme.light.typography, ...parsed.light?.typography },
            },
            dark: {
              colors: { ...defaultTheme.dark.colors, ...parsed.dark?.colors },
              spacing: { ...defaultTheme.dark.spacing, ...parsed.dark?.spacing },
              radius: { ...defaultTheme.dark.radius, ...parsed.dark?.radius },
              shadows: { ...defaultTheme.dark.shadows, ...parsed.dark?.shadows },
              typography: { ...defaultTheme.dark.typography, ...parsed.dark?.typography },
            },
          };
          return {
            miniApp: {
              ...state.miniApp,
              theme: mergedTheme,
            },
          };
        }),
      resetProject: () => {
        localStorage.removeItem("mini-app-builder");
        set((state) => ({
          miniApp: {
            ...sampleMiniApp(),
            id: state.miniApp.id, // keep the same project ID for DB sync
            name: state.miniApp.name, // keep the project name
          },
          activeScreenId: "home",
          screenSize: defaultScreenSize,
          scaleToFit: true,
          selectedNodeId: null,
          mode: "edit",
          validationErrors: [],
          activeDragId: null,
          activeOverId: null,
          zoom: 1.0,
          themeMode: "light",
        }));
      },
      importProject: (miniApp) =>
        set((state) => {
          let activeScreenId = miniApp.entryScreenId;
          const hasEntryScreen = miniApp.screens.some((s) => s.id === activeScreenId);
          if (!activeScreenId || !hasEntryScreen) {
            activeScreenId = miniApp.screens[0]?.id || "";
          }
          return {
            miniApp,
            activeScreenId,
            selectedNodeId: null,
            activeDragId: null,
            activeOverId: null,
            validationErrors: [],
          };
        }),
      importScreen: (screen) =>
        set((state) => {
          const screens = [...state.miniApp.screens];

          let newId = screen.id;
          let idCount = 1;
          while (screens.some((s) => s.id === newId)) {
            newId = `${screen.id}-${idCount++}`;
          }

          let newName = screen.name;
          let nameCount = 1;
          while (screens.some((s) => s.name.toUpperCase() === newName.toUpperCase())) {
            newName = `${screen.name} (${nameCount++})`;
          }

          const clonedNodes = screen.nodes.map(cloneNode);

          const newScreen = {
            id: newId,
            name: newName,
            nodes: clonedNodes,
          };

          screens.push(newScreen);

          return {
            miniApp: {
              ...state.miniApp,
              screens,
            },
            activeScreenId: newId,
            selectedNodeId: null,
            activeDragId: null,
            activeOverId: null,
            validationErrors: [],
          };
        }),
      importComponents: (nodesToImport) =>
        set((state) => {
          const screen = activeScreen(state.miniApp, state.activeScreenId);
          if (!screen) return state;

          const parentId = state.selectedNodeId;
          const parentNode = parentId ? findNode(screen.nodes, parentId) : null;
          const targetParentId = parentNode && componentRegistry[parentNode.type].canHaveChildren ? parentId : null;

          const sanitizedNodes = nodesToImport.map(cloneNode);

          return {
            miniApp: updateCurrentScreen(state.miniApp, state.activeScreenId, (nodes) => {
              let updated = [...nodes];
              sanitizedNodes.forEach((node) => {
                const index = targetParentId ? findNode(updated, targetParentId)?.children?.length ?? 0 : updated.length;
                updated = insertNode(updated, targetParentId, index, node);
              });
              return updated;
            }),
            selectedNodeId: sanitizedNodes[sanitizedNodes.length - 1]?.id ?? state.selectedNodeId,
            validationErrors: [],
          };
        }),
      fetchProjects: async () => {
        try {
          const res = await fetch("/api/projects");
          if (!res.ok) throw new Error("Failed to fetch projects");
          const projects = await res.json();
          set({ projects, dbStatus: "online", dbError: null });
        } catch (err: any) {
          console.error("fetchProjects error:", err);
          set({ dbStatus: "offline", dbError: err.message });
          set({
            notification: {
              type: "error",
              message: `Offline: Cannot connect to project database.`,
            },
          });
        }
      },
      loadProject: async (id: string) => {
        set({ isLoadingProject: true });
        try {
          const res = await fetch(`/api/projects/${id}`);
          if (!res.ok) {
            if (res.status === 404) {
              throw new Error("Project not found");
            }
            throw new Error("Failed to load project");
          }
          const project = await res.json();
          
          let activeScreenId = project.entryScreenId;
          const hasEntryScreen = project.screens.some((s: any) => s.id === activeScreenId);
          if (!activeScreenId || !hasEntryScreen) {
            activeScreenId = project.screens[0]?.id || "";
          }

          localStorage.setItem("lastOpenedProjectId", project.id);

          set({
            miniApp: project,
            activeScreenId,
            selectedNodeId: null,
            activeDragId: null,
            activeOverId: null,
            validationErrors: [],
            dbStatus: "online",
            dbError: null,
            notification: {
              type: "success",
              message: `Loaded project "${project.name}"`,
            },
          });
        } catch (err: any) {
          console.error("loadProject error:", err);
          set({
            notification: {
              type: "error",
              message: `Failed to load project: ${err.message}`,
            },
          });
        } finally {
          set({ isLoadingProject: false });
        }
      },
      createNewProject: async (name?: string) => {
        set({ isLoadingProject: true });
        try {
          const newProjectData = {
            schemaVersion: 1,
            name: name || "Untitled Project",
            entryScreenId: "home",
            screens: [
              {
                id: "home",
                name: "Home",
                nodes: [],
              },
            ],
            theme: themePresets.default,
            version: "1.0.0",
            ownerId: null,
          };

          const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newProjectData),
          });

          if (!res.ok) throw new Error("Failed to create new project");
          const createdProject = await res.json();

          localStorage.setItem("lastOpenedProjectId", createdProject.id);

          set((state) => ({
            miniApp: createdProject,
            activeScreenId: createdProject.entryScreenId || "home",
            selectedNodeId: null,
            activeDragId: null,
            activeOverId: null,
            validationErrors: [],
            projects: [createdProject, ...state.projects],
            dbStatus: "online",
            dbError: null,
            notification: {
              type: "success",
              message: `Created project "${createdProject.name}"`,
            },
          }));
        } catch (err: any) {
          console.error("createNewProject error:", err);
          set({
            notification: {
              type: "error",
              message: `Failed to create project: ${err.message}`,
            },
          });
        } finally {
          set({ isLoadingProject: false });
        }
      },
      duplicateProject: async (id: string) => {
        set({ isSaving: true });
        try {
          const projectRes = await fetch(`/api/projects/${id}`);
          if (!projectRes.ok) throw new Error("Failed to fetch project to duplicate");
          const targetProject = await projectRes.json();

          const duplicatedProject = {
            ...serializeProject(targetProject),
            name: `${targetProject.name} Copy`,
            id: undefined, // Let API generate a new project ID
          };

          const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(duplicatedProject),
          });

          if (!res.ok) throw new Error("Failed to save duplicated project");
          const savedProject = await res.json();

          set((state) => ({
            projects: [savedProject, ...state.projects],
            dbStatus: "online",
            dbError: null,
            notification: {
              type: "success",
              message: `Duplicated to "${savedProject.name}"`,
            },
          }));
        } catch (err: any) {
          console.error("duplicateProject error:", err);
          set({
            notification: {
              type: "error",
              message: `Failed to duplicate project: ${err.message}`,
            },
          });
        } finally {
          set({ isSaving: false });
        }
      },
      deleteProject: async (id: string) => {
        try {
          const res = await fetch(`/api/projects/${id}`, {
            method: "DELETE",
          });

          if (!res.ok) throw new Error("Failed to delete project");

          set((state) => {
            const nextProjects = state.projects.filter((p) => p.id !== id);
            const isCurrentlyOpen = state.miniApp.id === id;

            if (isCurrentlyOpen) {
              setTimeout(() => {
                const updatedProjects = useBuilderStore.getState().projects;
                if (updatedProjects.length > 0) {
                  useBuilderStore.getState().loadProject(updatedProjects[0].id);
                } else {
                  useBuilderStore.getState().createNewProject();
                }
              }, 0);
            }

            return {
              projects: nextProjects,
              dbStatus: "online",
              dbError: null,
              notification: {
                type: "success",
                message: `Project deleted successfully`,
              },
            };
          });
        } catch (err: any) {
          console.error("deleteProject error:", err);
          set({
            notification: {
              type: "error",
              message: `Failed to delete project: ${err.message}`,
            },
          });
        }
      },
      renameProject: async (id: string, newName: string) => {
        try {
          const isActive = useBuilderStore.getState().miniApp.id === id;
          if (isActive) {
            set((state) => ({
              miniApp: { ...state.miniApp, name: newName },
            }));
          }

          const targetProject = useBuilderStore.getState().projects.find((p) => p.id === id) || 
            (isActive ? useBuilderStore.getState().miniApp : null);
          
          if (!targetProject) throw new Error("Project not found in memory");

          const updated = {
            ...targetProject,
            name: newName,
          };

          const res = await fetch(`/api/projects/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });

          if (!res.ok) throw new Error("Failed to update project name");
          const saved = await res.json();

          set((state) => ({
            projects: state.projects.map((p) => (p.id === id ? saved : p)),
            dbStatus: "online",
            dbError: null,
          }));
        } catch (err: any) {
          console.error("renameProject error:", err);
          set({
            notification: {
              type: "error",
              message: `Failed to rename project: ${err.message}`,
            },
          });
        }
      },
      clearTheme: () => {
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            theme: {},
          },
          notification: {
            type: "info",
            message: "Custom theme cleared from memory. Save to apply to database.",
          },
        }));
      },
      createTheme: () => {
        const blankTheme = {
          name: "custom",
          light: {
            colors: {
              primary: "#000000",
              secondary: "#64748b",
              success: "#22c55e",
              warning: "#eab308",
              danger: "#ef4444",
              background: "#ffffff",
              surface: "#f8fafc",
              card: "#ffffff",
              border: "#e2e8f0",
              text: "#000000",
              mutedText: "#64748b",
            },
            spacing: defaultSpacing,
            radius: defaultRadius,
            shadows: defaultShadows,
            typography: defaultTypography,
          },
          dark: {
            colors: {
              primary: "#ffffff",
              secondary: "#94a3b8",
              success: "#22c55e",
              warning: "#eab308",
              danger: "#ef4444",
              background: "#09090b",
              surface: "#18181b",
              card: "#18181b",
              border: "#27272a",
              text: "#ffffff",
              mutedText: "#a1a1aa",
            },
            spacing: defaultSpacing,
            radius: defaultRadius,
            shadows: defaultShadows,
            typography: defaultTypography,
          },
        };
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            theme: blankTheme,
          },
          notification: {
            type: "info",
            message: "New custom theme initialized. Save to apply to database.",
          },
        }));
      },
      saveProject: async () => {
        set({ isSaving: true });
        try {
          const project = useBuilderStore.getState().miniApp;
          const payload = serializeProject(project);

          const res = await fetch(`/api/projects/${project.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Save failed");
          }

          const savedProject = await res.json();

          set({
            miniApp: savedProject,
            dbStatus: "online",
            dbError: null,
            notification: {
              type: "success",
              message: `Project and theme "${savedProject.name}" saved to database.`,
            },
          });

          // Refresh sidebar projects list
          await useBuilderStore.getState().fetchProjects();
        } catch (err: any) {
          console.error("Manual save error:", err);
          set({
            dbStatus: "offline",
            dbError: err.message,
            notification: {
              type: "error",
              message: `Failed to save: ${err.message}`,
            },
          });
        } finally {
          set({ isSaving: false });
        }
      },
      addCredential: (credential) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            credentials: [...(state.miniApp.credentials || []), credential],
          },
        })),
      updateCredential: (id, updated) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            credentials: (state.miniApp.credentials || []).map((c) =>
              c.id === id ? { ...c, ...updated } : c
            ),
          },
        })),
      deleteCredential: (id) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            credentials: (state.miniApp.credentials || []).filter((c) => c.id !== id),
          },
        })),
      addIntegration: (integration) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            integrations: [...(state.miniApp.integrations || []), integration],
          },
        })),
      updateIntegration: (id, updated) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            integrations: (state.miniApp.integrations || []).map((i) =>
              i.id === id ? { ...i, ...updated } : i
            ),
          },
        })),
      deleteIntegration: (id) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            integrations: (state.miniApp.integrations || []).filter((i) => i.id !== id),
          },
        })),
      addApiPath: (apiPath) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            apiPaths: [...(state.miniApp.apiPaths || []), apiPath],
          },
        })),
      updateApiPath: (id, updated) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            apiPaths: (state.miniApp.apiPaths || []).map((p) =>
              p.id === id ? { ...p, ...updated } : p
            ),
          },
        })),
      deleteApiPath: (id) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            apiPaths: (state.miniApp.apiPaths || []).filter((p) => p.id !== id),
          },
        })),
      updateScreenOnLoadAction: (screenId, action) =>
        set((state) => ({
          miniApp: {
            ...state.miniApp,
            screens: state.miniApp.screens.map((screen) =>
              screen.id === screenId
                ? {
                    ...screen,
                    events: action ? { ...screen.events, onLoad: action } : undefined,
                  }
                : screen
            ),
          },
        })),
    }),
    {
      name: "mini-app-builder",
      partialize: (state) => ({ miniApp: state.miniApp, screenSize: state.screenSize, scaleToFit: state.scaleToFit, zoom: state.zoom, themeMode: state.themeMode }),
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

export function serializeProject(project: any) {
  if (!project) return null;
  return {
    schemaVersion: project.schemaVersion || 1,
    id: project.id,
    name: project.name,
    entryScreenId: project.entryScreenId || "",
    theme: project.theme || {},
    screens: project.screens || [],
    ownerId: project.ownerId !== undefined ? project.ownerId : null,
    ...(project.credentials !== undefined ? { credentials: project.credentials } : {}),
    ...(project.integrations !== undefined ? { integrations: project.integrations } : {}),
    ...(project.apiPaths !== undefined ? { apiPaths: project.apiPaths } : {}),
  };
}

export function serializeProjectForAutosave(project: any) {
  if (!project) return null;
  return {
    schemaVersion: project.schemaVersion || 1,
    id: project.id,
    name: project.name,
    entryScreenId: project.entryScreenId || "",
    screens: project.screens || [],
    ownerId: project.ownerId !== undefined ? project.ownerId : null,
    ...(project.credentials !== undefined ? { credentials: project.credentials } : {}),
    ...(project.integrations !== undefined ? { integrations: project.integrations } : {}),
    ...(project.apiPaths !== undefined ? { apiPaths: project.apiPaths } : {}),
  };
}
