import { z } from "zod";
import { miniAppSchema, screenDefinitionSchema } from "./mini-app.schema";
import type { ComponentType, MiniApp, MiniAppNode, ScreenDefinition } from "../types/mini-app.types";
import { themePresets } from "../registry/theme-presets";
import { componentRegistry } from "../registry/component-registry";

export type ValidationError = {
  path: string;
  message: string;
};

export type ValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
  data?: any;
  type?: "project" | "screen";
};

export const SUPPORTED_SCHEMA_VERSION = 1;

export function formatZodPath(path: (string | number)[]): string {
  if (path.length === 0) return "root";
  return path.reduce<string>((acc, current) => {
    if (typeof current === "number") {
      return `${acc}[${current}]`;
    }
    return acc ? `${acc}.${current}` : current;
  }, "");
}

function validateThemeTokens(
  style: Record<string, any> | undefined,
  path: string,
  errors: ValidationError[]
) {
  if (!style) return;
  const defaultTheme = themePresets.default.light;
  for (const [prop, val] of Object.entries(style)) {
    if (val && typeof val === "object" && val.type === "theme") {
      const token = val.token;
      const exists =
        token in defaultTheme.colors ||
        token in defaultTheme.spacing ||
        token in defaultTheme.radius ||
        token in defaultTheme.typography ||
        token in defaultTheme.shadows;
      if (!exists) {
        errors.push({
          path: `${path}.style.${prop}`,
          message: `Theme token reference "${token}" does not exist in the default theme.`,
        });
      }
    }
  }
}

function checkNode(
  node: any,
  path: string,
  nodeIds: Set<string>,
  screens: { id: string }[],
  errors: ValidationError[]
) {
  if (!node || typeof node !== "object") return;

  if (node.id) {
    if (nodeIds.has(node.id)) {
      errors.push({
        path,
        message: `Duplicate component node ID "${node.id}".`,
      });
    }
    nodeIds.add(node.id);
  }

  if (node.type && !(node.type in componentRegistry)) {
    errors.push({
      path: `${path}.type`,
      message: `Unsupported component type "${node.type}".`,
    });
  }

  validateThemeTokens(node.style, path, errors);

  const action = node.events?.onPress;
  if (action && action.type === "navigate") {
    const targetExists = screens.some((s) => s.id === action.screenId);
    if (!targetExists) {
      errors.push({
        path: `${path}.events.onPress.screenId`,
        message: `Navigation target "${action.screenId}" does not exist.`,
      });
    }
  }

  if (node.type === "list" && node.itemTemplate) {
    checkNode(node.itemTemplate, `${path}.itemTemplate`, nodeIds, screens, errors);
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child: any, index: number) => {
      checkNode(child, `${path}.children[${index}]`, nodeIds, screens, errors);
    });
  }
}

export function validateSchemaVersion(parsedJson: any): ValidationError | null {
  if (parsedJson && typeof parsedJson === "object" && "schemaVersion" in parsedJson) {
    const version = parsedJson.schemaVersion;
    if (typeof version === "number" && version > SUPPORTED_SCHEMA_VERSION) {
      return {
        path: "schemaVersion",
        message: `This project uses schema version ${version}, but this builder supports version ${SUPPORTED_SCHEMA_VERSION}.`,
      };
    }
  }
  return null;
}

function generateRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function normalizeNode(node: any) {
  if (!node || typeof node !== "object") return;

  if (!node.id) {
    node.id = `${node.type || "node"}-${generateRandomId().slice(0, 8)}`;
  }

  if (!node.props || typeof node.props !== "object") {
    node.props = {};
  }

  if (node.type === "image" || node.type === "avatar") {
    const source = node.props.sourceUrl ?? node.props.source ?? node.props.src ?? node.props.url ?? node.props.imageUrl;
    if (typeof source === "string") {
      node.props.sourceUrl = source;
    }
    delete node.props.source;
    delete node.props.src;
    delete node.props.url;
    delete node.props.imageUrl;
  }

  const registryDef = node.type && node.type in componentRegistry
    ? componentRegistry[node.type as ComponentType]
    : undefined;
  if (registryDef) {
    node.props = { ...registryDef.defaultProps, ...node.props };
    node.style = { ...(registryDef.defaultStyle ?? {}), ...(node.style ?? {}) };
    if (node.type === "row") {
      node.style.direction = "horizontal";
    }
    if (node.type === "column") {
      node.style.direction = "vertical";
    }
    if (registryDef.canHaveChildren && !Array.isArray(node.children)) {
      node.children = [];
    }
  }

  if (Array.isArray(node.children)) {
    node.children.forEach(normalizeNode);
  }
}

