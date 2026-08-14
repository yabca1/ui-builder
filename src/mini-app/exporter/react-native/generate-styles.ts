import type { MiniAppNode } from "@/mini-app/types/mini-app.types";
import { sanitizeIdentifier } from "@/mini-app/exporter/react-native/identifiers";

type StyleValue = string | number;
type StyleObject = Record<string, StyleValue>;

export type GeneratedStyles = {
  stylesCode: string;
  styleNames: Map<string, string>;
};

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

function renderStyleObject(style: StyleObject): string {
  const entries = Object.entries(style);
  if (entries.length === 0) {
    return "{}";
  }

  return `{
${entries.map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`).join("\n")}
  }`;
}

export function generateStyles(nodes: MiniAppNode[]): GeneratedStyles {
  const styleNames = new Map<string, string>();
  const styleEntries: string[] = [
    `root: {
    flex: 1,
    padding: 16,
    backgroundColor: "#ffffff",
  }`,
  ];
  const usedNames = new Set(["root"]);

  for (const node of collectNodes(nodes)) {
    const style = supportedStyleEntries(node.style, node);
    if (Object.keys(style).length === 0) {
      continue;
    }

    let styleName = sanitizeIdentifier(node.id, `${node.type}Style`);
    if (usedNames.has(styleName)) {
      styleName = `${styleName}${usedNames.size}`;
    }
    usedNames.add(styleName);
    styleNames.set(node.id, styleName);
    styleEntries.push(`${styleName}: ${renderStyleObject(style)}`);
  }

  return {
    styleNames,
    stylesCode: `const styles = StyleSheet.create({
  ${styleEntries.join(",\n\n  ")}
});`,
  };
}
