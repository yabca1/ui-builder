import type { ScreenDefinition, ExportTarget, MiniAppNode } from "@/mini-app/types/mini-app.types";
import { generateNode } from "@/mini-app/exporter/react-native/generate-node";
import { generateStyles } from "@/mini-app/exporter/react-native/generate-styles";
import { ImportCollector } from "@/mini-app/exporter/react-native/imports";
import { routeName, screenComponentName } from "@/mini-app/exporter/react-native/identifiers";

function collectSetVariableActions(nodes: MiniAppNode[]): { variable: string; value: unknown }[] {
  const actions: { variable: string; value: unknown }[] = [];
  const visit = (node: MiniAppNode) => {
    const onPress = node.events?.onPress;
    if (onPress && onPress.type === "setVariable") {
      actions.push({ variable: onPress.variable, value: onPress.value });
    }
    node.children?.forEach(visit);
  };
  nodes.forEach(visit);
  return actions;
}

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

  const variables = collectSetVariableActions(screen.nodes);
  const uniqueVars = Array.from(new Set(variables.map((v) => v.variable)));
  const stateHooks = uniqueVars
    .map((v) => {
      const action = variables.find((act) => act.variable === v);
      const initialValue = action ? action.value : "";
      return `  const [${v}, set${v.charAt(0).toUpperCase() + v.slice(1)}] = React.useState(${JSON.stringify(initialValue)});`;
    })
    .join("\n");

  const hooksBlock = stateHooks ? `\n${stateHooks}\n` : "";

  if (target === "expo-standalone") {
    return `import React from "react";
${imports.renderReactNativeImport()}

export default function ${screenComponentName(screen.name)}() {${hooksBlock}  return (
    <${rootComponent}${rootComponent === "ScrollView" ? ` {...(() => { const { alignItems, justifyContent, ...style } = StyleSheet.flatten(styles.root); const hasAlign = alignItems !== undefined || justifyContent !== undefined; return { style, contentContainerStyle: { alignItems, justifyContent, ...(hasAlign ? { flexGrow: 1 } : {}) } }; })()}` : " style={styles.root}"}>
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
}: ${screenComponentName(screen.name)}Props) {${hooksBlock}  return (
    <${rootComponent}${rootComponent === "ScrollView" ? ` {...(() => { const { alignItems, justifyContent, ...style } = StyleSheet.flatten(styles.root); const hasAlign = alignItems !== undefined || justifyContent !== undefined; return { style, contentContainerStyle: { alignItems, justifyContent, ...(hasAlign ? { flexGrow: 1 } : {}) } }; })()}` : " style={styles.root}"}>
      ${children}
    </${rootComponent}>
  );
}

${generatedStyles.stylesCode}
`;
}
