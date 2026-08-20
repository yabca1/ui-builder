import type { MiniApp } from "@/mini-app/types/mini-app.types";
import { routeName, screenComponentName } from "@/mini-app/exporter/react-native/identifiers";

export function generateNavigation(miniApp: MiniApp, target?: string): string {
  const imports = miniApp.screens
    .map((screen) => `import ${screenComponentName(screen.name)} from "../../presentation/screens/${screenComponentName(screen.name)}";`)
    .join("\n");
  const paramList = miniApp.screens.map((screen) => `  ${routeName(screen.name)}: undefined;`).join("\n");
  const screens = miniApp.screens
    .map(
      (screen) =>
        `      <Stack.Screen name="${routeName(screen.name)}" component={${screenComponentName(screen.name)}} />`,
    )
    .join("\n");
  const entryScreen = miniApp.screens.find((screen) => screen.id === miniApp.entryScreenId) ?? miniApp.screens[0];

  return `import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
${imports}

export type RootStackParamList = {
${paramList}
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface MainNavigatorProps {
  initialRouteName?: keyof RootStackParamList;
}

const MainNavigator: React.FC<MainNavigatorProps> = ({ initialRouteName = "${routeName(entryScreen.name)}" }) => {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
    >
${screens}
    </Stack.Navigator>
  );
};

export default MainNavigator;
`;
}

