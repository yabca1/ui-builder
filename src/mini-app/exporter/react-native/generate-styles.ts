import type { MiniAppNode } from "@/mini-app/types/mini-app.types";

type StyleValue = string | number;
type StyleObject = Record<string, StyleValue>;

export type GeneratedStyles = {
  stylesCode: string;
  styleNames: Map<string, string>;
};

function px(value: number): string {
  return Number.isInteger(value) ? `${value}px` : `${value.toFixed(2)}px`;
}

function arbitraryValue(value: string | number, unit = "px"): string {
  if (typeof value === "number") {
    return `[${unit === "px" ? px(value) : `${value}${unit}`}]`;
  }
  return value === "100%" ? "full" : `[${value}]`;
}

function colorValue(value: string): string {
  return value.startsWith("#") ? `[${value}]` : value;
}

function fontWeightClass(value: string): string {
  const weights: Record<string, string> = {
    "100": "font-thin",
    "200": "font-extralight",
    "300": "font-light",
    "400": "font-normal",
    "500": "font-medium",
    "600": "font-semibold",
    "700": "font-bold",
    "800": "font-extrabold",
    "900": "font-black",
    normal: "font-normal",
    bold: "font-bold",
  };

  return weights[value] ?? `font-[${value}]`;
}

function justifyClass(value: string): string {
  const classes: Record<string, string> = {
    "flex-start": "justify-start",
    "flex-end": "justify-end",
    center: "justify-center",
    "space-between": "justify-between",
    "space-around": "justify-around",
  };

  return classes[value] ?? `justify-[${value}]`;
}

function spacingClass(prefix: string, value: StyleValue): string {
  return `${prefix}-${arbitraryValue(value)}`;
}

function supportedStyleEntries(style: Record<string, unknown> | undefined, node: MiniAppNode): StyleObject {
  const nodeType = node.type;
  const output: StyleObject = {};
  const actualStyle = style || {};

  const copyNumber = (from: string, to = from) => {
    if (typeof actualStyle[from] === "number") {
      output[to] = actualStyle[from];
    }
  };
  const copyString = (from: string, to = from) => {
    if (typeof actualStyle[from] === "string") {
      output[to] = actualStyle[from];
    }
  };

  copyNumber("width");
  copyNumber("height");
  copyString("width");
  copyString("height");
  copyNumber("padding");
  copyNumber("paddingTop");
  copyNumber("paddingRight");
  copyNumber("paddingBottom");
  copyNumber("paddingLeft");
  copyNumber("paddingHorizontal");
  copyNumber("paddingVertical");
  copyNumber("margin");
  copyNumber("marginTop");
  copyNumber("marginRight");
  copyNumber("marginBottom");
  copyNumber("marginLeft");
  copyNumber("gap");
  copyNumber("minWidth");
  copyNumber("maxWidth");
  copyNumber("minHeight");
  copyNumber("maxHeight");
  copyNumber("opacity");
  copyNumber("flex");
  copyString("backgroundColor");
  copyString("color");
  copyNumber("fontSize");
  copyString("fontWeight");
  copyNumber("borderRadius");
  copyString("borderColor");
  copyNumber("borderWidth");
  copyString("fontFamily");
  copyNumber("lineHeight");
  copyNumber("letterSpacing");

  const direction = actualStyle.direction;
  if (direction === "vertical") {
    output.flexDirection = "column";
  } else if (direction === "horizontal") {
    output.flexDirection = "row";
  }

  const align = actualStyle.alignItems ?? actualStyle.align ?? actualStyle.alignment;
  if (align === "start") {
    output.alignItems = "flex-start";
  } else if (align === "end") {
    output.alignItems = "flex-end";
  } else if (align === "center" || align === "stretch" || align === "flex-start" || align === "flex-end") {
    output.alignItems = align;
  }

  const justify = actualStyle.justifyContent ?? actualStyle.justify;
  if (justify === "start") {
    output.justifyContent = "flex-start";
  } else if (justify === "end") {
    output.justifyContent = "flex-end";
  } else if (
    justify === "center" ||
    justify === "space-between" ||
    justify === "space-around"
  ) {
    output.justifyContent = justify;
  }

  copyString("flexWrap");

  if (nodeType === "button" && typeof actualStyle.textColor === "string") {
    output.color = actualStyle.textColor;
  }

  if (nodeType === "separator") {
    const thickness = typeof actualStyle.thickness === "number" ? actualStyle.thickness : 1;
    const isHorizontal = node.props.orientation !== "vertical";
    if (isHorizontal) {
      output.height = thickness;
    } else {
      output.width = thickness;
    }
    if (typeof actualStyle.color === "string") {
      output.backgroundColor = actualStyle.color;
    }
  }

  if (nodeType === "heading" && typeof actualStyle.fontSize !== "number") {
    const level = typeof node.props.level === "number" ? node.props.level : 1;
    output.fontSize = level === 1 ? 24 : level === 2 ? 20 : level === 3 ? 18 : 16;
  }

  return output;
}

