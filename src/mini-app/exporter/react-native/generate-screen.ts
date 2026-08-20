import type { ScreenDefinition, ExportTarget, MiniAppNode, MiniAppAction } from "@/mini-app/types/mini-app.types";
import { generateNode, generateAction, stateIdentifier, stateRoot } from "@/mini-app/exporter/react-native/generate-node";
import { generateStyles } from "@/mini-app/exporter/react-native/generate-styles";
import { ImportCollector } from "@/mini-app/exporter/react-native/imports";
import { screenComponentName } from "@/mini-app/exporter/react-native/identifiers";
import { setValueByPath } from "@/mini-app/utils/path-utils";

function collectScreenVariables(nodes: MiniAppNode[], onLoadAction?: MiniAppAction): { variable: string; defaultValue: any }[] {
  const varsMap = new Map<string, any>();

  const ensureVariable = (path: string, defaultValue: any) => {
    const root = stateRoot(path);
    if (!varsMap.has(root)) {
      varsMap.set(root, path.includes(".") ? {} : defaultValue);
    }
    if (path.includes(".")) {
      const current = varsMap.get(root) ?? {};
      setValueByPath(current, path.split(".").slice(1).join("."), defaultValue);
      varsMap.set(root, current);
    }
  };

  const visitAction = (action?: MiniAppAction) => {
    if (!action) return;
    if (action.type === "setVariable") {
      ensureVariable(action.variable, action.value);
    } else if (action.type === "invokeApi") {
      ensureVariable(`api.${action.pathId}.status`, "idle");
      ensureVariable(`api.${action.pathId}.error`, null);
      ensureVariable(`api.${action.pathId}.statusCode`, null);
      if (action.responseMappings) {
        for (const mapping of action.responseMappings) {
          ensureVariable(mapping.targetVariable, "");
        }
      }
      visitAction(action.onLoading);
      visitAction(action.onLoaded);
      visitAction(action.onEmpty);
      visitAction(action.onError);
    }
  };

  const visitNode = (node: MiniAppNode) => {
    if ((node.type === "input" || node.type === "textarea") && typeof node.props.variableName === "string") {
      ensureVariable(node.props.variableName, node.props.defaultValue ?? "");
    }
    const onPress = node.events?.onPress;
    visitAction(onPress);
    node.children?.forEach(visitNode);
  };

  nodes.forEach(visitNode);
  visitAction(onLoadAction);

  return Array.from(varsMap.entries()).map(([variable, defaultValue]) => ({
    variable: stateIdentifier(variable),
    defaultValue,
  }));
}

function hasNavigationAction(nodes: MiniAppNode[]): boolean {
  const visit = (node: MiniAppNode): boolean => {
    const action = node.events?.onPress;
    if (action && (action.type === "navigate" || action.type === "goBack")) {
      return true;
    }
    return (node.children ?? []).some(visit);
  };
  return nodes.some(visit);
}

export function generateScreen(
  screen: ScreenDefinition,
  screens: ScreenDefinition[],
  target: ExportTarget = "react-native-cli",
): string {
  const imports = new ImportCollector();
  const generatedStyles = generateStyles(screen.nodes);

  const children = screen.nodes
    .map((node) =>
      generateNode(node, {
        imports,
        screens,
        target,
        styleNames: generatedStyles.styleNames,
      }),
    )
    .join("\n");

  const uniqueVars = collectScreenVariables(screen.nodes, screen.events?.onLoad);
  const stateHooks = uniqueVars
    .map(({ variable, defaultValue }) => {
      return `  const [${variable}, set${variable.charAt(0).toUpperCase() + variable.slice(1)}] = React.useState(${JSON.stringify(defaultValue)});`;
    })
    .join("\n");

  const hooksBlock = stateHooks ? `\n${stateHooks}\n` : "";

  let screenLoadEffect = "";
  /* if (screen.events?.onLoad) {
    const actionCode = generateAction(screen.events.onLoad, screens, target, imports);
    screenLoadEffect = `\n  React.useEffect(() => {\n    (${actionCode})();\n  }, []);\n`;
  } */

  let navHook = "";
  if (hasNavigationAction(screen.nodes)) {
    imports.add("@react-navigation/native", "useNavigation");
    navHook = "\n  const navigation = useNavigation<any>();\n";
  }

  imports.addReactNative("SafeAreaView");

  const componentImports = Array.from(imports.getUiComponents()).sort();
  const componentImportStr = componentImports.length > 0
    ? `import { ${componentImports.join(", ")} } from "../components";\n`
    : "";

  return `import React from "react";
${imports.renderReactNativeImport()}
${componentImportStr}
export default function ${screenComponentName(screen.name)}() {${hooksBlock}${navHook}${screenLoadEffect}  return (
    <SafeAreaView className="flex-1 bg-white">
      ${children}
    </SafeAreaView>
  );
}
`;
}
