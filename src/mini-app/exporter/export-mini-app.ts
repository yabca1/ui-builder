import { miniAppSchema } from "@/mini-app/schema/mini-app.schema";
import type { MiniApp, MiniAppPackage } from "@/mini-app/types/mini-app.types";

export type ExportResult =
  | {
      ok: true;
      json: string;
      miniAppPackage: MiniAppPackage;
    }
  | {
      ok: false;
      errors: string[];
    };

export function createMiniAppPackage(miniApp: MiniApp): MiniAppPackage {
  return {
    manifest: {
      id: miniApp.id,
      name: miniApp.name,
      version: miniApp.version,
      entryScreenId: miniApp.entryScreenId,
    },
    screens: miniApp.screens,
  };
}

export function exportMiniApp(miniApp: MiniApp): ExportResult {
  const parsed = miniAppSchema.safeParse(miniApp);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "miniApp"}: ${issue.message}`),
    };
  }

  const miniAppPackage = createMiniAppPackage(parsed.data);

  return {
    ok: true,
    miniAppPackage,
    json: JSON.stringify(miniAppPackage, null, 2),
  };
}
