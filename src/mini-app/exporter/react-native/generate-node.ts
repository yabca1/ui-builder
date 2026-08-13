import type { MiniAppAction, MiniAppNode, ScreenDefinition, ExportTarget } from "@/mini-app/types/mini-app.types";
import { ImportCollector } from "@/mini-app/exporter/react-native/imports";
import { routeName, slugify } from "@/mini-app/exporter/react-native/identifiers";
import { propString, sourceString, imageSourcePropValue } from "@/mini-app/exporter/react-native/strings";

type GenerateNodeOptions = {
  imports: ImportCollector;
  styleNames: Map<string, string>;
  screens: ScreenDefinition[];
  target?: ExportTarget;
};

let activeNode: MiniAppNode | null = null;

function classNameProp(className: string) {
  const merged = activeNode ? mergeClasses(className, activeNode) : className;
  return ` className=${sourceString(merged)}`;
}

function themeClassNames(node: MiniAppNode): string {
  const style = node.style ?? {};
  const classes: string[] = [];

  if (style.backgroundColor && typeof style.backgroundColor === "object" && (style.backgroundColor as any).type === "theme") {
    classes.push(`bg-${(style.backgroundColor as any).token}`);
  }
  if (style.color && typeof style.color === "object" && (style.color as any).type === "theme") {
    classes.push(`text-${(style.color as any).token}`);
  }
  if (style.textColor && typeof style.textColor === "object" && (style.textColor as any).type === "theme") {
    classes.push(`text-${(style.textColor as any).token}`);
  }
  if (style.borderColor && typeof style.borderColor === "object" && (style.borderColor as any).type === "theme") {
    classes.push(`border border-${(style.borderColor as any).token}`);
  }
  if (style.borderRadius && typeof style.borderRadius === "object" && (style.borderRadius as any).type === "theme") {
    classes.push(`rounded-${(style.borderRadius as any).token}`);
  }
  if (style.padding && typeof style.padding === "object" && (style.padding as any).type === "theme") {
    classes.push(`p-${(style.padding as any).token}`);
  }
  if (style.margin && typeof style.margin === "object" && (style.margin as any).type === "theme") {
    classes.push(`m-${(style.margin as any).token}`);
  }
  if (style.gap && typeof style.gap === "object" && (style.gap as any).type === "theme") {
    classes.push(`gap-${(style.gap as any).token}`);
  }
  if (style.fontSize && typeof style.fontSize === "object" && (style.fontSize as any).type === "theme") {
    classes.push(`text-${(style.fontSize as any).token}`);
  }

  return classes.join(" ");
}

function mergeClasses(defaultClasses: string, node: MiniAppNode): string {
  const tClass = themeClassNames(node);
  if (!tClass) return defaultClasses;

  const defaultList = defaultClasses.split(/\s+/).filter(Boolean);
  const themeList = tClass.split(/\s+/).filter(Boolean);

  const merged = defaultList.filter((c) => {
    if (c.startsWith("bg-") && themeList.some((tc) => tc.startsWith("bg-"))) return false;
    if (c.startsWith("text-") && themeList.some((tc) => tc.startsWith("text-"))) return false;
    if (c.startsWith("border-") && themeList.some((tc) => tc.startsWith("border-"))) return false;
    if (c.startsWith("rounded-") && themeList.some((tc) => tc.startsWith("rounded-"))) return false;
    if (c.startsWith("p-") && themeList.some((tc) => tc.startsWith("p-"))) return false;
    if (c.startsWith("m-") && themeList.some((tc) => tc.startsWith("m-"))) return false;
    if (c.startsWith("gap-") && themeList.some((tc) => tc.startsWith("gap-"))) return false;
    return true;
  });

  return [...merged, ...themeList].join(" ");
}

function styleProp(node: MiniAppNode, styleNames: Map<string, string>) {
  const styleName = styleNames.get(node.id);
  return styleName ? ` style={styles.${styleName}}` : "";
}

function screenRouteById(screens: ScreenDefinition[], screenId: string) {
  const screen = screens.find((candidate) => candidate.id === screenId);
  return screen ? routeName(screen.name) : "";
}

