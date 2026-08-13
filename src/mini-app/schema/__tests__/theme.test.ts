import { describe, expect, test } from "vitest";
import { miniAppSchema } from "../mini-app.schema";
import { themePresets, resolveValueTheme, resolveNodeTheme } from "../../registry/theme-presets";
import { generateTailwindConfig } from "../../exporter/react-native/nativewind-config";
import { generateProject } from "../../exporter/react-native/generate-project";
import type { MiniAppNode } from "../../types/mini-app.types";

describe("Theme Configuration System Tests", () => {
  const sampleApp = {
    id: "test-app",
    name: "Test Theme App",
    version: "1.0.0",
    entryScreenId: "screen1",
    screens: [
      {
        id: "screen1",
        name: "Screen 1",
        nodes: [
          {
            id: "node1",
            type: "button" as const,
            props: { label: "Test Theme Button" },
            style: {
              backgroundColor: { type: "theme", token: "primary" },
              textColor: { type: "theme", token: "text" },
              fontSize: { type: "theme", token: "headingSize" },
            },
          },
        ],
      },
    ],
    theme: themePresets.corporate,
  };

  test("Zod validates valid theme schemas correctly", () => {
    const result = miniAppSchema.safeParse(sampleApp);
    expect(result.success).toBe(true);
  });

  test("Theme presets are loaded correctly", () => {
    expect(themePresets.default).toBeDefined();
    expect(themePresets.modern).toBeDefined();
    expect(themePresets.corporate).toBeDefined();
    expect(themePresets.default.light.colors.primary).toBe("#3b82f6");
    expect(themePresets.corporate.light.colors.primary).toBe("#0f172a");
  });

  test("resolveValueTheme resolves color and size tokens correctly", () => {
    const theme = themePresets.default;

    // Resolve primary color in light mode
    const primaryLight = resolveValueTheme({ type: "theme", token: "primary" }, theme, "light");
    expect(primaryLight).toBe("#3b82f6");

    // Resolve primary color in dark mode
    const primaryDark = resolveValueTheme({ type: "theme", token: "primary" }, theme, "dark");
    expect(primaryDark).toBe("#60a5fa");

    // Resolve font size token
    const headingSize = resolveValueTheme({ type: "theme", token: "headingSize" }, theme, "light");
    expect(headingSize).toBe(24);

    // Should return raw value if not a theme token
    expect(resolveValueTheme("#ffffff", theme, "light")).toBe("#ffffff");
  });

  test("resolveNodeTheme recursively resolves references in nodes", () => {
    const theme = themePresets.corporate;
    const node: MiniAppNode = {
      id: "btn1",
      type: "button",
      props: { label: "Hi" },
      style: {
        backgroundColor: { type: "theme", token: "primary" },
        borderRadius: { type: "theme", token: "md" },
      },
    };

    const resolved = resolveNodeTheme(node, theme, "light");
    expect(resolved.style?.backgroundColor).toBe("#0f172a");
    expect(resolved.style?.borderRadius).toBe(8);
  });

  test("generateTailwindConfig includes colors and spacing scales in extend block", () => {
    const configStr = generateTailwindConfig("expo-standalone", themePresets.modern);

    expect(configStr).toContain('"primary": "#6366f1"');
    expect(configStr).toContain('"secondary": "#a855f7"');
    expect(configStr).toContain('"xs": "4px"');
    expect(configStr).toContain('"borderRadius"');
    expect(configStr).toContain('"fontSize"');
  });

  test("generateProject generates theme.ts and injects tailwind custom config", async () => {
    const result = await generateProject(sampleApp, "expo-standalone");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const paths = result.files.map((f) => f.path);
      expect(paths).toContain("theme.ts");
      expect(paths).toContain("tailwind.config.js");

      const themeFile = result.files.find((f) => f.path === "theme.ts")?.content ?? "";
      expect(themeFile).toContain("themePresets");
      expect(themeFile).toContain("ThemeProvider");

      const tailwindConfig = result.files.find((f) => f.path === "tailwind.config.js")?.content ?? "";
      expect(tailwindConfig).toContain('"primary": "#0f172a"');
    }
  });
});
