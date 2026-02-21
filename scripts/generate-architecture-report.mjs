#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const inventoryPath = path.join(repoRoot, "docs", "repo-inventory.md");
const dependenciesPath = path.join(repoRoot, "docs", "repo-dependencies.md");

const EXCLUDED_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  ".turbo",
  "dist",
  "build",
  "coverage",
]);
const EXCLUDED_FILES = new Set([".DS_Store", "tsconfig.tsbuildinfo"]);

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];

const IMPORT_EXPORT_RE = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g;

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(abs));
    } else if (entry.isFile()) {
      if (EXCLUDED_FILES.has(entry.name)) continue;
      files.push(abs);
    }
  }

  return files;
}

function getAllRepoFiles() {
  const all = walkFiles(repoRoot).map((abs) => toPosix(path.relative(repoRoot, abs)));
  return all.sort((a, b) => a.localeCompare(b));
}

function isCodeFile(relPath) {
  return CODE_EXTENSIONS.has(path.extname(relPath));
}

function isAnalyzableCodeFile(relPath) {
  return isCodeFile(relPath) && (relPath.startsWith("app/") || relPath.startsWith("src/"));
}

function readTextFile(relPath) {
  const abs = path.join(repoRoot, relPath);
  return fs.readFileSync(abs, "utf8");
}

function extractImportSpecifiers(sourceText) {
  const specs = [];

  IMPORT_EXPORT_RE.lastIndex = 0;
  DYNAMIC_IMPORT_RE.lastIndex = 0;

  for (const match of sourceText.matchAll(IMPORT_EXPORT_RE)) {
    specs.push(match[1]);
  }
  for (const match of sourceText.matchAll(DYNAMIC_IMPORT_RE)) {
    specs.push(match[1]);
  }

  return specs;
}

