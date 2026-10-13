/**
 * Extrae valores JSON de proyectos desde LevelDB de WebView2 (solo uso local / publicación).
 * Uso: node scripts/extract-webview-projects.mjs [carpeta-leveldb]
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const dir =
  process.argv[2] ??
  join(
    process.env.LOCALAPPDATA ?? "",
    "com.loxinstal.boxmaper",
    "EBWebView",
    "Default",
    "Local Storage",
    "leveldb",
  );

const files = readdirSync(dir).filter((f) => f.endsWith(".ldb") || f.endsWith(".log"));
const chunks = files.flatMap((f) => {
  try {
    return [readFileSync(join(dir, f))];
  } catch {
    return [];
  }
});

const text = Buffer.concat(chunks).toString("utf8");
const keys = new Set();
for (const m of text.matchAll(/boxmaper_project_[a-f0-9-]{36}/gi)) keys.add(m[0].toLowerCase());

const outDir = resolve("imports/extracted");
mkdirSync(outDir, { recursive: true });

let saved = 0;
for (const key of keys) {
  const idx = text.indexOf(key);
  if (idx < 0) continue;
  const slice = text.slice(idx, idx + 8_000_000);
  const start = slice.indexOf("{");
  if (start < 0) continue;
  let depth = 0;
  let end = -1;
  for (let i = start; i < slice.length; i++) {
    const c = slice[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) continue;
  const jsonText = slice.slice(start, end);
  try {
    const project = JSON.parse(jsonText);
    const id = project.id ?? key.replace("boxmaper_project_", "");
    const name = (project.projectName ?? id).replace(/[^\w\s.-]/g, "_").slice(0, 60);
    writeFileSync(join(outDir, `${name}-${id}.json`), JSON.stringify(project, null, 2));
    saved++;
    console.log(`OK: ${project.projectName ?? id} (${id})`);
  } catch {
    /* fragmento incompleto */
  }
}

if (!saved) {
  console.error("No se encontró ningún proyecto JSON completo en LevelDB.");
  process.exit(1);
}
