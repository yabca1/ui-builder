import prettier from "prettier/standalone";
import estreePlugin from "prettier/plugins/estree";
import typescriptPlugin from "prettier/plugins/typescript";
import { miniAppSchema } from "@/mini-app/schema/mini-app.schema";
import type { MiniApp, MiniAppNode, ExportTarget, MiniAppTheme } from "@/mini-app/types/mini-app.types";
import { generateNavigation } from "@/mini-app/exporter/react-native/generate-navigation";
import { generatePackageJson } from "@/mini-app/exporter/react-native/generate-package-json";
import { generateScreen } from "@/mini-app/exporter/react-native/generate-screen";
import { screenComponentName, slugify, toPascalCase, routeName } from "@/mini-app/exporter/react-native/identifiers";
import { expoSdk54 } from "@/mini-app/exporter/react-native/expo/sdk/sdk54";
import {
  generateBabelConfig,
  generateGlobalCss,
  generateMetroConfig,
  generateNativeWindEnv,
  generateTailwindConfig,
} from "@/mini-app/exporter/react-native/nativewind-config";
import { themePresets } from "@/mini-app/registry/theme-presets";

export type GeneratedProjectFile = {
  path: string;
  content: string;
};

export type GenerateProjectResult =
  | {
      ok: true;
      rootFolder: string;
      files: GeneratedProjectFile[];
    }
  | {
      ok: false;
      errors: string[];
    };

async function formatCode(source: string) {
  try {
    return await prettier.format(source, {
      parser: "typescript",
      plugins: [typescriptPlugin, estreePlugin],
      semi: true,
      trailingComma: "all",
      printWidth: 90,
    });
  } catch (error) {
    console.error("Formatting error:", error);
    return source; // fallback to unformatted code if formatting fails
  }
}

