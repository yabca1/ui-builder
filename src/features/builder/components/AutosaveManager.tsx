"use client";

import { useEffect, useRef } from "react";
import { useBuilderStore, serializeProject, serializeProjectForAutosave } from "@/features/builder/store/builder.store";

export function AutosaveManager() {
  const miniApp = useBuilderStore((state) => state.miniApp);
  const loadProject = useBuilderStore((state) => state.loadProject);
  const createNewProject = useBuilderStore((state) => state.createNewProject);
  const fetchProjects = useBuilderStore((state) => state.fetchProjects);
  const setNotification = useBuilderStore((state) => state.setNotification);
  const setIsSaving = useBuilderStore((state) => state.setIsSaving);
  const setDbStatus = useBuilderStore((state) => state.setDbStatus);

  const lastSavedJsonRef = useRef<string>("");
  const isSavingRef = useRef<boolean>(false);
  const activeProjectIdRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Project Load Logic
  useEffect(() => {
    async function initProject() {
      // Fetch project list first so sidebar has projects
      await fetchProjects();
      
      const lastOpenedId = localStorage.getItem("lastOpenedProjectId");
      const currentProjects = useBuilderStore.getState().projects;

      if (lastOpenedId) {
        try {
          const res = await fetch(`/api/projects/${lastOpenedId}`);
          if (res.ok) {
            const project = await res.json();
            await loadProject(project.id);
            lastSavedJsonRef.current = JSON.stringify(serializeProjectForAutosave(project));
            activeProjectIdRef.current = project.id;
            return;
          }
        } catch (e) {
          console.error("Failed to load last opened project from DB:", e);
        }
      }

      // Fallback 1: Load the first project from DB
      if (currentProjects && currentProjects.length > 0) {
        const firstProject = currentProjects[0];
        await loadProject(firstProject.id);
        lastSavedJsonRef.current = JSON.stringify(serializeProjectForAutosave(firstProject));
        activeProjectIdRef.current = firstProject.id;
      } else {
        // Fallback 2: Create a brand new project
        await createNewProject("Untitled Project");
        const newlyCreated = useBuilderStore.getState().miniApp;
        lastSavedJsonRef.current = JSON.stringify(serializeProjectForAutosave(newlyCreated));
        activeProjectIdRef.current = newlyCreated.id;
      }
    }

    void initProject();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // 2. Autosave Logic on Change (Excluding theme changes)
  useEffect(() => {
    if (!miniApp || !miniApp.id) return;

    const currentCompareJson = JSON.stringify(serializeProjectForAutosave(miniApp));

    if (activeProjectIdRef.current !== miniApp.id) {
      activeProjectIdRef.current = miniApp.id;
      lastSavedJsonRef.current = currentCompareJson;
      return;
    }

    if (currentCompareJson === lastSavedJsonRef.current) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsSaving(true);
      isSavingRef.current = true;

      try {
        const res = await fetch(`/api/projects/${miniApp.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serializeProject(miniApp)),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Save failed");
        }

        const savedProject = await res.json();
        lastSavedJsonRef.current = JSON.stringify(serializeProjectForAutosave(savedProject));

        setDbStatus("online", null);
        void fetchProjects();
      } catch (err: any) {
        if (err.name === "AbortError") {
          return;
        }

        console.error("Autosave error:", err);
        setDbStatus("offline", err.message);
        setNotification({
          type: "error",
          message: `Autosave failed: ${err.message || "Database offline"}`,
        });
      } finally {
        setIsSaving(false);
        isSavingRef.current = false;
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    }, 1000);

  }, [miniApp]);

  return null;
}