function tryResolve(absBase) {
  if (fs.existsSync(absBase) && fs.statSync(absBase).isFile()) {
    return absBase;
  }

  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = `${absBase}${ext}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  if (fs.existsSync(absBase) && fs.statSync(absBase).isDirectory()) {
    for (const ext of RESOLVE_EXTENSIONS) {
      const candidate = path.join(absBase, `index${ext}`);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
  }

  return null;
}

function resolveInternalImport(fromRelPath, spec) {
  let absBase = null;

  if (spec.startsWith("@/")) {
    absBase = path.join(repoRoot, "src", spec.slice(2));
  } else if (spec.startsWith(".")) {
    const fromAbs = path.join(repoRoot, fromRelPath);
    absBase = path.resolve(path.dirname(fromAbs), spec);
  } else {
    return null;
  }

  const resolved = tryResolve(absBase);
  if (!resolved) return null;

  const rel = toPosix(path.relative(repoRoot, resolved));
  return rel.startsWith("..") ? null : rel;
}

function layerFor(file) {
  if (file.startsWith("app/")) return "app";
  if (file.startsWith("src/components/inputs/")) return "components/inputs";
  if (file.startsWith("src/components/layout/")) return "components/layout";
  if (file.startsWith("src/components/reports/")) return "components/reports";
  if (file.startsWith("src/components/schedule/")) return "components/schedule";
  if (file.startsWith("src/features/planner/actions/")) return "features/actions";
  if (file.startsWith("src/features/planner/content/")) return "features/content";
  if (file.startsWith("src/features/planner/effects/")) return "features/effects";
  if (file.startsWith("src/features/planner/inputs/")) return "features/inputs";
  if (file.startsWith("src/features/planner/navigation/")) return "features/navigation";
  if (file.startsWith("src/features/planner/report/")) return "features/report";
  if (file.startsWith("src/features/planner/tax/")) return "features/tax";
  if (file.startsWith("src/lib/calc/")) return "lib/calc";
  if (file.startsWith("src/lib/copy/")) return "lib/copy";
  if (file.startsWith("src/lib/date/")) return "lib/date";
  if (file.startsWith("src/lib/hooks/")) return "lib/hooks";
  if (file.startsWith("src/lib/inputs/")) return "lib/inputs";
  if (file.startsWith("src/lib/planner/")) return "lib/planner";
  if (file.startsWith("src/lib/report/")) return "lib/report";
  if (file.startsWith("src/lib/")) return "lib";
  if (file.startsWith("src/config/clients/")) return "config/clients";
  if (file.startsWith("src/config/rules/")) return "config/rules";
  if (file.startsWith("src/copy/")) return "copy";
  if (file.startsWith("public/")) return "public";
  if (file.startsWith("scripts/")) return "scripts";
  if (file.startsWith("docs/")) return "docs";
  return "root";
}

function purposeFor(file) {
  const exact = {
    "app/page.tsx": "Main planner page container and orchestration.",
    "app/layout.tsx": "Global HTML layout wrapper.",
    "app/globals.css": "Global styles and theme variables.",
    "app/api/calculate/route.ts": "API route for planner calculations.",
    "src/config/clients/index.ts": "Loads client configuration by state/client code.",
    "src/config/rules/index.ts": "Exports rule/config helpers.",
    "src/copy/index.ts": "Language copy accessor and shared types.",
    "src/lib/amortization.ts": "Core amortization and month-by-month projection engine.",
    "src/lib/calc/usePlannerSchedule.ts": "Builds planner schedule + taxable mirror data.",
    "src/lib/planner/messages.ts": "Derived messaging helpers from schedule outcomes.",
    "src/lib/report/buildAccountGrowthNarrative.ts": "Builds narrative text for report summaries.",
    "src/lib/report/exportScheduleCsv.ts": "CSV export utilities for schedules.",
    "src/features/planner/actions/resetPlannerInputs.ts":
      "Central reset routine for planner state.",
    "src/features/planner/effects/usePlannerUiEffects.ts":
      "UI effects for scrolling, layout offsets, and mobile behavior.",
    "src/features/planner/content/InputsRightPane.tsx":
      "Right-column panel switcher for step-1 and step-2 content.",
  };
  if (exact[file]) return exact[file];

  if (file.startsWith("src/components/inputs/")) return "Input-side UI component.";
  if (file.startsWith("src/components/layout/")) return "Navigation/shell layout component.";
  if (file.startsWith("src/components/reports/")) return "Report-specific UI component.";
  if (file.startsWith("src/components/schedule/")) return "Schedule view/table component.";
  if (file.startsWith("src/features/planner/content/"))
    return "Planner page section/container logic.";
  if (file.startsWith("src/features/planner/inputs/"))
    return "Input flow helper (FSC/WTA/SSI) and related state logic.";
  if (file.startsWith("src/features/planner/report/"))
    return "Report view models and row shaping utilities.";
  if (file.startsWith("src/features/planner/navigation/"))
    return "Navigation model logic (desktop/mobile step flow).";
  if (file.startsWith("src/features/planner/tax/"))
    return "Tax and state-benefit computation helpers.";
  if (file.startsWith("src/features/planner/effects/")) return "UI behavior/effects hook.";
  if (file.startsWith("src/features/planner/actions/")) return "State transition helper.";
  if (file.startsWith("src/lib/calc/")) return "Calculation utility module.";
  if (file.startsWith("src/lib/report/")) return "Report formatting/export helper.";
  if (file.startsWith("src/lib/date/")) return "Date/index formatting utility.";
  if (file.startsWith("src/lib/hooks/")) return "Reusable React hook.";
  if (file.startsWith("src/lib/inputs/")) return "Input management helper.";
  if (file.startsWith("src/lib/planner/")) return "Planner derived-state helper.";
  if (file.startsWith("src/lib/copy/")) return "Copy/translation utility.";
  if (file.startsWith("src/config/clients/")) return "Client-specific defaults/overrides JSON.";
  if (file.startsWith("src/config/rules/")) return "Static rules/tax thresholds and limits.";
  if (file.startsWith("src/copy/")) return "Localized UI copy dictionary.";
  if (file.startsWith("app/api/")) return "HTTP API route.";
  if (file.startsWith("app/")) return "Next.js app entry/layout file.";
  if (file.startsWith("scripts/")) return "Developer tooling script.";
  if (file.startsWith("docs/")) return "Project documentation.";
  if (file.startsWith("public/")) return "Static public asset.";
  if (file === "README.md") return "Project setup and usage guide.";
  if (file === "package.json") return "Node package manifest and scripts.";
  if (file === "package-lock.json") return "Dependency lockfile.";
  if (file === "tsconfig.json") return "TypeScript compiler configuration.";
  if (file === "next.config.ts") return "Next.js runtime/build configuration.";
  if (file === "eslint.config.mjs") return "ESLint configuration.";
  if (file === "postcss.config.mjs") return "PostCSS/Tailwind processing configuration.";
  if (file === "THIRD-PARTY-LICENSES.md") return "Third-party license attributions.";
  return "Repository file.";
}

function escapePipe(value) {
  return String(value).replace(/\|/g, "\\|");
}

function nodeId(value) {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

function buildGraph(allFiles) {
  const codeFiles = allFiles.filter(isAnalyzableCodeFile);
  const importsByFile = new Map();
  const importedByFile = new Map();
  const unresolved = [];

  for (const file of allFiles) {
    importsByFile.set(file, new Set());
    importedByFile.set(file, new Set());
  }

  for (const file of codeFiles) {
    const source = readTextFile(file);
    const specs = extractImportSpecifiers(source);
    for (const spec of specs) {
      const resolved = resolveInternalImport(file, spec);
      if (!resolved) {
        if (spec.startsWith("@/") || spec.startsWith(".")) {
          unresolved.push({ from: file, spec });
        }
        continue;
      }
      if (!importsByFile.has(resolved)) {
        importsByFile.set(resolved, new Set());
        importedByFile.set(resolved, new Set());
      }
      importsByFile.get(file).add(resolved);
      importedByFile.get(resolved).add(file);
    }
  }

  return { importsByFile, importedByFile, unresolved };
}

function buildInventoryMarkdown({
  allFiles,
  importsByFile,
  importedByFile,
}) {
  const generatedAt = new Date().toISOString();
  const byLayer = new Map();

  for (const file of allFiles) {
    const layer = layerFor(file);
    byLayer.set(layer, (byLayer.get(layer) ?? 0) + 1);
  }

  const layerRows = [...byLayer.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const inventoryRows = allFiles.map((file) => {
    const imports = importsByFile.get(file)?.size ?? 0;
    const importedBy = importedByFile.get(file)?.size ?? 0;
    const depCell = isCodeFile(file) ? String(imports) : "-";
    const usedByCell = isCodeFile(file) ? String(importedBy) : "-";
    return `| ${escapePipe(file)} | ${escapePipe(layerFor(file))} | ${escapePipe(
      purposeFor(file),
    )} | ${depCell} | ${usedByCell} |`;
  });

  return `# Repository Inventory

Generated: \`${generatedAt}\`

Total files inventoried: **${allFiles.length}**

## File Count by Layer
| Layer | File Count |
|---|---:|
${layerRows.map(([layer, count]) => `| ${escapePipe(layer)} | ${count} |`).join("\n")}

## Full Inventory
| Path | Layer | Purpose | Internal Deps | Used By |
|---|---|---|---:|---:|
${inventoryRows.join("\n")}
`;
}

