"use client";

import { useState, useRef } from "react";
import { useBuilderStore, serializeProject } from "@/features/builder/store/builder.store";
import { validateImportJson } from "@/mini-app/schema/mini-app.validator";

export function ProjectManager() {
  const projects = useBuilderStore((state) => state.projects);
  const activeProject = useBuilderStore((state) => state.miniApp);
  const loadProject = useBuilderStore((state) => state.loadProject);
  const createNewProject = useBuilderStore((state) => state.createNewProject);
  const duplicateProject = useBuilderStore((state) => state.duplicateProject);
  const deleteProject = useBuilderStore((state) => state.deleteProject);
  const renameProject = useBuilderStore((state) => state.renameProject);
  const isLoadingProject = useBuilderStore((state) => state.isLoadingProject);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setRenameValue(name);
  };

  const handleSaveRename = async (id: string) => {
    if (renameValue.trim()) {
      await renameProject(id, renameValue.trim());
    }
    setEditingId(null);
  };

  const handleExportProject = (project: any) => {
    const serialized = serializeProject(project);
    const json = JSON.stringify(serialized, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}-project.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text !== "string") return;

      try {
        const result = validateImportJson(text);
        if (!result.isValid) {
          const errMessages = result.errors.map((err) => `${err.path}: ${err.message}`).join("\n");
          alert(`Import failed: validation errors:\n${errMessages}`);
          return;
        }

        if (result.type !== "project") {
          alert("Import failed: JSON must be a full project definition.");
          return;
        }

        const projectData = serializeProject(result.data);
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectData),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Save failed");
        }

        const imported = await res.json();
        await useBuilderStore.getState().fetchProjects();
        await loadProject(imported.id);
        alert(`Successfully imported project "${imported.name}"!`);
      } catch (error: any) {
        console.error("Import error:", error);
        alert(`Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <section className="mt-2 flex flex-col gap-4 text-slate-700 dark:text-slate-300">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-450">
          Projects
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-350 shadow-sm transition cursor-pointer"
          >
            Import JSON
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJson}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => createNewProject()}
            disabled={isLoadingProject}
            className="rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-white dark:text-slate-900 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            New Project
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {projects.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs font-medium text-slate-400 dark:text-slate-550">
            No projects in the cloud yet. Click "New Project" to start!
          </div>
        ) : (
          projects.map((project) => {
            const isActive = activeProject?.id === project.id;
            const isEditing = editingId === project.id;
            const isConfirmingDelete = deleteConfirmId === project.id;

            return (
              <div
                key={project.id}
                className={`group rounded-xl border p-3 transition shadow-sm relative ${
                  isActive
                    ? "border-teal-500 dark:border-teal-600 bg-teal-50/20 dark:bg-teal-950/20 ring-2 ring-teal-100 dark:ring-teal-950"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Project Header */}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        aria-label="Rename project"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleSaveRename(project.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(project.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="w-full rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-950 px-2 py-1 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/20"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => !isActive && loadProject(project.id)}
                          disabled={isLoadingProject}
                          className={`text-left text-sm font-bold truncate transition ${
                            isActive
                              ? "text-teal-700 dark:text-teal-400"
                              : "text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          }`}
                        >
                          {project.name}
                        </button>
                        <button
                          type="button"
                          title="Rename project"
                          onClick={() => handleStartRename(project.id, project.name)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                        >
                          <svg
                            className="size-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    {/* Screens Info & Updated Time */}
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      <span>{project.screens?.length || 0} screens</span>
                      <span>•</span>
                      <span className="truncate font-medium text-slate-500 dark:text-slate-400">
                        {project.updatedAt
                          ? new Date(project.updatedAt).toLocaleDateString()
                          : "local"}
                      </span>
                    </div>
                  </div>

                  {isActive && (
                    <span className="shrink-0 rounded-full bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 text-[9px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wider shadow-sm border border-teal-200/50 dark:border-teal-900/30">
                      Active
                    </span>
                  )}
                </div>

                {/* Confirm Delete Banner */}
                {isConfirmingDelete ? (
                  <div className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-2 text-center text-xs">
                    <p className="font-bold text-rose-800 dark:text-rose-400 mb-2">Delete this project?</p>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteProject(project.id);
                          setDeleteConfirmId(null);
                        }}
                        className="rounded bg-rose-600 dark:bg-rose-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 dark:hover:bg-rose-600 transition shadow-sm cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 opacity-90 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => loadProject(project.id)}
                      disabled={isActive || isLoadingProject}
                      className={`rounded px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        isActive
                          ? "bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-600 cursor-default"
                          : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 shadow-sm"
                      }`}
                    >
                      Open
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        title="Duplicate project"
                        onClick={() => duplicateProject(project.id)}
                        disabled={isLoadingProject}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
                      >
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        title="Export project JSON"
                        onClick={() => handleExportProject(project)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
                      >
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        title="Delete project"
                        onClick={() => setDeleteConfirmId(project.id)}
                        className="p-1.5 rounded-lg border border-rose-100 dark:border-rose-900/40 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 dark:text-rose-450 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                      >
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
