export function sourceString(value: unknown): string {
  return JSON.stringify(typeof value === "string" ? value : "");
}

export function propString(name: string, value: unknown): string {
  const stringValue = typeof value === "string" ? value : "";
  return stringValue ? `${name}=${sourceString(stringValue)}` : "";
}

export function imageSourcePropValue(source: unknown): string {
  const src = typeof source === "string" ? source.trim() : "";
  if (!src) {
    return '{ uri: "" }';
  }

  // 1. If it looks like a require call, e.g. require('./file.png')
  if (/^require\s*\(.*\)$/.test(src)) {
    return src;
  }

  // 2. If it is a remote url or data uri
  if (/^(https?:\/\/|data:)/i.test(src)) {
    return `{ uri: ${JSON.stringify(src)} }`;
  }

  // 3. If it's a local file path relative or absolute
  if (/^([\.\/]|[a-zA-Z]:)/.test(src) || /\.(png|jpe?g|gif|webp|svg)$/i.test(src)) {
    return `require(${JSON.stringify(src)})`;
  }

  // 4. Otherwise, assume it could be a variable reference (like localAsset or images.logo)
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(src)) {
    return src;
  }

  // Fallback
  return `require(${JSON.stringify(src)})`;
}
