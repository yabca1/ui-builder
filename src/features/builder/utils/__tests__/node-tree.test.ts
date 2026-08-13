import { describe, expect, it } from "vitest";
import { componentRegistry } from "@/mini-app/registry/component-registry";
import type { MiniAppNode } from "@/mini-app/types/mini-app.types";
import { canInsertNode, cloneNode, findNode, insertNode, makeNode, removeNode, updateNode } from "@/features/builder/utils/node-tree";

function node(type: MiniAppNode["type"], id: string, children?: MiniAppNode[]): MiniAppNode {
  return {
    id,
    type,
    props: {},
    style: {},
    children,
  };
}

describe("builder node tree", () => {
  it("creates nodes from registry defaults", () => {
    const button = makeNode("button");

    expect(button.props.label).toBe(componentRegistry.button.defaultProps.label);
    expect(button.style?.backgroundColor).toBe(componentRegistry.button.defaultStyle?.backgroundColor);
    expect(button.children).toBeUndefined();
  });

  it("allows valid container nesting and rejects leaf nesting", () => {
    const text = node("text", "text");
    const container = node("container", "container", []);
    const nodes = [container, text];
    const button = node("button", "button");

    expect(canInsertNode(nodes, "container", button)).toBe(true);
    expect(canInsertNode(nodes, "text", button)).toBe(false);
    expect(insertNode(nodes, "text", 0, button)).toBe(nodes);
  });

  it("prevents circular parent child relationships", () => {
    const child = node("container", "child", []);
    const parent = node("container", "parent", [child]);
    const nodes = [parent];

    expect(canInsertNode(nodes, "child", parent)).toBe(false);
    expect(insertNode(nodes, "child", 0, parent)).toBe(nodes);
  });

  it("duplicates nested nodes with new ids recursively", () => {
    const source = node("card", "card", [node("heading", "heading"), node("button", "button")]);
    const duplicated = cloneNode(source);
    const duplicatedIds = [duplicated.id, ...(duplicated.children ?? []).map((child) => child.id)];

    expect(duplicatedIds).not.toContain("card");
    expect(duplicatedIds).not.toContain("heading");
    expect(duplicatedIds).not.toContain("button");
    expect(new Set(duplicatedIds).size).toBe(duplicatedIds.length);
  });

  it("updates and deletes nodes without leaving orphans", () => {
    const nodes = [node("container", "container", [node("button", "button")])];
    const updated = updateNode(nodes, "button", (candidate) => ({
      ...candidate,
      props: { label: "Continue" },
    }));

    expect(findNode(updated, "button")?.props.label).toBe("Continue");

    const removed = removeNode(updated, "container");
    expect(removed.removed?.id).toBe("container");
    expect(findNode(removed.nodes, "button")).toBeNull();
  });
});
