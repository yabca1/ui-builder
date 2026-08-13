import prettier from "prettier/standalone";
import estreePlugin from "prettier/plugins/estree";
import typescriptPlugin from "prettier/plugins/typescript";
import { miniAppSchema } from "@/mini-app/schema/mini-app.schema";
import type { MiniApp, MiniAppNode, ExportTarget, MiniAppTheme } from "@/mini-app/types/mini-app.types";
import { generateNavigation } from "@/mini-app/exporter/react-native/generate-navigation";
import { generatePackageJson } from "@/mini-app/exporter/react-native/generate-package-json";
import { generateScreen } from "@/mini-app/exporter/react-native/generate-screen";
import { screenComponentName, slugify, toPascalCase } from "@/mini-app/exporter/react-native/identifiers";
import { expoSdk54 } from "@/mini-app/exporter/react-native/expo/sdk/sdk54";
import {
  generateBabelConfig,
  generateGlobalCss,
  generateMetroConfig,
  generateNativeWindEnv,
  generateTailwindConfig,
} from "@/mini-app/exporter/react-native/nativewind-config";
import { themePresets } from "@/mini-app/registry/theme-presets";

export type GeneratedProjectFile = {
  path: string;
  content: string;
};

export type GenerateProjectResult =
  | {
      ok: true;
      rootFolder: string;
      files: GeneratedProjectFile[];
    }
  | {
      ok: false;
      errors: string[];
    };

async function formatCode(source: string) {
  try {
    return await prettier.format(source, {
      parser: "typescript",
      plugins: [typescriptPlugin, estreePlugin],
      semi: true,
      trailingComma: "all",
      printWidth: 90,
    });
  } catch (error) {
    console.error("Formatting error:", error);
    return source; // fallback to unformatted code if formatting fails
  }
}