function validateMiniApp(miniApp: MiniApp): string[] {
  const errors: string[] = [];

  if (!miniApp.screens || miniApp.screens.length === 0) {
    errors.push("Project must have at least one screen.");
    return errors;
  }

  const entryScreen = miniApp.screens.find((s) => s.id === miniApp.entryScreenId);
  if (!entryScreen) {
    errors.push(`Entry screen ID "${miniApp.entryScreenId}" does not exist.`);
  }

  const screenIds = new Set<string>();
  const screenNames = new Set<string>();
  for (const screen of miniApp.screens) {
    if (screenIds.has(screen.id)) {
      errors.push(`Duplicate screen ID "${screen.id}".`);
    }
    screenIds.add(screen.id);

    const nameUpper = screen.name.toUpperCase();
    if (screenNames.has(nameUpper)) {
      errors.push(`Duplicate screen name "${screen.name}".`);
    }
    screenNames.add(nameUpper);
  }

  const nodeIds = new Set<string>();
  const checkNodes = (nodes: MiniAppNode[], path: string) => {
    nodes.forEach((node, index) => {
      const nodePath = `${path}.${index}`;
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate component node ID "${node.id}" at ${nodePath}.`);
      }
      nodeIds.add(node.id);

      const action = node.events?.onPress;
      if (action && action.type === "navigate") {
        const targetScreen = miniApp.screens.find((s) => s.id === action.screenId);
        if (!targetScreen) {
          errors.push(`${nodePath}.events.onPress.screenId: Navigation target "${action.screenId}" does not exist.`);
        }
      }

      if (node.children) {
        checkNodes(node.children, `${nodePath}.children`);
      }
    });
  };

  miniApp.screens.forEach((screen, screenIndex) => {
    checkNodes(screen.nodes, `screens.${screenIndex}.nodes`);
  });

  return errors;
}

function generateReadme(miniApp: MiniApp, target: ExportTarget): string {
  const components = [...new Set(miniApp.screens.flatMap((screen) => screen.nodes.map((node) => node.type)))].sort();
  const rootFolder = slugify(miniApp.name);
  const pascalName = toPascalCase(miniApp.name);

  if (target === "expo-mini-app") {
    return `# ${miniApp.name} (Expo Mini App)

This is an embeddable Expo Mini App designed to be integrated inside a super app.

## How to integrate

1. Copy the contents of this folder into your super app's codebase (e.g. at \`src/mini-apps/${rootFolder}\`).
2. Make sure the super app has the required navigation peer dependencies installed.
3. Import the root component in your super app navigation stack or screens:

\`\`\`tsx
import { ${pascalName}MiniApp } from "./mini-apps/${rootFolder}";

export default function MiniAppScreen() {
  return <${pascalName}MiniApp />;
}
\`\`\`

## Generated Components Used
${components.map((component) => `- ${component}`).join("\n")}
`;
  }

  if (target === "expo-standalone") {
    return `# ${miniApp.name} (Expo Standalone App)

This is a complete, standalone Expo Application utilizing Expo Router.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the Expo development server:
   \`\`\`bash
   npx expo start
   \`\`\`

## Generated Components Used
${components.map((component) => `- ${component}`).join("\n")}
`;
  }

  return `# ${miniApp.name} (React Native CLI App)

This is a standard React Native CLI Application.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start Metro Bundler:
   \`\`\`bash
   npx react-native start
   \`\`\`

3. Run on Android / iOS:
   \`\`\`bash
   npx react-native run-android
   # or
   npx react-native run-ios
   \`\`\`

## Generated Components Used
${components.map((component) => `- ${component}`).join("\n")}
`;
}

function nativeWindFiles(target: "expo-mini-app" | "expo-standalone", theme?: MiniAppTheme): GeneratedProjectFile[] {
  return [
    {
      path: "global.css",
      content: generateGlobalCss(),
    },
    {
      path: "tailwind.config.js",
      content: generateTailwindConfig(target, theme),
    },
    {
      path: "metro.config.js",
      content: generateMetroConfig(),
    },
    {
      path: "babel.config.js",
      content: generateBabelConfig(),
    },
    {
      path: "nativewind-env.d.ts",
      content: generateNativeWindEnv(),
    },
  ];
}

function generateThemeFile(appTheme?: MiniAppTheme): string {
  const theme = (appTheme && Object.keys(appTheme).length > 0) ? appTheme : themePresets.default;
  return `import { createContext, useContext, useState } from "react";

export const themePresets = ${JSON.stringify(theme, null, 2)};

export const ThemeContext = createContext({
  mode: "light" as "light" | "dark",
  theme: themePresets.light,
  setMode: (mode: "light" | "dark") => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const value = {
    mode,
    theme: themePresets[mode],
    setMode,
  };
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
`;
}

export function generateUiComponentsFile(): string {
  return `import React from "react";
import {
  View,
  Text as RNText,
  Pressable,
  TextInput,
  Image as RNImage,
  Switch as RNSwitch,
  ScrollView,
} from "react-native";
import Svg, { Rect, Ellipse, Polygon, Line } from "react-native-svg";

function getTailwindPropertyCategory(cls: string): string {
  if (cls.startsWith("bg-")) return "bg";
  if (cls.startsWith("text-")) return "text";
  if (cls.startsWith("border-") || cls === "border") return "border";
  if (cls.startsWith("rounded-") || cls.startsWith("rounded")) return "rounded";
  if (cls.startsWith("p-") || cls.startsWith("pt-") || cls.startsWith("pr-") || cls.startsWith("pb-") || cls.startsWith("pl-") || cls.startsWith("px-") || cls.startsWith("py-")) return "padding";
  if (cls.startsWith("m-") || cls.startsWith("mt-") || cls.startsWith("mr-") || cls.startsWith("mb-") || cls.startsWith("ml-") || cls.startsWith("mx-") || cls.startsWith("my-")) return "margin";
  if (cls.startsWith("w-") || cls.startsWith("min-w-") || cls.startsWith("max-w-")) return "width";
  if (cls.startsWith("h-") || cls.startsWith("min-h-") || cls.startsWith("max-h-")) return "height";
  if (cls.startsWith("gap-")) return "gap";
  if (cls.startsWith("flex-") || cls.startsWith("flex")) return "flex";
  if (cls.startsWith("items-")) return "items";
  if (cls.startsWith("justify-")) return "justify";
  if (cls.startsWith("font-")) return "font";
  if (cls.startsWith("leading-")) return "leading";
  if (cls.startsWith("tracking-")) return "tracking";
  if (cls.startsWith("opacity-")) return "opacity";
  return cls;
}

export function cn(...inputs: (string | undefined | null | boolean)[]) {
  const parts = inputs.filter(Boolean) as string[];
  if (parts.length <= 1) return parts[0] || "";

  const categoryMap = new Map<string, string>();
  for (const part of parts) {
    const classes = part.split(/\\\\s+/).filter(Boolean);
    for (const cls of classes) {
      const category = getTailwindPropertyCategory(cls);
      categoryMap.set(category, cls);
    }
  }

  return Array.from(categoryMap.values()).join(" ");
}

export function Button({ label, onPress, className, textClassName }: { label: string; onPress?: () => void; className?: string; textClassName?: string }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn("items-center justify-center rounded-lg bg-blue-600 px-4 py-3 active:opacity-90", className)}
    >
      <RNText className={cn("font-semibold text-white text-center", textClassName)}>{label}</RNText>
    </Pressable>
  );
}

export function Badge({ text, variant = "default", className }: { text: string; variant?: "default" | "secondary" | "destructive" | "outline"; className?: string }) {
  let bgClass = "bg-zinc-900";
  let textClass = "text-zinc-50";
  if (variant === "secondary") { bgClass = "bg-zinc-100"; textClass = "text-zinc-900"; }
  if (variant === "destructive") { bgClass = "bg-red-500"; textClass = "text-zinc-50"; }
  if (variant === "outline") { bgClass = "border border-zinc-200 bg-white"; textClass = "text-zinc-900"; }
  return (
    <View className={cn(\`self-start px-2.5 py-0.5 rounded-full \${bgClass}\`, className)}>
      <RNText className={\`text-xs font-semibold \${textClass}\`}>{text}</RNText>
    </View>
  );
}

export function Alert({ title, description, variant = "default", className }: { title: string; description?: string; variant?: "default" | "destructive"; className?: string }) {
  const isDestructive = variant === "destructive";
  const bgClass = isDestructive ? "border border-red-200 bg-red-50" : "border border-zinc-200 bg-white";
  const titleClass = isDestructive ? "text-red-900 font-semibold text-sm" : "text-zinc-950 font-semibold text-sm";
  const descClass = isDestructive ? "text-red-800 text-xs mt-1" : "text-zinc-500 text-xs mt-1";
  return (
    <View className={cn(\`p-4 rounded-lg border \${bgClass}\`, className)}>
      <RNText className={titleClass}>{title}</RNText>
      {description ? <RNText className={descClass}>{description}</RNText> : null}
    </View>
  );
}

export function Card({ title, description, children, className }: { title?: string; description?: string; children?: React.ReactNode; className?: string }) {
  const hasHeader = title || description;
  return (
    <View className={cn("border border-zinc-200 bg-white rounded-xl shadow-sm overflow-hidden", className)}>
      {hasHeader && (
        <View className="border-b border-zinc-100 p-4">
          {title && <RNText className="font-semibold text-zinc-900">{title}</RNText>}
          {description && <RNText className="text-zinc-500 text-xs mt-1">{description}</RNText>}
        </View>
      )}
      <View className="p-4 gap-3">{children}</View>
    </View>
  );
}

export function Input({ placeholder, defaultValue, value, onChangeText, className }: { placeholder?: string; defaultValue?: string; value?: string; onChangeText?: (text: string) => void; className?: string }) {
  return (
    <TextInput
      className={cn("rounded-lg border border-zinc-300 px-3 py-3 text-zinc-900 bg-white", className)}
      placeholder={placeholder}
      placeholderTextColor="#a1a1aa"
      defaultValue={defaultValue}
      value={value}
      onChangeText={onChangeText}
    />
  );
}

export function TextArea({ placeholder, defaultValue, value, onChangeText, className }: { placeholder?: string; defaultValue?: string; value?: string; onChangeText?: (text: string) => void; className?: string }) {
  return (
    <TextInput
      className={cn("rounded-lg border border-zinc-300 px-3 py-3 text-zinc-900 align-top bg-white", className)}
      placeholder={placeholder}
      placeholderTextColor="#a1a1aa"
      defaultValue={defaultValue}
      value={value}
      onChangeText={onChangeText}
      multiline={true}
      numberOfLines={4}
    />
  );
}

export function Checkbox({ label, checked = false, onChange, className }: { label?: string; checked?: boolean; onChange?: (checked: boolean) => void; className?: string }) {
  return (
    <Pressable
      onPress={() => onChange?.(!checked)}
      className={cn("flex-row items-center gap-2 py-1.5", className)}
    >
      <View className={cn(\`h-4 w-4 rounded-sm border border-zinc-300 items-center justify-center \${checked ? "bg-zinc-900 border-zinc-900" : "bg-white"}\`)}>
        {checked && <RNText className="text-[10px] leading-3 text-white">âœ“</RNText>}
      </View>
      {label && <RNText className="text-sm text-zinc-900">{label}</RNText>}
    </Pressable>
  );
}

export function Switch({ label, checked = false, onChange, className }: { label?: string; checked?: boolean; onChange?: (checked: boolean) => void; className?: string }) {
  return (
    <View className={cn("flex-row items-center gap-2 py-1", className)}>
      <RNSwitch value={checked} onValueChange={onChange} />
      {label && <RNText className="text-sm text-zinc-900">{label}</RNText>}
    </View>
  );
}

export function Slider({ label, min = 0, max = 100, value = 50, onChange, className }: { label?: string; min?: number; max?: number; value?: number; onChange?: (val: number) => void; className?: string }) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <View className={cn("w-full py-2", className)}>
      <View className="flex-row justify-between mb-1.5">
        {label && <RNText className="text-xs font-semibold text-zinc-700">{label}</RNText>}
        <RNText className="text-xs text-zinc-500">{value}</RNText>
      </View>
      <View className="h-2 bg-zinc-100 rounded-full w-full justify-center relative">
        <View className={cn("h-full bg-zinc-900 rounded-full", "w-[" + percentage + "%]")} />
        <View className={cn("absolute h-5 w-5 rounded-full border border-zinc-200 bg-white shadow-sm -ml-[10px]", "left-[" + percentage + "%]")} />
      </View>
    </View>
  );
}

export function Progress({ value = 60, max = 100, className }: { value?: number; max?: number; className?: string }) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <View className={cn("h-2.5 bg-zinc-100 rounded-full w-full overflow-hidden", className)}>
      <View className={cn("h-full bg-zinc-900", "w-[" + percentage + "%]")} />
    </View>
  );
}

export function Avatar({ sourceUrl, fallbackText, size = 40, className }: { sourceUrl?: string; fallbackText?: string; size?: number; className?: string }) {
  const sizeClassName = "h-[" + size + "px] w-[" + size + "px] rounded-[" + size / 2 + "px]";
  if (sourceUrl) {
    return (
      <RNImage
        className={cn("bg-zinc-100", sizeClassName, className)}
        source={typeof sourceUrl === "string" && (sourceUrl.startsWith("http") || sourceUrl.startsWith("data:")) ? { uri: sourceUrl } : sourceUrl as any}
      />
    );
  }
  return (
    <View className={cn("bg-zinc-100 items-center justify-center", sizeClassName, className)}>
      <RNText className="text-xs font-semibold text-zinc-600">{fallbackText}</RNText>
    </View>
  );
}

export function Accordion({ title, description, children, className }: { title: string; description?: string; children?: React.ReactNode; className?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <View className={cn("border border-zinc-200 bg-white rounded-lg overflow-hidden", className)}>
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row justify-between items-center px-4 py-3 bg-zinc-50/50"
      >
        <RNText className="font-semibold text-zinc-700 text-sm">{title}</RNText>
        <RNText className="text-zinc-500 text-xs">{isOpen ? "â–²" : "â–¼"}</RNText>
      </Pressable>
      {isOpen && (
        <View className="p-4 gap-2 border-t border-zinc-100 bg-white">
          {children ? children : description ? <RNText className="text-xs text-zinc-500">{description}</RNText> : null}
        </View>
      )}
    </View>
  );
}

export function Tabs({ tabs, children, className }: { tabs: string[]; children?: React.ReactNode; className?: string }) {
  const [activeIdx, setActiveIdx] = React.useState(0);
  return (
    <View className={cn("border border-zinc-200 bg-white rounded-lg overflow-hidden", className)}>
      <View className="flex-row border-b border-zinc-200 bg-zinc-50/50 p-1 gap-1">
        {tabs.map((tab, idx) => {
          const isActive = idx === activeIdx;
          return (
            <Pressable
              key={idx}
              onPress={() => setActiveIdx(idx)}
              className={cn(
                "px-3 py-1.5 rounded-md flex-1 items-center justify-center",
                isActive ? "bg-white border border-zinc-200 shadow-sm" : "bg-transparent"
              )}
            >
              <RNText className={cn("text-xs font-semibold", isActive ? "text-zinc-900" : "text-zinc-500")}>
                {tab}
              </RNText>
            </Pressable>
          );
        })}
      </View>
      <View className="p-4 gap-2 bg-white">
        {children ? (
          children
        ) : (
          <RNText className="text-xs text-zinc-500 text-center py-2">Tab {activeIdx + 1} Content</RNText>
        )}
      </View>
    </View>
  );
}

export function Separator({ orientation = "horizontal", className }: { orientation?: "horizontal" | "vertical"; className?: string }) {
  const lineStyle = orientation === "horizontal" ? "h-[1px] w-full" : "w-[1px] h-full min-h-[20px]";
  return <View className={cn(\`bg-zinc-200 \${lineStyle}\`, className)} />;
}

export function RadioGroup({
  label,
  options,
  selectedValue,
  onValueChange,
  className,
}: {
  label?: string;
  options: string[];
  selectedValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <View className={cn("gap-2 py-1", className)}>
      {label && <RNText className="text-xs font-semibold text-zinc-500">{label}</RNText>}
      {options.map((option, idx) => {
        const isSelected = option === selectedValue;
        return (
          <Pressable
            key={idx}
            onPress={() => onValueChange?.(option)}
            className="flex-row items-center gap-2"
          >
            <View
              className={cn(
                "h-4 w-4 rounded-full border items-center justify-center bg-white",
                isSelected ? "border-zinc-900" : "border-zinc-300"
              )}
            >
              {isSelected && <View className="h-2 w-2 rounded-full bg-zinc-900" />}
            </View>
            <RNText className="text-sm text-zinc-900">{option}</RNText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <View className={cn("bg-zinc-200 rounded-sm", className)} />;
}

export function ScrollArea({ children, className, contentContainerClassName }: { children?: React.ReactNode; className?: string; contentContainerClassName?: string }) {
  return (
    <ScrollView className={cn("w-full", className)} contentContainerClassName={contentContainerClassName}>
      {children}
    </ScrollView>
  );
}

export function AspectRatio({ ratio = 1.77, children, className }: { ratio?: number; children: React.ReactNode; className?: string }) {
  return (
    <View className={cn("w-full overflow-hidden", "aspect-[" + ratio + "]", className)}>
      {children}
    </View>
  );
}

export function Row({ children, className, scrollable = false }: { children?: React.ReactNode; className?: string; scrollable?: boolean }) {
  if (scrollable) {
    return (
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        className={cn("w-full", className)}
        contentContainerClassName="flex-row items-center gap-2"
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View className={cn("flex-row items-center gap-2", className)}>
      {children}
    </View>
  );
}

export function Column({ children, className, scrollable = false }: { children?: React.ReactNode; className?: string; scrollable?: boolean }) {
  if (scrollable) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        className={cn("w-full", className)}
        contentContainerClassName="flex-col gap-2"
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View className={cn("flex-col gap-2", className)}>
      {children}
    </View>
  );
}

export function Heading({ text, level = 1, className }: { text: string; level?: 1 | 2 | 3; className?: string }) {
  const sizeClass = level === 1 ? "text-2xl font-bold" : level === 2 ? "text-xl font-bold" : "text-lg font-bold";
  return (
    <RNText className={cn(\`text-zinc-900 \${sizeClass}\`, className)}>{text}</RNText>
  );
}

export function Label({ text, className }: { text: string; className?: string }) {
  return (
    <RNText className={cn("text-sm font-semibold text-zinc-700", className)}>{text}</RNText>
  );
}

export function List({
  title,
  items,
  ordered = false,
  showDividers = false,
  className,
}: {
  title?: string;
  items: string[];
  ordered?: boolean;
  showDividers?: boolean;
  className?: string;
}) {
  return (
    <View className={className}>
      {title && <RNText className="text-base font-semibold text-zinc-900 mb-2">{title}</RNText>}
      <View className={showDividers ? "" : "gap-2"}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const prefix = ordered ? String(idx + 1) + "." : "•";
          return (
            <View key={idx} className={showDividers && !isLast ? "border-b border-zinc-200 pb-2 mb-2" : ""}>
              <View className="flex-row items-start">
                <RNText className="text-sm text-zinc-600 mr-2 opacity-60">{prefix}</RNText>
                <RNText className="text-sm text-zinc-900 flex-1">{item}</RNText>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function Shape({
  shapeType = "rectangle",
  width = 100,
  height = 100,
  rx = 0,
  fill = "#3b82f6",
  stroke = "transparent",
  strokeWidth = 0,
  className,
}: {
  shapeType?: string;
  width?: number;
  height?: number;
  rx?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}) {
  let elementStr: React.ReactNode = null;
  if (shapeType === "rectangle") {
    elementStr = <Rect x={strokeWidth / 2} y={strokeWidth / 2} width={width - strokeWidth} height={height - strokeWidth} rx={rx} ry={rx} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  } else if (shapeType === "ellipse") {
    elementStr = <Ellipse cx={width / 2} cy={height / 2} rx={(width - strokeWidth) / 2} ry={(height - strokeWidth) / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  } else if (shapeType === "triangle") {
    const p1 = \`\${width / 2},\${strokeWidth}\`;
    const p2 = \`\${width - strokeWidth},\${height - strokeWidth}\`;
    const p3 = \`\${strokeWidth},\${height - strokeWidth}\`;
    elementStr = <Polygon points={\`\${p1} \${p2} \${p3}\`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
  } else if (shapeType === "star") {
    const cx = width / 2;
    const cy = height / 2;
    const spikes = 5;
    const outerRadius = (Math.min(width, height) - strokeWidth) / 2;
    const innerRadius = outerRadius * 0.4;
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    const points: string[] = [];
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      points.push(\`\${Math.round(x)},\${Math.round(y)}\`);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      points.push(\`\${Math.round(x)},\${Math.round(y)}\`);
      rot += step;
    }
    elementStr = <Polygon points={points.join(" ")} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
  } else if (shapeType === "line") {
    elementStr = <Line x1={strokeWidth} y1={height / 2} x2={width - strokeWidth} y2={height / 2} stroke={fill} strokeWidth={strokeWidth || 2} strokeLinecap="round" />;
  }

  return (
    <View className={className}>
      <Svg width={width} height={height}>
        {elementStr}
      </Svg>
    </View>
  );
}

export function Image({ source, className }: { source: any; className?: string }) {
  return <RNImage className={cn("rounded-lg", className)} source={source} />;
}

export function Text({ text, className }: { text: string; className?: string }) {
  return <RNText className={cn("text-zinc-900", className)}>{text}</RNText>;
}
`;
}

function splitUiComponentSources(): { name: string; source: string }[] {
  const source = generateUiComponentsFile();
  const matches = [...source.matchAll(/^export function (\w+)/gm)];

  return matches
    .map((match, index) => {
      const name = match[1];
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? source.length;
      return {
        name,
        source: source.slice(start, end).trim(),
      };
    })
    .filter((component) => component.name !== "cn");
}

function generateCnFile(): string {
  return `function getTailwindPropertyCategory(cls: string): string {
  if (cls.startsWith("bg-")) return "bg";
  if (cls.startsWith("text-")) return "text";
  if (cls.startsWith("border-") || cls === "border") return "border";
  if (cls.startsWith("rounded-") || cls.startsWith("rounded")) return "rounded";
  if (cls.startsWith("p-") || cls.startsWith("pt-") || cls.startsWith("pr-") || cls.startsWith("pb-") || cls.startsWith("pl-") || cls.startsWith("px-") || cls.startsWith("py-")) return "padding";
  if (cls.startsWith("m-") || cls.startsWith("mt-") || cls.startsWith("mr-") || cls.startsWith("mb-") || cls.startsWith("ml-") || cls.startsWith("mx-") || cls.startsWith("my-")) return "margin";
  if (cls.startsWith("w-") || cls.startsWith("min-w-") || cls.startsWith("max-w-")) return "width";
  if (cls.startsWith("h-") || cls.startsWith("min-h-") || cls.startsWith("max-h-")) return "height";
  if (cls.startsWith("gap-")) return "gap";
  if (cls.startsWith("flex-") || cls.startsWith("flex")) return "flex";
  if (cls.startsWith("items-")) return "items";
  if (cls.startsWith("justify-")) return "justify";
  if (cls.startsWith("font-")) return "font";
  if (cls.startsWith("leading-")) return "leading";
  if (cls.startsWith("tracking-")) return "tracking";
  if (cls.startsWith("opacity-")) return "opacity";
  return cls;
}

export function cn(...inputs: (string | undefined | null | boolean)[]) {
  const parts = inputs.filter(Boolean) as string[];
  if (parts.length <= 1) return parts[0] || "";

  const categoryMap = new Map<string, string>();
  for (const part of parts) {
    const classes = part.split(/\\s+/).filter(Boolean);
    for (const cls of classes) {
      const category = getTailwindPropertyCategory(cls);
      categoryMap.set(category, cls);
    }
  }

  return Array.from(categoryMap.values()).join(" ");
}
`;
}

function generateUiComponentFile(componentSource: string): string {
  return `import React from "react";
import {
  Image as RNImage,
  Pressable,
  ScrollView,
  Switch as RNSwitch,
  Text as RNText,
  TextInput,
  View,
} from "react-native";
import Svg, { Ellipse, Line, Polygon, Rect } from "react-native-svg";
import { cn } from "./cn";

${componentSource}
`;
}

async function generateUiComponentFiles(basePath: string): Promise<GeneratedProjectFile[]> {
  const components = splitUiComponentSources();
  const files: GeneratedProjectFile[] = [
    {
      path: `${basePath}/cn.ts`,
      content: await formatCode(generateCnFile()),
    },
  ];

  for (const component of components) {
    files.push({
      path: `${basePath}/${component.name}.tsx`,
      content: await formatCode(generateUiComponentFile(component.source)),
    });
  }

  files.push({
    path: `${basePath}/index.ts`,
    content: await formatCode(
      [
        'export * from "./cn";',
        ...components.map((component) => `export * from "./${component.name}";`),
      ].join("\n"),
    ),
  });

  return files;
}

function generateTailwindConfigForCleanApp(appTheme?: MiniAppTheme): string {
  const content = [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ];

  const themeObj = (appTheme && Object.keys(appTheme).length > 0) ? appTheme : themePresets.default;
  const colors = themeObj.light.colors;
  const spacing = themeObj.light.spacing;
  const radius = themeObj.light.radius;
  const typography = themeObj.light.typography;

  const formattedSpacing: Record<string, string> = {};
  for (const [k, v] of Object.entries(spacing)) {
    formattedSpacing[k] = `${v}px`;
  }

  const formattedRadius: Record<string, string> = {};
  for (const [k, v] of Object.entries(radius)) {
    formattedRadius[k] = `${v}px`;
  }

  const formattedFontSize = {
    headingSize: `${typography.headingSize}px`,
    subheadingSize: `${typography.subheadingSize}px`,
    bodySize: `${typography.bodySize}px`,
    captionSize: `${typography.captionSize}px`,
  };

  const extendSection = {
    colors: colors,
    spacing: formattedSpacing,
    borderRadius: formattedRadius,
    fontSize: formattedFontSize,
  };

  return `/** @type {import("tailwindcss").Config} */
module.exports = {
  darkMode: "class",
  content: ${JSON.stringify(content, null, 2)},
  presets: [require("nativewind/preset")],
  theme: {
    extend: ${JSON.stringify(extendSection, null, 2)},
  },
  plugins: [],
};
`;
}

function generateRspackConfig(rootFolder: string): string {
  return `import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as Repack from "@callstack/repack";
import rspack from "@rspack/core";
import getSharedDependencies from "./sharedDeps.js";
import { ExpoModulesPlugin } from "@callstack/repack-plugin-expo-modules";
import { NativeWindPlugin } from "@callstack/repack-plugin-nativewind";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STANDALONE = Boolean(process.env.STANDALONE);

function readEnvFileValue(key) {
  const envFile = process.env.ENVFILE || ".env";
  try {
    const raw = fs.readFileSync(path.resolve(__dirname, envFile), "utf8");
    for (const line of raw.split(/\\r?\\n/)) {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
      const [candidate, ...rest] = line.split("=");
      if (candidate.trim() === key) return rest.join("=").trim();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

const DEV_PORT = (process.env.MINIAPP_DEV_PORT || readEnvFileValue("MINIAPP_DEV_PORT") || "9005").trim();
const DEV_HOST = (process.env.MINIAPP_DEV_HOST || readEnvFileValue("MINIAPP_DEV_HOST") || "127.0.0.1").trim();
const APP_NAME = (process.env.MINIAPP_NAME || readEnvFileValue("MINIAPP_NAME") || "${rootFolder}").trim();
const APP_VERSION = (process.env.MINIAPP_VERSION || readEnvFileValue("MINIAPP_VERSION") || "1.0.0").trim();
const CDN_BASE_URL = (process.env.MINIAPP_CDN_BASE_URL || readEnvFileValue("MINIAPP_CDN_BASE_URL") || "https://cdn.metro.example.com").replace(/\\/$/, "");

const assetTransformRules = Repack.getAssetTransformRules();
for (const rule of assetTransformRules) {
  if (rule?.use?.loader === "@callstack/repack/assets-loader") {
    try {
      rule.test = Repack.ReactNative.getAssetExtensionsRegExp(
        Repack.ReactNative.ASSET_EXTENSIONS.filter((ext) => ext !== "svg"),
      );
    } catch {}
  }
}

export default (env) => {
  const { mode, devServer, platform } = env;
  const publicPath = devServer
    ? \`http://\${DEV_HOST}:\${DEV_PORT}/\`
    : \`\${CDN_BASE_URL}/\${APP_NAME}/\${APP_VERSION}/\${platform}/\`;

  const keyPath = path.join(__dirname, "keys", "private_rsa.pem");
  const codeSigningEnabled = mode === "production" && fs.existsSync(keyPath);

  return {
    mode,
    context: __dirname,
    entry: "./index.js",
    experiments: { incremental: false },
    resolve: {
      ...Repack.getResolveOptions(),
      alias: {
        "@metro/miniapp-auth": path.resolve(__dirname, "packages/miniapp-auth/src"),
      },
    },
    output: {
      uniqueName: \`sas-\${APP_NAME}\`,
      publicPath,
    },
    module: {
      rules: [
        {
          test: /\\.lottie$/,
          type: "asset/resource",
          generator: { filename: "assets/[hash][ext][query]" },
        },
        {
          test: /\\.svg$/,
          use: [{ loader: "@svgr/webpack", options: { native: true } }],
        },
        {
          test: /\\.[cm]?[jt]sx?$/,
          type: "javascript/auto",
          use: {
            loader: "@callstack/repack/babel-loader",
            options: { sourceMaps: true },
          },
        },
        ...assetTransformRules,
      ],
    },
    plugins: [
      new Repack.RepackPlugin(),
      new ExpoModulesPlugin(),
      new NativeWindPlugin({ input: "./global.css" }),
      new Repack.plugins.ModuleFederationPluginV2({
        name: APP_NAME,
        filename: \`\${APP_NAME}.container.bundle\`,
        dts: false,
        exposes: {
          "./App": "./src/bootstrap-${rootFolder}",
        },
        shared: getSharedDependencies({ eager: STANDALONE, standalone: STANDALONE }),
        federationOptions: {
          enableThemeContextSharing: true,
          androidOptimizations: true,
        },
      }),
      new Repack.plugins.CodeSigningPlugin({
        enabled: codeSigningEnabled,
        privateKeyPath: keyPath,
      }),
      new rspack.IgnorePlugin({ resourceRegExp: /^@react-native-masked-view/ }),
    ],
  };
};
`;
}

function generateSharedDeps(): string {
  return `const HOST_ONLY_MODULES = new Set([
  "react-native-gesture-handler",
  "react-native-reanimated",
  "react-native-safe-area-context",
  "react-native-screens",
  "react-native-svg",
  "@react-native-async-storage/async-storage",
  "react-native-worklets",
  "nativewind",
  "react-native-css-interop",
]);

const CRITICAL_SINGLETONS = new Set([
  "react",
  "react-native",
  "react-native-paper",
  "@react-navigation/native",
  "@react-navigation/native-stack",
  "react-native-gesture-handler",
  "react-native-reanimated",
  "react-native-safe-area-context",
  "react-native-screens",
  "@react-native-async-storage/async-storage",
  "react-redux",
  "@reduxjs/toolkit",
  "@tanstack/react-query",
  "@metro/miniapp-auth",
  "expo-asset",
  "expo-constants",
  "expo-modules-core",
  "react-native-css-interop",
  "nativewind",
]);

const STRICT_SINGLETONS = new Set(["react", "react-native"]);

const normalizeRequiredVersion = (versionSpec, fallbackVersion) => {
  if (!versionSpec || versionSpec === "*" || versionSpec.startsWith("workspace:")) return false;
  return String(versionSpec || fallbackVersion).trim();
};

const resolveInstalledVersion = (dep, fallbackVersion) => {
  try {
    return require(\`\${dep}/package.json\`).version || fallbackVersion;
  } catch {
    return (fallbackVersion || "").replace(/^[~^]/, "");
  }
};

const buildSharedConfig = (dep, versionSpec, eagerByDefault, standalone) => {
  const installedVersion = resolveInstalledVersion(dep, versionSpec);
  const isHostOnly = !standalone && HOST_ONLY_MODULES.has(dep);

  return {
    singleton: true,
    eager: CRITICAL_SINGLETONS.has(dep) || dep.startsWith("@react-navigation/") ? true : eagerByDefault,
    requiredVersion: normalizeRequiredVersion(versionSpec, installedVersion),
    version: installedVersion,
    strictVersion: STRICT_SINGLETONS.has(dep),
    ...(isHostOnly ? { import: false } : {}),
  };
};

const getSharedDependencies = ({ eager = true, standalone = false } = {}) => {
  const { dependencies = {} } = require("./package.json");
  const shared = Object.fromEntries(
    Object.entries(dependencies)
      .filter(([dep]) => dep !== "@module-federation/enhanced")
      .map(([dep, versionSpec]) => [dep, buildSharedConfig(dep, versionSpec, eager, standalone)]),
  );

  shared["react-native-css-interop/jsx-runtime"] = buildSharedConfig(
    "react-native-css-interop",
    dependencies["react-native-css-interop"],
    eager,
    standalone,
  );
  shared["nativewind/jsx-runtime"] = buildSharedConfig("nativewind", dependencies.nativewind, eager, standalone);

  return shared;
};

module.exports = getSharedDependencies;
`;
}

function generateGemfile(): string {
  return `source "https://rubygems.org"

ruby ">= 2.6.10"

gem "cocoapods", ">= 1.13", "!= 1.15.0", "!= 1.15.1"
gem "activesupport", ">= 6.1.7.5", "!= 7.1.0"
gem "xcodeproj", "< 1.26.0"
gem "concurrent-ruby", "< 1.3.4"

gem "bigdecimal"
gem "logger"
gem "benchmark"
gem "mutex_m"
`;
}

function generateGemfileLock(): string {
  return `GEM
  remote: https://rubygems.org/
  specs:
    activesupport (6.1.7.10)
      concurrent-ruby (~> 1.0, >= 1.0.2)
      i18n (>= 1.6, < 2)
      minitest (>= 5.1)
      tzinfo (~> 2.0)
      zeitwerk (~> 2.3)
    benchmark (0.4.1)
    bigdecimal (3.3.0)
    cocoapods (1.15.2)
      cocoapods-core (= 1.15.2)
    concurrent-ruby (1.3.3)
    logger (1.7.0)
    mutex_m (0.3.0)
    xcodeproj (1.25.1)

PLATFORMS
  arm64-darwin-24

DEPENDENCIES
  activesupport (>= 6.1.7.5, != 7.1.0)
  benchmark
  bigdecimal
  cocoapods (>= 1.13, != 1.15.1, != 1.15.0)
  concurrent-ruby (< 1.3.4)
  logger
  mutex_m
  xcodeproj (< 1.26.0)

RUBY VERSION
   ruby 2.6.10p210

BUNDLED WITH
   2.4.20
`;
}

function nativePackageName(rootFolder: string): string {
  const normalized = rootFolder.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
  return `com.minibuilder.${normalized || "miniapp"}`;
}

function androidScaffoldFiles(rootFolder: string): GeneratedProjectFile[] {
  const appId = nativePackageName(rootFolder);
  const javaPath = appId.replace(/\./g, "/");
  const appClassName = toPascalCase(rootFolder);

  return [
    {
      path: "android/settings.gradle",
      content: `pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings") }
extensions.configure(com.facebook.react.ReactSettingsExtension) { ex -> ex.autolinkLibrariesFromCommand() }
rootProject.name = "${appClassName}"
include ":app"
includeBuild("../node_modules/@react-native/gradle-plugin")
`,
    },
    {
      path: "android/build.gradle",
      content: `buildscript {
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 24
        compileSdkVersion = 35
        targetSdkVersion = 35
        ndkVersion = "27.1.12297006"
        kotlinVersion = "2.1.20"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
    }
}

apply plugin: "com.facebook.react.rootproject"
`,
    },
    {
      path: "android/gradle.properties",
      content: `org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
android.useAndroidX=true
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
newArchEnabled=true
hermesEnabled=true
`,
    },
    {
      path: "android/gradle/wrapper/gradle-wrapper.properties",
      content: `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.1-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`,
    },
    {
      path: "android/app/build.gradle",
      content: `apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

react {
    autolinkLibrariesWithApp()
}

def enableProguardInReleaseBuilds = false
def jscFlavor = "io.github.react-native-community:jsc-android:2026004.+"

android {
    ndkVersion rootProject.ext.ndkVersion
    buildToolsVersion rootProject.ext.buildToolsVersion
    compileSdk rootProject.ext.compileSdkVersion

    namespace "${appId}"
    defaultConfig {
        applicationId "${appId}"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
    }
    signingConfigs {
        debug {
            storeFile file("debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
    if (hermesEnabled.toBoolean()) {
        implementation("com.facebook.react:hermes-android")
    } else {
        implementation jscFlavor
    }
}
`,
    },
    { path: "android/app/proguard-rules.pro", content: `# Add project specific ProGuard rules here.\n` },
    {
      path: "android/app/src/main/AndroidManifest.xml",
      content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />

    <application
      android:name=".MainApplication"
      android:label="@string/app_name"
      android:icon="@mipmap/ic_launcher"
      android:roundIcon="@mipmap/ic_launcher_round"
      android:allowBackup="false"
      android:theme="@style/AppTheme"
      android:supportsRtl="true">
      <activity
        android:name=".MainActivity"
        android:label="@string/app_name"
        android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
        android:launchMode="singleTask"
        android:windowSoftInputMode="adjustResize"
        android:exported="true">
        <intent-filter>
          <action android:name="android.intent.action.MAIN" />
          <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity>
    </application>
</manifest>
`,
    },
    {
      path: `android/app/src/main/java/${javaPath}/MainActivity.kt`,
      content: `package ${appId}

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
  override fun getMainComponentName(): String = "${rootFolder}"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
`,
    },
    {
      path: `android/app/src/main/java/${javaPath}/MainApplication.kt`,
      content: `package ${appId}

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> =
        PackageList(this).packages

      override fun getJSMainModuleName(): String = "index"
      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
  }
}
`,
    },
    { path: "android/app/src/main/res/values/strings.xml", content: `<resources>\n    <string name="app_name">${rootFolder}</string>\n</resources>\n` },
    { path: "android/app/src/main/res/values/styles.xml", content: `<resources>\n    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar" />\n</resources>\n` },
    { path: "android/app/src/main/res/mipmap-hdpi/.gitkeep", content: "" },
    { path: "android/app/src/main/res/mipmap-mdpi/.gitkeep", content: "" },
    { path: "android/app/src/main/res/mipmap-xhdpi/.gitkeep", content: "" },
    { path: "android/app/src/main/res/mipmap-xxhdpi/.gitkeep", content: "" },
    { path: "android/app/src/main/res/mipmap-xxxhdpi/.gitkeep", content: "" },
    { path: "android/link-assets-manifest.json", content: JSON.stringify({ assets: [] }, null, 2) },
  ];
}

function generateIosPrivacyManifest(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>CA92.1</string>
			</array>
		</dict>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>0A2A.1</string>
				<string>3B52.1</string>
				<string>C617.1</string>
			</array>
		</dict>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryDiskSpace</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>E174.1</string>
				<string>85F4.1</string>
			</array>
		</dict>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategorySystemBootTime</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>35F9.1</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
`;
}

function generateIosWorkspace(appClassName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Workspace
   version = "1.0">
   <FileRef
      location = "group:${appClassName}.xcodeproj">
   </FileRef>
   <FileRef
      location = "group:Pods/Pods.xcodeproj">
   </FileRef>
</Workspace>
`;
}

function generateIosScheme(appClassName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1210"
   version = "1.3">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
               BuildableName = "${appClassName}.app"
               BlueprintName = "${appClassName}"
               ReferencedContainer = "container:${appClassName}.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables>
      </Testables>
   </TestAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
            BuildableName = "${appClassName}.app"
            BlueprintName = "${appClassName}"
            ReferencedContainer = "container:${appClassName}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "13B07F861A680F5B00A75B9A"
            BuildableName = "${appClassName}.app"
            BlueprintName = "${appClassName}"
            ReferencedContainer = "container:${appClassName}.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
`;
}

function generateIosProject(appClassName: string, bundleIdentifier: string): string {
  return `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 54;
	objects = {

/* Begin PBXBuildFile section */
		0C80B921A6F3F58F76C31292 /* libPods-${appClassName}.a in Frameworks */ = {isa = PBXBuildFile; fileRef = 5DCACB8F33CDC322A6C60F78 /* libPods-${appClassName}.a */; };
		13B07FBF1A68108700A75B9A /* Images.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = 13B07FB51A68108700A75B9A /* Images.xcassets */; };
		13C32A4BD1E27F37033C852B /* ExpoModulesProvider.swift in Sources */ = {isa = PBXBuildFile; fileRef = CDE646E81F29E90FAE82980E /* ExpoModulesProvider.swift */; };
		2FE847D96A902A97E60D699D /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = 9A62C2A0C650765A1A475A4F /* PrivacyInfo.xcprivacy */; };
		81AB9BB82411601600AC10FF /* LaunchScreen.storyboard in Resources */ = {isa = PBXBuildFile; fileRef = 81AB9BB72411601600AC10FF /* LaunchScreen.storyboard */; };
		B39E15AC2D9BDB8300326657 /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = B39E15AB2D9BDB8300326657 /* AppDelegate.swift */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		13B07F961A680F5B00A75B9A /* ${appClassName}.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ${appClassName}.app; sourceTree = BUILT_PRODUCTS_DIR; };
		13B07FB51A68108700A75B9A /* Images.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; name = Images.xcassets; path = ${appClassName}/Images.xcassets; sourceTree = "<group>"; };
		13B07FB61A68108700A75B9A /* Info.plist */ = {isa = PBXFileReference; fileEncoding = 4; lastKnownFileType = text.plist.xml; name = Info.plist; path = ${appClassName}/Info.plist; sourceTree = "<group>"; };
		3B4392A12AC88292D35C810B /* Pods-${appClassName}.debug.xcconfig */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = text.xcconfig; name = "Pods-${appClassName}.debug.xcconfig"; path = "Target Support Files/Pods-${appClassName}/Pods-${appClassName}.debug.xcconfig"; sourceTree = "<group>"; };
		5709B34CF0A7D63546082F79 /* Pods-${appClassName}.release.xcconfig */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = text.xcconfig; name = "Pods-${appClassName}.release.xcconfig"; path = "Target Support Files/Pods-${appClassName}/Pods-${appClassName}.release.xcconfig"; sourceTree = "<group>"; };
		5DCACB8F33CDC322A6C60F78 /* libPods-${appClassName}.a */ = {isa = PBXFileReference; explicitFileType = archive.ar; includeInIndex = 0; path = "libPods-${appClassName}.a"; sourceTree = BUILT_PRODUCTS_DIR; };
		81AB9BB72411601600AC10FF /* LaunchScreen.storyboard */ = {isa = PBXFileReference; fileEncoding = 4; lastKnownFileType = file.storyboard; name = LaunchScreen.storyboard; path = ${appClassName}/LaunchScreen.storyboard; sourceTree = "<group>"; };
		9A62C2A0C650765A1A475A4F /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = text.xml; name = PrivacyInfo.xcprivacy; path = ${appClassName}/PrivacyInfo.xcprivacy; sourceTree = "<group>"; };
		B39E15AB2D9BDB8300326657 /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };
		CDE646E81F29E90FAE82980E /* ExpoModulesProvider.swift */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = sourcecode.swift; name = ExpoModulesProvider.swift; path = "Pods/Target Support Files/Pods-${appClassName}/ExpoModulesProvider.swift"; sourceTree = "<group>"; };
		ED297162215061F000B7C4FE /* JavaScriptCore.framework */ = {isa = PBXFileReference; lastKnownFileType = wrapper.framework; name = JavaScriptCore.framework; path = System/Library/Frameworks/JavaScriptCore.framework; sourceTree = SDKROOT; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		13B07F8C1A680F5B00A75B9A /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
				0C80B921A6F3F58F76C31292 /* libPods-${appClassName}.a in Frameworks */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		13B07FAE1A68108700A75B9A /* ${appClassName} */ = {
			isa = PBXGroup;
			children = (
				B39E15AB2D9BDB8300326657 /* AppDelegate.swift */,
				13B07FB51A68108700A75B9A /* Images.xcassets */,
				13B07FB61A68108700A75B9A /* Info.plist */,
				81AB9BB72411601600AC10FF /* LaunchScreen.storyboard */,
				9A62C2A0C650765A1A475A4F /* PrivacyInfo.xcprivacy */,
			);
			name = ${appClassName};
			sourceTree = "<group>";
		};
		2D16E6871FA4F8E400B85C8A /* Frameworks */ = {
			isa = PBXGroup;
			children = (
				ED297162215061F000B7C4FE /* JavaScriptCore.framework */,
				5DCACB8F33CDC322A6C60F78 /* libPods-${appClassName}.a */,
			);
			name = Frameworks;
			sourceTree = "<group>";
		};
		832341AE1AAA6A7D00B99B32 /* Libraries */ = {
			isa = PBXGroup;
			children = (
			);
			name = Libraries;
			sourceTree = "<group>";
		};
		83CBB9F61A601CBA00E9B192 = {
			isa = PBXGroup;
			children = (
				13B07FAE1A68108700A75B9A /* ${appClassName} */,
				832341AE1AAA6A7D00B99B32 /* Libraries */,
				83CBBA001A601CBA00E9B192 /* Products */,
				2D16E6871FA4F8E400B85C8A /* Frameworks */,
				BBD78D7AC51CEA395F1C20DB /* Pods */,
				FEADD11FE2CF52CA25C3B0EC /* ExpoModulesProviders */,
			);
			indentWidth = 2;
			sourceTree = "<group>";
			tabWidth = 2;
			usesTabs = 0;
		};
		83CBBA001A601CBA00E9B192 /* Products */ = {
			isa = PBXGroup;
			children = (
				13B07F961A680F5B00A75B9A /* ${appClassName}.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
		BBD78D7AC51CEA395F1C20DB /* Pods */ = {
			isa = PBXGroup;
			children = (
				3B4392A12AC88292D35C810B /* Pods-${appClassName}.debug.xcconfig */,
				5709B34CF0A7D63546082F79 /* Pods-${appClassName}.release.xcconfig */,
			);
			path = Pods;
			sourceTree = "<group>";
		};
		D598433356753B84B31B1445 /* ${appClassName} */ = {
			isa = PBXGroup;
			children = (
				CDE646E81F29E90FAE82980E /* ExpoModulesProvider.swift */,
			);
			name = ${appClassName};
			sourceTree = "<group>";
		};
		FEADD11FE2CF52CA25C3B0EC /* ExpoModulesProviders */ = {
			isa = PBXGroup;
			children = (
				D598433356753B84B31B1445 /* ${appClassName} */,
			);
			name = ExpoModulesProviders;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		13B07F861A680F5B00A75B9A /* ${appClassName} */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 13B07F931A680F5B00A75B9A /* Build configuration list for PBXNativeTarget "${appClassName}" */;
			buildPhases = (
				C38B50BA6285516D6DCD4F65 /* [CP] Check Pods Manifest.lock */,
				FD10A7F022414F080027D42C /* Start Packager */,
				3F3F791A45DC86DFB54D7EB3 /* [Expo] Configure project */,
				13B07F871A680F5B00A75B9A /* Sources */,
				13B07F8C1A680F5B00A75B9A /* Frameworks */,
				13B07F8E1A680F5B00A75B9A /* Resources */,
				00DD1BFF1BD5951E006B06BC /* Bundle React Native code and images */,
				00EEFC60759A1932668264C0 /* [CP] Embed Pods Frameworks */,
				E235C05ADACE081382539298 /* [CP] Copy Pods Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = ${appClassName};
			productName = ${appClassName};
			productReference = 13B07F961A680F5B00A75B9A /* ${appClassName}.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		83CBB9F71A601CBA00E9B192 /* Project object */ = {
			isa = PBXProject;
			attributes = {
				LastUpgradeCheck = 1210;
				TargetAttributes = {
					13B07F861A680F5B00A75B9A = {
						LastSwiftMigration = 1620;
					};
				};
			};
			buildConfigurationList = 83CBB9FA1A601CBA00E9B192 /* Build configuration list for PBXProject "${appClassName}" */;
			compatibilityVersion = "Xcode 12.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = 83CBB9F61A601CBA00E9B192;
			productRefGroup = 83CBBA001A601CBA00E9B192 /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				13B07F861A680F5B00A75B9A /* ${appClassName} */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		13B07F8E1A680F5B00A75B9A /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				81AB9BB82411601600AC10FF /* LaunchScreen.storyboard in Resources */,
				13B07FBF1A68108700A75B9A /* Images.xcassets in Resources */,
				2FE847D96A902A97E60D699D /* PrivacyInfo.xcprivacy in Resources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXShellScriptBuildPhase section */
		00DD1BFF1BD5951E006B06BC /* Bundle React Native code and images */ = {
			isa = PBXShellScriptBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			inputPaths = (
				"$(SRCROOT)/.xcode.env.local",
				"$(SRCROOT)/.xcode.env",
			);
			name = "Bundle React Native code and images";
			outputPaths = (
			);
			runOnlyForDeploymentPostprocessing = 0;
			shellPath = /bin/sh;
			shellScript = "set -e\\n\\nWITH_ENVIRONMENT=\\"../node_modules/react-native/scripts/with-environment.sh\\"\\nREACT_NATIVE_XCODE=\\"../node_modules/react-native/scripts/react-native-xcode.sh\\"\\n\\n/bin/sh -c \\"$WITH_ENVIRONMENT $REACT_NATIVE_XCODE\\"\\n";
		};
		00EEFC60759A1932668264C0 /* [CP] Embed Pods Frameworks */ = {
			isa = PBXShellScriptBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			inputFileListPaths = (
				"$\{PODS_ROOT}/Target Support Files/Pods-${appClassName}/Pods-${appClassName}-frameworks-$\{CONFIGURATION}-input-files.xcfilelist",
			);
			name = "[CP] Embed Pods Frameworks";
			outputFileListPaths = (
				"$\{PODS_ROOT}/Target Support Files/Pods-${appClassName}/Pods-${appClassName}-frameworks-$\{CONFIGURATION}-output-files.xcfilelist",
			);
			runOnlyForDeploymentPostprocessing = 0;
			shellPath = /bin/sh;
			shellScript = "\\"$\{PODS_ROOT}/Target Support Files/Pods-${appClassName}/Pods-${appClassName}-frameworks.sh\\"\\n";
			showEnvVarsInLog = 0;
		};
		3F3F791A45DC86DFB54D7EB3 /* [Expo] Configure project */ = {
			isa = PBXShellScriptBuildPhase;
			alwaysOutOfDate = 1;
			buildActionMask = 2147483647;
			files = (
			);
			inputFileListPaths = (
			);
			inputPaths = (
				"$(SRCROOT)/.xcode.env",
				"$(SRCROOT)/.xcode.env.local",
				"$(SRCROOT)/Pods/Target Support Files/Pods-${appClassName}/expo-configure-project.sh",
			);
			name = "[Expo] Configure project";
			outputFileListPaths = (
			);
			outputPaths = (
				"$(SRCROOT)/Pods/Target Support Files/Pods-${appClassName}/ExpoModulesProvider.swift",
			);
			runOnlyForDeploymentPostprocessing = 0;
			shellPath = /bin/sh;
			shellScript = "# This script configures Expo modules and generates the modules provider file.\\nbash -l -c \\"./Pods/Target\\\\ Support\\\\ Files/Pods-${appClassName}/expo-configure-project.sh\\"\\n";
		};
		C38B50BA6285516D6DCD4F65 /* [CP] Check Pods Manifest.lock */ = {
			isa = PBXShellScriptBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			inputFileListPaths = (
			);
			inputPaths = (
				"$\{PODS_PODFILE_DIR_PATH}/Podfile.lock",
				"$\{PODS_ROOT}/Manifest.lock",
			);
			name = "[CP] Check Pods Manifest.lock";
			outputFileListPaths = (
			);
			outputPaths = (
				"$(DERIVED_FILE_DIR)/Pods-${appClassName}-checkManifestLockResult.txt",
			);
			runOnlyForDeploymentPostprocessing = 0;
			shellPath = /bin/sh;
			shellScript = "diff \\"$\{PODS_PODFILE_DIR_PATH}/Podfile.lock\\" \\"$\{PODS_ROOT}/Manifest.lock\\" > /dev/null\\nif [ $? != 0 ] ; then\\n    echo \\"error: The sandbox is not in sync with the Podfile.lock. Run 'pod install' or update your CocoaPods installation.\\" >&2\\n    exit 1\\nfi\\necho \\"SUCCESS\\" > \\"$\{SCRIPT_OUTPUT_FILE_0}\\"\\n";
			showEnvVarsInLog = 0;
		};
		E235C05ADACE081382539298 /* [CP] Copy Pods Resources */ = {
			isa = PBXShellScriptBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			inputFileListPaths = (
				"$\{PODS_ROOT}/Target Support Files/Pods-${appClassName}/Pods-${appClassName}-resources-$\{CONFIGURATION}-input-files.xcfilelist",
			);
			name = "[CP] Copy Pods Resources";
			outputFileListPaths = (
				"$\{PODS_ROOT}/Target Support Files/Pods-${appClassName}/Pods-${appClassName}-resources-$\{CONFIGURATION}-output-files.xcfilelist",
			);
			runOnlyForDeploymentPostprocessing = 0;
			shellPath = /bin/sh;
			shellScript = "\\"$\{PODS_ROOT}/Target Support Files/Pods-${appClassName}/Pods-${appClassName}-resources.sh\\"\\n";
			showEnvVarsInLog = 0;
		};
		FD10A7F022414F080027D42C /* Start Packager */ = {
			isa = PBXShellScriptBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			inputFileListPaths = (
			);
			inputPaths = (
			);
			name = "Start Packager";
			outputFileListPaths = (
			);
			outputPaths = (
			);
			runOnlyForDeploymentPostprocessing = 0;
			shellPath = /bin/sh;
			shellScript = "export RCT_METRO_PORT=\\"$\{RCT_METRO_PORT:=8081}\\"\\necho \\"export RCT_METRO_PORT=$\{RCT_METRO_PORT}\\" > \\"$\{SRCROOT}/../node_modules/react-native/scripts/.packager.env\\"\\nif [ -z \\"$\{RCT_NO_LAUNCH_PACKAGER+xxx}\\" ] ; then\\n  if nc -w 5 -z localhost $\{RCT_METRO_PORT} ; then\\n    if ! curl -s \\"http://localhost:$\{RCT_METRO_PORT}/status\\" | grep -q \\"packager-status:running\\" ; then\\n      echo \\"Port $\{RCT_METRO_PORT} already in use, packager is either not running or not running correctly\\"\\n      exit 2\\n    fi\\n  else\\n    open \\"$SRCROOT/../node_modules/react-native/scripts/launchPackager.command\\" || echo \\"Can't start packager automatically\\"\\n  fi\\nfi\\n";
			showEnvVarsInLog = 0;
		};
/* End PBXShellScriptBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		13B07F871A680F5B00A75B9A /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				B39E15AC2D9BDB8300326657 /* AppDelegate.swift in Sources */,
				13C32A4BD1E27F37033C852B /* ExpoModulesProvider.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		13B07F941A680F5B00A75B9A /* Debug */ = {
			isa = XCBuildConfiguration;
			baseConfigurationReference = 3B4392A12AC88292D35C810B /* Pods-${appClassName}.debug.xcconfig */;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CLANG_ENABLE_MODULES = YES;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				ENABLE_BITCODE = NO;
				INFOPLIST_FILE = ${appClassName}/Info.plist;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				OTHER_LDFLAGS = (
					"$(inherited)",
					"-ObjC",
					"-lc++",
				);
				OTHER_SWIFT_FLAGS = "$(inherited) -D EXPO_CONFIGURATION_DEBUG";
				PRODUCT_BUNDLE_IDENTIFIER = ${bundleIdentifier};
				PRODUCT_NAME = ${appClassName};
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
				SWIFT_VERSION = 5.0;
				VERSIONING_SYSTEM = "apple-generic";
			};
			name = Debug;
		};
		13B07F951A680F5B00A75B9A /* Release */ = {
			isa = XCBuildConfiguration;
			baseConfigurationReference = 5709B34CF0A7D63546082F79 /* Pods-${appClassName}.release.xcconfig */;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CLANG_ENABLE_MODULES = YES;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				ENABLE_BITCODE = NO;
				INFOPLIST_FILE = ${appClassName}/Info.plist;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				OTHER_LDFLAGS = (
					"$(inherited)",
					"-ObjC",
					"-lc++",
				);
				OTHER_SWIFT_FLAGS = "$(inherited) -D EXPO_CONFIGURATION_RELEASE";
				PRODUCT_BUNDLE_IDENTIFIER = ${bundleIdentifier};
				PRODUCT_NAME = ${appClassName};
				SWIFT_VERSION = 5.0;
				VERSIONING_SYSTEM = "apple-generic";
			};
			name = Release;
		};
		83CBBA201A601CBA00E9B192 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ANALYZER_LOCALIZABILITY_NONLOCALIZED = YES;
				CLANG_CXX_LANGUAGE_STANDARD = "c++20";
				CLANG_CXX_LIBRARY = "libc++";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING = YES;
				CLANG_WARN_BOOL_CONVERSION = YES;
				CLANG_WARN_COMMA = YES;
				CLANG_WARN_CONSTANT_CONVERSION = YES;
				CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS = YES;
				CLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
				CLANG_WARN_EMPTY_BODY = YES;
				CLANG_WARN_ENUM_CONVERSION = YES;
				CLANG_WARN_INFINITE_RECURSION = YES;
				CLANG_WARN_INT_CONVERSION = YES;
				CLANG_WARN_NON_LITERAL_NULL_CONVERSION = YES;
				CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF = YES;
				CLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
				CLANG_WARN_OBJC_ROOT_CLASS = YES_ERROR;
				CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;
				CLANG_WARN_RANGE_LOOP_ANALYSIS = YES;
				CLANG_WARN_STRICT_PROTOTYPES = YES;
				CLANG_WARN_SUSPICIOUS_MOVE = YES;
				CLANG_WARN_UNREACHABLE_CODE = YES;
				CLANG_WARN__DUPLICATE_METHOD_MATCH = YES;
				"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Developer";
				COPY_PHASE_STRIP = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				ENABLE_TESTABILITY = YES;
				"EXCLUDED_ARCHS[sdk=iphonesimulator*]" = i386;
				GCC_C_LANGUAGE_STANDARD = gnu99;
				GCC_DYNAMIC_NO_PIC = NO;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_OPTIMIZATION_LEVEL = 0;
				GCC_PREPROCESSOR_DEFINITIONS = (
					"DEBUG=1",
					"$(inherited)",
				);
				GCC_SYMBOLS_PRIVATE_EXTERN = NO;
				GCC_WARN_64_TO_32_BIT_CONVERSION = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNDECLARED_SELECTOR = YES;
				GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
				GCC_WARN_UNUSED_FUNCTION = YES;
				GCC_WARN_UNUSED_VARIABLE = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 15.1;
				LD_RUNPATH_SEARCH_PATHS = (
					/usr/lib/swift,
					"$(inherited)",
				);
				LIBRARY_SEARCH_PATHS = (
					"\\"$(SDKROOT)/usr/lib/swift\\"",
					"\\"$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)\\"",
					"\\"$(inherited)\\"",
				);
				MTL_ENABLE_DEBUG_INFO = YES;
				ONLY_ACTIVE_ARCH = YES;
				OTHER_CPLUSPLUSFLAGS = (
					"$(OTHER_CFLAGS)",
					"-DFOLLY_NO_CONFIG",
					"-DFOLLY_MOBILE=1",
					"-DFOLLY_USE_LIBCPP=1",
				);
				OTHER_LDFLAGS = (
					"$(inherited)",
					" ",
				);
				REACT_NATIVE_PATH = "$\{PODS_ROOT}/../../node_modules/react-native";
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = "$(inherited) DEBUG";
				USE_HERMES = true;
			};
			name = Debug;
		};
		83CBBA211A601CBA00E9B192 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ANALYZER_LOCALIZABILITY_NONLOCALIZED = YES;
				CLANG_CXX_LANGUAGE_STANDARD = "c++20";
				CLANG_CXX_LIBRARY = "libc++";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING = YES;
				CLANG_WARN_BOOL_CONVERSION = YES;
				CLANG_WARN_COMMA = YES;
				CLANG_WARN_CONSTANT_CONVERSION = YES;
				CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS = YES;
				CLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
				CLANG_WARN_EMPTY_BODY = YES;
				CLANG_WARN_ENUM_CONVERSION = YES;
				CLANG_WARN_INFINITE_RECURSION = YES;
				CLANG_WARN_INT_CONVERSION = YES;
				CLANG_WARN_NON_LITERAL_NULL_CONVERSION = YES;
				CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF = YES;
				CLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
				CLANG_WARN_OBJC_ROOT_CLASS = YES_ERROR;
				CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;
				CLANG_WARN_RANGE_LOOP_ANALYSIS = YES;
				CLANG_WARN_STRICT_PROTOTYPES = YES;
				CLANG_WARN_SUSPICIOUS_MOVE = YES;
				CLANG_WARN_UNREACHABLE_CODE = YES;
				CLANG_WARN__DUPLICATE_METHOD_MATCH = YES;
				"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Developer";
				COPY_PHASE_STRIP = YES;
				ENABLE_NS_ASSERTIONS = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				"EXCLUDED_ARCHS[sdk=iphonesimulator*]" = i386;
				GCC_C_LANGUAGE_STANDARD = gnu99;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_WARN_64_TO_32_BIT_CONVERSION = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNDECLARED_SELECTOR = YES;
				GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
				GCC_WARN_UNUSED_FUNCTION = YES;
				GCC_WARN_UNUSED_VARIABLE = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 15.1;
				LD_RUNPATH_SEARCH_PATHS = (
					/usr/lib/swift,
					"$(inherited)",
				);
				LIBRARY_SEARCH_PATHS = (
					"\\"$(SDKROOT)/usr/lib/swift\\"",
					"\\"$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)\\"",
					"\\"$(inherited)\\"",
				);
				MTL_ENABLE_DEBUG_INFO = NO;
				OTHER_CPLUSPLUSFLAGS = (
					"$(OTHER_CFLAGS)",
					"-DFOLLY_NO_CONFIG",
					"-DFOLLY_MOBILE=1",
					"-DFOLLY_USE_LIBCPP=1",
				);
				OTHER_LDFLAGS = (
					"$(inherited)",
					" ",
				);
				REACT_NATIVE_PATH = "$\{PODS_ROOT}/../../node_modules/react-native";
				SDKROOT = iphoneos;
				USE_HERMES = true;
				VALIDATE_PRODUCT = YES;
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		13B07F931A680F5B00A75B9A /* Build configuration list for PBXNativeTarget "${appClassName}" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				13B07F941A680F5B00A75B9A /* Debug */,
				13B07F951A680F5B00A75B9A /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		83CBB9FA1A601CBA00E9B192 /* Build configuration list for PBXProject "${appClassName}" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				83CBBA201A601CBA00E9B192 /* Debug */,
				83CBBA211A601CBA00E9B192 /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = 83CBB9F71A601CBA00E9B192 /* Project object */;
}
`;
}

function iosScaffoldFiles(rootFolder: string): GeneratedProjectFile[] {
  const appClassName = toPascalCase(rootFolder);
  const bundleIdentifier = `com.${rootFolder.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase() || "miniapp"}`;

  return [
    { path: "ios/.xcode.env", content: `export NODE_BINARY=node\n` },
    { path: "ios/.xcode.env.local", content: `export NODE_BINARY=node\n` },
    {
      path: "ios/Podfile",
      content: `# Resolve react_native_pods.rb with node to allow for hoisting and pnpm layouts.
