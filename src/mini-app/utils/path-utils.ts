export function pathSegments(path: string): string[] {
  return path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getValueByPath(value: unknown, path: string): any {
  if (!path) return undefined;

  return pathSegments(path).reduce<any>((current, part) => {
    if (current === undefined || current === null || typeof current !== "object") {
      return undefined;
    }
    return current[part as keyof typeof current];
  }, value);
}

export function setValueByPath<T extends Record<string, any>>(target: T, path: string, value: any): T {
  const parts = pathSegments(path);
  if (parts.length === 0) return target;

  let current: Record<string, any> = target;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const isLast = index === parts.length - 1;

    if (isLast) {
      current[part] = value;
      break;
    }

    const nextPart = parts[index + 1];
    const shouldBeArray = /^\d+$/.test(nextPart);
    const existing = current[part];
    if (!existing || typeof existing !== "object") {
      current[part] = shouldBeArray ? [] : {};
    }
    current = current[part];
  }

  return target;
}

export function cloneWithValueByPath<T extends Record<string, any>>(source: T, path: string, value: any): T {
  const next = structuredClone(source);
  return setValueByPath(next, path, value);
}