function validateMiniApp(miniApp: MiniApp): string[] {
  const errors: string[] = [];

  if (!miniApp.screens || miniApp.screens.length === 0) {
    errors.push("Project must have at least one screen.");
    return errors;
  }

  const entryScreen = miniApp.screens.find((s) => s.id === miniApp.entryScreenId);
  if (!entryScreen) {
    errors.push(`Entry screen ID "${miniApp.entryScreenId}" does not exist.`);
  }

  const screenIds = new Set<string>();
  const screenNames = new Set<string>();
  for (const screen of miniApp.screens) {
    if (screenIds.has(screen.id)) {
      errors.push(`Duplicate screen ID "${screen.id}".`);
    }
    screenIds.add(screen.id);

    const nameUpper = screen.name.toUpperCase();
    if (screenNames.has(nameUpper)) {
      errors.push(`Duplicate screen name "${screen.name}".`);
    }
    screenNames.add(nameUpper);
  }

  const nodeIds = new Set<string>();
  const checkNodes = (nodes: MiniAppNode[], path: string) => {
    nodes.forEach((node, index) => {
      const nodePath = `${path}.${index}`;
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate component node ID "${node.id}" at ${nodePath}.`);
      }
      nodeIds.add(node.id);

      const action = node.events?.onPress;
      if (action && action.type === "navigate") {
        const targetScreen = miniApp.screens.find((s) => s.id === action.screenId);
        if (!targetScreen) {
          errors.push(`${nodePath}.events.onPress.screenId: Navigation target "${action.screenId}" does not exist.`);
        }
      }

      if (node.children) {
        checkNodes(node.children, `${nodePath}.children`);
      }
    });
  };

  miniApp.screens.forEach((screen, screenIndex) => {
    checkNodes(screen.nodes, `screens.${screenIndex}.nodes`);
  });

  return errors;
}

function generateReadme(miniApp: MiniApp, target: ExportTarget): string {
  const components = [...new Set(miniApp.screens.flatMap((screen) => screen.nodes.map((node) => node.type)))].sort();
  const rootFolder = slugify(miniApp.name);
  const pascalName = toPascalCase(miniApp.name);

  if (target === "expo-mini-app") {
    return `# ${miniApp.name} (Expo Mini App)

This is an embeddable Expo Mini App designed to be integrated inside a super app.

## How to integrate

1. Copy the contents of this folder into your super app's codebase (e.g. at \`src/mini-apps/${rootFolder}\`).
2. Make sure the super app has the required navigation peer dependencies installed.
3. Import the root component in your super app navigation stack or screens:

\`\`\`tsx
import { ${pascalName}MiniApp } from "./mini-apps/${rootFolder}";

export default function MiniAppScreen() {
  return <${pascalName}MiniApp />;
}
\`\`\`

## Generated Components Used
${components.map((component) => `- ${component}`).join("\n")}
`;
  }

  if (target === "expo-standalone") {
    return `# ${miniApp.name} (Expo Standalone App)

This is a complete, standalone Expo Application utilizing Expo Router.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the Expo development server:
   \`\`\`bash
   npx expo start
   \`\`\`

## Generated Components Used
${components.map((component) => `- ${component}`).join("\n")}
`;
  }

  return `# ${miniApp.name} (React Native CLI App)

This is a standard React Native CLI Application.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start Metro Bundler:
   \`\`\`bash
   npx react-native start
   \`\`\`

3. Run on Android / iOS:
   \`\`\`bash
   npx react-native run-android
   # or
   npx react-native run-ios
   \`\`\`

## Generated Components Used
${components.map((component) => `- ${component}`).join("\n")}
`;
}

function nativeWindFiles(target: "expo-mini-app" | "expo-standalone", theme?: MiniAppTheme): GeneratedProjectFile[] {
  return [
    {
      path: "global.css",
      content: generateGlobalCss(),
    },
    {
      path: "tailwind.config.js",
      content: generateTailwindConfig(target, theme),
    },
    {
      path: "metro.config.js",
      content: generateMetroConfig(),
    },
    {
      path: "babel.config.js",
      content: generateBabelConfig(),
    },
    {
      path: "nativewind-env.d.ts",
      content: generateNativeWindEnv(),
    },
  ];
}

function generateThemeFile(appTheme?: MiniAppTheme): string {
  const theme = appTheme ?? themePresets.default;
  return `import { createContext, useContext, useState } from "react";

export const themePresets = ${JSON.stringify(theme, null, 2)};

export const ThemeContext = createContext({
  mode: "light" as "light" | "dark",
  theme: themePresets.light,
  setMode: (mode: "light" | "dark") => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const value = {
    mode,
    theme: themePresets[mode],
    setMode,
  };
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
`;
}

export async function generateProject(miniApp: MiniApp, target: ExportTarget): Promise<GenerateProjectResult> {
  const parsed = miniAppSchema.safeParse(miniApp);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "miniApp"}: ${issue.message}`),
    };
  }

  const validMiniApp = parsed.data;
  const validationErrors = validateMiniApp(validMiniApp);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      errors: validationErrors,
    };
  }

  const rootFolder = slugify(validMiniApp.name);
  const files: GeneratedProjectFile[] = [];
  const pascalName = toPascalCase(validMiniApp.name);

  if (target === "expo-mini-app") {
    for (const screen of validMiniApp.screens) {
      files.push({
        path: `src/screens/${screenComponentName(screen.name)}.tsx`,
        content: await formatCode(generateScreen(screen, validMiniApp.screens, target)),
      });
    }

    files.push(
      ...nativeWindFiles("expo-mini-app", validMiniApp.theme),
      {
        path: "src/theme/theme.ts",
        content: await formatCode(generateThemeFile(validMiniApp.theme)),
      },
      {
        path: "src/navigation/MiniAppNavigator.tsx",
        content: await formatCode(generateNavigation(validMiniApp, target)),
      },
      {
        path: "src/index.ts",
        content: await formatCode(`export { ${pascalName}MiniApp } from "./${pascalName}MiniApp";`),
      },
      {
        path: `src/${pascalName}MiniApp.tsx`,
        content: await formatCode(`import "../global.css";
import React from "react";
import { MiniAppNavigator } from "./navigation/MiniAppNavigator";

export function ${pascalName}MiniApp() {
  return <MiniAppNavigator />;
}
`),
      },
      {
        path: "package.json",
        content: JSON.stringify(
          {
            name: `${rootFolder}-mini-app`,
            version: validMiniApp.version || "1.0.0",
            private: true,
            main: "src/index.ts",
            peerDependencies: {
              "react": "*",
              "react-native": "*",
              "@react-navigation/native": "*",
              "@react-navigation/native-stack": "*",
              "nativewind": "^4.0.0",
              "react-native-safe-area-context": "*",
              "react-native-screens": "*"
            },
            devDependencies: {
              "babel-preset-expo": expoSdk54.devDependencies["babel-preset-expo"],
              "prettier-plugin-tailwindcss": expoSdk54.devDependencies["prettier-plugin-tailwindcss"],
              "tailwindcss": expoSdk54.devDependencies.tailwindcss
            }
          },
          null,
          2
        ),
      },
      {
        path: "README.md",
        content: generateReadme(validMiniApp, target),
      }
    );

  } else if (target === "expo-standalone") {
    for (const screen of validMiniApp.screens) {
      const isEntry = screen.id === validMiniApp.entryScreenId;
      const slug = isEntry ? "index" : slugify(screen.name);
      files.push({
        path: `app/${slug}.tsx`,
        content: await formatCode(generateScreen(screen, validMiniApp.screens, target)),
      });
    }

    files.push(
      ...nativeWindFiles("expo-standalone", validMiniApp.theme),
      {
        path: "theme.ts",
        content: await formatCode(generateThemeFile(validMiniApp.theme)),
      },
      {
        path: "app/_layout.tsx",
        content: await formatCode(`import "../global.css";
import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
`),
      },
      {
        path: "package.json",
        content: JSON.stringify(
          {
            name: rootFolder,
            version: validMiniApp.version || "1.0.0",
            private: true,
            main: "expo-router/entry",
            scripts: {
              "start": "expo start",
              "android": "expo start --android",
              "ios": "expo start --ios",
              "web": "expo start --web"
            },
            dependencies: {
              ...expoSdk54.dependencies,
            },
            devDependencies: {
              ...expoSdk54.devDependencies,
            }
          },
          null,
          2
        ),
      },
      {
        path: "app.json",
        content: JSON.stringify(
          {
            expo: {
              name: validMiniApp.name,
              slug: rootFolder,
              version: validMiniApp.version || "1.0.0",
              orientation: "portrait",
              userInterfaceStyle: "light",
              plugins: ["expo-router", "expo-asset"],
              scheme: rootFolder,
              web: {
                bundler: "metro"
              }
            }
          },
          null,
          2
        ),
      },
      {
        path: "tsconfig.json",
        content: JSON.stringify(
          {
            extends: "expo/tsconfig.base",
            compilerOptions: {
              strict: true
            }
          },
          null,
          2
        ),
      },
      {
        path: "README.md",
        content: generateReadme(validMiniApp, target),
      }
    );

  } else {
    // react-native-cli
    for (const screen of validMiniApp.screens) {
      files.push({
        path: `src/screens/${screenComponentName(screen.name)}.tsx`,
        content: await formatCode(generateScreen(screen, validMiniApp.screens, target)),
      });
    }

    files.push(
      {
        path: "src/navigation/MiniAppNavigator.tsx",
        content: await formatCode(generateNavigation(validMiniApp, target)),
      },
      {
        path: "src/index.ts",
        content: await formatCode(`export { MiniAppNavigator } from "./navigation/MiniAppNavigator";`),
      },
      {
        path: "App.tsx",
        content: await formatCode(`import React from "react";
import { MiniAppNavigator } from "./src";

export default function App() {
  return <MiniAppNavigator />;
}
`),
      },
      {
        path: "index.js",
        content: `import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
`,
      },
      {
        path: "package.json",
        content: JSON.stringify(
          {
            name: rootFolder,
            version: validMiniApp.version || "1.0.0",
            private: true,
            scripts: {
              "android": "react-native run-android",
              "ios": "react-native run-ios",
              "start": "react-native start"
            },
            dependencies: {
              "react": "18.2.0",
              "react-native": "0.72.6",
              "@react-navigation/native": "^6.1.9",
              "@react-navigation/native-stack": "^6.9.17",
              "react-native-safe-area-context": "^4.7.4",
              "react-native-screens": "^3.27.0"
            },
            devDependencies: {
              "@babel/core": "^7.20.0",
              "@babel/preset-env": "^7.20.0",
              "@babel/runtime": "^7.20.0",
              "@types/react": "^18.2.0",
              "typescript": "^5.0.4"
            }
          },
          null,
          2
        ),
      },
      {
        path: "app.json",
        content: JSON.stringify(
          {
            name: rootFolder,
            displayName: validMiniApp.name
          },
          null,
          2
        ),
      },
      {
        path: "tsconfig.json",
        content: JSON.stringify(
          {
            compilerOptions: {
              strict: true,
              target: "esnext",
              module: "commonjs",
              allowJs: true,
              jsx: "react-native"
            }
          },
          null,
          2
        ),
      },
      {
        path: "README.md",
        content: generateReadme(validMiniApp, target),
      }
    );
  }

  return { ok: true, rootFolder, files };
}

export async function generateReactNativeProject(miniApp: MiniApp): Promise<GenerateProjectResult> {
  return generateProject(miniApp, "react-native-cli");
}
