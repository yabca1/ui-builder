import { describe, expect, test, vi, beforeEach } from "vitest";
import { useBuilderStore, serializeProject } from "../builder.store";
import { validateProjectObject, validateImportJson } from "@/mini-app/schema/mini-app.validator";
import { themePresets } from "@/mini-app/registry/theme-presets";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

global.localStorage = localStorageMock as any;

describe("Project Persistence Store & API Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useBuilderStore.getState().resetProject();
  });

  test("Create Project Action generates valid Phase 10 default structure", async () => {
    const mockCreatedProject = {
      id: "project-123",
      schemaVersion: 1,
      name: "New Web App",
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

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCreatedProject,
    });
    global.fetch = fetchMock;

    const store = useBuilderStore.getState();
    await store.createNewProject("New Web App");

    expect(fetchMock).toHaveBeenCalledWith("/api/projects", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"name":"New Web App"'),
    }));

    const state = useBuilderStore.getState();
    expect(state.miniApp.id).toBe("project-123");
    expect(state.miniApp.name).toBe("New Web App");
    expect(state.miniApp.entryScreenId).toBe("home");
    expect(state.miniApp.screens[0].id).toBe("home");
    expect(state.miniApp.ownerId).toBeNull();
    expect(localStorage.getItem("lastOpenedProjectId")).toBe("project-123");
  });

  test("Load Project Action fetches project and updates state", async () => {
    const mockProject = {
      id: "project-abc",
      schemaVersion: 1,
      name: "Loaded Project",
      entryScreenId: "home",
      screens: [{ id: "home", name: "Home", nodes: [] }],
      theme: themePresets.default,
      version: "1.0.0",
      ownerId: null,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProject,
    });
    global.fetch = fetchMock;

    const store = useBuilderStore.getState();
    await store.loadProject("project-abc");

    expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-abc");
    const state = useBuilderStore.getState();
    expect(state.miniApp.name).toBe("Loaded Project");
    expect(state.activeScreenId).toBe("home");
    expect(localStorage.getItem("lastOpenedProjectId")).toBe("project-abc");
  });

  test("Update Project / Sync updates list and active state", async () => {
    const mockUpdatedProject = {
      id: "project-123",
      schemaVersion: 1,
      name: "Updated App Name",
      entryScreenId: "home",
      screens: [{ id: "home", name: "Home", nodes: [] }],
      theme: {},
      version: "1.0.0",
      ownerId: null,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUpdatedProject,
    });
    global.fetch = fetchMock;

    const store = useBuilderStore.getState();
    useBuilderStore.setState({
      projects: [{ id: "project-123", name: "Original", screens: [], entryScreenId: "", version: "1.0.0" }],
    });

    await store.renameProject("project-123", "Updated App Name");

    expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-123", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining("Updated App Name"),
    }));

    const state = useBuilderStore.getState();
    expect(state.projects[0].name).toBe("Updated App Name");
  });

  test("Delete Project Action sends DELETE request and triggers fallback load", async () => {
    const fetchMock = vi.fn().mockImplementation((url, init) => {
      if (init?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: async () => ({ message: "deleted" }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: "project-other",
          name: "Other Project",
          screens: [],
          entryScreenId: "",
          version: "1.0.0",
          ownerId: null,
        }),
      });
    });
    global.fetch = fetchMock;

    useBuilderStore.setState({
      miniApp: { id: "project-to-delete", name: "Delete Me", screens: [], entryScreenId: "", version: "1.0.0" },
      projects: [
        { id: "project-to-delete", name: "Delete Me", screens: [], entryScreenId: "", version: "1.0.0" },
        { id: "project-other", name: "Other Project", screens: [], entryScreenId: "", version: "1.0.0" },
      ],
    });

    const store = useBuilderStore.getState();
    await store.deleteProject("project-to-delete");

    expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-to-delete", expect.objectContaining({
      method: "DELETE",
    }));

    const state = useBuilderStore.getState();
    expect(state.projects.length).toBe(1);
    expect(state.projects[0].id).toBe("project-other");
  });

  test("Duplicate Project copies project with Copy suffix and a new ID", async () => {
    const mockSourceProject = {
      id: "project-source",
      schemaVersion: 1,
      name: "Original Design",
      screens: [{ id: "home", name: "Home", nodes: [] }],
      entryScreenId: "home",
      theme: themePresets.default,
      version: "1.0.0",
      ownerId: null,
    };

    const fetchMock = vi.fn().mockImplementation((url, init) => {
      if (url === "/api/projects/project-source") {
        return Promise.resolve({ ok: true, json: async () => mockSourceProject });
      }
      if (url === "/api/projects" && init?.method === "POST") {
        const body = JSON.parse(init.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...body,
            id: "project-copy-uuid",
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    global.fetch = fetchMock;

    const store = useBuilderStore.getState();
    await store.duplicateProject("project-source");

    expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-source");
    expect(fetchMock).toHaveBeenCalledWith("/api/projects", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("Original Design Copy"),
    }));

    const state = useBuilderStore.getState();
    expect(state.projects.some((p) => p.name === "Original Design Copy" && p.id === "project-copy-uuid")).toBe(true);
  });

  test("Serialization filters editor-only fields and preserves ownerId", () => {
    const fullEditorState = {
      schemaVersion: 1,
      id: "app-id",
      name: "App Name",
      entryScreenId: "home",
      screens: [],
      theme: themePresets.default,
      selectedNodeId: "node-1",
      zoom: 1.25,
      clipboard: "...",
      ownerId: "user-999",
    };

    const serialized = serializeProject(fullEditorState);
    expect(serialized).toEqual({
      schemaVersion: 1,
      id: "app-id",
      name: "App Name",
      entryScreenId: "home",
      screens: [],
      theme: themePresets.default,
      ownerId: "user-999",
    });

    expect((serialized as any).selectedNodeId).toBeUndefined();
    expect((serialized as any).zoom).toBeUndefined();
  });

  test("Import -> Save -> Load -> Render maintains canvas structure identically", async () => {
    const importJsonText = JSON.stringify({
      schemaVersion: 1,
      id: "imported-id",
      name: "Imported App",
      entryScreenId: "main",
      screens: [
        {
          id: "main",
          name: "Main Screen",
          nodes: [
            {
              id: "btn-1",
              type: "button",
              props: { label: "Click Me" },
            },
          ],
        },
      ],
      theme: themePresets.default,
    });

    // 1. Import
    const importResult = validateImportJson(importJsonText);
    expect(importResult.isValid).toBe(true);
    const importedProject = importResult.data;

    // 2. Save Mock
    const saveFetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...serializeProject(importedProject),
        ownerId: null,
      }),
    });
    global.fetch = saveFetchMock;

    const res = await fetch("/api/projects", {
      method: "POST",
      body: JSON.stringify(serializeProject(importedProject)),
    });
    const savedProject = await res.json();

    // 3. Load Into State
    useBuilderStore.getState().importProject(savedProject);
    const state = useBuilderStore.getState();

    // 4. Render validation (identical canvas structure)
    expect(state.miniApp.screens).toHaveLength(1);
    expect(state.miniApp.screens[0].id).toBe("main");
    expect(state.miniApp.screens[0].nodes[0].id).toBe("btn-1");
    expect(state.miniApp.screens[0].nodes[0].type).toBe("button");
    expect(state.miniApp.screens[0].nodes[0].props.label).toBe("Click Me");
  });

  test("Round-trip Export -> Import parses and matches original project structure", () => {
    const originalProject = {
      schemaVersion: 1,
      id: "round-trip-app",
      name: "Round Trip App",
      entryScreenId: "first",
      screens: [
        {
          id: "first",
          name: "First Screen",
          nodes: [
            {
              id: "txt-node",
              type: "text",
              props: { text: "Hello Round Trip" },
            },
          ],
        },
      ],
      theme: themePresets.corporate,
      ownerId: null,
    };

    const exportedString = JSON.stringify(serializeProject(originalProject));
    const importResult = validateImportJson(exportedString);

    expect(importResult.isValid).toBe(true);
    const imported = serializeProject(importResult.data);
    expect(imported.name).toBe(originalProject.name);
    expect(imported.entryScreenId).toBe(originalProject.entryScreenId);
    expect(imported.screens[0].id).toBe(originalProject.screens[0].id);
    expect(imported.screens[0].nodes[0].id).toBe(originalProject.screens[0].nodes[0].id);
    expect(imported.screens[0].nodes[0].type).toBe(originalProject.screens[0].nodes[0].type);
    expect(imported.screens[0].nodes[0].props.text).toBe(originalProject.screens[0].nodes[0].props.text);
  });
});