export function generateAction(
  action: MiniAppAction | undefined,
  screens: ScreenDefinition[],
  target: ExportTarget,
  imports?: ImportCollector
): string {
  if (!action) {
    return "() => {}";
  }

  if (action.type === "navigate") {
    if (target === "expo-standalone") {
      imports?.add("expo-router", "router");
      const screen = screens.find((candidate) => candidate.id === action.screenId);
      const slug = screen ? slugify(screen.name) : "";
      return `() => router.push(${sourceString(slug === "home" || slug === "index" ? "/" : `/${slug}`)})`;
    }
    return `() => navigation.navigate(${sourceString(screenRouteById(screens, action.screenId))})`;
  }

  if (action.type === "goBack") {
    if (target === "expo-standalone") {
      imports?.add("expo-router", "router");
      return "() => router.back()";
    }
    return "() => navigation.goBack()";
  }

  if (action.type === "showAlert" || action.type === "showToast") {
    imports?.addReactNative("Alert");
    return `() => Alert.alert(${sourceString(action.message)})`;
  }

  return "() => {}";
}

export function generateNode(node: MiniAppNode, options: GenerateNodeOptions): string {
  const previousNode = activeNode;
  activeNode = node;
  try {
    return generateNodeInternal(node, options);
  } finally {
    activeNode = previousNode;
  }
}

