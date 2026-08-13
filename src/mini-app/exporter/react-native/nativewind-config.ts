type NativeWindProjectKind = "expo-mini-app" | "expo-standalone";

export function generateGlobalCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
}

export function generateNativeWindEnv(): string {
  return `/// <reference types="nativewind/types" />
`;
}

export function generateBabelConfig(): string {
  return `module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
`;
}

export function generateMetroConfig(): string {
  return `const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
`;
}

import type { MiniAppTheme } from "@/mini-app/types/mini-app.types";
import { themePresets } from "@/mini-app/registry/theme-presets";

export function generateTailwindConfig(kind: NativeWindProjectKind, appTheme?: MiniAppTheme): string {
  const content =
    kind === "expo-standalone"
      ? [
          "./app/**/*.{js,jsx,ts,tsx}",
          "./components/**/*.{js,jsx,ts,tsx}",
        ]
      : [
          "./src/**/*.{js,jsx,ts,tsx}",
          "./components/**/*.{js,jsx,ts,tsx}",
        ];

  const themeObj = appTheme ?? themePresets.default;
  const colors = themeObj.light.colors;
  const spacing = themeObj.light.spacing;
  const radius = themeObj.light.radius;
  const typography = themeObj.light.typography;

  const formattedSpacing: Record<string, string> = {};
  for (const [k, v] of Object.entries(spacing)) {
    formattedSpacing[k] = `${v}px`;
  }

  const formattedRadius: Record<string, string> = {};
  for (const [k, v] of Object.entries(radius)) {
    formattedRadius[k] = `${v}px`;
  }

  const formattedFontSize = {
    headingSize: `${typography.headingSize}px`,
    subheadingSize: `${typography.subheadingSize}px`,
    bodySize: `${typography.bodySize}px`,
    captionSize: `${typography.captionSize}px`,
  };

  const extendSection = {
    colors: colors,
    spacing: formattedSpacing,
    borderRadius: formattedRadius,
    fontSize: formattedFontSize,
  };

  return `/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ${JSON.stringify(content, null, 4).replace(/\n/g, "\n  ")},
  presets: [require("nativewind/preset")],
  theme: {
    extend: ${JSON.stringify(extendSection, null, 4).replace(/\n/g, "\n    ")},
  },
  plugins: [],
};
`;
}
