import type { MiniAppTheme, MiniAppNode, ModeTheme } from "@/mini-app/types/mini-app.types";

export const defaultSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const defaultRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
};

export const defaultShadows = {
  sm: { shadowColor: "#000000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: "#000000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  lg: { shadowColor: "#000000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
};

export const defaultTypography = {
  fontFamily: "sans-serif",
  headingSize: 24,
  subheadingSize: 18,
  bodySize: 14,
  captionSize: 12,
};

export const themePresets: Record<string, MiniAppTheme> = {
  default: {
    name: "default",
    light: {
      colors: {
        primary: "#3b82f6",
        secondary: "#6b7280",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        background: "#ffffff",
        surface: "#f3f4f6",
        card: "#ffffff",
        border: "#e5e7eb",
        text: "#111827",
        mutedText: "#6b7280",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
    dark: {
      colors: {
        primary: "#60a5fa",
        secondary: "#9ca3af",
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
        background: "#111827",
        surface: "#1f2937",
        card: "#1f2937",
        border: "#374151",
        text: "#f9fafb",
        mutedText: "#9ca3af",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
  },
  modern: {
    name: "modern",
    light: {
      colors: {
        primary: "#6366f1",
        secondary: "#a855f7",
        success: "#14b8a6",
        warning: "#f59e0b",
        danger: "#f43f5e",
        background: "#fafafa",
        surface: "#f4f4f5",
        card: "#ffffff",
        border: "#e4e4e7",
        text: "#09090b",
        mutedText: "#71717a",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
    dark: {
      colors: {
        primary: "#818cf8",
        secondary: "#c084fc",
        success: "#2dd4bf",
        warning: "#fbbf24",
        danger: "#fb7185",
        background: "#09090b",
        surface: "#18181b",
        card: "#18181b",
        border: "#27272a",
        text: "#fafafa",
        mutedText: "#a1a1aa",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
  },
  darkSlate: {
    name: "darkSlate",
    light: {
      colors: {
        primary: "#0f172a",
        secondary: "#475569",
        success: "#16a34a",
        warning: "#ca8a04",
        danger: "#dc2626",
        background: "#f8fafc",
        surface: "#f1f5f9",
        card: "#ffffff",
        border: "#cbd5e1",
        text: "#0f172a",
        mutedText: "#475569",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
    dark: {
      colors: {
        primary: "#cbd5e1",
        secondary: "#94a3b8",
        success: "#4ade80",
        warning: "#fde047",
        danger: "#f87171",
        background: "#020617",
        surface: "#0f172a",
        card: "#0f172a",
        border: "#1e293b",
        text: "#f8fafc",
        mutedText: "#94a3b8",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
  },
  corporate: {
    name: "corporate",
    light: {
      colors: {
        primary: "#0f172a",
        secondary: "#475569",
        success: "#16a34a",
        warning: "#ca8a04",
        danger: "#dc2626",
        background: "#f8fafc",
        surface: "#f1f5f9",
        card: "#ffffff",
        border: "#cbd5e1",
        text: "#0f172a",
        mutedText: "#475569",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
    dark: {
      colors: {
        primary: "#cbd5e1",
        secondary: "#94a3b8",
        success: "#4ade80",
        warning: "#fde047",
        danger: "#f87171",
        background: "#020617",
        surface: "#0f172a",
        card: "#0f172a",
        border: "#1e293b",
        text: "#f8fafc",
        mutedText: "#94a3b8",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
  },
  fintech: {
    name: "fintech",
    light: {
      colors: {
        primary: "#059669",
        secondary: "#0891b2",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        background: "#f0fdf4",
        surface: "#e6f4ea",
        card: "#ffffff",
        border: "#d1fae5",
        text: "#064e3b",
        mutedText: "#047857",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
    dark: {
      colors: {
        primary: "#34d399",
        secondary: "#22d3ee",
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
        background: "#064e3b",
        surface: "#022c22",
        card: "#022c22",
        border: "#065f46",
        text: "#ecfdf5",
        mutedText: "#a7f3d0",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
  },
  dark: {
    name: "dark",
    light: {
      colors: {
        primary: "#18181b",
        secondary: "#71717a",
        success: "#22c55e",
        warning: "#eab308",
        danger: "#ef4444",
        background: "#ffffff",
        surface: "#fafafa",
        card: "#ffffff",
        border: "#e4e4e7",
        text: "#09090b",
        mutedText: "#71717a",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
    dark: {
      colors: {
        primary: "#ffffff",
        secondary: "#a1a1aa",
        success: "#4ade80",
        warning: "#facc15",
        danger: "#f87171",
        background: "#000000",
        surface: "#09090b",
        card: "#09090b",
        border: "#27272a",
        text: "#ffffff",
        mutedText: "#a1a1aa",
      },
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadows: defaultShadows,
      typography: defaultTypography,
    },
  },
};

export function resolveValueTheme(value: unknown, theme: MiniAppTheme, mode: "light" | "dark", key?: string): any {
  if (value && typeof value === "object" && (value as any).type === "theme") {
    const token = (value as any).token;
    const activeTheme = theme[mode] || theme.light;
    if (!activeTheme) return value;

    if (key) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes("radius")) {
        if (token in activeTheme.radius) return activeTheme.radius[token as keyof typeof activeTheme.radius];
      }
      if (lowerKey.includes("padding") || lowerKey.includes("margin") || lowerKey === "gap") {
        if (token in activeTheme.spacing) return activeTheme.spacing[token as keyof typeof activeTheme.spacing];
      }
      if (lowerKey.includes("color")) {
        if (token in activeTheme.colors) return activeTheme.colors[token as keyof typeof activeTheme.colors];
      }
      if (lowerKey.includes("size")) {
        if (token in activeTheme.typography) return activeTheme.typography[token as keyof typeof activeTheme.typography];
      }
    }

    if (token in activeTheme.colors) {
      return activeTheme.colors[token as keyof typeof activeTheme.colors];
    }
    if (token in activeTheme.spacing) {
      return activeTheme.spacing[token as keyof typeof activeTheme.spacing];
    }
    if (token in activeTheme.radius) {
      return activeTheme.radius[token as keyof typeof activeTheme.radius];
    }
    if (token in activeTheme.typography) {
      return activeTheme.typography[token as keyof typeof activeTheme.typography];
    }
    if (token in activeTheme.shadows) {
      return activeTheme.shadows[token as keyof typeof activeTheme.shadows];
    }
  }
  return value;
}

export function resolveNodeTheme(node: MiniAppNode, theme: MiniAppTheme, mode: "light" | "dark"): MiniAppNode {
  const resolveObject = (obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
    if (!obj) return undefined;
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveValueTheme(value, theme, mode, key);
    }
    return resolved;
  };

  return {
    ...node,
    props: resolveObject(node.props) ?? {},
    style: resolveObject(node.style),
    children: node.children?.map((child) => resolveNodeTheme(child, theme, mode)),
  };
}
