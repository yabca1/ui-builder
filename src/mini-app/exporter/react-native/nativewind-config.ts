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

export function generateTailwindConfig(kind: NativeWindProjectKind): string {
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

  return `/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ${JSON.stringify(content, null, 4).replace(/\n/g, "\n  ")},
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;
}