require Pod::Executable.execute_command("node", ["-p",
  "require.resolve(
    'react-native/scripts/react_native_pods.rb',
    {paths: [process.argv[1]]},
  )", __dir__]).strip

require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")

platform :ios, "15.1"
prepare_react_native_project!

use_expo_modules!
post_integrate do |installer|
  begin
    expo_patch_react_imports!(installer)
  rescue => e
    Pod::UI.warn e
  end
end

target "${appClassName}" do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  pod "SDWebImage", :modular_headers => true
  pod "SDWebImageSVGCoder", :modular_headers => true

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )

    installer.pods_project.build_configurations.each do |config|
      config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"
    end

    installer.pods_project.targets.each do |target|
      if target.name == "fmt"
        target.build_configurations.each do |config|
          config.build_settings["CLANG_CXX_LANGUAGE_STANDARD"] = "c++17"
        end
      end

      target.build_configurations.each do |config|
        config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"
        config.build_settings["GCC_WARN_INHIBIT_ALL_WARNINGS"] = "NO"
        config.build_settings["CLANG_WARN_DOCUMENTATION_COMMENTS"] = "NO"
        config.build_settings["CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER"] = "NO"
        config.build_settings["VALIDATE_PRODUCT"] = "YES"
        config.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "15.1"
      end
    end
  end