export function normalizeImportedData(parsed: any, type: "project" | "screen") {
  if (!parsed || typeof parsed !== "object") return;

  if (type === "project") {
    parsed.id = parsed.id || slugify(parsed.name || "app") || generateRandomId();
    parsed.version = parsed.version || "1.0.0";

    if (parsed.theme && typeof parsed.theme === "object") {
      const theme = parsed.theme;
      const defaultTheme = themePresets.default;
      const mergeMode = (mode: "light" | "dark") => ({
        colors: { ...defaultTheme[mode].colors, ...(theme.colors || {}), ...(theme[mode]?.colors || {}) },
        spacing: { ...defaultTheme[mode].spacing, ...(theme.spacing || {}), ...(theme[mode]?.spacing || {}) },
        radius: { ...defaultTheme[mode].radius, ...(theme.radius || {}), ...(theme[mode]?.radius || {}) },
        shadows: { ...defaultTheme[mode].shadows, ...(theme.shadows || {}), ...(theme[mode]?.shadows || {}) },
        typography: { ...defaultTheme[mode].typography, ...(theme.typography || {}), ...(theme[mode]?.typography || {}) },
      });
      parsed.theme = {
        name: theme.name || "custom",
        light: mergeMode("light"),
        dark: mergeMode("dark"),
      };
    }

    if (Array.isArray(parsed.screens)) {
      parsed.screens.forEach((screen: any) => {
        screen.id = screen.id || slugify(screen.name || "screen") || generateRandomId();
        screen.nodes = Array.isArray(screen.nodes) ? screen.nodes : [];
        if (Array.isArray(screen.nodes)) {
          screen.nodes.forEach(normalizeNode);
        }
      });
      const entryExists = parsed.screens.some((screen: any) => screen.id === parsed.entryScreenId);
      if (!parsed.entryScreenId || !entryExists) {
        parsed.entryScreenId = parsed.screens[0]?.id;
      }
    }
  } else {
    parsed.id = parsed.id || slugify(parsed.name || "screen") || generateRandomId();
    if (Array.isArray(parsed.nodes)) {
      parsed.nodes.forEach(normalizeNode);
    }
  }
}

export function validateImportJson(rawJson: string): ValidationResult {
  const errors: ValidationError[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e: any) {
    let posMessage = "";
    const match = e.message.match(/at position (\d+)/);
    if (match) {
      const pos = parseInt(match[1], 10);
      const lines = rawJson.slice(0, pos).split("\n");
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      posMessage = ` at line ${line}, column ${col}`;
    }
    return {
      isValid: false,
      errors: [
        {
          path: "json",
          message: `JSON syntax error: ${e.message}${posMessage}`,
        },
      ],
    };
  }

  const versionError = validateSchemaVersion(parsed);
  if (versionError) {
    return {
      isValid: false,
      errors: [versionError],
    };
  }

  const isProject = parsed && typeof parsed === "object" && Array.isArray(parsed.screens);
  const isScreen = parsed && typeof parsed === "object" && Array.isArray(parsed.nodes) && typeof parsed.name === "string";

  if (!isProject && !isScreen) {
    return {
      isValid: false,
      errors: [
        {
          path: "root",
          message: "Root object must be a project (has 'screens' array) or a screen definition (has 'nodes' array and 'name' string).",
        },
      ],
    };
  }

  if (isProject) {
    normalizeImportedData(parsed, "project");
    const schemaResult = miniAppSchema.safeParse(parsed);
    if (!schemaResult.success) {
      schemaResult.error.issues.forEach((issue) => {
        errors.push({
          path: formatZodPath(issue.path as (string | number)[]),
          message: issue.message,
        });
      });
      return { isValid: false, errors };
    }

    const app = schemaResult.data as MiniApp;

    const hasEntry = app.screens.some((s) => s.id === app.entryScreenId);
    if (!hasEntry) {
      errors.push({
        path: "entryScreenId",
        message: `Screen "${app.entryScreenId}" does not exist.`,
      });
    }

    const screenIds = new Set<string>();
    const screenNames = new Set<string>();
    app.screens.forEach((screen, index) => {
      const path = `screens[${index}]`;
      if (screenIds.has(screen.id)) {
        errors.push({
          path: `${path}.id`,
          message: `Duplicate screen ID "${screen.id}".`,
        });
      }
      screenIds.add(screen.id);

      const upperName = screen.name.toUpperCase();
      if (screenNames.has(upperName)) {
        errors.push({
          path: `${path}.name`,
          message: `Duplicate screen name "${screen.name}".`,
        });
      }
      screenNames.add(upperName);
    });

    const nodeIds = new Set<string>();
    app.screens.forEach((screen, screenIndex) => {
      screen.nodes.forEach((node, nodeIndex) => {
        checkNode(
          node,
          `screens[${screenIndex}].nodes[${nodeIndex}]`,
          nodeIds,
          app.screens,
          errors
        );
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      data: app,
      type: "project",
    };
  } else {
    normalizeImportedData(parsed, "screen");
    const schemaResult = screenDefinitionSchema.safeParse(parsed);
    if (!schemaResult.success) {
      schemaResult.error.issues.forEach((issue) => {
        errors.push({
          path: formatZodPath(issue.path as (string | number)[]),
          message: issue.message,
        });
      });
      return { isValid: false, errors };
    }

    const screen = schemaResult.data as ScreenDefinition;

    const nodeIds = new Set<string>();
    screen.nodes.forEach((node, nodeIndex) => {
      checkNode(
        node,
        `nodes[${nodeIndex}]`,
        nodeIds,
        [{ id: screen.id }],
        errors
      );
    });

    return {
      isValid: errors.length === 0,
      errors,
      data: screen,
      type: "screen",
    };
  }
}
