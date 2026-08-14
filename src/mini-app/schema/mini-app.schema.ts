import { z } from "zod";
import { componentRegistry } from "@/mini-app/registry/component-registry";

const supportedTypes = Object.keys(componentRegistry) as [
  keyof typeof componentRegistry,
  ...(keyof typeof componentRegistry)[],
];

export const miniAppActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("navigate"),
    screenId: z.string().min(1),
  }),
  z.object({
    type: z.literal("goBack"),
  }),
  z.object({
    type: z.literal("showAlert"),
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal("setVariable"),
    variable: z.string().min(1),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal("showToast"),
    message: z.string().min(1),
  }),
]);

export type MiniAppActionInput = z.input<typeof miniAppActionSchema>;

export const miniAppNodeSchema: z.ZodType<{
  id: string;
  type: (typeof supportedTypes)[number];
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
  events?: Record<string, MiniAppActionInput>;
  children?: z.infer<typeof miniAppNodeSchema>[];
}> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.string().superRefine((val, ctx) => {
      if (!(val in componentRegistry)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported component type "${val}"`,
        });
      }
    }) as any,
    props: z.record(z.string(), z.unknown()).optional().default({}),
    style: z.record(z.string(), z.unknown()).optional(),
    events: z.record(z.string(), miniAppActionSchema).optional(),
    children: z.array(miniAppNodeSchema).optional(),
  }),
);

export const screenDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nodes: z.array(miniAppNodeSchema),
});

const themeColorsSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  success: z.string().min(1),
  warning: z.string().min(1),
  danger: z.string().min(1),
  background: z.string().min(1),
  surface: z.string().min(1),
  card: z.string().min(1),
  border: z.string().min(1),
  text: z.string().min(1),
  mutedText: z.string().min(1),
});

const themeSpacingSchema = z.object({
  xs: z.number(),
  sm: z.number(),
  md: z.number(),
  lg: z.number(),
  xl: z.number(),
  xxl: z.number(),
});

const themeRadiusSchema = z.object({
  sm: z.number(),
  md: z.number(),
  lg: z.number(),
  xl: z.number(),
});

const themeShadowsSchema = z.object({
  sm: z.record(z.string(), z.unknown()),
  md: z.record(z.string(), z.unknown()),
  lg: z.record(z.string(), z.unknown()),
});

const themeTypographySchema = z.object({
  fontFamily: z.string().min(1),
  headingSize: z.number(),
  subheadingSize: z.number(),
  bodySize: z.number(),
  captionSize: z.number(),
});

const modeThemeSchema = z.object({
  colors: themeColorsSchema,
  spacing: themeSpacingSchema,
  radius: themeRadiusSchema,
  shadows: themeShadowsSchema,
  typography: themeTypographySchema,
});

const miniAppThemeSchema = z.object({
  name: z.string().min(1),
  light: modeThemeSchema,
  dark: modeThemeSchema,
});

export const miniAppSchema = z
  .object({
    schemaVersion: z.number().optional().default(1),
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.string().optional().default("1.0.0"),
    entryScreenId: z.string().optional().default(""),
    screens: z.array(screenDefinitionSchema),
    theme: z.preprocess(
      (val) => {
        if (val && typeof val === "object" && Object.keys(val).length === 0) {
          return undefined;
        }
        return val;
      },
      miniAppThemeSchema.optional()
    ),
    ownerId: z.any().nullable().optional().default(null),
  })
  .superRefine((app, ctx) => {
    const screenIds = new Set<string>();
    const nodeIds = new Set<string>();

    for (const [screenIndex, screen] of app.screens.entries()) {
      if (screenIds.has(screen.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["screens", screenIndex, "id"],
          message: `Duplicate screen ID "${screen.id}".`,
        });
      }
      screenIds.add(screen.id);
    }

    if (app.screens.length > 0) {
      if (!app.entryScreenId || !screenIds.has(app.entryScreenId)) {
        ctx.addIssue({
          code: "custom",
          path: ["entryScreenId"],
          message: `Screen "${app.entryScreenId || ""}" does not exist.`,
        });
      }
    }

    const visitNode = (node: z.infer<typeof miniAppNodeSchema>, path: (string | number)[]) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(node.id)) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "id"],
          message: `Node ID "${node.id}" contains unsupported characters.`,
        });
      }

      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "id"],
          message: `Duplicate component node ID "${node.id}".`,
        });
      }
      nodeIds.add(node.id);

      const definition = componentRegistry[node.type];
      if (node.type === "text" && typeof node.props.text !== "string") {
        ctx.addIssue({
          code: "custom",
          path: [...path, "props", "text"],
          message: "Text nodes require a string text prop.",
        });
      }
      if (node.type === "button" && typeof node.props.label !== "string") {
        ctx.addIssue({
          code: "custom",
          path: [...path, "props", "label"],
          message: "Button nodes require a string label prop.",
        });
      }
      if (node.type === "input" && node.props.placeholder !== undefined && typeof node.props.placeholder !== "string") {
        ctx.addIssue({
          code: "custom",
          path: [...path, "props", "placeholder"],
          message: "Input placeholder must be a string.",
        });
      }
      if (
        node.type === "image" &&
        typeof node.props.sourceUrl !== "string" &&
        typeof node.props.source !== "string"
      ) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "props", "sourceUrl"],
          message: "Image nodes require a sourceUrl or source string prop.",
        });
      }
      if (node.type === "list" && typeof node.props.items !== "string") {
        ctx.addIssue({
          code: "custom",
          path: [...path, "props", "items"],
          message: "List items must be a string.",
        });
      }

      const style = node.style ?? {};
      if (style.direction !== undefined && style.direction !== "vertical" && style.direction !== "horizontal") {
        ctx.addIssue({
          code: "custom",
          path: [...path, "style", "direction"],
          message: "Direction must be vertical or horizontal.",
        });
      }
      const align = style.align ?? style.alignment;
      if (
        align !== undefined &&
        align !== "start" &&
        align !== "center" &&
        align !== "end" &&
        align !== "stretch" &&
        align !== "flex-start" &&
        align !== "flex-end"
      ) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "style", "align"],
          message: "Alignment uses an unsupported value.",
        });
      }

      if (definition && !definition.canHaveChildren && node.children && node.children.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: [...path, "children"],
          message: `${definition.label} cannot contain children.`,
        });
      }

      for (const [eventName, action] of Object.entries(node.events ?? {})) {
        if (action.type === "navigate" && !screenIds.has(action.screenId)) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "events", eventName, "screenId"],
            message: `Navigation target "${action.screenId}" does not exist.`,
          });
        }
      }

      node.children?.forEach((child, childIndex) => {
        visitNode(child, [...path, "children", childIndex]);
      });
    };

    app.screens.forEach((screen, screenIndex) => {
      screen.nodes.forEach((node, nodeIndex) => {
        visitNode(node, ["screens", screenIndex, "nodes", nodeIndex]);
      });
    });
  });