end
`,
    },
    {
      path: "ios/AppDelegate.swift",
      content: `import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
  ) -> Bool {
    self.moduleName = "${rootFolder}"
    self.dependencyProvider = RCTAppDependencyProvider()
    self.initialProps = [:]
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
`,
    },
    {
      path: `ios/${appClassName}/Info.plist`,
      content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>${rootFolder}</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>LSRequiresIPhoneOS</key>
  <true/>
  <key>UILaunchStoryboardName</key>
  <string>LaunchScreen</string>
  <key>UIRequiredDeviceCapabilities</key>
  <array>
    <string>arm64</string>
  </array>
  <key>UISupportedInterfaceOrientations</key>
  <array>
    <string>UIInterfaceOrientationPortrait</string>
  </array>
</dict>
</plist>
`,
    },
    {
      path: `ios/${appClassName}/LaunchScreen.storyboard`,
      content: `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="22505" targetRuntime="iOS.CocoaTouch">
  <scenes>
    <scene sceneID="launch">
      <objects>
        <viewController id="launchViewController" sceneMemberID="viewController">
          <view key="view" contentMode="scaleToFill" id="launchView">
            <rect key="frame" x="0.0" y="0.0" width="390" height="844"/>
            <color key="backgroundColor" systemColor="systemBackgroundColor"/>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="firstResponder" sceneMemberID="firstResponder"/>
      </objects>
    </scene>
  </scenes>
</document>
`,
    },
    { path: `ios/${appClassName}/PrivacyInfo.xcprivacy`, content: generateIosPrivacyManifest() },
    { path: `ios/${appClassName}/Images.xcassets/Contents.json`, content: JSON.stringify({ info: { author: "xcode", version: 1 } }, null, 2) },
    { path: `ios/${appClassName}/Images.xcassets/AppIcon.appiconset/Contents.json`, content: JSON.stringify({ images: [], info: { author: "xcode", version: 1 } }, null, 2) },
    { path: `ios/${appClassName}.xcworkspace/contents.xcworkspacedata`, content: generateIosWorkspace(appClassName) },
    { path: `ios/${appClassName}.xcodeproj/project.pbxproj`, content: generateIosProject(appClassName, bundleIdentifier) },
    { path: `ios/${appClassName}.xcodeproj/xcshareddata/xcschemes/${appClassName}.xcscheme`, content: generateIosScheme(appClassName) },
    { path: "ios/link-assets-manifest.json", content: JSON.stringify({ assets: [] }, null, 2) },
  ];
}