function buildDependenciesMarkdown({
  allFiles,
  importsByFile,
  importedByFile,
  unresolved,
}) {
  const generatedAt = new Date().toISOString();
  const codeFiles = allFiles.filter(isAnalyzableCodeFile);

  let edgeCount = 0;
  for (const file of codeFiles) {
    edgeCount += importsByFile.get(file)?.size ?? 0;
  }

  const layerEdgeCounts = new Map();
  for (const from of codeFiles) {
    const fromLayer = layerFor(from);
    for (const to of importsByFile.get(from) ?? []) {
      const toLayer = layerFor(to);
      const key = `${fromLayer}=>${toLayer}`;
      layerEdgeCounts.set(key, (layerEdgeCounts.get(key) ?? 0) + 1);
    }
  }

  const layerEdges = [...layerEdgeCounts.entries()]
    .map(([k, count]) => {
      const [from, to] = k.split("=>");
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  const topHotspots = codeFiles
    .map((file) => {
      const imports = importsByFile.get(file) ?? new Set();
      const importedBy = importedByFile.get(file) ?? new Set();
      return {
        file,
        importsCount: imports.size,
        importedByCount: importedBy.size,
        keyImports: [...imports].slice(0, 4).join(", "),
      };
    })
    .sort(
      (a, b) =>
        b.importedByCount - a.importedByCount ||
        b.importsCount - a.importsCount ||
        a.file.localeCompare(b.file),
    )
    .slice(0, 25);

  const pageDeps = [...(importsByFile.get("app/page.tsx") ?? new Set())].sort((a, b) =>
    a.localeCompare(b),
  );

  const layerNodes = new Set();
  for (const file of codeFiles) layerNodes.add(layerFor(file));

  const mermaidLayerLines = [
    "graph LR",
    ...[...layerNodes]
      .sort((a, b) => a.localeCompare(b))
      .map((layer) => `  ${nodeId(layer)}["${layer}"]`),
    ...layerEdges
      .filter((edge) => edge.count > 0)
      .map(
        (edge) =>
          `  ${nodeId(edge.from)} -->|${edge.count}| ${nodeId(edge.to)}`,
      ),
  ];

  const mermaidPageLines = [
    "graph TD",
    `  app_page["app/page.tsx"]`,
    ...pageDeps.map((dep) => `  app_page --> ${nodeId(dep)}["${dep}"]`),
  ];

  return `# Repository Dependencies

Generated: \`${generatedAt}\`

## Summary
- Code files analyzed: **${codeFiles.length}**
- Internal import edges: **${edgeCount}**
- Unresolved internal imports: **${unresolved.length}**

## Layer Dependency Edges
| From Layer | To Layer | Edge Count |
|---|---|---:|
${layerEdges.map((edge) => `| ${escapePipe(edge.from)} | ${escapePipe(edge.to)} | ${edge.count} |`).join("\n")}

## Layer Graph
\`\`\`mermaid
${mermaidLayerLines.join("\n")}
\`\`\`

## Most Connected Files
| File | Depends On | Used By | Example Internal Imports |
|---|---:|---:|---|
${topHotspots
  .map(
    (row) =>
      `| ${escapePipe(row.file)} | ${row.importsCount} | ${row.importedByCount} | ${escapePipe(
        row.keyImports || "-",
      )} |`,
  )
  .join("\n")}

## app/page.tsx Dependency Focus
\`\`\`mermaid
${mermaidPageLines.join("\n")}
\`\`\`

## Unresolved Internal Imports
${unresolved.length === 0
  ? "None."
  : unresolved
      .slice(0, 60)
      .map((entry) => `- \`${entry.from}\` -> \`${entry.spec}\``)
      .join("\n")}
`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function main() {
  const allFiles = getAllRepoFiles();
  const graph = buildGraph(allFiles);

  const inventoryMd = buildInventoryMarkdown({
    allFiles,
    importsByFile: graph.importsByFile,
    importedByFile: graph.importedByFile,
  });
  const dependenciesMd = buildDependenciesMarkdown({
    allFiles,
    importsByFile: graph.importsByFile,
    importedByFile: graph.importedByFile,
    unresolved: graph.unresolved,
  });

  ensureDir(inventoryPath);
  ensureDir(dependenciesPath);
  fs.writeFileSync(inventoryPath, inventoryMd, "utf8");
  fs.writeFileSync(dependenciesPath, dependenciesMd, "utf8");

  process.stdout.write(
    [
      "Architecture reports generated:",
      `- ${toPosix(path.relative(repoRoot, inventoryPath))}`,
      `- ${toPosix(path.relative(repoRoot, dependenciesPath))}`,
      `Files inventoried: ${allFiles.length}`,
      `Internal import edges: ${[...graph.importsByFile.values()].reduce((acc, set) => acc + set.size, 0)}`,
      `Unresolved internal imports: ${graph.unresolved.length}`,
    ].join("\n") + "\n",
  );
}

main();
