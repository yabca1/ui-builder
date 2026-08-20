import type { MiniAppAction, MiniAppNode, ScreenDefinition, ExportTarget } from "@/mini-app/types/mini-app.types";
import { ImportCollector } from "@/mini-app/exporter/react-native/imports";
import { routeName } from "@/mini-app/exporter/react-native/identifiers";
import { sourceString, imageSourcePropValue } from "@/mini-app/exporter/react-native/strings";

type GenerateNodeOptions = {
  imports: ImportCollector;
  screens: ScreenDefinition[];
  target?: ExportTarget;
  styleNames?: Map<string, string>;
};

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

function mergeTailwindClasses(defaultClasses: string, customClasses: string): string {
  if (!customClasses) return defaultClasses;
  if (!defaultClasses) return customClasses;

  const defaultList = defaultClasses.split(/\s+/).filter(Boolean);
  const customList = customClasses.split(/\s+/).filter(Boolean);

  const customCategories = new Set(customList.map(getTailwindPropertyCategory));

  const filteredDefaults = defaultList.filter(
    (cls) => !customCategories.has(getTailwindPropertyCategory(cls))
  );

  return [...filteredDefaults, ...customList].join(" ");
}

function styleToTailwind(style: Record<string, any> | undefined, node: MiniAppNode): string {
  if (!style) return "";
  const classes: string[] = [];

  const getVal = (prop: string) => {
    const val = style[prop];
    if (val === undefined || val === null) return null;
    if (typeof val === "object" && val.type === "theme") {
      return { isToken: true, value: val.token };
    }
    return { isToken: false, value: val };
  };

  const bg = getVal("backgroundColor");
  if (bg) {
    if (bg.isToken) classes.push(`bg-${bg.value}`);
    else classes.push(`bg-[${bg.value}]`);
  }

  const color = getVal("color") ?? getVal("textColor");
  if (color) {
    if (color.isToken) classes.push(`text-${color.value}`);
    else classes.push(`text-[${color.value}]`);
  }

  const borderColor = getVal("borderColor");
  if (borderColor) {
    if (borderColor.isToken) classes.push(`border-${borderColor.value}`);
    else classes.push(`border-[${borderColor.value}]`);
  }

  const borderWidth = getVal("borderWidth");
  if (borderWidth) {
    classes.push(`border-[${borderWidth.value}px]`);
  }

  const borderRadius = getVal("borderRadius");
  if (borderRadius) {
    if (borderRadius.isToken) classes.push(`rounded-${borderRadius.value}`);
    else classes.push(`rounded-[${borderRadius.value}px]`);
  }

  const width = getVal("width");
  if (width) {
    if (typeof width.value === "number") classes.push(`w-[${width.value}px]`);
    else classes.push(`w-[${width.value}]`);
  }

  const height = getVal("height");
  if (height) {
    if (typeof height.value === "number") classes.push(`h-[${height.value}px]`);
    else classes.push(`h-[${height.value}]`);
  }

  const minWidth = getVal("minWidth");
  if (minWidth) classes.push(`min-w-[${minWidth.value}${typeof minWidth.value === "number" ? "px" : ""}]`);
  const maxWidth = getVal("maxWidth");
  if (maxWidth) classes.push(`max-w-[${maxWidth.value}${typeof maxWidth.value === "number" ? "px" : ""}]`);
  const minHeight = getVal("minHeight");
  if (minHeight) classes.push(`min-h-[${minHeight.value}${typeof minHeight.value === "number" ? "px" : ""}]`);
  const maxHeight = getVal("maxHeight");
  if (maxHeight) classes.push(`max-h-[${maxHeight.value}${typeof maxHeight.value === "number" ? "px" : ""}]`);

  const padding = getVal("padding");
  if (padding) {
    if (padding.isToken) classes.push(`p-${padding.value}`);
    else classes.push(`p-[${padding.value}px]`);
  }
  const pt = getVal("paddingTop"); if (pt) classes.push(pt.isToken ? `pt-${pt.value}` : `pt-[${pt.value}px]`);
  const pr = getVal("paddingRight"); if (pr) classes.push(pr.isToken ? `pr-${pr.value}` : `pr-[${pr.value}px]`);
  const pb = getVal("paddingBottom"); if (pb) classes.push(pb.isToken ? `pb-${pb.value}` : `pb-[${pb.value}px]`);
  const pl = getVal("paddingLeft"); if (pl) classes.push(pl.isToken ? `pl-${pl.value}` : `pl-[${pl.value}px]`);
  const px = getVal("paddingHorizontal"); if (px) classes.push(px.isToken ? `px-${px.value}` : `px-[${px.value}px]`);
  const py = getVal("paddingVertical"); if (py) classes.push(py.isToken ? `py-${py.value}` : `py-[${py.value}px]`);

  const margin = getVal("margin");
  if (margin) {
    if (margin.isToken) classes.push(`m-${margin.value}`);
    else classes.push(`m-[${margin.value}px]`);
  }
  const mt = getVal("marginTop"); if (mt) classes.push(mt.isToken ? `mt-${mt.value}` : `mt-[${mt.value}px]`);
  const mr = getVal("marginRight"); if (mr) classes.push(mr.isToken ? `mr-${mr.value}` : `mr-[${mr.value}px]`);
  const mb = getVal("marginBottom"); if (mb) classes.push(mb.isToken ? `mb-${mb.value}` : `mb-[${mb.value}px]`);
  const ml = getVal("marginLeft"); if (ml) classes.push(ml.isToken ? `ml-${ml.value}` : `ml-[${ml.value}px]`);
  const mx = getVal("marginHorizontal"); if (mx) classes.push(mx.isToken ? `mx-${mx.value}` : `mx-[${mx.value}px]`);
  const my = getVal("marginVertical"); if (my) classes.push(my.isToken ? `my-${my.value}` : `my-[${my.value}px]`);

  const gap = getVal("gap");
  if (gap) {
    if (gap.isToken) classes.push(`gap-${gap.value}`);
    else classes.push(`gap-[${gap.value}px]`);
  }

  const flex = getVal("flex");
  if (flex) {
    classes.push(`flex-[${flex.value}]`);
  }

  const direction = style.direction;
  if (direction === "vertical" || direction === "column") {
    classes.push("flex-col");
  } else if (direction === "horizontal" || direction === "row") {
    classes.push("flex-row");
  }

  const flexWrap = style.flexWrap;
  if (flexWrap === "wrap") classes.push("flex-wrap");
  else if (flexWrap === "nowrap") classes.push("flex-nowrap");

  const align = style.alignItems ?? style.align ?? style.alignment;
  if (align === "start" || align === "flex-start") classes.push("items-start");
  else if (align === "end" || align === "flex-end") classes.push("items-end");
  else if (align === "center") classes.push("items-center");
  else if (align === "stretch") classes.push("items-stretch");

  const justify = style.justifyContent ?? style.justify;
  if (justify === "start" || justify === "flex-start") classes.push("justify-start");
  else if (justify === "end" || justify === "flex-end") classes.push("justify-end");
  else if (justify === "center") classes.push("justify-center");
  else if (justify === "space-between") classes.push("justify-between");
  else if (justify === "space-around") classes.push("justify-around");

  const fontSize = getVal("fontSize");
  if (fontSize) {
    if (fontSize.isToken) classes.push(`text-${fontSize.value}`);
    else classes.push(`text-[${fontSize.value}px]`);
  }

  const fontWeight = getVal("fontWeight");
  if (fontWeight) {
    classes.push(`font-[${fontWeight.value}]`);
  }

  const opacity = getVal("opacity");
  if (opacity) {
    classes.push(`opacity-[${opacity.value}]`);
  }

  const lineHeight = getVal("lineHeight");
  if (lineHeight) {
    classes.push(`leading-[${lineHeight.value}px]`);
  }

  const letterSpacing = getVal("letterSpacing");
  if (letterSpacing) {
    classes.push(`tracking-[${letterSpacing.value}px]`);
  }

  return classes.join(" ");
}