function generateNodeInternal(node: MiniAppNode, options: GenerateNodeOptions): string {
  if (node.type === "container") {
    const hasManyChildren = (node.children ?? []).length >= 2;
    const isHorizontal = node.style?.direction === "horizontal";
    const useScrollView = hasManyChildren && isHorizontal;
    const componentName = useScrollView ? "ScrollView" : "View";
    options.imports.addReactNative(componentName);
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    const scrollProps = useScrollView ? " horizontal={true} showsHorizontalScrollIndicator={false}" : "";
    return `<${componentName}${classNameProp("gap-3 rounded-xl")}${scrollProps}${styleProp(node, options.styleNames)}>${children}</${componentName}>`;
  }

  if (node.type === "text") {
    options.imports.addReactNative("Text");
    return `<Text${classNameProp("text-zinc-900")}${styleProp(node, options.styleNames)}>{${sourceString(node.props.text)}}</Text>`;
  }

  if (node.type === "button") {
    options.imports.addReactNative("Pressable");
    options.imports.addReactNative("Text");
    const action = node.events?.onPress;
    const target = options.target ?? "react-native-cli";
    if (action?.type === "showAlert" || action?.type === "showToast") {
      options.imports.addReactNative("Alert");
    }
    return `<Pressable${classNameProp("items-center rounded-lg bg-blue-600 px-4 py-3")}${styleProp(node, options.styleNames)} onPress={${generateAction(action, options.screens, target, options.imports)}}><Text${classNameProp("font-semibold text-white")}>{${sourceString(node.props.label)}}</Text></Pressable>`;
  }

  if (node.type === "input") {
    options.imports.addReactNative("TextInput");
    return `<TextInput${classNameProp("rounded-lg border border-zinc-300 px-3 py-3 text-zinc-900")}${styleProp(node, options.styleNames)} ${propString("placeholder", node.props.placeholder)} defaultValue={${sourceString(node.props.defaultValue)}} />`;
  }

  if (node.type === "image") {
    options.imports.addReactNative("Image");
    const sourceUrl = node.props.sourceUrl ?? node.props.source;
    return `<Image${classNameProp("rounded-lg")}${styleProp(node, options.styleNames)} source={${imageSourcePropValue(sourceUrl)}} />`;
  }

  if (node.type === "card") {
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    const header = (node.children ?? []).length > 0
      ? ""
      : `<View${classNameProp("border-b border-zinc-100 p-4")}>
        <Text${classNameProp("font-semibold text-zinc-900")}>{${sourceString(node.props.title)}}</Text>
        <Text${classNameProp("text-zinc-500 text-xs mt-1")}>{${sourceString(node.props.description)}}</Text>
      </View>`;
    return `<View${classNameProp("border border-zinc-200 bg-white rounded-xl shadow-sm overflow-hidden")}${styleProp(node, options.styleNames)}>
      ${header}
      <View${classNameProp("p-4 gap-3")}>${children}</View>
    </View>`;
  }

  if (node.type === "badge") {
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    const variant = node.props.variant ?? "default";
    let bgClass = "bg-zinc-900";
    let textClass = "text-zinc-50";
    if (variant === "secondary") { bgClass = "bg-zinc-100"; textClass = "text-zinc-900"; }
    if (variant === "destructive") { bgClass = "bg-red-500"; textClass = "text-zinc-50"; }
    if (variant === "outline") { bgClass = "border border-zinc-200 bg-white"; textClass = "text-zinc-900"; }
    return `<View${classNameProp(`self-start px-2.5 py-0.5 rounded-full ${bgClass}`)}${styleProp(node, options.styleNames)}><Text${classNameProp(`text-xs font-semibold ${textClass}`)}>{${sourceString(node.props.text)}}</Text></View>`;
  }

  if (node.type === "alert") {
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    const variant = node.props.variant ?? "default";
    const isDestructive = variant === "destructive";
    const bgClass = isDestructive ? "border border-red-200 bg-red-50" : "border border-zinc-200 bg-white";
    const titleClass = isDestructive ? "text-red-900 font-semibold text-sm" : "text-zinc-950 font-semibold text-sm";
    const descClass = isDestructive ? "text-red-800 text-xs mt-1" : "text-zinc-500 text-xs mt-1";
    return `<View${classNameProp(`p-4 rounded-lg ${bgClass}`)}${styleProp(node, options.styleNames)}>
      <Text${classNameProp(titleClass)}>{${sourceString(node.props.title)}}</Text>
      <Text${classNameProp(descClass)}>{${sourceString(node.props.description)}}</Text>
    </View>`;
  }

  if (node.type === "switch") {
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    options.imports.addReactNative("Switch");
    return `<View${classNameProp("flex-row items-center gap-2 py-1")}${styleProp(node, options.styleNames)}>
      <Switch value={${Boolean(node.props.checked)}} />
      <Text${classNameProp("text-sm text-zinc-900")}>{${sourceString(node.props.label)}}</Text>
    </View>`;
  }

  if (node.type === "slider") {
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    const min = typeof node.props.min === "number" ? node.props.min : 0;
    const max = typeof node.props.max === "number" ? node.props.max : 100;
    const val = typeof node.props.defaultValue === "number" ? node.props.defaultValue : 50;
    const percentage = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    return `<View${classNameProp("w-full py-2")}${styleProp(node, options.styleNames)}>
      <View${classNameProp("flex-row justify-between mb-1.5")}>
        <Text${classNameProp("text-xs font-semibold text-zinc-700")}>{${sourceString(node.props.label)}}</Text>
        <Text${classNameProp("text-xs text-zinc-500")}>{${val}}</Text>
      </View>
      <View${classNameProp("h-2 bg-zinc-100 rounded-full w-full justify-center relative")}>
        <View${classNameProp("h-full bg-zinc-900 rounded-full")} style={{ width: "${percentage}%" }} />
        <View${classNameProp("absolute h-5 w-5 rounded-full border border-zinc-200 bg-white shadow-sm")} style={{ left: "calc(${percentage}% - 10px)" }} />
      </View>
    </View>`;
  }

  if (node.type === "progress") {
    options.imports.addReactNative("View");
    const value = typeof node.props.value === "number" ? node.props.value : 60;
    const max = typeof node.props.max === "number" ? node.props.max : 100;
    const percentage = Math.max(0, Math.min(100, (value / max) * 100));
    return `<View${classNameProp("h-2.5 bg-zinc-100 rounded-full w-full overflow-hidden")}${styleProp(node, options.styleNames)}>
      <View${classNameProp("h-full bg-zinc-900")} style={{ width: "${percentage}%" }} />
    </View>`;
  }

  if (node.type === "avatar") {
    options.imports.addReactNative("View");
    options.imports.addReactNative("Image");
    options.imports.addReactNative("Text");
    const sourceUrl = node.props.sourceUrl;
    const size = typeof node.style?.size === "number" ? node.style.size : 40;
    const sizeStyle = `width: ${size}, height: ${size}, borderRadius: ${size / 2}`;
    if (sourceUrl) {
      return `<Image${classNameProp("bg-zinc-100")}${styleProp(node, options.styleNames)} source={${imageSourcePropValue(sourceUrl)}} style={{ ${sizeStyle} }} />`;
    } else {
      return `<View${classNameProp("bg-zinc-100 items-center justify-center")}${styleProp(node, options.styleNames)} style={{ ${sizeStyle} }}>
        <Text${classNameProp("text-xs font-semibold text-zinc-600")}>{${sourceString(node.props.fallbackText)}}</Text>
      </View>`;
    }
  }

  if (node.type === "checkbox") {
    options.imports.addReactNative("Pressable");
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    const checked = Boolean(node.props.checked);
    return `<Pressable${classNameProp("flex-row items-center gap-2 py-1.5")}${styleProp(node, options.styleNames)}>
      <View${classNameProp(`h-4 w-4 rounded-sm border border-zinc-300 items-center justify-center ${checked ? "bg-zinc-900 border-zinc-900" : "bg-white"}`)}>
        {${checked} && <Text style={{ color: "#ffffff", fontSize: 10 }}>✓</Text>}
      </View>
      <Text${classNameProp("text-sm text-zinc-900")}>{${sourceString(node.props.label)}}</Text>
    </Pressable>`;
  }

  if (node.type === "textarea") {
    options.imports.addReactNative("TextInput");
    return `<TextInput${classNameProp("rounded-lg border border-zinc-300 px-3 py-3 text-zinc-900 align-top")}${styleProp(node, options.styleNames)} ${propString("placeholder", node.props.placeholder)} defaultValue={${sourceString(node.props.defaultValue)}} multiline={true} numberOfLines={4} />`;
  }

  if (node.type === "label") {
    options.imports.addReactNative("Text");
    return `<Text${classNameProp("text-sm font-semibold text-zinc-700")}${styleProp(node, options.styleNames)}>{${sourceString(node.props.text)}}</Text>`;
  }

  if (node.type === "separator") {
    options.imports.addReactNative("View");
    const isHorizontal = node.props.orientation === "horizontal";
    const lineStyle = isHorizontal ? "h-[1px] w-full" : "w-[1px] h-full min-h-[20px]";
    return `<View${classNameProp(`bg-zinc-200 ${lineStyle}`)}${styleProp(node, options.styleNames)} />`;
  }

  if (node.type === "radioGroup") {
    options.imports.addReactNative("Pressable");
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    const optionsText = typeof node.props.options === "string" ? node.props.options : "Option A\nOption B";
    const opts = optionsText.split("\n").filter(Boolean);
    const selected = node.props.selectedValue;
    return `<View${classNameProp("gap-2 py-1")}${styleProp(node, options.styleNames)}>
      <Text${classNameProp("text-xs font-semibold text-zinc-500")}>{${sourceString(node.props.label)}}</Text>
      {${JSON.stringify(opts)}.map((option, idx) => {
        const isSelected = option === ${sourceString(selected)};
        return (
          <Pressable key={idx}${classNameProp("flex-row items-center gap-2")}>
            <View${classNameProp("h-4 w-4 rounded-full border border-zinc-300 items-center justify-center bg-white")} style={isSelected ? { borderColor: "#18181b" } : undefined}>
              {isSelected && <View${classNameProp("h-2 w-2 rounded-full bg-zinc-900")} />}
            </View>
            <Text${classNameProp("text-sm text-zinc-900")}>{option}</Text>
          </Pressable>
        );
      })}
    </View>`;
  }

  if (node.type === "accordion") {
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    return `<View${classNameProp("border border-zinc-200 bg-white rounded-lg overflow-hidden")}${styleProp(node, options.styleNames)}>
      <View${classNameProp("flex-row justify-between items-center px-4 py-3 bg-zinc-50/50 border-b border-zinc-100")}>
        <Text${classNameProp("font-semibold text-zinc-700 text-sm")}>{${sourceString(node.props.title)}}</Text>
        <Text>▼</Text>
      </View>
      <View${classNameProp("p-4 gap-2 border-t border-zinc-100 bg-white")}>
        {${children ? `\n        <>${children}</>\n        ` : `\n        <Text${classNameProp("text-xs text-zinc-500")}>{${sourceString(node.props.description)}}</Text>\n        `}}
      </View>
    </View>`;
  }

  if (node.type === "tabs") {
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    const tabsText = typeof node.props.tabs === "string" ? node.props.tabs : "Tab 1\nTab 2";
    const tabs = tabsText.split("\n").filter(Boolean);
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    return `<View${classNameProp("border border-zinc-200 bg-white rounded-lg overflow-hidden")}${styleProp(node, options.styleNames)}>
      <View${classNameProp("flex-row border-b border-zinc-200 bg-zinc-50/50 p-1 gap-1")}>
        {${JSON.stringify(tabs)}.map((tab, idx) => (
          <View key={idx}${classNameProp("px-3 py-1.5 rounded-md bg-white border border-zinc-200 shadow-sm")} style={idx > 0 ? { backgroundColor: "transparent", borderColor: "transparent" } : undefined}>
            <Text${classNameProp("text-xs font-semibold text-zinc-900")}>{tab}</Text>
          </View>
        ))}
      </View>
      <View${classNameProp("p-4 gap-2 bg-white")}>
        {${children ? `\n        <>${children}</>\n        ` : `\n        <Text${classNameProp("text-xs text-zinc-500 text-center py-2")}>Content</Text>\n        `}}
      </View>
    </View>`;
  }

  if (node.type === "skeleton") {
    options.imports.addReactNative("View");
    return `<View${classNameProp("bg-zinc-200 rounded-sm")}${styleProp(node, options.styleNames)} />`;
  }

  if (node.type === "scrollArea") {
    options.imports.addReactNative("ScrollView");
    options.imports.addReactNative("View");
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    return `<ScrollView${classNameProp("w-full")}${styleProp(node, options.styleNames)}>
      <View${classNameProp("gap-2")}>${children}</View>
    </ScrollView>`;
  }

  if (node.type === "aspectRatio") {
    options.imports.addReactNative("View");
    const ratio = typeof node.props.ratio === "number" ? node.props.ratio : 1.77;
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    return `<View style={{ aspectRatio: ${ratio}, width: "100%", overflow: "hidden" }}>${children}</View>`;
  }

  if (node.type === "pagination") {
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    options.imports.addReactNative("Pressable");
    const cur = typeof node.props.currentPage === "number" ? node.props.currentPage : 1;
    const total = typeof node.props.totalPages === "number" ? node.props.totalPages : 5;
    const showEllipsis = node.props.showEllipsis !== false;

    return `<View${classNameProp("flex-row items-center justify-center gap-1.5 py-2 w-full")}${styleProp(node, options.styleNames)}>
      <Pressable${classNameProp("px-2 py-1.5 rounded border border-zinc-200 bg-white")}><Text${classNameProp("text-xs font-semibold text-zinc-500")}>&lt; Prev</Text></Pressable>
      {(() => {
        const cur = ${cur};
        const total = ${total};
        const showEllipsis = ${showEllipsis};
        const pages = [];
        if (total <= 4) {
          for (let i = 1; i <= total; i++) pages.push(i);
        } else {
          pages.push(1);
          if (cur > 2) {
            if (showEllipsis) pages.push("...");
            else pages.push(cur - 1);
          } else if (cur === 2 && total > 2) {
            pages.push(2);
          }
          if (cur > 2 && cur < total - 1) pages.push(cur);
          if (cur < total - 1) {
            if (showEllipsis) pages.push("...");
            else pages.push(cur + 1);
          } else if (cur === total - 1 && total > 2 && cur > 2) {
            pages.push(total - 1);
          }
          if (total > 1) pages.push(total);
        }
        const finalPages = Array.from(new Set(pages.map(String))).map(p => p === "..." ? "..." : Number(p));
        return finalPages.map((p, idx) => {
          const isActive = p === cur;
          return (
            <Pressable key={idx}${classNameProp("min-w-[28px] h-7 px-1 rounded border items-center justify-center")} style={isActive ? { backgroundColor: "#18181b", borderColor: "#18181b" } : p === "..." ? { borderColor: "transparent", backgroundColor: "transparent" } : { borderColor: "#e4e4e7", backgroundColor: "#ffffff" }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: isActive ? "#ffffff" : p === "..." ? "#a1a1aa" : "#52525b" }}>{p}</Text>
            </Pressable>
          );
        });
      })()}
      <Pressable${classNameProp("px-2 py-1.5 rounded border border-zinc-200 bg-white")}><Text${classNameProp("text-xs font-semibold text-zinc-500")}>Next &gt;</Text></Pressable>
    </View>`;
  }

  if (node.type === "row") {
    const hasManyChildren = (node.children ?? []).length >= 2;
    const componentName = hasManyChildren ? "ScrollView" : "View";
    options.imports.addReactNative(componentName);
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    const horizontalProp = hasManyChildren ? " horizontal={true} showsHorizontalScrollIndicator={false}" : "";
    return `<${componentName}${classNameProp("flex-row items-center gap-2")}${horizontalProp}${styleProp(node, options.styleNames)}>
${children}
</${componentName}>`;
  }

  if (node.type === "column") {
    const hasManyChildren = (node.children ?? []).length >= 2;
    const componentName = hasManyChildren ? "ScrollView" : "View";
    options.imports.addReactNative(componentName);
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    return `<${componentName}${classNameProp("gap-2")}${styleProp(node, options.styleNames)}>
${children}
</${componentName}>`;
  }

  if (node.type === "heading") {
    options.imports.addReactNative("Text");
    return `<Text${classNameProp("font-bold text-zinc-900")}${styleProp(node, options.styleNames)}>{${sourceString(node.props.text)}}</Text>`;
  }

  if (node.type === "list") {
    options.imports.addReactNative("View");
    options.imports.addReactNative("Text");
    const title = typeof node.props.title === "string" ? node.props.title : "";
    const itemsText = typeof node.props.items === "string" ? node.props.items : "Item 1\nItem 2\nItem 3";
    const items = itemsText.split("\n").filter(Boolean);
    const ordered = node.props.ordered === true;
    const showDividers = node.props.showDividers === true;
    const style = node.style ?? {};
    const gap = typeof style.gap === "number" ? style.gap : 8;
    const fontSize = typeof style.fontSize === "number" ? style.fontSize : 14;

    const itemsJsx = items.map((item, idx) => {
      const isLast = idx === items.length - 1;
      const divider = showDividers && !isLast
        ? `\n      <View style={{ height: 1, backgroundColor: "#e4e4e7", width: "100%" }} />`
        : "";
      const prefix = ordered ? `${idx + 1}.` : "•";
      const verticalPadding = showDividers
        ? ` style={{ paddingTop: ${idx > 0 ? gap : 0}, paddingBottom: ${isLast ? 0 : gap} }}`
        : "";

      return `    <View key={${idx}} style={{ flexDirection: "column" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}${verticalPadding}>
        <Text style={{ fontSize: ${fontSize}, color: ${sourceString(String(style.color ?? "#111827"))}, marginRight: 8, opacity: ${ordered ? 0.6 : 0.5} }}>${prefix}</Text>
        <Text style={{ fontSize: ${fontSize}, color: ${sourceString(String(style.color ?? "#111827"))}, fontWeight: ${sourceString(String(style.fontWeight ?? "400"))}, flex: 1 }}>{${sourceString(item)}}</Text>
      </View>${divider}
    </View>`;
    }).join("\n");

    const titleJsx = title
      ? `<Text style={{ fontSize: ${fontSize + 2}, fontWeight: "600", color: ${sourceString(String(style.color ?? "#111827"))}, marginBottom: 8 }}>{${sourceString(title)}}</Text>\n`
      : "";

    return `<View${styleProp(node, options.styleNames)}>
${titleJsx}  <View style={{ gap: ${showDividers ? 0 : gap} }}>
${itemsJsx}
  </View>
</View>`;
  }

  return "";
}