function cleanArchitectureScaffoldFiles(rootFolder: string): GeneratedProjectFile[] {
  return [
    ...iosScaffoldFiles(rootFolder),
    ...androidScaffoldFiles(rootFolder),
    { path: "assets/fonts/.gitkeep", content: "" },
    { path: "patches/@callstack__repack-dev-server@5.2.1.patch", content: `diff --git a/dist/createServer.js b/dist/createServer.js\n--- a/dist/createServer.js\n+++ b/dist/createServer.js\n@@ -101,7 +101,7 @@ export async function createServer(config) {\n-                        connection.device.sendMessage(msg);\n+                        // connection.device.sendMessage(msg);\n` },
    { path: "scripts/start-dev-server.sh", content: `#!/usr/bin/env bash\nset -euo pipefail\n\nENV_FILE="\${ENVFILE:-.env.development}"\nPORT="\${MINIAPP_DEV_PORT:-}"\nHOST="\${MINIAPP_DEV_HOST:-}"\nexport ENVFILE="\${ENVFILE:-$ENV_FILE}"\n\nif [[ -f "$ENV_FILE" ]]; then\n  set -a\n  source "$ENV_FILE"\n  set +a\n  [[ -z "$PORT" ]] && PORT="$(awk -F= '/^MINIAPP_DEV_PORT=/{print $2}' "$ENV_FILE" | tail -n 1 | tr -d '[:space:]')"\n  [[ -z "$HOST" ]] && HOST="$(awk -F= '/^MINIAPP_DEV_HOST=/{print $2}' "$ENV_FILE" | tail -n 1 | tr -d '[:space:]')"\nfi\n\nPORT="\${PORT:-9005}"\nHOST="\${HOST:-127.0.0.1}"\nexec react-native start --reset-cache --host "$HOST" --port "$PORT"\n` },
    { path: "scripts/archive-builds.sh", content: `#!/usr/bin/env bash\nset -euo pipefail\n\nAPP_NAME="\${MINIAPP_NAME:-${rootFolder}}"\nVERSION="\${MINIAPP_VERSION:-1.0.0}"\nOUT_DIR="builds/$APP_NAME/$VERSION"\nmkdir -p "$OUT_DIR"\nfind . -maxdepth 1 -name "*.bundle" -o -name "*.map" | while read -r file; do\n  cp "$file" "$OUT_DIR/"\ndone\nprintf "Archived bundles to %s\\n" "$OUT_DIR"\n` },
    { path: "scripts/install-cli.sh", content: `#!/usr/bin/env bash\nset -euo pipefail\ncorepack enable\npnpm install\n` },
    { path: "scripts/new-miniapp.sh", content: `#!/usr/bin/env bash\nset -euo pipefail\nAPP_NAME="\${1:-${rootFolder}}"\nprintf "Mini app scaffold is ready for %s\\n" "$APP_NAME"\n` },
    { path: "scripts/rename-miniapp.sh", content: `#!/usr/bin/env bash\nset -euo pipefail\npython3 ./scripts/rename-miniapp.py "$@"\n` },
    { path: "scripts/rename-miniapp.py", content: `import sys\n\nname = sys.argv[1] if len(sys.argv) > 1 else "${rootFolder}"\nprint(f"Rename helper placeholder for {name}")\n` },
    { path: "scripts/sync-host-deps.py", content: `import json\nfrom pathlib import Path\n\npackage_json = Path("package.json")\nprint(json.loads(package_json.read_text()).get("dependencies", {}))\n` },
    { path: "scripts/patch-rnc-config-newarch.sh", content: `#!/usr/bin/env bash\nset -euo pipefail\nprintf "react-native-config new architecture patch hook\\n"\n` },
    { path: "packages/miniapp-auth/package.json", content: JSON.stringify({ name: "@metro/miniapp-auth", version: "1.0.0", private: true, main: "src/index.ts", types: "src/index.ts" }, null, 2) },
    { path: "packages/miniapp-auth/src/index.ts", content: `export type MiniAppSession = {\n  accessToken?: string | null;\n  locale?: string | null;\n  themeMode?: "light" | "dark" | string | null;\n};\n\nexport const getSharedApi = () => (globalThis as any).__MINIAPP_SHARED_API__ ?? null;\nexport const getAccessToken = () => getSharedApi()?.getAccessToken?.() ?? null;\n` },
    { path: "pnpm-workspace.yaml", content: `packages:\n  - packages/*\n\nonlyBuiltDependencies:\n  - esbuild\n` },
    { path: "Gemfile", content: generateGemfile() },
    { path: "Gemfile.lock", content: generateGemfileLock() },
    { path: "rspack.config.mjs", content: generateRspackConfig(rootFolder) },
    { path: "sharedDeps.js", content: generateSharedDeps() },
    { path: "react-native.config.js", content: `module.exports = {\n  commands: require("@callstack/repack/commands/rspack"),\n  dependencies: {\n    "react-native-config": {\n      platforms: {\n        android: {\n          sourceDir: "../node_modules/react-native-config/android",\n          packageImportPath: "import com.lugg.RNCConfig.RNCConfigPackage;",\n        },\n      },\n    },\n  },\n  assets: ["./assets/fonts"],\n};\n` },
    { path: "babel.config.base.from-host.js", content: `module.exports = require("./babel.config");\n` },
    { path: "postcss.config.js", content: `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n` },
    { path: "jest.config.js", content: `module.exports = { preset: "react-native" };\n` },
    { path: ".eslintrc.js", content: `module.exports = { root: true, extends: "@react-native" };\n` },
  ];
}

