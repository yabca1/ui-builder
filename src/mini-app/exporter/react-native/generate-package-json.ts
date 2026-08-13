import type { MiniApp } from "@/mini-app/types/mini-app.types";
import { slugify } from "@/mini-app/exporter/react-native/identifiers";
import { expoSdk54 } from "@/mini-app/exporter/react-native/expo/sdk/sdk54";

export function generatePackageJson(miniApp: MiniApp): string {
  return JSON.stringify(
    {
      name: slugify(miniApp.name),
      version: miniApp.version,
      private: true,
      main: "node_modules/expo/AppEntry.js",
      scripts: {
        start: "expo start",
        android: "expo start --android",
        ios: "expo start --ios",
        web: "expo start --web",
      },
      dependencies: {
        ...expoSdk54.dependencies,
      },
      devDependencies: {
        ...expoSdk54.devDependencies,
      },
    },
    null,
    2,
  );
}