function renderStringProp(value: unknown): string {
  if (typeof value !== "string") return JSON.stringify(value);
  if (value.includes("{") && value.includes("}")) {
    const templateExpr = value.replace(/\{([^{}]+)\}/g, "${$1}");
    return `\`${templateExpr}\``;
  }
  return sourceString(value);
}

export function stateRoot(path: string): string {
  return String(path || "").split(".").filter(Boolean)[0] || "value";
}

export function stateIdentifier(path: string): string {
  const root = stateRoot(path);
  return root.replace(/[^a-zA-Z0-9_$]/g, "_").replace(/^(\d)/, "_$1");
}

export function stateSetterName(path: string): string {
  const id = stateIdentifier(path);
  return `set${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

function relativePath(path: string): string {
  const parts = String(path || "").split(".").filter(Boolean);
  return parts.slice(1).join(".");
}

function expressionForStatePath(path: string): string {
  const id = stateIdentifier(path);
  const nestedPath = relativePath(path);
  return nestedPath ? `getValueByPath(${id}, ${sourceString(nestedPath)})` : id;
}

function setterForStatePath(path: string, valueExpression: string): string {
  const id = stateIdentifier(path);
  const setter = stateSetterName(path);
  const nestedPath = relativePath(path);
  if (!nestedPath) {
    return `${setter}(${valueExpression});`;
  }
  return `${setter}((prev: any) => {
        const next = structuredClone(prev ?? {});
        setValueByPath(next, ${sourceString(nestedPath)}, ${valueExpression});
        return next;
      });`;
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
    const screen = screens.find((candidate) => candidate.id === action.screenId);
    const screenRoute = screen ? routeName(screen.name) : "";
    return `() => navigation.navigate(${sourceString(screenRoute)})`;
  }

  if (action.type === "goBack") {
    return "() => navigation.goBack()";
  }

  if (action.type === "showAlert") {
    imports?.addReactNative("Alert");
    return `() => Alert.alert(${sourceString(action.message)})`;
  }

  if (action.type === "showToast") {
    imports?.addReactNative("ToastAndroid");
    imports?.addReactNative("Platform");
    imports?.addReactNative("Alert");
    return `() => {
      if (Platform.OS === 'android') {
        ToastAndroid.show(${sourceString(action.message)}, ToastAndroid.SHORT);
      } else {
        Alert.alert(${sourceString(action.message)});
      }
    }`;
  }

  if (action.type === "setVariable") {
    imports?.add("../../infrastructure/api/api-client", "setValueByPath");
    const valueStr = String(action.value);
    const code = valueStr.startsWith("=") ? valueStr.slice(1) : sourceString(valueStr);
    return `() => {
      ${setterForStatePath(action.variable, code)}
    }`;
  }

  if (action.type === "invokeApi") {
    imports?.add("../../infrastructure/api/api-client", "getValueByPath");
    imports?.add("../../infrastructure/api/api-client", "invokeApi");
    imports?.add("../../infrastructure/api/api-client", "setValueByPath");
    if (action.requestMappings.some((mapping) => mapping.sourceType === "credential")) {
      imports?.add("../../infrastructure/api/api-client", "credentialsResolver");
    }

    const paramLines = action.requestMappings.map((m) => {
      if (m.sourceType === "static") {
        return `setValueByPath(params, ${sourceString(m.parameter)}, ${sourceString(m.sourceValue)});`;
      } else if (m.sourceType === "credential") {
        return `setValueByPath(params, ${sourceString(m.parameter)}, credentialsResolver.get(${sourceString(m.sourceValue)}));`;
      }
      return `setValueByPath(params, ${sourceString(m.parameter)}, ${expressionForStatePath(m.sourceValue)} ?? "");`;
    }).join("\n      ");

    const responseUpdates = action.responseMappings.map((m) => {
      return setterForStatePath(m.targetVariable, `getValueByPath(result.data, ${sourceString(m.responsePath)}) ?? null`);
    }).join("\n          ");

    const onLoadingCode = action.onLoading ? `(${generateAction(action.onLoading, screens, target, imports)})();` : "";
    const onLoadedCode = action.onLoaded ? `(${generateAction(action.onLoaded, screens, target, imports)})();` : "";
    const onEmptyCode = action.onEmpty ? `(${generateAction(action.onEmpty, screens, target, imports)})();` : "";
    const onErrorCode = action.onError ? `(${generateAction(action.onError, screens, target, imports)})();` : "";

    return `() => {
      ${setterForStatePath(`api.${action.pathId}.status`, sourceString("loading"))}
      ${setterForStatePath(`api.${action.pathId}.error`, "null")}
      ${setterForStatePath(`api.${action.pathId}.statusCode`, "null")}
      ${onLoadingCode}
      const params: Record<string, any> = {};
      ${paramLines}
      invokeApi(
        ${JSON.stringify(action.integrationId)},
        ${JSON.stringify(action.pathId)},
        params
      ).then((result) => {
        if (result.success) {
          ${responseUpdates}
          const isEmpty = !result.data ||
            (Array.isArray(result.data) && result.data.length === 0) ||
            (typeof result.data === 'object' && Object.keys(result.data).length === 0);
          if (isEmpty) {
            ${setterForStatePath(`api.${action.pathId}.status`, sourceString("empty"))}
            ${setterForStatePath(`api.${action.pathId}.statusCode`, "result.status ?? null")}
            ${onEmptyCode ? onEmptyCode : onLoadedCode}
          } else {
            ${setterForStatePath(`api.${action.pathId}.status`, sourceString("loaded"))}
            ${setterForStatePath(`api.${action.pathId}.statusCode`, "result.status ?? null")}
            ${onLoadedCode}
          }
        } else {
          ${setterForStatePath(`api.${action.pathId}.status`, sourceString("error"))}
          ${setterForStatePath(`api.${action.pathId}.error`, "result.error ?? 'API request failed'")}
          ${setterForStatePath(`api.${action.pathId}.statusCode`, "result.status ?? null")}
          ${onErrorCode}
        }
      }).catch((err) => {
        console.error(err);
        ${setterForStatePath(`api.${action.pathId}.status`, sourceString("error"))}
        ${setterForStatePath(`api.${action.pathId}.error`, "err?.message ?? 'API request failed'")}
        ${onErrorCode}
      });
    }`;
  }

  return "() => {}";
}

export function generateNode(node: MiniAppNode, options: GenerateNodeOptions): string {
  let result = generateNodeInternal(node, options);
  const action = node.events?.onPress;
  if (node.type !== "button" && action) {
    options.imports.addReactNative("Pressable");
    const target = options.target ?? "react-native-cli";
    result = `<Pressable onPress={${generateAction(action, options.screens, target, options.imports)}}>${result}</Pressable>`;
  }
  return result;
}

function generateNodeInternal(node: MiniAppNode, options: GenerateNodeOptions): string {
  const customClasses = options.styleNames?.get(node.id) || styleToTailwind(node.style, node);

  if (node.type === "container") {
    const hasManyChildren = (node.children ?? []).length >= 2;
    const isHorizontal = node.style?.direction === "horizontal";
    const useScrollView = hasManyChildren;
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    const mergedClasses = mergeTailwindClasses("gap-3 rounded-xl", customClasses);

    if (useScrollView) {
      options.imports.addReactNative("ScrollView");
      const scrollProps = isHorizontal ? ' horizontal={true} showsHorizontalScrollIndicator={false}' : '';
      const words = mergedClasses.split(/\s+/).filter(Boolean);
      const layoutPrefixes = ["flex-", "items-", "justify-", "gap-", "flex-row", "flex-col"];
      const layoutClasses: string[] = [];
      const containerClasses: string[] = [];
      for (const c of words) {
        if (layoutPrefixes.some(prefix => c.startsWith(prefix))) {
          layoutClasses.push(c);
        } else {
          containerClasses.push(c);
        }
      }
      const classProp = containerClasses.length > 0 ? ` className="${containerClasses.join(" ")}"` : "";
      const contentClassProp = layoutClasses.length > 0 ? ` contentContainerClassName="${layoutClasses.join(" ")}"` : "";
      return `<ScrollView${classProp}${contentClassProp}${scrollProps}>${children}</ScrollView>`;
    } else {
      options.imports.addReactNative("View");
      return `<View className="${mergedClasses}">${children}</View>`;
    }
  }

  if (node.type === "shape") {
    options.imports.addUiComponent("Shape");
    const shapeType = node.props.shapeType as string || "rectangle";
    const width = node.style?.width !== undefined ? (typeof node.style.width === "number" ? node.style.width : 100) : 100;
    const height = node.style?.height !== undefined ? (typeof node.style.height === "number" ? node.style.height : 100) : 100;
    const rx = node.style?.borderRadius !== undefined ? (typeof node.style.borderRadius === "number" ? node.style.borderRadius : 0) : 0;
    const bg = node.style?.backgroundColor !== undefined ? renderStringProp(node.style.backgroundColor) : `"#3b82f6"`;
    const stroke = node.style?.borderColor !== undefined ? renderStringProp(node.style.borderColor) : `"transparent"`;
    const strokeWidth = node.style?.borderWidth !== undefined ? (typeof node.style.borderWidth === "number" ? node.style.borderWidth : 0) : 0;
    
    const shapeClasses = customClasses.split(/\s+/).filter(cls => {
      return !cls.startsWith("w-") && !cls.startsWith("h-") && !cls.startsWith("bg-") && !cls.startsWith("border-") && !cls.startsWith("rounded-");
    }).join(" ");

    const classProp = shapeClasses ? ` className="${shapeClasses}"` : "";

    return `<Shape shapeType="${shapeType}" width={${width}} height={${height}} rx={${rx}} fill={${bg}} stroke={${stroke}} strokeWidth={${strokeWidth}}${classProp} />`;
  }

  if (node.type === "text") {
    options.imports.addUiComponent("Text");
    const mergedClasses = mergeTailwindClasses("text-zinc-900", customClasses);
    return `<Text className="${mergedClasses}" text={${renderStringProp(node.props.text)}} />`;
  }

  if (node.type === "button") {
    options.imports.addUiComponent("Button");
    const mergedClasses = mergeTailwindClasses("items-center rounded-lg bg-blue-600 px-4 py-3", customClasses);
    const action = node.events?.onPress;
    const target = options.target ?? "react-native-cli";
    return `<Button className="${mergedClasses}" label={${renderStringProp(node.props.label)}} onPress={${generateAction(action, options.screens, target, options.imports)}} />`;
  }

  if (node.type === "input") {
    options.imports.addUiComponent("Input");
    const mergedClasses = mergeTailwindClasses("rounded-lg border border-zinc-300 px-3 py-3 text-zinc-900 bg-white", customClasses);
    const variableName = typeof node.props.variableName === "string" ? node.props.variableName : "";
    if (variableName) {
      options.imports.add("../../infrastructure/api/api-client", "getValueByPath");
      options.imports.add("../../infrastructure/api/api-client", "setValueByPath");
      const valueExpr = expressionForStatePath(variableName);
      const updateCode = setterForStatePath(variableName, "text");
      return `<Input className="${mergedClasses}" placeholder=${sourceString(node.props.placeholder)} value={String(${valueExpr} ?? "")} onChangeText={(text) => { ${updateCode} }} />`;
    }
    return `<Input className="${mergedClasses}" placeholder=${sourceString(node.props.placeholder)} defaultValue={${sourceString(node.props.defaultValue)}} />`;
  }

  if (node.type === "image") {
    options.imports.addUiComponent("Image");
    const mergedClasses = mergeTailwindClasses("rounded-lg", customClasses);
    const sourceUrl = node.props.sourceUrl ?? node.props.source;
    return `<Image className="${mergedClasses}" source={${imageSourcePropValue(sourceUrl)}} />`;
  }

  if (node.type === "card") {
    options.imports.addUiComponent("Card");
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    const mergedClasses = mergeTailwindClasses("border border-zinc-200 bg-white rounded-xl shadow-sm overflow-hidden", customClasses);
    const titleProp = node.props.title ? ` title=${sourceString(node.props.title)}` : "";
    const descProp = node.props.description ? ` description=${sourceString(node.props.description)}` : "";
    return `<Card className="${mergedClasses}"${titleProp}${descProp}>${children}</Card>`;
  }

  if (node.type === "badge") {
    options.imports.addUiComponent("Badge");
    const variant = node.props.variant ?? "default";
    return `<Badge className="${customClasses}" text=${sourceString(node.props.text)} variant="${variant}" />`;
  }

  if (node.type === "alert") {
    options.imports.addUiComponent("Alert");
    const variant = node.props.variant ?? "default";
    const titleProp = node.props.title ? ` title=${sourceString(node.props.title)}` : "";
    const descProp = node.props.description ? ` description=${sourceString(node.props.description)}` : "";
    return `<Alert className="${customClasses}" variant="${variant}"${titleProp}${descProp} />`;
  }

  if (node.type === "switch") {
    options.imports.addUiComponent("Switch");
    return `<Switch className="${customClasses}" checked={${Boolean(node.props.checked)}} label=${sourceString(node.props.label)} />`;
  }

  if (node.type === "slider") {
    options.imports.addUiComponent("Slider");
    const min = typeof node.props.min === "number" ? node.props.min : 0;
    const max = typeof node.props.max === "number" ? node.props.max : 100;
    const val = typeof node.props.defaultValue === "number" ? node.props.defaultValue : 50;
    return `<Slider className="${customClasses}" min={${min}} max={${max}} value={${val}} label=${sourceString(node.props.label)} />`;
  }

  if (node.type === "progress") {
    options.imports.addUiComponent("Progress");
    const value = typeof node.props.value === "number" ? node.props.value : 60;
    const max = typeof node.props.max === "number" ? node.props.max : 100;
    return `<Progress className="${customClasses}" value={${value}} max={${max}} />`;
  }

  if (node.type === "avatar") {
    options.imports.addUiComponent("Avatar");
    const sourceUrl = node.props.sourceUrl;
    const fallbackText = node.props.fallbackText ? ` fallbackText=${sourceString(node.props.fallbackText)}` : "";
    const size = typeof node.style?.size === "number" ? node.style.size : 40;
    return `<Avatar className="${customClasses}" sourceUrl=${sourceString(sourceUrl)} size={${size}}${fallbackText} />`;
  }

  if (node.type === "checkbox") {
    options.imports.addUiComponent("Checkbox");
    return `<Checkbox className="${customClasses}" checked={${Boolean(node.props.checked)}} label=${sourceString(node.props.label)} />`;
  }

  if (node.type === "textarea") {
    options.imports.addUiComponent("TextArea");
    const mergedClasses = mergeTailwindClasses("rounded-lg border border-zinc-300 px-3 py-3 text-zinc-900 align-top bg-white", customClasses);
    const variableName = typeof node.props.variableName === "string" ? node.props.variableName : "";
    if (variableName) {
      options.imports.add("../../infrastructure/api/api-client", "getValueByPath");
      options.imports.add("../../infrastructure/api/api-client", "setValueByPath");
      const valueExpr = expressionForStatePath(variableName);
      const updateCode = setterForStatePath(variableName, "text");
      return `<TextArea className="${mergedClasses}" placeholder=${sourceString(node.props.placeholder)} value={String(${valueExpr} ?? "")} onChangeText={(text) => { ${updateCode} }} />`;
    }
    return `<TextArea className="${mergedClasses}" placeholder=${sourceString(node.props.placeholder)} defaultValue={${sourceString(node.props.defaultValue)}} />`;
  }

  if (node.type === "label") {
    options.imports.addUiComponent("Label");
    const mergedClasses = mergeTailwindClasses("text-sm font-semibold text-zinc-700", customClasses);
    return `<Label className="${mergedClasses}" text={${renderStringProp(node.props.text)}} />`;
  }

  if (node.type === "separator") {
    options.imports.addUiComponent("Separator");
    const orientation = node.props.orientation === "vertical" ? "vertical" : "horizontal";
    return `<Separator className="${customClasses}" orientation="${orientation}" />`;
  }

  if (node.type === "radioGroup") {
    options.imports.addUiComponent("RadioGroup");
    const optionsText = typeof node.props.options === "string" ? node.props.options : "Option A\nOption B";
    const opts = optionsText.split("\n").filter(Boolean);
    const selected = node.props.selectedValue;
    return `<RadioGroup className="${customClasses}" label=${sourceString(node.props.label)} options={${JSON.stringify(opts)}} selectedValue=${sourceString(selected)} />`;
  }

  if (node.type === "accordion") {
    options.imports.addUiComponent("Accordion");
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    const titleProp = node.props.title ? ` title=${sourceString(node.props.title)}` : "";
    const descProp = node.props.description ? ` description=${sourceString(node.props.description)}` : "";
    return `<Accordion className="${customClasses}"${titleProp}${descProp}>${children}</Accordion>`;
  }

  if (node.type === "tabs") {
    options.imports.addUiComponent("Tabs");
    const tabsText = typeof node.props.tabs === "string" ? node.props.tabs : "Tab 1\nTab 2";
    const tabs = tabsText.split("\n").filter(Boolean);
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    return `<Tabs className="${customClasses}" tabs={${JSON.stringify(tabs)}}>${children}</Tabs>`;
  }

  if (node.type === "skeleton") {
    options.imports.addUiComponent("Skeleton");
    const mergedClasses = mergeTailwindClasses("bg-zinc-200 rounded-sm", customClasses);
    return `<Skeleton className="${mergedClasses}" />`;
  }

  if (node.type === "scrollArea") {
    options.imports.addUiComponent("ScrollArea");
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    return `<ScrollArea className="${customClasses}">${children}</ScrollArea>`;
  }

  if (node.type === "aspectRatio") {
    options.imports.addUiComponent("AspectRatio");
    const ratio = typeof node.props.ratio === "number" ? node.props.ratio : 1.77;
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    return `<AspectRatio className="${customClasses}" ratio={${ratio}}>${children}</AspectRatio>`;
  }

  if (node.type === "pagination") {
    options.imports.addUiComponent("Pagination");
    const cur = typeof node.props.currentPage === "number" ? node.props.currentPage : 1;
    const total = typeof node.props.totalPages === "number" ? node.props.totalPages : 5;
    const showEllipsis = node.props.showEllipsis !== false;
    return `<Pagination className="${customClasses}" currentPage={${cur}} totalPages={${total}} showEllipsis={${showEllipsis}} />`;
  }

  if (node.type === "row") {
    options.imports.addUiComponent("Row");
    const hasManyChildren = (node.children ?? []).length >= 2;
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    return `<Row className="${customClasses}" scrollable={${hasManyChildren}}>${children}</Row>`;
  }

  if (node.type === "column") {
    options.imports.addUiComponent("Column");
    const hasManyChildren = (node.children ?? []).length >= 2;
    const children = (node.children ?? []).map((child) => generateNode(child, options)).join("\n");
    return `<Column className="${customClasses}" scrollable={${hasManyChildren}}>${children}</Column>`;
  }

  if (node.type === "heading") {
    options.imports.addUiComponent("Heading");
    const level = typeof node.props.level === "number" ? node.props.level : 1;
    return `<Heading className="${customClasses}" text={${renderStringProp(node.props.text)}} level={${level}} />`;
  }

  if (node.type === "list") {
    options.imports.addUiComponent("List");
    const title = typeof node.props.title === "string" ? node.props.title : "";
    const itemsText = typeof node.props.items === "string" ? node.props.items : "Item 1\nItem 2\nItem 3";
    const items = itemsText.split("\n").filter(Boolean);
    const ordered = node.props.ordered === true;
    const showDividers = node.props.showDividers === true;
    const titleProp = title ? ` title=${sourceString(title)}` : "";
    return `<List className="${customClasses}"${titleProp} items={${JSON.stringify(items)}} ordered={${ordered}} showDividers={${showDividers}} />`;
  }

  return "";
}