export async function generateProject(miniApp: MiniApp, target: ExportTarget): Promise<GenerateProjectResult> {
  const parsed = miniAppSchema.safeParse(miniApp);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "miniApp"}: ${issue.message}`),
    };
  }

  const validMiniApp = parsed.data;
  const validationErrors = validateMiniApp(validMiniApp);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      errors: validationErrors,
    };
  }

  const rootFolder = slugify(validMiniApp.name);
  const files: GeneratedProjectFile[] = [];
  const pascalName = toPascalCase(validMiniApp.name);
  const iosSchemeName = toPascalCase(rootFolder);
  const entryScreen = validMiniApp.screens.find((screen) => screen.id === validMiniApp.entryScreenId) ?? validMiniApp.screens[0];

  // 1. Screens
  for (const screen of validMiniApp.screens) {
    files.push({
      path: `src/features/core/presentation/screens/${screenComponentName(screen.name)}.tsx`,
      content: await formatCode(generateScreen(screen, validMiniApp.screens, target)),
    });
  }

  // 2. Components
  files.push(
    ...(await generateUiComponentFiles("src/features/core/presentation/components"))
  );

  // 2.5 API Config & Client files
  files.push({
    path: "src/features/core/infrastructure/api/api-config.ts",
    content: await formatCode(`
      export const integrations = ${JSON.stringify(validMiniApp.integrations || [], null, 2)};
      export const apiPaths = ${JSON.stringify(validMiniApp.apiPaths || [], null, 2)};
    `),
  });

  files.push({
    path: "src/features/core/infrastructure/api/api-client.ts",
    content: await formatCode(`
      import { integrations, apiPaths } from "./api-config";

      export const credentialsResolver = {
        values: {} as Record<string, string>,
        set(id: string, value: string) {
          this.values[id] = value;
        },
        get(id: string): string {
          return this.values[id] || "";
        }
      };

      export function getValueByPath(value: unknown, path: string): any {
        if (!path) return undefined;
        return path.split(".").filter(Boolean).reduce<any>((current, part) => {
          if (current === undefined || current === null || typeof current !== "object") {
            return undefined;
          }
          return current[part];
        }, value);
      }

      export function setValueByPath(target: Record<string, any>, path: string, value: any) {
        const parts = path.split(".").filter(Boolean);
        let current = target;
        for (let index = 0; index < parts.length; index += 1) {
          const part = parts[index];
          const isLast = index === parts.length - 1;
          if (isLast) {
            current[part] = value;
            break;
          }
          const nextPart = parts[index + 1];
          const shouldBeArray = /^\\d+$/.test(nextPart);
          if (!current[part] || typeof current[part] !== "object") {
            current[part] = shouldBeArray ? [] : {};
          }
          current = current[part];
        }
        return target;
      }

      function castFieldType(value: any, type: string) {
        if (type === "number") {
          const num = Number(value);
          return isNaN(num) ? value : num;
        }
        if (type === "boolean") {
          if (value === "true" || value === true) return true;
          if (value === "false" || value === false) return false;
          return Boolean(value);
        }
        if ((type === "object" || type === "array") && typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return type === "array" ? value.split(",").map((item) => item.trim()) : value;
          }
        }
        return value;
      }

      function appendQueryParams(searchParams: URLSearchParams, key: string, value: any) {
        if (value === undefined || value === null || value === "") return;
        if (Array.isArray(value)) {
          value.forEach((item) => appendQueryParams(searchParams, key, item));
          return;
        }
        if (typeof value === "object") {
          for (const [childKey, childValue] of Object.entries(value)) {
            appendQueryParams(searchParams, key ? key + "." + childKey : childKey, childValue);
          }
          return;
        }
        searchParams.append(key, String(value));
      }

      export async function invokeApi(
        integrationId: string,
        pathId: string,
        rawParams: Record<string, any>
      ) {
        const integration = integrations.find(i => i.id === integrationId);
        const pathDef = apiPaths.find(p => p.id === pathId);
        if (!integration || !pathDef) {
          throw new Error("Integration or path not found");
        }

        const credentialValue = credentialsResolver.get(integration.authConfig.credentialId || "");

        const requestSchema = pathDef.requestSchema || [];
        const requestPayload: Record<string, any> = {};
        const validationErrors: string[] = [];

        for (const field of requestSchema) {
          let val = getValueByPath(rawParams, field.name);
          if (val === undefined || val === null || val === "") {
            if (field.defaultValue !== undefined && field.defaultValue !== "") {
              val = field.defaultValue;
            }
          }

          const castedVal = val !== undefined && val !== null && val !== "" ? castFieldType(val, field.type) : val;
          setValueByPath(requestPayload, field.name, castedVal);

          if (field.required && (castedVal === undefined || castedVal === null || castedVal === "")) {
            validationErrors.push("Field " + field.name + " is required.");
          }
        }

        if (validationErrors.length > 0) {
          return {
            success: false,
            status: 400,
            validationErrors,
            error: "Request Validation Error",
          };
        }

        let targetPath = pathDef.path;
        const unusedParams = { ...requestPayload };
        const pathParams = targetPath.match(/(?::([a-zA-Z0-9_-]+))|(\{[a-zA-Z0-9_-]+\})/g) || [];
        for (const match of pathParams) {
          const paramName = match.replace(/[:{}]/g, "");
          const paramValue = getValueByPath(requestPayload, paramName);
          if (paramValue !== undefined) {
            targetPath = targetPath.replace(match, encodeURIComponent(String(paramValue)));
            delete unusedParams[paramName];
          }
        }

        let url = integration.baseUrl.replace(/\\/$/, "") + "/" + targetPath.replace(/^\\//, "");

        const headers: Record<string, string> = {};
        if (integration.defaultHeaders) {
          for (const h of integration.defaultHeaders) {
            if (h.key && h.value) {
              headers[h.key] = h.value;
            }
          }
        }

        const hasBody = ["POST", "PUT", "PATCH"].includes(pathDef.method);
        if (hasBody) {
          headers["Content-Type"] = "application/json";
        }

        if (integration.authConfig.type === "bearer" && credentialValue) {
          headers["Authorization"] = "Bearer " + credentialValue;
        } else if (integration.authConfig.type === "apiKey" && credentialValue) {
          const headerName = integration.authConfig.headerName || "X-API-Key";
          headers[headerName] = credentialValue;
        }

        const fetchOptions: RequestInit = {
          method: pathDef.method,
          headers,
        };

        if (hasBody) {
          fetchOptions.body = JSON.stringify(unusedParams);
        } else {
          const queryKeys = Object.keys(unusedParams);
          if (queryKeys.length > 0) {
            const searchParams = new URLSearchParams();
            for (const key of queryKeys) {
              appendQueryParams(searchParams, key, unusedParams[key]);
            }
            const queryString = searchParams.toString();
            if (queryString) {
              url += (url.includes("?") ? "&" : "?") + queryString;
            }
          }
        }

        const start = Date.now();
        const response = await fetch(url, fetchOptions);
        const duration = Date.now() - start;

        const contentType = response.headers.get("content-type") || "";
        const rawText = await response.text();
        let responseData: any;
        if (contentType.includes("application/json") || rawText.trim().startsWith("{") || rawText.trim().startsWith("[")) {
          try { responseData = JSON.parse(rawText); } catch { responseData = rawText; }
        } else {
          responseData = rawText;
        }

        if (!response.ok) {
          return {
            success: false,
            status: response.status,
            data: responseData,
            error: "HTTP Error " + response.status,
            duration,
          };
        }

        const responseSchema = pathDef.responseSchema || [];
        const responseErrors: string[] = [];
        if (responseSchema.length > 0 && typeof responseData === "object" && responseData !== null) {
          for (const field of responseSchema) {
            const val = getValueByPath(responseData, field.name);
            if (field.required && (val === undefined || val === null || val === "")) {
              responseErrors.push("Response field " + field.name + " is required.");
            }
          }
        }

        if (responseErrors.length > 0) {
          return {
            success: false,
            status: response.status,
            data: responseData,
            validationErrors: responseErrors,
            error: "Response Validation Error",
            duration,
          };
        }

        return {
          success: true,
          status: response.status,
          data: responseData,
          duration,
        };
      }
    `),
  });

  // 3. Navigation / Routing
  files.push({
    path: "src/features/core/application/routing/MainNavigator.tsx",
    content: await formatCode(generateNavigation(validMiniApp, target)),
  });

  // 4. Root App.tsx
  files.push({
    path: "src/App.tsx",
    content: await formatCode(`import React, { useEffect, useMemo } from "react";
import { StatusBar } from "react-native";
import { colorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { NavigationContainer } from "@react-navigation/native";
import { Provider } from "react-redux";
import { PaperProvider } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "./store";
import MainNavigator from "./features/core/application/routing/MainNavigator";
import { darkPaperTheme, lightPaperTheme } from "./features/core/presentation/theme/paperTheme";
import "../global.css";

const queryClient = new QueryClient();

interface AppProps {
  standalone?: boolean;
  hostThemeMode?: "light" | "dark" | string;
  initialRouteName?: any;
}

const AppContent: React.FC<{ standalone?: boolean; initialRouteName?: any }> = ({
  standalone = true,
  initialRouteName,
}) => {
  const content = <MainNavigator initialRouteName={initialRouteName} />;

  if (standalone) {
    return (
      <NavigationContainer>
        {content}
      </NavigationContainer>
    );
  }
  return content;
};

const App: React.FC<AppProps> = ({
  standalone = true,
  hostThemeMode = "light",
  initialRouteName,
}) => {
  useEffect(() => {
    if (hostThemeMode === "light" || hostThemeMode === "dark") {
      colorScheme.set(hostThemeMode);
    }
  }, [hostThemeMode]);

  const effectiveTheme = useMemo(() => {
    if (hostThemeMode === "dark") return darkPaperTheme;
    return lightPaperTheme;
  }, [hostThemeMode]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Provider store={store}>
            <PaperProvider theme={effectiveTheme}>
              <BottomSheetModalProvider>
                <StatusBar
                  barStyle={effectiveTheme.dark ? "light-content" : "dark-content"}
                  backgroundColor={effectiveTheme.colors.background}
                  translucent={false}
                />
                <AppContent
                  standalone={standalone}
                  initialRouteName={initialRouteName}
                />
              </BottomSheetModalProvider>
            </PaperProvider>
          </Provider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
export { AppContent as MiniAppContent };
`),
  });

  // 5. Bootstrap file
  files.push({
    path: `src/bootstrap-${rootFolder}.tsx`,
    content: await formatCode(`import React from "react";
import App from "./App";

const ${pascalName}App = (props: any) => <App {...props} initialRouteName="${routeName(entryScreen.name)}" />;

export default ${pascalName}App;
export { ${pascalName}App as App };
`),
  });

  // 6. index.ts & index.tsx
  files.push({
    path: "src/index.ts",
    content: await formatCode(`export { default } from "./index.tsx";
export * from "./index.tsx";
`),
  });

  files.push({
    path: "src/index.tsx",
    content: await formatCode(`import React from "react";
import App, { MiniAppContent } from "./App";

declare const module: any;

const SmartApp: React.FC<any> = (props) => {
  const isInHostEnvironment = Object.keys(props).length > 0;
  return <App {...props} standalone={!isInHostEnvironment} />;
};

export const AppModule = SmartApp;
export default SmartApp;
export { App as StandaloneApp, MiniAppContent };

const cjsExports = module.exports as any;
cjsExports.default = SmartApp;
cjsExports.AppModule = SmartApp;
`),
  });

  // 7. Store / Redux
  files.push({
    path: "src/store/index.ts",
    content: await formatCode(`import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  ready: boolean;
}

const initialState: AppState = {
  ready: true,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setReady(state, action: PayloadAction<boolean>) {
      state.ready = action.payload;
    },
  },
});

export const { setReady } = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`),
  });

  // 8. Theme files
  files.push({
    path: "src/features/core/presentation/theme/colors.ts",
    content: await formatCode(`export const colors = {
  primary: "#0E5FFF",
  background: "#FFFFFF",
  surface: "#F7F8FA",
  text: "#0F172A",
  muted: "#64748B",
  success: "#16A34A",
  danger: "#DC2626",
};
`),
  });

  files.push({
    path: "src/features/core/presentation/theme/index.ts",
    content: await formatCode(`export * from "./colors";
`),
  });

  files.push({
    path: "src/features/core/presentation/theme/paperTheme.ts",
    content: await formatCode(`import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { colors } from "./colors";

export const lightPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.text,
    onBackground: colors.text,
    secondary: colors.muted,
    error: colors.danger,
  },
};

