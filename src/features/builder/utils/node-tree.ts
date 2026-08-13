import { componentRegistry, createDefaultNode } from "@/mini-app/registry/component-registry";
import type { ComponentType, MiniAppNode } from "@/mini-app/types/mini-app.types";

export type DropTarget = {
  parentId: string | null;
  index: number;
};

export function makeNode(type: ComponentType): MiniAppNode {
  return createDefaultNode(type, crypto.randomUUID());
}

export function cloneNode(node: MiniAppNode): MiniAppNode {
  return {
    ...node,
    id: crypto.randomUUID(),
    props: { ...node.props },
    style: node.style ? { ...node.style } : undefined,
    events: node.events ? { ...node.events } : undefined,
    children: node.children?.map(cloneNode),
  };
}

export function findNode(nodes: MiniAppNode[], nodeId: string): MiniAppNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const child = findNode(node.children ?? [], nodeId);
    if (child) {
      return child;
    }
  }

  return null;
}

export function findParentAndIndex(
  nodes: MiniAppNode[],
  nodeId: string,
  parentId: string | null = null,
): DropTarget | null {
  for (const [index, node] of nodes.entries()) {
    if (node.id === nodeId) {
      return { parentId, index };
    }

    const child = findParentAndIndex(node.children ?? [], nodeId, node.id);
    if (child) {
      return child;
    }
  }

  return null;
}

export function isDescendant(nodes: MiniAppNode[], ancestorId: string, maybeChildId: string): boolean {
  const ancestor = findNode(nodes, ancestorId);
  return ancestor ? Boolean(findNode(ancestor.children ?? [], maybeChildId)) : false;
}

export function canAcceptChildren(node: MiniAppNode | null): boolean {
  return node ? componentRegistry[node.type].canHaveChildren : true;
}

export function canInsertNode(nodes: MiniAppNode[], parentId: string | null, nodeToInsert: MiniAppNode): boolean {
  if (parentId === null) {
    return true;
  }

  if (parentId === nodeToInsert.id || isDescendant([nodeToInsert], nodeToInsert.id, parentId)) {
    return false;
  }

  return canAcceptChildren(findNode(nodes, parentId));
}

export function insertNode(nodes: MiniAppNode[], parentId: string | null, index: number, nodeToInsert: MiniAppNode): MiniAppNode[] {
  if (!canInsertNode(nodes, parentId, nodeToInsert)) {
    return nodes;
  }

  if (parentId === null) {
    const next = [...nodes];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, nodeToInsert);
    return next;
  }

  return nodes.map((node) => {
    if (node.id === parentId) {
      const children = [...(node.children ?? [])];
      children.splice(Math.max(0, Math.min(index, children.length)), 0, nodeToInsert);
      return { ...node, children };
    }

    return {
      ...node,
      children: node.children ? insertNode(node.children, parentId, index, nodeToInsert) : node.children,
    };
  });
}

export function removeNode(nodes: MiniAppNode[], nodeId: string): { nodes: MiniAppNode[]; removed: MiniAppNode | null } {
  let removed: MiniAppNode | null = null;
  const next: MiniAppNode[] = [];

  for (const node of nodes) {
    if (node.id === nodeId) {
      removed = node;
      continue;
    }

    const childResult = removeNode(node.children ?? [], nodeId);
    if (childResult.removed) {
      removed = childResult.removed;
      next.push({ ...node, children: childResult.nodes });
    } else {
      next.push(node);
    }
  }

  return { nodes: next, removed };
}

export function updateNode(
  nodes: MiniAppNode[],
  nodeId: string,
  updater: (node: MiniAppNode) => MiniAppNode,
): MiniAppNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return updater(node);
    }

    return {
      ...node,
      children: node.children ? updateNode(node.children, nodeId, updater) : node.children,
    };
  });
}
