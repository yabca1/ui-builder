import type { MiniApp } from "@/mini-app/types/mini-app.types";
import { routeName, screenComponentName } from "@/mini-app/exporter/react-native/identifiers";

export function generateNavigation(miniApp: MiniApp, target?: string): string {
  const imports = miniApp.screens
    .map((screen) => `import { ${screenComponentName(screen.name)} } from "../screens/${screenComponentName(screen.name)}";`)
    .join("\n");
  const paramList = miniApp.screens.map((screen) => `  ${JSON.stringify(routeName(screen.name))}: undefined;`).join("\n");
  const screens = miniApp.screens
    .map(
      (screen) =>
        `<Stack.Screen name=${JSON.stringify(routeName(screen.name))} component={${screenComponentName(screen.name)}} />`,
    )
    .join("\n");
  const entryScreen = miniApp.screens.find((screen) => screen.id === miniApp.entryScreenId) ?? miniApp.screens[0];

  return `import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
${imports}

export type MiniAppStackParamList = {
${paramList}
};

const Stack = createNativeStackNavigator<MiniAppStackParamList>();

export function MiniAppNavigator() {
  return (
    <NavigationContainer independent>
      <Stack.Navigator initialRouteName=${JSON.stringify(routeName(entryScreen.name))}>
        ${screens}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
`;
}
