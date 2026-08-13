export type ComponentType =
  | "container"
  | "text"
  | "button"
  | "image"
  | "input"
  | "card"
  | "badge"
  | "alert"
  | "switch"
  | "slider"
  | "progress"
  | "avatar"
  | "checkbox"
  | "textarea"
  | "label"
  | "separator"
  | "radioGroup"
  | "accordion"
  | "tabs"
  | "skeleton"
  | "scrollArea"
  | "aspectRatio"
  | "pagination"
  | "row"
  | "column"
  | "heading"
  | "list";

export type MiniAppAction =
  | {
      type: "navigate";
      screenId: string;
    }
  | {
      type: "goBack";
    }
  | {
      type: "showAlert";
      message: string;
    }
  | {
      type: "setVariable";
      variable: string;
      value: unknown;
    }
  | {
      type: "showToast";
      message: string;
    };

export type MiniAppNode = {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
  events?: Record<string, MiniAppAction>;
  children?: MiniAppNode[];
};

export type ScreenDefinition = {
  id: string;
  name: string;
  nodes: MiniAppNode[];
};

export type ThemeColors = {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  background: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  mutedText: string;
};

export type ThemeSpacing = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
};

export type ThemeRadius = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type ThemeShadows = {
  sm: Record<string, unknown>;
  md: Record<string, unknown>;
  lg: Record<string, unknown>;
};

export type ThemeTypography = {
  fontFamily: string;
  headingSize: number;
  subheadingSize: number;
  bodySize: number;
  captionSize: number;
};

export type ModeTheme = {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  shadows: ThemeShadows;
  typography: ThemeTypography;
};

export type MiniAppTheme = {
  name: string;
  light: ModeTheme;
  dark: ModeTheme;
};

export type MiniApp = {
  id: string;
  name: string;
  version: string;
  entryScreenId: string;
  screens: ScreenDefinition[];
  theme?: MiniAppTheme;
};

export type MiniAppPackage = {
  manifest: {
    id: string;
    name: string;
    version: string;
    entryScreenId: string;
  };
  screens: ScreenDefinition[];
};

export type ExportTarget = "expo-mini-app" | "expo-standalone" | "react-native-cli";