export const darkPaperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    background: "#0F172A",
    surface: "#1E293B",
    onSurface: "#E2E8F0",
    onBackground: "#E2E8F0",
    secondary: colors.muted,
    error: colors.danger,
    outline: "#334155",
    outlineVariant: "#1E293B",
  },
};

export const paperTheme = lightPaperTheme;
`),
  });

  // 9. Session types
  files.push({
    path: "src/features/core/presentation/types/session.ts",
    content: await formatCode(`export interface SessionStatus {
  hasUser: boolean;
  hasToken: boolean;
  tokenPreview?: string;
  isAuthenticated?: boolean | null;
  authSource: "host-bridge" | "context" | "fallback" | "unknown";
  sharedApiPresent: boolean;
  sharedApiFallback: boolean;
  hostThemeMode?: "light" | "dark" | "unknown";
  hostLocale?: string;
}
`),
  });

  // 9.5 Backward-compatible theme file
  const themePath = target === "expo-standalone" ? "theme.ts" : "src/theme/theme.ts";
  files.push({
    path: themePath,
    content: await formatCode(generateThemeFile(validMiniApp.theme)),
  });

  // 10. Translation i18n
  files.push({
    path: "src/features/core/presentation/i18n/strings.ts",
    content: await formatCode(`export type TemplateLocale = "en" | "am" | "ar" | "zh";

