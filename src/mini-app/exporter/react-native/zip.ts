import JSZip from "jszip";
import type { MiniApp, ExportTarget } from "@/mini-app/types/mini-app.types";
import { generateProject } from "@/mini-app/exporter/react-native/generate-project";

export type ZipResult =
  | {
      ok: true;
      blob: Blob;
      filename: string;
    }
  | {
      ok: false;
      errors: string[];
    };

export async function createProjectZip(miniApp: MiniApp, target: ExportTarget): Promise<ZipResult> {
  const project = await generateProject(miniApp, target);
  if (!project.ok) {
    return project;
  }

  const zip = new JSZip();
  const root = zip.folder(project.rootFolder);
  if (!root) {
    return { ok: false, errors: ["Unable to create ZIP root folder."] };
  }

  for (const file of project.files) {
    root.file(file.path, file.content);
  }

  return {
    ok: true,
    blob: await zip.generateAsync({ type: "blob" }),
    filename: `${project.rootFolder}-${target}.zip`,
  };
}

export async function createReactNativeProjectZip(miniApp: MiniApp): Promise<ZipResult> {
  const result = await createProjectZip(miniApp, "react-native-cli");
  if (!result.ok) {
    return result;
  }
  return {
    ...result,
    filename: `${result.filename.replace(/-react-native-cli\.zip$/, "")}.zip`,
  };
}

export async function createExpoProjectZip(miniApp: MiniApp): Promise<ZipResult> {
  const result = await createProjectZip(miniApp, "expo-mini-app");
  if (!result.ok) {
    return result;
  }
  return {
    ...result,
    filename: `${result.filename.replace(/-expo-mini-app\.zip$/, "")}-expo.zip`,
  };
}