function collectNodes(nodes: MiniAppNode[]): MiniAppNode[] {
  return nodes.flatMap((node) => [node, ...collectNodes(node.children ?? [])]);
}

function styleObjectToClasses(style: StyleObject): string {
  const classes: string[] = [];

  for (const [key, value] of Object.entries(style)) {
    if (key === "width") classes.push(spacingClass("w", value));
    if (key === "height") classes.push(spacingClass("h", value));
    if (key === "minWidth") classes.push(spacingClass("min-w", value));
    if (key === "maxWidth") classes.push(spacingClass("max-w", value));
    if (key === "minHeight") classes.push(spacingClass("min-h", value));
    if (key === "maxHeight") classes.push(spacingClass("max-h", value));
    if (key === "padding") classes.push(spacingClass("p", value));
    if (key === "paddingTop") classes.push(spacingClass("pt", value));
    if (key === "paddingRight") classes.push(spacingClass("pr", value));
    if (key === "paddingBottom") classes.push(spacingClass("pb", value));
    if (key === "paddingLeft") classes.push(spacingClass("pl", value));
    if (key === "paddingHorizontal") classes.push(spacingClass("px", value));
    if (key === "paddingVertical") classes.push(spacingClass("py", value));
    if (key === "margin") classes.push(spacingClass("m", value));
    if (key === "marginTop") classes.push(spacingClass("mt", value));
    if (key === "marginRight") classes.push(spacingClass("mr", value));
    if (key === "marginBottom") classes.push(spacingClass("mb", value));
    if (key === "marginLeft") classes.push(spacingClass("ml", value));
    if (key === "gap") classes.push(spacingClass("gap", value));
    if (key === "opacity") classes.push(`opacity-[${value}]`);
    if (key === "flex") classes.push(value === 1 ? "flex-1" : `flex-[${value}]`);
    if (key === "backgroundColor" && typeof value === "string") classes.push(`bg-${colorValue(value)}`);
    if (key === "color" && typeof value === "string") classes.push(`text-${colorValue(value)}`);
    if (key === "fontSize") classes.push(`text-${arbitraryValue(value)}`);
    if (key === "fontWeight" && typeof value === "string") classes.push(fontWeightClass(value));
    if (key === "borderRadius") classes.push(`rounded-${arbitraryValue(value)}`);
    if (key === "borderColor" && typeof value === "string") classes.push(`border border-${colorValue(value)}`);
    if (key === "borderWidth") classes.push(value === 1 ? "border" : `border-[${value}px]`);
    if (key === "lineHeight") classes.push(`leading-${arbitraryValue(value)}`);
    if (key === "letterSpacing") classes.push(`tracking-${arbitraryValue(value)}`);
    if (key === "flexDirection") classes.push(value === "row" ? "flex-row" : "flex-col");
    if (key === "alignItems") classes.push(`items-${String(value).replace("flex-", "")}`);
    if (key === "justifyContent") classes.push(justifyClass(String(value)));
    if (key === "flexWrap") classes.push(value === "wrap" ? "flex-wrap" : "flex-nowrap");
  }

  return classes.join(" ");
}

export function generateStyles(nodes: MiniAppNode[]): GeneratedStyles {
  const styleNames = new Map<string, string>();

  for (const node of collectNodes(nodes)) {
    const style = supportedStyleEntries(node.style, node);
    if (Object.keys(style).length === 0) {
      continue;
    }

    styleNames.set(node.id, styleObjectToClasses(style));
  }

  return {
    styleNames,
    stylesCode: "",
  };
}
