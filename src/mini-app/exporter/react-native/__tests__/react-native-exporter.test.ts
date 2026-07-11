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

    expect(styles.stylesCode).toContain('flexDirection: "column"');
    expect(styles.stylesCode).toContain("padding: 16");
    expect(styles.stylesCode).toContain('fontWeight: "700"');
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

    expect(styles.stylesCode).toContain('flexDirection: "row"');
    expect(styles.stylesCode).toContain('justifyContent: "space-between"');
    expect(styles.stylesCode).toContain("paddingTop: 4");
    expect(styles.stylesCode).toContain("marginBottom: 8");
    expect(styles.stylesCode).toContain('flexDirection: "column"');
    expect(styles.stylesCode).toContain('alignItems: "stretch"');
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

    expect(output).toContain("<ScrollView");
    expect(output).toContain("StyleSheet.flatten(styles.scrollableRow)");
    expect(output).toContain("contentContainerStyle: { alignItems, justifyContent, ...(hasAlign ? { flexGrow: 1 } : {}) }");
    expect(imports.renderReactNativeImport()).toContain("StyleSheet");
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

    expect(styles.stylesCode).toContain("height: 3");
    expect(styles.stylesCode).toContain('backgroundColor: "#ff0000"');
    expect(styles.stylesCode).toContain("width: 5");
    expect(styles.stylesCode).toContain('backgroundColor: "#0000ff"');
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
    expect(output).toContain("<TextInput");
    expect(output).toContain('navigation.navigate("Profile")');
  });

  it("generates navigation code", () => {
    const navigation = generateNavigation(sampleMiniApp());

    expect(navigation).toContain("createNativeStackNavigator");
    expect(navigation).toContain('initialRouteName="Home"');
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
    expect(result.files.map((file) => file.path)).toContain("src/screens/HomeScreen.tsx");
    expect(result.files.map((file) => file.path)).toContain("src/navigation/MiniAppNavigator.tsx");
  });

  it("formats a complete generated screen", async () => {
    const result = await generateReactNativeProject(sampleMiniApp());
    if (!result.ok) {
      throw new Error(result.errors.join("\n"));
    }

    const homeScreen = result.files.find((file) => file.path === "src/screens/HomeScreen.tsx");
    expect(homeScreen?.content).toMatchInlineSnapshot(`
      "import React from "react";
      import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
      import type { NativeStackScreenProps } from "@react-navigation/native-stack";
      import type { MiniAppStackParamList } from "../navigation/MiniAppNavigator";

      type HomeScreenProps = NativeStackScreenProps<MiniAppStackParamList, "Home">;

      export function HomeScreen({ navigation }: HomeScreenProps) {
        return (
          <View style={styles.root}>
            <ScrollView
              className="rounded-xl"
              contentContainerClassName="gap-3"
              {...(() => {
                const { alignItems, justifyContent, ...style } = StyleSheet.flatten(
                  styles.homeContainer,
                );
                const hasAlign = alignItems !== undefined || justifyContent !== undefined;
                return {
                  style,
                  contentContainerStyle: {
                    alignItems,
                    justifyContent,
                    ...(hasAlign ? { flexGrow: 1 } : {}),
                  },
                };
              })()}
            >
              <Text className="text-zinc-900" style={styles.title}>
                {"Welcome"}
              </Text>
              <TextInput
                className="rounded-lg border border-zinc-300 px-3 py-3 text-zinc-900"
                placeholder="Email"
                defaultValue={""}
              />
              <Pressable
                className="items-center rounded-lg bg-blue-600 px-4 py-3"
                onPress={() => navigation.navigate("Profile")}
              >
                <Text className="font-semibold text-white">{"Open Profile"}</Text>
              </Pressable>
            </ScrollView>
          </View>
        );
      }

      const styles = StyleSheet.create({
        root: {
          flex: 1,
          padding: 16,
          backgroundColor: "#ffffff",
        },

        homeContainer: {
          padding: 16,
          gap: 12,
          backgroundColor: "#ffffff",
          flexDirection: "column",
        },

        title: {
          fontSize: 24,
          fontWeight: "700",
        },
      });
      "
    `);
  });

  it("generates correct Expo Mini App project structure", async () => {
    const result = await generateProject(sampleMiniApp(), "expo-mini-app");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = result.files.map((f) => f.path);
    expect(paths).toContain("src/screens/HomeScreen.tsx");
    expect(paths).toContain("src/navigation/MiniAppNavigator.tsx");
    expect(paths).toContain("src/index.ts");
    expect(paths).toContain("src/FoodMiniAppMiniApp.tsx");
    expect(paths).toContain("global.css");
    expect(paths).toContain("tailwind.config.js");
    expect(paths).toContain("metro.config.js");
    expect(paths).toContain("babel.config.js");
    expect(paths).toContain("nativewind-env.d.ts");
    expect(paths).toContain("package.json");
    expect(paths).toContain("README.md");

    const packageJson = JSON.parse(result.files.find((f) => f.path === "package.json")?.content || "{}");
    expect(packageJson.name).toBe("food-mini-app-mini-app");
    expect(packageJson.peerDependencies).toBeDefined();
    expect(packageJson.peerDependencies.nativewind).toBe("^4.0.0");
    expect(packageJson.devDependencies.tailwindcss).toBe("3.4.17");

    const tailwindConfig = result.files.find((f) => f.path === "tailwind.config.js")?.content ?? "";
    expect(tailwindConfig).toContain('presets: [require("nativewind/preset")]');
    expect(tailwindConfig).toContain('./src/**/*.{js,jsx,ts,tsx}');

    const miniAppRoot = result.files.find((f) => f.path === "src/FoodMiniAppMiniApp.tsx")?.content ?? "";
    expect(miniAppRoot).toContain('import "../global.css";');
  });

  it("generates correct Expo Standalone project structure with Expo Router app files", async () => {
    const result = await generateProject(sampleMiniApp(), "expo-standalone");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = result.files.map((f) => f.path);
    expect(paths).toContain("app/index.tsx");
    expect(paths).toContain("app/profile.tsx");
    expect(paths).toContain("app/_layout.tsx");
    expect(paths).toContain("global.css");
    expect(paths).toContain("tailwind.config.js");
    expect(paths).toContain("metro.config.js");
    expect(paths).toContain("babel.config.js");
    expect(paths).toContain("nativewind-env.d.ts");
    expect(paths).toContain("app.json");
    expect(paths).toContain("package.json");
    expect(paths).toContain("tsconfig.json");

    const appJson = JSON.parse(result.files.find((f) => f.path === "app.json")?.content || "{}");
    expect(appJson.expo.plugins).toContain("expo-router");
    expect(appJson.expo.web.bundler).toBe("metro");

    const packageJson = JSON.parse(result.files.find((f) => f.path === "package.json")?.content || "{}");
    expect(packageJson.dependencies["expo-router"]).toBeDefined();
    expect(packageJson.dependencies.nativewind).toBe("4.1.23");
    expect(packageJson.devDependencies.tailwindcss).toBe("3.4.17");
    expect(packageJson.devDependencies["babel-preset-expo"]).toBe(expoSdk54.devDependencies["babel-preset-expo"]);

    const tailwindConfig = result.files.find((f) => f.path === "tailwind.config.js")?.content ?? "";
    expect(tailwindConfig).toContain('presets: [require("nativewind/preset")]');
    expect(tailwindConfig).toContain('./app/**/*.{js,jsx,ts,tsx}');

    const metroConfig = result.files.find((f) => f.path === "metro.config.js")?.content ?? "";
    expect(metroConfig).toContain('withNativeWind(config, { input: "./global.css" })');

    const babelConfig = result.files.find((f) => f.path === "babel.config.js")?.content ?? "";
    expect(babelConfig).toContain('"nativewind/babel"');

    const layout = result.files.find((f) => f.path === "app/_layout.tsx")?.content ?? "";
    expect(layout).toContain('import "../global.css";');
  });

  it("generates correct React Native CLI project structure", async () => {
    const result = await generateProject(sampleMiniApp(), "react-native-cli");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = result.files.map((f) => f.path);
    expect(paths).toContain("src/screens/HomeScreen.tsx");
    expect(paths).toContain("src/navigation/MiniAppNavigator.tsx");
    expect(paths).toContain("App.tsx");
    expect(paths).toContain("index.js");
    expect(paths).toContain("package.json");
  });

  it("verifies generated package.json matches centralized Expo SDK 54 configuration", async () => {
    const result = await generateProject(sampleMiniApp(), "expo-standalone");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const file = result.files.find((f) => f.path === "package.json");
    expect(file).toBeDefined();
    const packageJson = JSON.parse(file!.content);

    // Verify dependencies are set correctly
    expect(packageJson.dependencies.expo).toBe(expoSdk54.dependencies.expo);
    expect(packageJson.dependencies["expo-router"]).toBe(expoSdk54.dependencies["expo-router"]);
    expect(packageJson.dependencies.react).toBe(expoSdk54.dependencies.react);
    expect(packageJson.dependencies["react-native"]).toBe(expoSdk54.dependencies["react-native"]);
    expect(packageJson.dependencies["react-native-screens"]).toBe(expoSdk54.dependencies["react-native-screens"]);
    expect(packageJson.dependencies["react-native-safe-area-context"]).toBe(expoSdk54.dependencies["react-native-safe-area-context"]);
    expect(packageJson.dependencies["react-native-gesture-handler"]).toBe(expoSdk54.dependencies["react-native-gesture-handler"]);
    expect(packageJson.dependencies["react-native-reanimated"]).toBe(expoSdk54.dependencies["react-native-reanimated"]);
    expect(packageJson.dependencies["@react-navigation/native"]).toBe(expoSdk54.dependencies["@react-navigation/native"]);
    expect(packageJson.dependencies["@react-navigation/native-stack"]).toBe(expoSdk54.dependencies["@react-navigation/native-stack"]);
    expect(packageJson.dependencies.nativewind).toBe("4.1.23");

    // Verify devDependencies
    expect(packageJson.devDependencies["@types/react"]).toBe(expoSdk54.devDependencies["@types/react"]);
    expect(packageJson.devDependencies.typescript).toBe(expoSdk54.devDependencies.typescript);
    expect(packageJson.devDependencies.tailwindcss).toBe("3.4.17");

    // Ensure no dependencies from other SDK sets are mixed in
    expect(packageJson.dependencies.expo).toContain("54.0");
    expect(packageJson.dependencies.react).toBe("19.1.0");
    expect(packageJson.dependencies["react-native"]).toBe("0.81.5");
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
    expect(output).toContain("•");
    expect(output).toContain("height: 1");
    expect(output).toContain("backgroundColor: \"#e4e4e7\"");
    expect(imports.renderReactNativeImport()).toContain("View");
    expect(imports.renderReactNativeImport()).toContain("Text");
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
});
