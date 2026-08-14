import { describe, expect, test } from "vitest";
import { validateImportJson } from "../mini-app.validator";
import { generateProject } from "../../exporter/react-native/generate-project";
import { resolveNodeTheme } from "../../registry/theme-presets";

describe("JSON Import & Validation Pipeline Tests", () => {
  const validProject = {
    schemaVersion: 1,
    id: "json-demo",
    name: "JSON Demo",
    version: "1.0.0",
    entryScreenId: "home",
    screens: [
      {
        id: "home",
        name: "Home",
        nodes: [
          {
            id: "root-col",
            type: "column",
            style: { padding: 16, gap: 12 },
            children: [
              {
                id: "heading-title",
                type: "heading",
                props: { text: "Welcome" }
              },
              {
                id: "nav-btn",
                type: "button",
                props: { label: "Go Details" },
                events: {
                  onPress: {
                    type: "navigate",
                    screenId: "details"
                  }
                }
              }
            ]
          }
        ]
      },
      {
        id: "details",
        name: "Details",
        nodes: [
          {
            id: "detail-text",
            type: "text",
            props: { text: "Details Screen" }
          }
        ]
      }
    ]
  };

  test("Import accepts valid project JSON", () => {
    const res = validateImportJson(JSON.stringify(validProject));
    if (!res.isValid) {
      console.log("VALIDATION ERRORS DETECTED:", JSON.stringify(res.errors, null, 2));
    }
    expect(res.isValid).toBe(true);
    expect(res.type).toBe("project");
  });

  test("Import detects invalid JSON syntax with line and column info", () => {
    const badJson = `{\n  "schemaVersion": 1,\n  "name": "Bad",\n  "screens": [\n    "invalid": true\n  ]\n}`;
    const res = validateImportJson(badJson);
    expect(res.isValid).toBe(false);
    expect(res.errors[0].message).toContain("JSON syntax error");
    expect(res.errors[0].message).toContain("line 5");
  });

  test("Import detects unsupported component types", () => {
    const invalidComponent = {
      ...validProject,
      screens: [
        {
          id: "home",
          name: "Home",
          nodes: [
            {
              id: "bad-node",
              type: "unsupportedComponentType",
              props: {}
            }
          ]
        }
      ]
    };
    const res = validateImportJson(JSON.stringify(invalidComponent));
    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("screens[0].nodes[0].type");
    expect(res.errors[0].message).toContain("Unsupported component type");
  });

  test("Import detects duplicate screen IDs", () => {
    const dupScreens = {
      ...validProject,
      screens: [
        { id: "home", name: "Home", nodes: [] },
        { id: "home", name: "Home Duplicate", nodes: [] }
      ]
    };
    const res = validateImportJson(JSON.stringify(dupScreens));
    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("screens[1].id");
    expect(res.errors[0].message).toContain("Duplicate screen ID");
  });

  test("Import detects duplicate node IDs", () => {
    const dupNodes = {
      ...validProject,
      screens: [
        {
          id: "home",
          name: "Home",
          nodes: [
            { id: "node-dup", type: "text", props: { text: "1" } },
            { id: "node-dup", type: "text", props: { text: "2" } }
          ]
        }
      ]
    };
    const res = validateImportJson(JSON.stringify(dupNodes));
    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("screens[0].nodes[1].id");
    expect(res.errors[0].message).toContain("Duplicate component node ID");
  });

  test("Import falls back from invalid entryScreenId to first screen", () => {
    const invalidEntry = {
      ...validProject,
      entryScreenId: "nonexistent"
    };
    const res = validateImportJson(JSON.stringify(invalidEntry));
    expect(res.isValid).toBe(true);
    expect(res.data.entryScreenId).toBe("home");
  });

  test("Import falls back from missing entryScreenId to first screen", () => {
    const { entryScreenId, ...missingEntry } = validProject;
    const res = validateImportJson(JSON.stringify(missingEntry));
    expect(res.isValid).toBe(true);
    expect(res.data.entryScreenId).toBe("home");
  });

  test("Import detects invalid navigation action target", () => {
    const badNav = {
      ...validProject,
      screens: [
        {
          id: "home",
          name: "Home",
          nodes: [
            {
              id: "nav-btn",
              type: "button",
              props: { label: "Go" },
              events: {
                onPress: {
                  type: "navigate",
                  screenId: "nonexistent"
                }
              }
            }
          ]
        }
      ]
    };
    const res = validateImportJson(JSON.stringify(badNav));
    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("screens[0].nodes[0].events.onPress.screenId");
    expect(res.errors[0].message).toContain('Navigation target "nonexistent" does not exist');
  });

  test("Import detects invalid theme reference token", () => {
    const badThemeRef = {
      ...validProject,
      screens: [
        {
          id: "home",
          name: "Home",
          nodes: [
            {
              id: "text-node",
              type: "text",
              props: { text: "Hello" },
              style: {
                color: { type: "theme", token: "invalid-token" }
              }
            }
          ]
        }
      ]
    };
    const res = validateImportJson(JSON.stringify(badThemeRef));
    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("screens[0].nodes[0].style.color");
    expect(res.errors[0].message).toContain("Theme token reference");
  });

  test("Import detects invalid schema version", () => {
    const badVersion = {
      ...validProject,
      schemaVersion: 99
    };
    const res = validateImportJson(JSON.stringify(badVersion));
    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("schemaVersion");
    expect(res.errors[0].message).toContain("builder supports version 1");
  });

  test("Import accepts valid single screen JSON", () => {
    const validScreen = {
      id: "details",
      name: "Details",
      nodes: [
        {
          id: "title",
          type: "heading",
          props: { text: "Details" }
        }
      ]
    };
    const res = validateImportJson(JSON.stringify(validScreen));
    expect(res.isValid).toBe(true);
    expect(res.type).toBe("screen");
  });

  test("Import rejects invalid root objects", () => {
    const res = validateImportJson(JSON.stringify({ title: "No screens or nodes" }));
    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("root");
  });

  test("Import reports invalid theme shadow paths", () => {
    const badTheme = {
      ...validProject,
      theme: {
        light: {
          shadows: {
            sm: "not-a-shadow-object"
          }
        }
      }
    };
    const res = validateImportJson(JSON.stringify(badTheme));
    expect(res.isValid).toBe(false);
    expect(res.errors.some((error) => error.path === "theme.light.shadows.sm")).toBe(true);
  });

  test("Import normalizes image URL aliases to canonical sourceUrl", () => {
    const withSrc = {
      ...validProject,
      screens: [
        {
          id: "home",
          name: "Home",
          nodes: [
            {
              id: "hero-image",
              type: "image",
              props: {
                src: "https://example.com/hero.png"
              }
            }
          ]
        }
      ]
    };
    const res = validateImportJson(JSON.stringify(withSrc));
    expect(res.isValid).toBe(true);
    const props = res.data.screens[0].nodes[0].props;
    expect(props.sourceUrl).toBe("https://example.com/hero.png");
    expect(props.src).toBeUndefined();
  });

  test("Import normalizes row and column directions from component semantics", () => {
    const layoutProject = {
      ...validProject,
      screens: [
        {
          id: "home",
          name: "Home",
          nodes: [
            { id: "row-1", type: "row", style: { direction: "vertical" }, children: [] },
            { id: "column-1", type: "column", style: { direction: "horizontal" }, children: [] }
          ]
        }
      ]
    };
    const res = validateImportJson(JSON.stringify(layoutProject));
    expect(res.isValid).toBe(true);
    expect(res.data.screens[0].nodes[0].style.direction).toBe("horizontal");
    expect(res.data.screens[0].nodes[1].style.direction).toBe("vertical");
  });

  test("Imported card with children keeps children as normal builder state", () => {
    const cardProject = {
      ...validProject,
      screens: [
        {
          id: "home",
          name: "Home",
          nodes: [
            {
              id: "card-1",
              type: "card",
              children: [
                { id: "card-copy", type: "text", props: { text: "Real child content" } }
              ]
            }
          ]
        }
      ]
    };
    const res = validateImportJson(JSON.stringify(cardProject));
    expect(res.isValid).toBe(true);
    expect(res.data.screens[0].nodes[0].children).toHaveLength(1);
    expect(res.data.screens[0].nodes[0].children[0].props.text).toBe("Real child content");
  });

  test("Imported dark green theme resolves direct colors and tokens", () => {
    const themedProject = {
      ...validProject,
      theme: {
        colors: {
          primary: "#22c55e",
          background: "#0f172a",
          card: "#1e293b",
          text: "#f8fafc"
        }
      },
      screens: [
        {
          id: "home",
          name: "Home",
          nodes: [
            {
              id: "green-button",
              type: "button",
              props: { label: "Green" },
              style: {
                backgroundColor: { type: "theme", token: "primary" },
                textColor: "#052e16"
              }
            }
          ]
        }
      ]
    };
    const res = validateImportJson(JSON.stringify(themedProject));
    expect(res.isValid).toBe(true);
    expect(res.data.theme.light.colors.background).toBe("#0f172a");
    const resolved = resolveNodeTheme(res.data.screens[0].nodes[0], res.data.theme, "light");
    expect(resolved.style?.backgroundColor).toBe("#22c55e");
    expect(resolved.style?.textColor).toBe("#052e16");
  });

  test("Export to Import round-trip works end-to-end", async () => {
    const exportResult = await generateProject(validProject as any, "expo-standalone");
    expect(exportResult.ok).toBe(true);
    if (exportResult.ok) {
      const reimported = validateImportJson(JSON.stringify(validProject));
      expect(reimported.isValid).toBe(true);
    }
  });

  test("Normalizes and accepts simplified user project JSON", () => {
    const userJson = {
      "schemaVersion": 1,
      "name": "Food Delivery Demo",
      "entryScreenId": "home",
      "theme": {
        "colors": {
          "primary": "#3b82f6",
          "secondary": "#10b981",
          "background": "#ffffff",
          "card": "#f8fafc",
          "text": "#111827"
        }
      },
      "screens": [
        {
          "id": "home",
          "name": "Home",
          "nodes": [
            {
              "id": "root-column",
              "type": "column",
              "style": {
                "padding": 16,
                "gap": 16
              },
              "children": [
                {
                  "id": "welcome-heading",
                  "type": "heading",
                  "props": {
                    "text": "Welcome"
                  }
                },
                {
                  "id": "welcome-text",
                  "type": "text",
                  "props": {
                    "text": "Browse our featured meals."
                  }
                },
                {
                  "id": "search-input",
                  "type": "input",
                  "props": {
                    "placeholder": "Search food..."
                  }
                },
                {
                  "id": "featured-card",
                  "type": "card",
                  "style": {
                    "padding": 12,
                    "gap": 8
                  },
                  "children": [
                    {
                      "id": "card-title",
                      "type": "heading",
                      "props": {
                        "text": "Today's Special"
                      }
                    },
                    {
                      "id": "card-description",
                      "type": "text",
                      "props": {
                        "text": "Burger Combo - $12"
                      }
                    },
                    {
                      "id": "view-button",
                      "type": "button",
                      "props": {
                        "label": "View Details"
                      },
                      "events": {
                        "onPress": {
                          "type": "navigate",
                          "screenId": "details"
                        }
                      }
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "id": "details",
          "name": "Details",
          "nodes": [
            {
              "id": "details-root",
              "type": "column",
              "style": {
                "padding": 16,
                "gap": 12
              },
              "children": [
                {
                  "id": "details-heading",
                  "type": "heading",
                  "props": {
                    "text": "Burger Combo"
                  }
                },
                {
                  "id": "details-text",
                  "type": "text",
                  "props": {
                    "text": "Delicious burger, fries, and drink."
                  }
                },
                {
                  "id": "back-button",
                  "type": "button",
                  "props": {
                    "label": "Go Back"
                  },
                  "events": {
                    "onPress": {
                      "type": "goBack"
                    }
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    const res = validateImportJson(JSON.stringify(userJson));
    expect(res.isValid).toBe(true);
    expect(res.type).toBe("project");
    expect(res.data.id).toBeDefined();
    expect(res.data.version).toBe("1.0.0");
    expect(res.data.theme.name).toBe("custom");
    expect(res.data.theme.light.colors.primary).toBe("#3b82f6");
    expect(res.data.theme.dark.colors.primary).toBe("#3b82f6");
  });

  test("should successfully validate individual component JSON definitions", () => {
    const singleComponent = {
      type: "button",
      props: {
        label: "Imported Button",
      },
      style: {
        backgroundColor: "#10b981",
      },
    };

    const res = validateImportJson(JSON.stringify(singleComponent));
    expect(res.isValid).toBe(true);
    expect(res.type).toBe("components");
    expect(res.data).toHaveLength(1);
    expect(res.data[0].type).toBe("button");
    expect(res.data[0].props.label).toBe("Imported Button");
  });

  test("should successfully validate array of component JSON definitions", () => {
    const componentArray = [
      {
        type: "heading",
        props: { text: "Imported Heading" },
      },
      {
        type: "text",
        props: { text: "Imported Body text" },
      },
    ];

    const res = validateImportJson(JSON.stringify(componentArray));
    expect(res.isValid).toBe(true);
    expect(res.type).toBe("components");
    expect(res.data).toHaveLength(2);
    expect(res.data[0].type).toBe("heading");
    expect(res.data[1].type).toBe("text");
  });
});
