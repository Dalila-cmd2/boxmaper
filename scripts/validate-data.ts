/**
 * Valida el repositorio central de datos (boxmaper-datos) antes de publicar.
 * Uso: npm run validate:data [carpeta]
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { sha256Hex } from "../src/sync/sha256";
import { MANIFEST_PATH, PROJECTS_DIR } from "../src/sync/types";
import { parseEnvelope, parseManifest } from "../src/sync/validate";

const root = resolve(process.argv[2] ?? "data-repo");
const manifestPath = join(root, MANIFEST_PATH);

function fail(message: string): never {
  console.error(`validate:data: ${message}`);
  process.exit(1);
}

if (!existsSync(manifestPath)) {
  fail(`No existe ${MANIFEST_PATH} en ${root}`);
}

const manifestText = readFileSync(manifestPath, "utf8");
let manifest;
try {
  manifest = parseManifest(manifestText);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

for (const entry of manifest.projects) {
  const expected = join(root, entry.path);
  if (!existsSync(expected)) {
    fail(`Falta el archivo del proyecto: ${entry.path}`);
  }
  const text = readFileSync(expected, "utf8");
  if (sha256Hex(text) !== entry.sha256) {
    fail(`La huella de «${entry.name}» no coincide con ${entry.path}`);
  }
  try {
    const envelope = parseEnvelope(text);
    if (envelope.project.id !== entry.id) {
      fail(`«${entry.name}»: el id del archivo no coincide con el índice.`);
    }
  } catch (error) {
    fail(`«${entry.name}»: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!entry.path.startsWith(`${PROJECTS_DIR}/`)) {
    fail(`Ruta no permitida: ${entry.path}`);
  }
}

console.log(
  `OK: índice v${manifest.dataVersion}, ${manifest.projects.length} proyecto(s) en ${root}`,
);
