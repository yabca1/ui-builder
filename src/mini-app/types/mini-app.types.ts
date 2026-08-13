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

export type MiniApp = {
  id: string;
  name: string;
  version: string;
  entryScreenId: string;
  screens: ScreenDefinition[];
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
