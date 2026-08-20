import { describe, expect, it } from "vitest";
import { generateNavigation } from "@/mini-app/exporter/react-native/generate-navigation";
import { generateNode } from "@/mini-app/exporter/react-native/generate-node";
import { generateReactNativeProject, generateProject } from "@/mini-app/exporter/react-native/generate-project";
import { expoSdk54 } from "@/mini-app/exporter/react-native/expo/sdk/sdk54";
import { generateScreen } from "@/mini-app/exporter/react-native/generate-screen";
import { generateStyles } from "@/mini-app/exporter/react-native/generate-styles";
import { screenComponentName, sanitizeIdentifier } from "@/mini-app/exporter/react-native/identifiers";
import { ImportCollector } from "@/mini-app/exporter/react-native/imports";
import type { MiniApp, MiniAppNode, ScreenDefinition } from "@/mini-app/types/mini-app.types";

function sampleMiniApp(): MiniApp {
  return {
    id: "food-mini-app",
    name: "Food Mini App",
    version: "1.0.0",
    entryScreenId: "home",
    screens: [
      {
        id: "home",
        name: "Home",
        nodes: [
          {
            id: "home-container",
            type: "container",
            props: {},
            style: { padding: 16, direction: "vertical", gap: 12, backgroundColor: "#ffffff" },
            children: [
              {
                id: "title",
                type: "text",
                props: { text: "Welcome" },
                style: { fontSize: 24, fontWeight: "700" },
              },
              {
                id: "email",
                type: "input",
                props: { placeholder: "Email", defaultValue: "" },
              },
              {
                id: "open-profile",
                type: "button",
                props: { label: "Open Profile" },
                events: { onPress: { type: "navigate", screenId: "profile" } },
              },
            ],
          },
        ],
      },
      {
        id: "profile",
        name: "Profile",
        nodes: [
          {
            id: "profile-container",
            type: "container",
            props: {},
            children: [
              {
                id: "profile-title",
                type: "text",
                props: { text: "Profile" },
              },
              {
                id: "go-back",
                type: "button",
                props: { label: "Go Back" },
                events: { onPress: { type: "goBack" } },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("React Native exporter", () => {
  it("sanitizes screen and node identifiers", () => {
    expect(screenComponentName("user-profile")).toBe("UserProfileScreen");
    expect(screenComponentName("food order")).toBe("FoodOrderScreen");
    expect(sanitizeIdentifier("123 bad id", "node")).toBe("node123BadId");
  });

  it("collects only requested React Native imports", () => {
    const imports = new ImportCollector();
    imports.addReactNative("Text");
    imports.addReactNative("View");

    expect(imports.renderReactNativeImport()).toBe('import { Text, View } from "react-native";');
  });

  it("generates React Native styles from semantic styles", () => {
    const styles = generateStyles(sampleMiniApp().screens[0].nodes);

    expect(styles.styleNames.get("home-container")).toContain("flex-col");
    expect(styles.styleNames.get("home-container")).toContain("p-[16px]");
    expect(styles.styleNames.get("title")).toContain("font-bold");
  });

  it("exports shared layout semantics for row and column rules", () => {
    const styles = generateStyles([
      {
        id: "row",
        type: "row",
        props: {},
        style: {
          direction: "horizontal",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          paddingTop: 4,
          marginBottom: 8,
        },
        children: [],
      },
      {
        id: "column",
        type: "column",
        props: {},
        style: { direction: "vertical", alignment: "stretch", justifyContent: "center" },
        children: [],
      },
    ]);

    expect(styles.styleNames.get("row")).toContain("flex-row");
    expect(styles.styleNames.get("row")).toContain("justify-between");
    expect(styles.styleNames.get("row")).toContain("pt-[4px]");
    expect(styles.styleNames.get("row")).toContain("mb-[8px]");
    expect(styles.styleNames.get("column")).toContain("flex-col");
    expect(styles.styleNames.get("column")).toContain("items-stretch");
  });

  it("generates ScrollView with layout styles mapped to contentContainerStyle", () => {
    const imports = new ImportCollector();
    const rowNode = {
      id: "scrollable-row",
      type: "row" as const,
      props: {},
      style: {
        direction: "horizontal",
        alignItems: "center",
        justifyContent: "space-between",
      },
      children: [
        { id: "child-1", type: "text" as const, props: { text: "C1" } },
        { id: "child-2", type: "text" as const, props: { text: "C2" } },
      ],
    };

    const styles = generateStyles([rowNode]);
    const output = generateNode(rowNode, {
      imports,
      styleNames: styles.styleNames,
      screens: [],
    });

    expect(output).toContain("<Row");
    expect(output).toContain("scrollable={true}");
    expect(imports.getUiComponents()).toContain("Row");
  });

  it("resolves separator style properties correctly", () => {
    const styles = generateStyles([
      {
        id: "sep-h",
        type: "separator",
        props: { orientation: "horizontal" },
        style: { thickness: 3, color: "#ff0000" },
      },
      {
        id: "sep-v",
        type: "separator",
        props: { orientation: "vertical" },
        style: { thickness: 5, color: "#0000ff" },
      },
    ]);

    expect(styles.styleNames.get("sep-h")).toContain("h-[3px]");
    expect(styles.styleNames.get("sep-h")).toContain("bg-[#ff0000]");
    expect(styles.styleNames.get("sep-v")).toContain("w-[5px]");
    expect(styles.styleNames.get("sep-v")).toContain("bg-[#0000ff]");
  });

  it("generates a nested component tree", () => {
    const imports = new ImportCollector();
    const screen = sampleMiniApp().screens[0];
    const styles = generateStyles(screen.nodes);
    const output = generateNode(screen.nodes[0], {
      imports,
      styleNames: styles.styleNames,
      screens: sampleMiniApp().screens,
    });

    expect(output).toContain("<ScrollView");
    expect(output).toContain("<Text");
    expect(output).toContain("<Input");
    expect(output).toContain('navigation.navigate("Profile")');
  });

  it("generates navigation code", () => {
    const navigation = generateNavigation(sampleMiniApp());

    expect(navigation).toContain("createNativeStackNavigator");
    expect(navigation).toContain('initialRouteName = "Home"');
    expect(navigation).toContain('name="Profile"');
  });

  it("rejects invalid navigation targets before generation", async () => {
    const invalid = sampleMiniApp();
    invalid.screens[0].nodes[0].children?.push({
      id: "bad-nav",
      type: "button",
      props: { label: "Broken" },
      events: { onPress: { type: "navigate", screenId: "missing" } },
    });

    const result = await generateReactNativeProject(invalid);

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toContain(
      'screens.0.nodes.0.children.3.events.onPress.screenId: Navigation target "missing" does not exist.',
    );
  });

  it("generates a full sample project", async () => {
    const result = await generateReactNativeProject(sampleMiniApp());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.rootFolder).toBe("food-mini-app");
    expect(result.files.map((file) => file.path)).toContain("src/features/core/presentation/screens/HomeScreen.tsx");
    expect(result.files.map((file) => file.path)).toContain("src/features/core/application/routing/MainNavigator.tsx");
  });

  it("formats a complete generated screen", async () => {
    const result = await generateReactNativeProject(sampleMiniApp());
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }

    const homeScreen = result.files.find((file) => file.path === "src/features/core/presentation/screens/HomeScreen.tsx");
    expect(homeScreen).toBeDefined();
    expect(homeScreen?.content).toContain("export default function HomeScreen()");
    expect(homeScreen?.content).toContain("import { Button, Input, Text } from \"../components\";");
    expect(homeScreen?.content).toContain("navigation.navigate(\"Profile\")");
  });

  it("generates correct Expo Mini App project structure", async () => {
    const result = await generateProject(sampleMiniApp(), "expo-mini-app");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = result.files.map((f) => f.path);
    expect(paths).toContain("src/features/core/presentation/screens/HomeScreen.tsx");
    expect(paths).toContain("src/features/core/application/routing/MainNavigator.tsx");
    expect(paths).toContain("src/index.ts");
    expect(paths).toContain("src/bootstrap-food-mini-app.tsx");
    expect(paths).toContain("global.css");
    expect(paths).toContain("tailwind.config.js");
    expect(paths).toContain("metro.config.js");
    expect(paths).toContain("babel.config.js");
    expect(paths).toContain("nativewind-env.d.ts");
    expect(paths).toContain("src/features/core/presentation/components/cn.ts");
    expect(paths).toContain("src/features/core/presentation/components/Button.tsx");
    expect(paths).toContain("src/features/core/presentation/components/Card.tsx");
    expect(paths).toContain("src/features/core/presentation/components/index.ts");
    expect(paths).not.toContain("src/features/core/presentation/components/ui.tsx");
    expect(paths).toContain("package.json");
    expect(paths).toContain("README.md");

    const buttonFile = result.files.find((f) => f.path === "src/features/core/presentation/components/Button.tsx")?.content ?? "";
    expect(buttonFile).toContain('import { cn } from "./cn";');
    expect(buttonFile).toContain("export function Button");

    const componentsIndex = result.files.find((f) => f.path === "src/features/core/presentation/components/index.ts")?.content ?? "";
    expect(componentsIndex).toContain('export * from "./Button";');
    expect(componentsIndex).toContain('export * from "./Card";');

    const packageJson = JSON.parse(result.files.find((f) => f.path === "package.json")?.content || "{}");
    expect(packageJson.name).toBe("food-mini-app-mini-app");
    expect(packageJson.peerDependencies).toBeDefined();
    expect(packageJson.peerDependencies.nativewind).toBe("^4.0.0");
    expect(packageJson.devDependencies.tailwindcss).toBe("^3.4.17");

    const tailwindConfig = result.files.find((f) => f.path === "tailwind.config.js")?.content ?? "";
    expect(tailwindConfig).toContain('presets: [require("nativewind/preset")]');
    expect(tailwindConfig).toContain('./src/**/*.{js,jsx,ts,tsx}');

    const miniAppRoot = result.files.find((f) => f.path === "src/bootstrap-food-mini-app.tsx")?.content ?? "";
    expect(miniAppRoot).toContain('import React from "react";');
  });

  it("generates correct Expo Standalone project structure with Expo Router app files", async () => {
    const result = await generateProject(sampleMiniApp(), "expo-standalone");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = result.files.map((f) => f.path);
    expect(paths).toContain("src/features/core/presentation/screens/HomeScreen.tsx");
    expect(paths).toContain("src/features/core/presentation/screens/ProfileScreen.tsx");
    expect(paths).toContain("src/App.tsx");
    expect(paths).toContain("global.css");
    expect(paths).toContain("tailwind.config.js");
    expect(paths).toContain("metro.config.js");
    expect(paths).toContain("babel.config.js");
    expect(paths).toContain("nativewind-env.d.ts");
    expect(paths).toContain("src/features/core/presentation/components/Button.tsx");
    expect(paths).toContain("src/features/core/presentation/components/Card.tsx");
    expect(paths).toContain("src/features/core/presentation/components/index.ts");
    expect(paths).not.toContain("src/features/core/presentation/components/ui.tsx");
    expect(paths).toContain("app.json");
    expect(paths).toContain("package.json");
    expect(paths).toContain("tsconfig.json");

    const appJson = JSON.parse(result.files.find((f) => f.path === "app.json")?.content || "{}");
    expect(appJson.name).toBe("food-mini-app");

    const packageJson = JSON.parse(result.files.find((f) => f.path === "package.json")?.content || "{}");
    expect(packageJson.dependencies.nativewind).toBe("^4.2.2");
    expect(packageJson.devDependencies.tailwindcss).toBe("^3.4.17");

    const tailwindConfig = result.files.find((f) => f.path === "tailwind.config.js")?.content ?? "";
    expect(tailwindConfig).toContain('presets: [require("nativewind/preset")]');
    expect(tailwindConfig).toContain('./src/**/*.{js,jsx,ts,tsx}');

    const metroConfig = result.files.find((f) => f.path === "metro.config.js")?.content ?? "";
    expect(metroConfig).toContain('withNativeWind(mergeConfig(defaultConfig, config), { input: "./global.css" })');

    const babelConfig = result.files.find((f) => f.path === "babel.config.js")?.content ?? "";
    expect(babelConfig).toContain('"nativewind/babel"');

    const layout = result.files.find((f) => f.path === "src/App.tsx")?.content ?? "";
    expect(layout).toContain('import "../global.css";');
  });

  it("generates correct React Native CLI project structure", async () => {
    const result = await generateProject(sampleMiniApp(), "react-native-cli");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = result.files.map((f) => f.path);
    expect(paths).toContain("src/features/core/presentation/screens/HomeScreen.tsx");
    expect(paths).toContain("src/features/core/application/routing/MainNavigator.tsx");
    expect(paths).toContain("src/features/core/presentation/components/Button.tsx");
    expect(paths).toContain("src/features/core/presentation/components/Card.tsx");
    expect(paths).toContain("src/features/core/presentation/components/index.ts");
    expect(paths).not.toContain("src/features/core/presentation/components/ui.tsx");
    expect(paths).toContain("src/App.tsx");
    expect(paths).toContain("index.js");
    expect(paths).toContain("package.json");
    expect(paths).toContain("ios/Podfile");
    expect(paths).toContain("ios/AppDelegate.swift");
    expect(paths).toContain("ios/FoodMiniApp/Info.plist");
    expect(paths).toContain("ios/FoodMiniApp.xcodeproj/project.pbxproj");
    expect(paths).toContain("ios/FoodMiniApp.xcodeproj/xcshareddata/xcschemes/FoodMiniApp.xcscheme");
    expect(paths).toContain("ios/FoodMiniApp.xcworkspace/contents.xcworkspacedata");
    expect(paths).toContain("android/settings.gradle");
    expect(paths).toContain("android/app/build.gradle");
    expect(paths).toContain("android/app/src/main/AndroidManifest.xml");
    expect(paths).toContain("android/app/src/main/java/com/minibuilder/foodminiapp/MainActivity.kt");
    expect(paths).toContain("rspack.config.mjs");
    expect(paths).toContain("sharedDeps.js");
    expect(paths).toContain("scripts/start-dev-server.sh");
    expect(paths).toContain("scripts/archive-builds.sh");
    expect(paths).toContain("patches/@callstack__repack-dev-server@5.2.1.patch");
    expect(paths).toContain("Gemfile");
    expect(paths).toContain("Gemfile.lock");
    expect(paths).toContain("packages/miniapp-auth/package.json");

    const packageJson = JSON.parse(result.files.find((f) => f.path === "package.json")?.content || "{}");
    expect(packageJson.scripts.postinstall).toBe("patch-package");
    expect(packageJson.scripts.pods).toContain("bundle exec pod install");
    expect(packageJson.scripts.ios).toContain("--scheme FoodMiniApp");
    expect(packageJson.scripts["ios:dev"]).toContain("--scheme FoodMiniApp");
    expect(packageJson.scripts["ios:prod"]).toContain("--scheme FoodMiniApp");
    expect(packageJson.devDependencies["@callstack/repack"]).toBe("^5.2.1");
    expect(packageJson.devDependencies["@rspack/core"]).toBe("^1.3.4");
    expect(packageJson.devDependencies["patch-package"]).toBe("^8.0.1");
    expect(packageJson.dependencies["@metro/miniapp-auth"]).toBe("workspace:*");

    const podfile = result.files.find((f) => f.path === "ios/Podfile")?.content ?? "";
    expect(podfile).toContain("require.resolve(");
    expect(podfile).toContain("react-native/scripts/react_native_pods.rb");
    expect(podfile).toContain("scripts/autolinking");
    expect(podfile).toContain("use_expo_modules!");
    expect(podfile).toContain('target "FoodMiniApp" do');

    const privacyManifest = result.files.find((f) => f.path === "ios/FoodMiniApp/PrivacyInfo.xcprivacy")?.content ?? "";
    expect(privacyManifest).toContain("NSPrivacyAccessedAPICategoryUserDefaults");
    expect(privacyManifest).toContain("NSPrivacyAccessedAPICategoryDiskSpace");

    const xcodeProject = result.files.find((f) => f.path === "ios/FoodMiniApp.xcodeproj/project.pbxproj")?.content ?? "";
    expect(xcodeProject).toContain("PBXNativeTarget");
    expect(xcodeProject).toContain("[CP] Check Pods Manifest.lock");
    expect(xcodeProject).toContain("[Expo] Configure project");
    expect(xcodeProject).toContain("libPods-FoodMiniApp.a");
    expect(xcodeProject).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.foodminiapp;");
    expect(xcodeProject).not.toContain("Generated placeholder");

    const workspace = result.files.find((f) => f.path === "ios/FoodMiniApp.xcworkspace/contents.xcworkspacedata")?.content ?? "";
    expect(workspace).toContain("group:FoodMiniApp.xcodeproj");
    expect(workspace).toContain("group:Pods/Pods.xcodeproj");

    const scheme = result.files.find((f) => f.path === "ios/FoodMiniApp.xcodeproj/xcshareddata/xcschemes/FoodMiniApp.xcscheme")?.content ?? "";
    expect(scheme).toContain('BuildableName = "FoodMiniApp.app"');
    expect(scheme).toContain('BlueprintName = "FoodMiniApp"');

    const rspackConfig = result.files.find((f) => f.path === "rspack.config.mjs")?.content ?? "";
    expect(rspackConfig).toContain('exposes:');
    expect(rspackConfig).toContain('"./App": "./src/bootstrap-food-mini-app"');
  });

  it("verifies generated package.json matches centralized Expo SDK 54 configuration", async () => {
    const result = await generateProject(sampleMiniApp(), "expo-standalone");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const file = result.files.find((f) => f.path === "package.json");
    expect(file).toBeDefined();
    const packageJson = JSON.parse(file!.content);

    // Verify dependencies are set correctly
    expect(packageJson.dependencies.expo).toBe("^54.0.10");
    expect(packageJson.dependencies.react).toBe("19.1.0");
    expect(packageJson.dependencies["react-native"]).toBe("0.81.4");
    expect(packageJson.dependencies["react-native-screens"]).toBe("4.16.0");
    expect(packageJson.dependencies["react-native-safe-area-context"]).toBe("^5.6.1");
    expect(packageJson.dependencies["react-native-gesture-handler"]).toBe("^2.28.0");
    expect(packageJson.dependencies["react-native-reanimated"]).toBe("4.2.2");
    expect(packageJson.dependencies["@react-navigation/native"]).toBe("7.1.18");
    expect(packageJson.dependencies["@react-navigation/native-stack"]).toBe("7.3.27");
    expect(packageJson.dependencies.nativewind).toBe("^4.2.2");

    // Verify devDependencies
    expect(packageJson.devDependencies.tailwindcss).toBe("^3.4.17");
  });

  it("exports list components correctly with bullet styles and dividers", () => {
    const imports = new ImportCollector();
    const listNode: MiniAppNode = {
      id: "my-list",
      type: "list",
      props: {
        title: "Tasks",
        items: "Buy milk\nWalk the dog\nCode clean",
        ordered: false,
        showDividers: true,
      },
      style: {
        fontSize: 16,
        color: "#333333",
        gap: 10,
      },
    };

    const styles = generateStyles([listNode]);
    const output = generateNode(listNode, {
      imports,
      styleNames: styles.styleNames,
      screens: [],
    });

    expect(output).toContain("Tasks");
    expect(output).toContain("Buy milk");
    expect(output).toContain("Walk the dog");
    expect(output).toContain("Code clean");
    expect(output).toContain("<List");
    expect(output).toContain("items={");
    expect(output).toContain("showDividers={true}");
  });

  it("generates correct showToast and setVariable React Native actions", () => {
    const imports = new ImportCollector();
    const btnNode: MiniAppNode = {
      id: "toast-btn",
      type: "button",
      props: { label: "Toast Button" },
      events: {
        onPress: {
          type: "showToast",
          message: "Toast trigger clicked",
        },
      },
    };

    const styles = generateStyles([btnNode]);
    const output = generateNode(btnNode, {
      imports,
      styleNames: styles.styleNames,
      screens: [],
    });

    expect(output).toContain("ToastAndroid.show(");
    expect(output).toContain("Toast trigger clicked");
    expect(output).toContain("Platform.OS");
    expect(imports.renderReactNativeImport()).toContain("ToastAndroid");
    expect(imports.renderReactNativeImport()).toContain("Platform");

    // Test setVariable action state injection
    const screen: ScreenDefinition = {
      id: "details",
      name: "Details",
      nodes: [
        {
          id: "set-btn",
          type: "button",
          props: { label: "Click to set" },
          events: {
            onPress: {
              type: "setVariable",
              variable: "userName",
              value: "Alice",
            },
          },
        },
      ],
    };

    const screenCode = generateScreen(screen, [screen]);
    expect(screenCode).toContain('const [userName, setUserName] = React.useState("Alice");');
    expect(screenCode).toContain('setUserName("Alice")');
  });

  it("generates correct invokeApi action with credential source mapping", () => {
    const imports = new ImportCollector();
    const btnNode: MiniAppNode = {
      id: "api-btn",
      type: "button",
      props: { label: "Call API" },
      events: {
        onPress: {
          type: "invokeApi",
          integrationId: "int-1",
          pathId: "path-1",
          requestMappings: [
            {
              parameter: "apiKey",
              sourceType: "credential",
              sourceValue: "cred-exchange-rate",
            },
            {
              parameter: "user.address.city",
              sourceType: "static",
              sourceValue: "Addis Ababa",
            },
          ],
          responseMappings: [
            {
              responsePath: "data.user.id",
              targetVariable: "currentUser.id",
            },
          ],
        },
      },
    };

    const styles = generateStyles([btnNode]);
    const output = generateNode(btnNode, {
      imports,
      styleNames: styles.styleNames,
      screens: [],
    });

    expect(output).toContain("invokeApi(");
    expect(output).toContain('setValueByPath(params, "apiKey", credentialsResolver.get("cred-exchange-rate"))');
    expect(output).toContain('setValueByPath(params, "user.address.city", "Addis Ababa")');
    expect(output).toContain('setValueByPath(next, "id", getValueByPath(result.data, "data.user.id") ?? null)');
    expect(output).toContain('setValueByPath(next, "path-1.status", "loading")');
    const renderedImports = imports.renderReactNativeImport();
    expect(renderedImports).toContain("credentialsResolver");
    expect(renderedImports).toContain("getValueByPath");
    expect(renderedImports).toContain("invokeApi");
    expect(renderedImports).toContain("setValueByPath");
  });

  it("collects input and nested response variables for generated API screens", () => {
    const screen: ScreenDefinition = {
      id: "register",
      name: "Register",
      nodes: [
        {
          id: "first-name",
          type: "input",
          props: { placeholder: "First name", variableName: "firstName", defaultValue: "" },
        },
        {
          id: "submit",
          type: "button",
          props: { label: "Register" },
          events: {
            onPress: {
              type: "invokeApi",
              integrationId: "user-api",
              pathId: "register-user",
              requestMappings: [{ parameter: "user.firstName", sourceType: "variable", sourceValue: "firstName" }],
              responseMappings: [{ responsePath: "data.user.id", targetVariable: "currentUser.id" }],
            },
          },
        },
      ],
    };

    const screenCode = generateScreen(screen, [screen]);

    expect(screenCode).toContain('const [firstName, setFirstName] = React.useState("");');
    expect(screenCode).toContain('const [currentUser, setCurrentUser] = React.useState({"id":""});');
    expect(screenCode).toContain('const [api, setApi] = React.useState({"register-user":{"status":"idle"');
    expect(screenCode).toContain('setValueByPath(params, "user.firstName", firstName ?? "")');
  });
});
