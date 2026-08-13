import type { ScreenDefinition, ExportTarget } from "@/mini-app/types/mini-app.types";
import { generateNode } from "@/mini-app/exporter/react-native/generate-node";
import { generateStyles } from "@/mini-app/exporter/react-native/generate-styles";
import { ImportCollector } from "@/mini-app/exporter/react-native/imports";
import { routeName, screenComponentName } from "@/mini-app/exporter/react-native/identifiers";

export function generateScreen(
  screen: ScreenDefinition,
  screens: ScreenDefinition[],
  target: ExportTarget = "react-native-cli",
): string {
  const imports = new ImportCollector();
  imports.addReactNative("StyleSheet");
  const rootComponent = screen.nodes.length >= 2 ? "ScrollView" : "View";
  imports.addReactNative(rootComponent);

  const generatedStyles = generateStyles(screen.nodes);
  const children = screen.nodes
    .map((node) =>
      generateNode(node, {
        imports,
        styleNames: generatedStyles.styleNames,
        screens,
        target,
      }),
    )
    .join("\n");

  if (target === "expo-standalone") {
    return `import React from "react";
${imports.renderReactNativeImport()}

export default function ${screenComponentName(screen.name)}() {
  return (
    <${rootComponent} style={styles.root}>
      ${children}
    </${rootComponent}>
  );
}

${generatedStyles.stylesCode}
`;
  }

  return `import React from "react";
${imports.renderReactNativeImport()}
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MiniAppStackParamList } from "../navigation/MiniAppNavigator";

type ${screenComponentName(screen.name)}Props = NativeStackScreenProps<
  MiniAppStackParamList,
  ${JSON.stringify(routeName(screen.name))}
>;

export function ${screenComponentName(screen.name)}({
  navigation,
}: ${screenComponentName(screen.name)}Props) {
  return (
    <${rootComponent} style={styles.root}>
      ${children}
    </${rootComponent}>
  );
}

${generatedStyles.stylesCode}
`;
}