const STRINGS: Record<TemplateLocale, Record<string, string>> = {
  en: { welcome: "Welcome" },
  am: { welcome: "እንኳን ደህና መጡ" },
  ar: { welcome: "مرحباً" },
  zh: { welcome: "欢迎" }
};

export const normalizeLocale = (locale?: string | null): TemplateLocale => {
  const normalized = String(locale || 'en').toLowerCase();
  if (normalized.startsWith('am')) return 'am';
  if (normalized.startsWith('ar')) return 'ar';
  if (normalized.startsWith('zh')) return 'zh';
  return 'en';
};

export const getTemplateStrings = (locale?: string | null) => {
  return STRINGS[normalizeLocale(locale)];
};
`),
  });

  // 11. Root entry and RN configuration
  files.push({
    path: "index.js",
    content: `import { AppRegistry } from "react-native";
import App from "./src/App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
`,
  });

  files.push({
    path: "app.json",
    content: JSON.stringify(
      {
        name: rootFolder,
        displayName: validMiniApp.name,
      },
      null,
      2
    ),
  });

  // tsconfig.json
  const tsConfigBase = target === "react-native-cli" ? "@react-native/typescript-config" : "expo/tsconfig.base";
  files.push({
    path: "tsconfig.json",
    content: JSON.stringify(
      {
        extends: tsConfigBase,
        compilerOptions: {
          target: "ES2017",
          lib: ["ES2017", "DOM"],
          allowJs: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: false,
          forceConsistentCasingInFileNames: true,
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
        include: ["**/*.ts", "**/*.tsx", "index.js"],
        exclude: ["**/node_modules", "**/Pods"],
      },
      null,
      2
    ),
  });

  // Config files
  files.push({
    path: "tailwind.config.js",
    content: generateTailwindConfigForCleanApp(validMiniApp.theme),
  });

  files.push({
    path: "global.css",
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
  });

  files.push({
    path: "nativewind-env.d.ts",
    content: `/// <reference types="nativewind/types" />
`,
  });

  files.push({
    path: "metro.config.js",
    content: `const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = {};
const defaultConfig = getDefaultConfig(__dirname);

module.exports = withNativeWind(mergeConfig(defaultConfig, config), { input: "./global.css" });
`,
  });

  files.push({
    path: "babel.config.js",
    content: `module.exports = {
  presets: [
    "module:@react-native/babel-preset",
    "nativewind/babel",
  ],
  plugins: [
    "react-native-reanimated/plugin"
  ]
};
`,
  });

  // Env files
  const envContent = `API_BASE_URL=https://apim.flyzagol.com:8251
MINIAPP_API_BASE_URL=https://example.flyzagol.qzz.io
MINIAPP_FAKE_TOKEN=REPLACE_ME
MINIAPP_NAME=${rootFolder}
MINIAPP_VERSION=${validMiniApp.version || "1.0.0"}
MINIAPP_CDN_BASE_URL=https://cdn.flyzagol.qzz.io
MINIAPP_DEV_PORT=9005
MINIAPP_DEV_HOST=127.0.0.1
`;
  files.push({ path: ".env", content: envContent });
  files.push({ path: ".env.development", content: envContent });
  files.push({ path: ".env.example", content: envContent });
  files.push({ path: ".env.production", content: envContent });

  if (target === "react-native-cli") {
    files.push(...cleanArchitectureScaffoldFiles(rootFolder));
  }

  // package.json dependencies based on target
  let packageJsonContent: any = {};
  if (target === "expo-mini-app") {
    packageJsonContent = {
      name: `${rootFolder}-mini-app`,
      version: validMiniApp.version || "1.0.0",
      private: true,
      main: "src/index.ts",
      peerDependencies: {
        "react": "*",
        "react-native": "*",
        "@react-navigation/native": "*",
        "@react-navigation/native-stack": "*",
        "nativewind": "^4.0.0",
        "react-native-safe-area-context": "*",
        "react-native-screens": "*",
      },
      devDependencies: {
        "babel-preset-expo": "^54.0.0",
        "prettier-plugin-tailwindcss": "^0.6.0",
        "tailwindcss": "^3.4.17",
      },
    };
  } else {
    // Standalone or CLI
    packageJsonContent = {
      name: rootFolder,
      version: validMiniApp.version || "1.0.0",
      private: true,
      main: "index.js",
      scripts: {
        "android": "ENVFILE=.env.development react-native run-android --no-packager",
        "android:dev": "ENVFILE=.env.development react-native run-android --no-packager",
        "android:prod": "NODE_ENV=production ENVFILE=.env.production react-native run-android --no-packager --mode=release",
        "ios": `ENVFILE=.env.development RCT_NO_LAUNCH_PACKAGER=1 react-native run-ios --no-packager --scheme ${iosSchemeName}`,
        "ios:dev": `ENVFILE=.env.development RCT_NO_LAUNCH_PACKAGER=1 react-native run-ios --no-packager --scheme ${iosSchemeName}`,
        "ios:prod": `NODE_ENV=production ENVFILE=.env.production RCT_NO_LAUNCH_PACKAGER=1 react-native run-ios --no-packager --mode Release --scheme ${iosSchemeName}`,
        "start": "bash ./scripts/start-dev-server.sh",
        "start:dev": "ENVFILE=.env.development bash ./scripts/start-dev-server.sh",
        "start:prod": "NODE_ENV=production ENVFILE=.env.production bash ./scripts/start-dev-server.sh",
        "start:standalone": "STANDALONE=1 react-native start --port 8081",
        "test": "jest",
        "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
        "postinstall": "patch-package",
        "pods": "(cd ios && bundle install && bundle exec pod install)",
        "pods:update": "(cd ios && bundle exec pod update)",
        "bundle": "pnpm bundle:ios && pnpm bundle:android && pnpm bundle:archive",
        "bundle:dev": "ENVFILE=.env.development pnpm bundle",
        "bundle:prod": "NODE_ENV=production ENVFILE=.env.production pnpm bundle",
        "bundle:ios": "react-native bundle --reset-cache true --dev false --platform ios --entry-file index.js",
        "bundle:ios:dev": "ENVFILE=.env.development pnpm bundle:ios",
        "bundle:ios:prod": "NODE_ENV=production ENVFILE=.env.production pnpm bundle:ios",
        "bundle:android": "react-native bundle --reset-cache true --dev false --platform android --entry-file index.js",
        "bundle:android:dev": "ENVFILE=.env.development pnpm bundle:android",
        "bundle:android:prod": "NODE_ENV=production ENVFILE=.env.production pnpm bundle:android",
        "bundle:archive": "bash ./scripts/archive-builds.sh",
      },
      dependencies: {
        "@gorhom/bottom-sheet": "^5.2.14",
        "@metro/miniapp-auth": "workspace:*",
        "@module-federation/enhanced": "^0.19.1",
        "@react-native-async-storage/async-storage": "^2.2.0",
        "@react-native-vector-icons/ionicons": "^12.3.0",
        "@react-native/codegen": "0.81.4",
        "@react-native/gradle-plugin": "0.81.4",
        "@react-native/new-app-screen": "0.81.4",
        "@react-navigation/native": "7.1.18",
        "@react-navigation/native-stack": "7.3.27",
        "@reduxjs/toolkit": "^2.9.0",
        "@tanstack/react-query": "^5.90.2",
        "expo": "^54.0.10",
        "expo-asset": "^12.0.9",
        "expo-constants": "^18.0.9",
        "expo-file-system": "^19.0.15",
        "expo-modules-core": "^3.0.18",
        "expo-secure-store": "^15.0.7",
        "nativewind": "^4.2.2",
        "react": "19.1.0",
        "react-native": "0.81.4",
        "react-native-config": "^1.5.9",
        "react-native-css-interop": "^0.2.2",
        "react-native-gesture-handler": "^2.28.0",
        "react-native-paper": "5.14.5",
        "react-native-reanimated": "4.2.2",
        "react-native-safe-area-context": "^5.6.1",
        "react-native-screens": "4.16.0",
        "react-native-svg": "^15.14.0",
        "react-native-vector-icons": "^10.3.0",
        "react-native-worklets": "^0.7.4",
        "react-redux": "^9.2.0",
      },
      devDependencies: {
        "@babel/core": "^7.25.2",
        "@babel/plugin-syntax-typescript": "^7.25.4",
        "@babel/plugin-transform-react-jsx": "^7.29.7",
        "@babel/preset-env": "^7.25.3",
        "@babel/runtime": "^7.25.0",
        "@callstack/repack": "^5.2.1",
        "@callstack/repack-plugin-expo-modules": "^5.2.1",
        "@callstack/repack-plugin-nativewind": "^5.2.4",
        "@callstack/repack-plugin-reanimated": "^5.2.1",
        "@react-native-community/cli": "20.0.0",
        "@react-native-community/cli-platform-android": "20.0.0",
        "@react-native-community/cli-platform-ios": "20.0.0",
        "@react-native/babel-preset": "0.81.4",
        "@react-native/community-cli-plugin": "0.81.4",
        "@react-native/eslint-config": "0.81.4",
        "@react-native/metro-config": "0.81.4",
        "@react-native/typescript-config": "0.81.4",
        "@rspack/core": "^1.3.4",
        "@swc/helpers": "^0.5.17",
        "@types/jest": "^29.5.13",
        "@types/node": "^24.7.0",
        "@types/react": "^19.1.0",
        "@types/react-test-renderer": "^19.1.0",
        "autoprefixer": "^10.4.27",
        "babel-plugin-module-resolver": "^5.0.2",
        "babel-plugin-syntax-hermes-parser": "^0.25.1",
        "babel-plugin-transform-inline-environment-variables": "^0.4.4",
        "eslint": "^8.19.0",
        "jest": "^29.6.3",
        "patch-package": "^8.0.1",
        "postcss": "^8.5.8",
        "postcss-loader": "^8.2.1",
        "prettier": "2.8.8",
        "react-test-renderer": "19.1.0",
        "reactotron-react-native": "^5.1.17",
        "reactotron-react-query": "^2.0.2",
        "tailwindcss": "^3.4.17",
        "typescript": "^5.9.2",
      },
      engines: {
        node: ">=20",
      },
    };
  }

  files.push({
    path: "package.json",
    content: JSON.stringify(packageJsonContent, null, 2),
  });

  files.push({
    path: "README.md",
    content: generateReadme(validMiniApp, target),
  });

  return { ok: true, rootFolder, files };
}

export async function generateReactNativeProject(miniApp: MiniApp): Promise<GenerateProjectResult> {
  return generateProject(miniApp, "react-native-cli");
}
