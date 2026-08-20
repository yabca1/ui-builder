"use client";

import React, { useRef, useState } from "react";
import { useBuilderStore } from "@/features/builder/store/builder.store";
import { invokeFetchClient } from "@/mini-app/utils/fetch-client";
import type { Credential, Integration, ApiPath, SchemaField, SchemaFieldType } from "@/mini-app/types/mini-app.types";

const schemaFieldTypes: SchemaFieldType[] = ["string", "number", "boolean", "object", "array"];

export function ApisPanel() {
  const miniApp = useBuilderStore((state) => state.miniApp);
  const addCredential = useBuilderStore((state) => state.addCredential);
  const updateCredential = useBuilderStore((state) => state.updateCredential);
  const deleteCredential = useBuilderStore((state) => state.deleteCredential);
  
  const addIntegration = useBuilderStore((state) => state.addIntegration);
  const updateIntegration = useBuilderStore((state) => state.updateIntegration);
  const deleteIntegration = useBuilderStore((state) => state.deleteIntegration);

  const addApiPath = useBuilderStore((state) => state.addApiPath);
  const updateApiPath = useBuilderStore((state) => state.updateApiPath);
  const deleteApiPath = useBuilderStore((state) => state.deleteApiPath);

  const credentials = miniApp.credentials || [];
  const integrations = miniApp.integrations || [];
  const apiPaths = miniApp.apiPaths || [];

  const [activeSubTab, setActiveSubTab] = useState<"integrations" | "credentials">("integrations");

  // Selection states
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  // Edit states for Credential
  const [editingCredId, setEditingCredId] = useState<string | null>(null);
  const [credName, setCredName] = useState("");
  const [credValue, setCredValue] = useState("");

  // Edit states for Integration
  const [editingIntId, setEditingIntId] = useState<string | null>(null);
  const [intName, setIntName] = useState("");
  const [intBaseUrl, setIntBaseUrl] = useState("");
  const [intAuthType, setIntAuthType] = useState<"none" | "apiKey" | "bearer">("none");
  const [intCredId, setIntCredId] = useState("");
  const [intHeaderName, setIntHeaderName] = useState("X-API-Key");
  const [intHeaders, setIntHeaders] = useState<{ key: string; value: string }[]>([]);
  const [intLogging, setIntLogging] = useState<"off" | "basic" | "verbose">("off");

  // Edit states for ApiPath
  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [pathName, setPathName] = useState("");
  const [pathStr, setPathStr] = useState("");
  const [pathMethod, setPathMethod] = useState<"GET" | "POST" | "PUT" | "PATCH" | "DELETE">("GET");
  const [pathRequestSchema, setPathRequestSchema] = useState<SchemaField[]>([]);
  const [pathResponseSchema, setPathResponseSchema] = useState<SchemaField[]>([]);

  // Testing states
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Helper lists
  const activeIntegration = integrations.find(i => i.id === selectedIntegrationId);
  const activePath = apiPaths.find(p => p.id === selectedPathId);
  const pathsForActiveIntegration = apiPaths.filter(p => p.integrationId === selectedIntegrationId);
  const methodHasBody = ["POST", "PUT", "PATCH"].includes(pathMethod);

  const handleImportConsoleTest = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result;
        if (typeof raw !== "string") return;
        const parsed = JSON.parse(raw);
        const importedIntegration = parsed.integration as Integration | undefined;
        const importedPath = parsed.path as ApiPath | undefined;

        if (!importedIntegration?.id || !importedPath?.id) {
          alert("Import failed: JSON must include integration and path definitions.");
          return;
        }

        const nextIntegration = {
          ...importedIntegration,
          authConfig: importedIntegration.authConfig || { type: "none" as const },
          loggingLevel: importedIntegration.loggingLevel || "basic",
        };

        const existingIntegration = integrations.find((item) => item.id === nextIntegration.id);
        if (existingIntegration) {
          updateIntegration(nextIntegration.id, nextIntegration);
        } else {
          addIntegration(nextIntegration);
        }

        const existingPath = apiPaths.find((item) => item.id === importedPath.id);
        const nextPath = {
          ...importedPath,
          integrationId: nextIntegration.id,
          requestSchema: importedPath.requestSchema || [],
          responseSchema: importedPath.responseSchema || [],
        };
        if (existingPath) {
          updateApiPath(nextPath.id, nextPath);
        } else {
          addApiPath(nextPath);
        }

        const credentialId = nextIntegration.authConfig.credentialId;
        if (credentialId && !credentials.some((item) => item.id === credentialId)) {
          const rawValue = typeof parsed.credentialValue === "string" && !parsed.credentialValue.startsWith("REPLACE_")
            ? parsed.credentialValue
            : "";
          addCredential({
            id: credentialId,
            name: `${nextIntegration.name} Key`,
            value: rawValue,
          });
        }

        setSelectedIntegrationId(nextIntegration.id);
        setSelectedPathId(nextPath.id);
        setTestParams(parsed.params || {});
        setTestResult(null);
      } catch (error: any) {
        alert(`Import failed: ${error.message || "Invalid JSON"}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // ----------------------------------------------------
  // Credentials Logic
  // ----------------------------------------------------
  const handleSaveCred = () => {
    if (!credName.trim()) return;
    if (editingCredId === "new") {
      addCredential({
        id: `cred-${crypto.randomUUID().slice(0, 8)}`,
        name: credName,
        value: credValue,
      });
    } else if (editingCredId) {
      updateCredential(editingCredId, { name: credName, value: credValue });
    }
    setEditingCredId(null);
    setCredName("");
    setCredValue("");
  };

  const handleStartNewCred = () => {
    setEditingCredId("new");
    setCredName("");
    setCredValue("");
  };

  const handleStartEditCred = (c: Credential) => {
    setEditingCredId(c.id);
    setCredName(c.name);
    setCredValue(c.value);
  };

  // ----------------------------------------------------
  // Integrations Logic
  // ----------------------------------------------------
  const handleSaveInt = () => {
    if (!intName.trim() || !intBaseUrl.trim()) return;
    const data = {
      name: intName,
      baseUrl: intBaseUrl,
      authConfig: {
        type: intAuthType,
        credentialId: intAuthType !== "none" ? intCredId : undefined,
        headerName: intAuthType === "apiKey" ? intHeaderName : undefined,
      },
      defaultHeaders: intHeaders.filter(h => h.key.trim() !== ""),
      loggingLevel: intLogging,
    };

    if (editingIntId === "new") {
      const newId = `int-${crypto.randomUUID().slice(0, 8)}`;
      addIntegration({ id: newId, ...data });
      setSelectedIntegrationId(newId);
    } else if (editingIntId) {
      updateIntegration(editingIntId, data);
    }
    setEditingIntId(null);
  };

  const handleStartNewInt = () => {
    setEditingIntId("new");
    setIntName("");
    setIntBaseUrl("");
    setIntAuthType("none");
    setIntCredId(credentials[0]?.id || "");
    setIntHeaderName("X-API-Key");
    setIntHeaders([]);
    setIntLogging("off");
  };

  const handleStartEditInt = (i: Integration) => {
    setEditingIntId(i.id);
    setIntName(i.name);
    setIntBaseUrl(i.baseUrl);
    setIntAuthType(i.authConfig.type);
    setIntCredId(i.authConfig.credentialId || credentials[0]?.id || "");
    setIntHeaderName(i.authConfig.headerName || "X-API-Key");
    setIntHeaders(i.defaultHeaders || []);
    setIntLogging(i.loggingLevel || "off");
  };

  const handleAddHeaderRow = () => {
    setIntHeaders([...intHeaders, { key: "", value: "" }]);
  };

  const handleHeaderChange = (index: number, field: "key" | "value", val: string) => {
    const updated = [...intHeaders];
    updated[index][field] = val;
    setIntHeaders(updated);
  };

  const handleRemoveHeaderRow = (index: number) => {
    setIntHeaders(intHeaders.filter((_, idx) => idx !== index));
  };

  // ----------------------------------------------------
  // API Paths Logic
  // ----------------------------------------------------
  const handleSavePath = () => {
    if (!pathName.trim() || !pathStr.trim() || !selectedIntegrationId) return;
    const invalidRequestField = pathRequestSchema.find((field) => !field.name.trim());
    const duplicateRequestField = pathRequestSchema.find((field, index) =>
      pathRequestSchema.findIndex((candidate) => candidate.name.trim() === field.name.trim()) !== index
    );
    if (invalidRequestField) {
      alert("Request schema fields need a name before saving.");
      return;
    }
    if (duplicateRequestField) {
      alert(`Request schema field "${duplicateRequestField.name}" is duplicated.`);
      return;
    }

    const data = {
      name: pathName,
      path: pathStr,
      method: pathMethod,
      requestSchema: pathRequestSchema.map((field) => ({ ...field, name: field.name.trim() })),
      responseSchema: pathResponseSchema,
      integrationId: selectedIntegrationId,
    };

    if (editingPathId === "new") {
      const newId = `path-${crypto.randomUUID().slice(0, 8)}`;
      addApiPath({ id: newId, ...data });
      setSelectedPathId(newId);
    } else if (editingPathId) {
      updateApiPath(editingPathId, data);
    }
    setEditingPathId(null);
  };

  const handleStartNewPath = () => {
    setEditingPathId("new");
    setPathName("");
    setPathStr("");
    setPathMethod("GET");
    setPathRequestSchema([]);
    setPathResponseSchema([]);
  };

  const handleStartEditPath = (p: ApiPath) => {
    setEditingPathId(p.id);
    setPathName(p.name);
    setPathStr(p.path);
    setPathMethod(p.method);
    setPathRequestSchema(p.requestSchema || []);
    setPathResponseSchema(p.responseSchema || []);
  };

  const handleAddSchemaField = (type: "request" | "response") => {
    const newField: SchemaField = {
      name: "",
      type: "string",
      required: false,
    };
    if (type === "request") {
      setPathRequestSchema([...pathRequestSchema, newField]);
    } else {
      setPathResponseSchema([...pathResponseSchema, newField]);
    }
  };

  const handleSchemaFieldChange = (
    type: "request" | "response",
    index: number,
    field: keyof SchemaField | "minimum" | "maximum" | "minLength" | "maxLength" | "pattern",
    val: any
  ) => {
    const schema = type === "request" ? [...pathRequestSchema] : [...pathResponseSchema];
    const item = { ...schema[index] };

    if (field === "minimum" || field === "maximum" || field === "minLength" || field === "maxLength" || field === "pattern") {
      item.validationRules = item.validationRules || {};
      if (val === "") {
        delete (item.validationRules as any)[field];
      } else {
        (item.validationRules as any)[field] = field === "pattern" ? val : Number(val);
      }
    } else {
      (item as any)[field] = val;
    }

    schema[index] = item;
    if (type === "request") {
      setPathRequestSchema(schema);
    } else {
      setPathResponseSchema(schema);
    }
  };

  const handleRemoveSchemaField = (type: "request" | "response", index: number) => {
    if (type === "request") {
      setPathRequestSchema(pathRequestSchema.filter((_, idx) => idx !== index));
    } else {
      setPathResponseSchema(pathResponseSchema.filter((_, idx) => idx !== index));
    }
  };

  const renderSchemaFieldEditor = (field: SchemaField, index: number, type: "request" | "response") => (
    <div key={`${type}-${index}`} className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
      <input
        value={field.name}
        onChange={(e) => handleSchemaFieldChange(type, index, "name", e.target.value)}
        placeholder={type === "request" ? "e.g. user.firstName" : "e.g. data.id"}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
      />
      <div className="flex items-center justify-between gap-2">
        <select
          value={field.type}
          onChange={(e) => handleSchemaFieldChange(type, index, "type", e.target.value as SchemaFieldType)}
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-xs outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition"
        >
          {schemaFieldTypes.map((fieldType) => (
            <option key={fieldType} value={fieldType}>{fieldType}</option>
          ))}
        </select>
        
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-505 dark:text-slate-400 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => handleSchemaFieldChange(type, index, "required", e.target.checked)}
            className="size-3.5 rounded border-slate-300 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500"
          />
          Required
        </label>
        
        <button
          type="button"
          onClick={() => handleRemoveSchemaField(type, index)}
          aria-label={`Remove ${field.name || "schema field"}`}
          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition flex items-center justify-center"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );

  const inferSchemaFromObject = (obj: any, prefix = ""): SchemaField[] => {
    if (obj === null || obj === undefined) return [];
    const fields: SchemaField[] = [];

    if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === "object") {
        return inferSchemaFromObject(obj[0], prefix);
      }
      return [];
    }

    if (typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        const path = prefix ? `${prefix}.${key}` : key;
        const type = Array.isArray(val)
          ? "array"
          : typeof val === "object" && val !== null
          ? "object"
          : typeof val;

        fields.push({
          name: path,
          type: type as any,
          required: true,
        });

        if (val && typeof val === "object" && !Array.isArray(val)) {
          fields.push(...inferSchemaFromObject(val, path));
        }
      }
    }

    return fields;
  };

  const handleInferSchema = () => {
    if (!testResult || !testResult.data || !activePath) return;
    const inferred = inferSchemaFromObject(testResult.data);
    updateApiPath(activePath.id, { responseSchema: inferred });
    if (editingPathId === activePath.id) {
      setPathResponseSchema(inferred);
    }
    alert(`Successfully generated and saved ${inferred.length} response schema fields!`);
  };

  // ----------------------------------------------------
  // Test API Logic
  // ----------------------------------------------------
  const handleTestApi = async () => {
    if (!activeIntegration || !activePath) return;
    setIsTesting(true);
    setTestResult(null);

    // Resolve credential value if auth is required
    let credVal = "";
    if (activeIntegration.authConfig.type !== "none") {
      const cred = credentials.find(c => c.id === activeIntegration.authConfig.credentialId);
      if (cred) credVal = cred.value;
    }

    try {
      const result = await invokeFetchClient(activeIntegration, activePath, testParams, credVal);
      setTestResult(result);
    } catch (e: any) {
      setTestResult({
        success: false,
        status: 0,
        error: e.message || "Unknown client error",
      });
    } finally {
      setIsTesting(false);
    }
  };
  return (
    <div className="flex h-full flex-col min-h-0 text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors duration-150">
      {/* Header Tabs - Segmented Control style */}
      <div className="flex shrink-0 p-3 select-none">
        <div className="flex w-full bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setActiveSubTab("integrations"); setEditingIntId(null); setEditingPathId(null); }}
            className={`flex-1 rounded-lg py-1.5 px-3 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === "integrations"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Services
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab("credentials"); setEditingCredId(null); }}
            className={`flex-1 rounded-lg py-1.5 px-3 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === "credentials"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Credentials
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-4">
        {/* ----------------------------------------------------
            CREDENTIALS VIEW
            ---------------------------------------------------- */}
        {activeSubTab === "credentials" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">API Credentials</h3>
              {!editingCredId && (
                <button
                  type="button"
                  onClick={handleStartNewCred}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer transition shadow-sm"
                >
                  + Add
                </button>
              )}
            </div>

            {editingCredId ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-4 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  {editingCredId === "new" ? "New Credential" : "Edit Credential"}
                </h4>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Name
                  <input
                    value={credName}
                    onChange={(e) => setCredName(e.target.value)}
                    placeholder="e.g. Currency Converter Token"
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Secret Value
                  <input
                    type="password"
                    value={credValue}
                    onChange={(e) => setCredValue(e.target.value)}
                    placeholder="Enter secret token / key"
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </label>
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditingCredId(null)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCred}
                    className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs font-bold cursor-pointer transition shadow-sm hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2.5">
              {credentials.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-semibold border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/20">
                  No API credentials configured.
                </div>
              ) : (
                credentials.map(c => (
                  <div key={c.id} className="group flex items-center justify-between border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-950 shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition duration-150">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono select-none">••••••••••••••••</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEditCred(c)}
                        title="Edit Credential"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition flex items-center justify-center"
                      >
                        <svg className="size-4 text-slate-500 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCredential(c.id)}
                        title="Delete Credential"
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition flex items-center justify-center"
                      >
                        <svg className="size-4 text-rose-500 dark:text-rose-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            INTEGRATIONS & PATHS VIEW
            ---------------------------------------------------- */}
        {activeSubTab === "integrations" && (
          <div className="flex flex-col gap-5">
            {/* Integrations Dropdown / Selector */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 select-none">
                  Service Integration
                </h3>
                
                {!editingIntId && (
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <select
                        value={selectedIntegrationId || ""}
                        onChange={(e) => {
                          setSelectedIntegrationId(e.target.value || null);
                          setSelectedPathId(null);
                          setTestResult(null);
                        }}
                        className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-xs outline-none text-slate-900 dark:text-slate-100 shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Select Service Integration --</option>
                        {integrations.map((i) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 dark:text-slate-500">
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleStartNewInt}
                        className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 text-xs font-semibold cursor-pointer shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Service
                      </button>
                      
                      {selectedIntegrationId && (
                        <button
                          type="button"
                          onClick={() => activeIntegration && handleStartEditInt(activeIntegration)}
                          className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 py-2 px-3 text-xs font-semibold cursor-pointer shadow-sm transition flex items-center justify-center gap-1.5"
                        >
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => importInputRef.current?.click()}
                        className="rounded-xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 py-2 px-3 text-xs font-semibold cursor-pointer shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import
                      </button>
                      <input
                        ref={importInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportConsoleTest}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Editing/Creating Integration */}
            {editingIntId ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/20 p-4 flex flex-col gap-3.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  {editingIntId === "new" ? "Create API Integration" : "Edit API Integration"}
                </h4>
                
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Integration Name
                  <input
                    value={intName}
                    onChange={(e) => setIntName(e.target.value)}
                    placeholder="e.g. Fixer Exchange Rates"
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Base URL
                  <input
                    value={intBaseUrl}
                    onChange={(e) => setIntBaseUrl(e.target.value)}
                    placeholder="https://api.apilayer.com"
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </label>

                <div className="flex gap-3">
                  <label className="flex-1 flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Authentication
                    <select
                      value={intAuthType}
                      onChange={(e) => setIntAuthType(e.target.value as any)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 px-2.5 py-2 text-xs outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition"
                    >
                      <option value="none">None</option>
                      <option value="apiKey">API Key (Header)</option>
                      <option value="bearer">Bearer Token</option>
                    </select>
                  </label>

                  <label className="flex-1 flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Logging Level
                    <select
                      value={intLogging}
                      onChange={(e) => setIntLogging(e.target.value as any)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 px-2.5 py-2 text-xs outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition"
                    >
                      <option value="off">Off</option>
                      <option value="basic">Basic</option>
                      <option value="verbose">Verbose</option>
                    </select>
                  </label>
                </div>

                {intAuthType !== "none" && (
                  <div className="flex flex-col gap-3 bg-white dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-850">
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Link Credential
                      {credentials.length === 0 ? (
                        <div className="text-red-500 font-semibold text-[10px] mt-1">
                          No credentials found. Save this integration first, then configure a Credential in the next tab.
                        </div>
                      ) : (
                        <select
                          value={intCredId}
                          onChange={(e) => setIntCredId(e.target.value)}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition"
                        >
                          {credentials.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                    </label>

                    {intAuthType === "apiKey" && (
                      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Custom Header Name (optional)
                        <input
                          value={intHeaderName}
                          onChange={(e) => setIntHeaderName(e.target.value)}
                          placeholder="X-API-Key"
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Default headers editor */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between select-none">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Default Headers</span>
                    <button
                      type="button"
                      onClick={handleAddHeaderRow}
                      className="text-xs font-bold text-indigo-650 hover:text-indigo-700 cursor-pointer"
                    >
                      + Add Header
                    </button>
                  </div>
                  {intHeaders.map((header, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        placeholder="Key"
                        value={header.key}
                        onChange={(e) => handleHeaderChange(idx, "key", e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition"
                      />
                      <input
                        placeholder="Value"
                        value={header.value}
                        onChange={(e) => handleHeaderChange(idx, "value", e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveHeaderRow(idx)}
                        className="text-xs text-rose-500 hover:text-rose-600 p-1.5 cursor-pointer font-bold transition rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  {editingIntId !== "new" && (
                    <button
                      type="button"
                      onClick={() => { deleteIntegration(editingIntId); setEditingIntId(null); setSelectedIntegrationId(null); setSelectedPathId(null); }}
                      className="mr-auto rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 dark:bg-rose-950/25 dark:border-rose-900/30 dark:text-rose-400 px-3.5 py-2 text-xs font-semibold cursor-pointer transition duration-150"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingIntId(null)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold cursor-pointer transition duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInt}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold cursor-pointer transition duration-150 shadow-sm"
                  >
                    Save Integration
                  </button>
                </div>
              </div>
            ) : null}

            {/* API Paths Section */}
            {selectedIntegrationId && !editingIntId && (
              <div className="flex flex-col gap-4 border-t border-slate-150 dark:border-slate-800 pt-4.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">API Operations / Paths</h3>
                  {!editingPathId && (
                    <button
                      type="button"
                      onClick={handleStartNewPath}
                      className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer transition shadow-sm"
                    >
                      + Add Path
                    </button>
                  )}
                </div>

                {!editingPathId && (
                  <div className="flex flex-col gap-2.5">
                    {pathsForActiveIntegration.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 font-semibold border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/20">
                        No operations configured for this service.
                      </div>
                    ) : (
                      pathsForActiveIntegration.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelectedPathId(p.id); setTestResult(null); }}
                          className={`flex items-center justify-between border rounded-xl p-3 text-left transition duration-150 select-none ${
                            selectedPathId === p.id
                              ? "border-indigo-500 dark:border-indigo-650 bg-indigo-50/5 dark:bg-indigo-950/10 shadow-sm"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-350 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex flex-col min-w-0 mr-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{p.name}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5 font-mono truncate">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border select-none ${
                                p.method === "GET"
                                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border-emerald-200/50 dark:border-emerald-900/30"
                                  : p.method === "POST"
                                  ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-450 border-blue-200/50 dark:border-blue-900/30"
                                  : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-450 border-amber-200/50 dark:border-amber-900/30"
                              }`}>{p.method}</span>
                              {p.path}
                            </span>
                          </div>
                          <span className="text-slate-400 text-sm font-semibold select-none">&rarr;</span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Path Editing Form */}
                {editingPathId ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955/20 p-4 flex flex-col gap-3.5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                      {editingPathId === "new" ? "New API Path" : "Edit API Path"}
                    </h4>

                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Operation Name
                      <input
                        value={pathName}
                        onChange={(e) => setPathName(e.target.value)}
                        placeholder="e.g. Get Latest Rates"
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                      />
                    </label>

                    <div className="flex gap-3">
                      <label className="w-28 shrink-0 flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Method
                        <select
                          value={pathMethod}
                          onChange={(e) => setPathMethod(e.target.value as any)}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 px-2.5 py-2 text-xs outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="PATCH">PATCH</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </label>

                      <label className="flex-1 flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Endpoint Path
                        <input
                          value={pathStr}
                          onChange={(e) => setPathStr(e.target.value)}
                          placeholder="e.g. /v6/latest/USD"
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        />
                      </label>
                    </div>

                    {/* Schemas editor: Request payload */}
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col min-w-0 mr-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Request Schema / Parameters</span>
                          <span className="text-[10px] text-slate-450 font-medium">
                            {methodHasBody ? "Fields become JSON body keys. Dotted names create nested objects." : "Fields are used as path/query parameters."}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddSchemaField("request")}
                          className="rounded-xl bg-slate-905 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-2.5 py-1.5 text-[11px] font-bold cursor-pointer transition shadow-sm"
                        >
                          + Field
                        </button>
                      </div>
                      {pathRequestSchema.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400 font-semibold bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850">No request fields defined.</div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {pathRequestSchema.map((field, index) => renderSchemaFieldEditor(field, index, "request"))}
                        </div>
                      )}
                    </div>

                    {/* Schemas editor: Expected Response */}
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-2.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Response Definition</span>
                        <span className="text-[10px] text-slate-400 font-semibold italic">Manual editing disabled</span>
                      </div>
                      {pathResponseSchema.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400 font-semibold bg-white dark:bg-slate-955 rounded-xl border border-slate-200 dark:border-slate-850">No response fields defined. Run "Test API" to infer automatically.</div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {pathResponseSchema.map((field) => (
                            <div key={field.name} className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
                              <span className="font-bold text-slate-800 dark:text-slate-200">{field.name}</span>
                              <span className="text-slate-450 font-mono text-[10px] bg-slate-100 dark:bg-slate-900 py-0.5 px-1.5 rounded-md">({field.type})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 mt-2">
                      {editingPathId !== "new" && (
                        <button
                          type="button"
                          onClick={() => { deleteApiPath(editingPathId); setEditingPathId(null); setSelectedPathId(null); }}
                          className="mr-auto rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 dark:bg-rose-955/25 dark:border-rose-900/30 dark:text-rose-450 px-3.5 py-2 text-xs font-semibold cursor-pointer transition duration-150"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingPathId(null)}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-705 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-805 px-3.5 py-2 text-xs font-semibold cursor-pointer transition duration-150"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePath}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold cursor-pointer transition duration-150 shadow-sm"
                      >
                        Save Operation
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Path selection detail and Test API console */}
                {selectedPathId && !editingPathId && activePath && (
                  <div className="flex flex-col gap-4 border-t border-slate-150 dark:border-slate-800 pt-4.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Test API Console</h4>
                      <button
                        type="button"
                        onClick={() => handleStartEditPath(activePath)}
                        className="text-xs font-bold text-indigo-650 hover:text-indigo-700 cursor-pointer transition"
                      >
                        Edit Schema/Path
                      </button>
                    </div>

                    {/* Inputs */}
                    <div className="flex flex-col gap-3.5 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 select-none uppercase tracking-wider">API Request Parameters</span>
                      {activePath.requestSchema?.length === 0 ? (
                        <div className="text-xs text-slate-450 font-semibold py-2 text-center bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm">No request parameters defined. You can trigger directly.</div>
                      ) : (
                        activePath.requestSchema.map((field) => {
                          const value = testParams[field.name] ?? field.defaultValue ?? "";
                          const updateValue = (nextValue: string) => setTestParams({ ...testParams, [field.name]: nextValue });

                          return (
                            <label key={field.name} className="flex flex-col gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <span>
                                {field.name}
                                {field.required && <span className="text-rose-500 font-black ml-0.5">*</span>}
                                <span className="ml-1 font-mono text-[10px] text-slate-450 font-normal">({field.type})</span>
                              </span>
                              {field.type === "boolean" ? (
                                <select
                                  value={String(value)}
                                  onChange={(e) => updateValue(e.target.value)}
                                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition"
                                >
                                  <option value="">Unset</option>
                                  <option value="true">true</option>
                                  <option value="false">false</option>
                                </select>
                              ) : field.type === "object" || field.type === "array" ? (
                                <textarea
                                  value={String(value)}
                                  onChange={(e) => updateValue(e.target.value)}
                                  placeholder={field.type === "array" ? "[\"item\"]" : "{\"key\":\"value\"}"}
                                  rows={3}
                                  className="resize-y rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100 font-mono focus:border-indigo-500 transition"
                                />
                              ) : (
                                <input
                                  value={value}
                                  onChange={(e) => updateValue(e.target.value)}
                                  placeholder={field.type === "number" ? "123" : "Enter value"}
                                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition"
                                />
                              )}
                            </label>
                          );
                        })
                      )}

                      <button
                        type="button"
                        onClick={handleTestApi}
                        disabled={isTesting}
                        className="rounded-xl bg-indigo-650 hover:bg-indigo-750 disabled:bg-indigo-400 text-white py-2.5 text-xs font-bold cursor-pointer transition flex items-center justify-center gap-1.5 shadow-sm mt-1"
                      >
                        {isTesting ? "Executing Request..." : "Test API Operation"}
                      </button>
                    </div>

                    {/* Output */}
                    {testResult && (
                      <div className="flex flex-col gap-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-955 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-400">Response Console</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase select-none ${
                            testResult.success 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:border-emerald-900/40" 
                              : "bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:border-rose-900/40"
                          }`}>
                            Status: {testResult.status} {testResult.success ? "OK" : "FAILED"}
                          </span>
                        </div>

                        {testResult.success && testResult.data && (
                          <button
                            type="button"
                            onClick={handleInferSchema}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2 text-xs font-bold transition flex items-center justify-center cursor-pointer select-none shadow-sm"
                          >
                            Auto-Generate Response Schema
                          </button>
                        )}
                        {testResult.duration !== undefined && (
                          <div className="text-[10px] text-slate-450 font-semibold select-none">
                            Duration: <span className="font-bold text-slate-700 dark:text-slate-350">{testResult.duration}ms</span>
                          </div>
                        )}

                        {testResult.validationErrors && testResult.validationErrors.length > 0 && (
                          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-3 text-[11px] text-rose-650 dark:text-rose-400">
                            <span className="font-bold block mb-1">Validation Errors:</span>
                            <ul className="list-disc pl-4.5 space-y-0.5">
                              {testResult.validationErrors.map((err: string, i: number) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {testResult.error && (
                          <div className="text-xs text-rose-600 dark:text-rose-450 font-bold font-mono">
                            Error: {testResult.error}
                          </div>
                        )}

                        {testResult.data !== undefined && (
                          <pre className="rounded-xl bg-slate-950 text-emerald-450 p-3 text-[10px] overflow-x-auto max-h-56 font-mono select-text shadow-inner border border-slate-900 leading-normal">
                            {typeof testResult.data === "object"
                              ? JSON.stringify(testResult.data, null, 2)
                              : String(testResult.data)}
                          </pre>
                        )}

                        {testResult.logs && testResult.logs.length > 0 && (
                          <div className="border-t border-slate-100 dark:border-slate-850 pt-3 flex flex-col gap-1.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Internal Trace Logs</span>
                            <pre className="text-[10px] text-slate-450 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl overflow-x-auto font-mono whitespace-pre-wrap select-text leading-relaxed">
                              {testResult.logs.join("\n")}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
