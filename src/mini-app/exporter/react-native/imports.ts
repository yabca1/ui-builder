export class ImportCollector {
  private readonly reactNativeImports = new Set<string>();
  private readonly genericImports = new Map<string, Set<string>>();
  private readonly uiComponentImports = new Set<string>();

  addReactNative(name: string) {
    this.reactNativeImports.add(name);
  }

  hasReactNative(name: string) {
    return this.reactNativeImports.has(name);
  }

  addUiComponent(name: string) {
    this.uiComponentImports.add(name);
  }

  getUiComponents() {
    return this.uiComponentImports;
  }

  add(module: string, name: string) {
    if (!this.genericImports.has(module)) {
      this.genericImports.set(module, new Set());
    }
    this.genericImports.get(module)!.add(name);
  }

  renderReactNativeImport() {
    const names = [...this.reactNativeImports].sort();
    let imports = "";
    if (names.length > 0) {
      imports += `import { ${names.join(", ")} } from "react-native";\n`;
    }

    for (const [module, specifiers] of this.genericImports.entries()) {
      const sortedSpecifiers = [...specifiers].sort();
      imports += `import { ${sortedSpecifiers.join(", ")} } from "${module}";\n`;
    }

    return imports.trim();
  }
}

