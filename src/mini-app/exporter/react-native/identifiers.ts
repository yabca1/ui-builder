export function toPascalCase(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  const result = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return /^[0-9]/.test(result) ? `Screen${result}` : result || "Generated";
}

export function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function sanitizeIdentifier(value: string, fallback = "generated"): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9_$]+/)
    .filter(Boolean);
  const camel = words.length > 0
    ? words
        .map((word, index) =>
          index === 0
            ? word.charAt(0).toLowerCase() + word.slice(1)
            : word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join("")
    : fallback;
  const cleaned = camel.replace(/[^a-zA-Z0-9_$]/g, "");
  const safe = cleaned || fallback;
  return /^[0-9]/.test(safe) ? `${fallback}${safe}` : safe;
}

export function screenComponentName(screenName: string): string {
  const base = toPascalCase(screenName);
  return base.endsWith("Screen") ? base : `${base}Screen`;
}

export function routeName(screenName: string): string {
  return toPascalCase(screenName);
}

export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "mini-app"
  );
}
