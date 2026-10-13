/**
 * Publica uno o más proyectos al repositorio boxmaper-datos.
 * Requiere: GITHUB_TOKEN o `gh auth login` (se usa el token de gh).
 *
 * Uso:
 *   npm run publish:project -- imports/extracted/Ordino-xxx.json
 *   npm run publish:project -- ruta/al/archivo.boxmaper "Mensaje de publicación"
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import type { ProjectState } from "../src/types/project";
import { normalizeProject } from "../src/data/deviceCatalog";
import { migrateProjectState } from "../src/utils/projectModel";
import { DEFAULT_SYNC_CONFIG } from "../src/sync/config";
import { SyncEngine } from "../src/sync/engine";
import { memoryKv } from "../src/sync/kv";
import { GitHubSource } from "../src/sync/sources";
import { prepareRemoteProject } from "../src/sync/syncService";
import { parseEnvelope } from "../src/sync/validate";

function token(): string {
  if (process.env.GITHUB_TOKEN?.trim()) return process.env.GITHUB_TOKEN.trim();
  try {
    return execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch {
    throw new Error("Falta GITHUB_TOKEN o sesión de gh auth login.");
  }
}

function loadProject(path: string): ProjectState {
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.format === "boxmaper-project" && o.project) {
      return prepareRemoteProject(parseEnvelope(JSON.stringify(raw)).project);
    }
    if (o.format === "boxmaper" && o.project) {
      const p = o.project as ProjectState;
      return prepareRemoteProject({ ...p, id: p.id ?? crypto.randomUUID() });
    }
  }
  const migrated = migrateProjectState(raw as ProjectState);
  if (!migrated) throw new Error("El archivo no es un proyecto BoxMaper válido.");
  return prepareRemoteProject(normalizeProject(migrated));
}

const args = process.argv.slice(2);
const isProjectFile = (a: string) => /\.(json|boxmaper)$/i.test(a);
let message = "Publicación Ordino Diamat / proyectos locales";
const fileArgs = args.filter(isProjectFile);
if (args.length && !isProjectFile(args[args.length - 1]!)) {
  message = args[args.length - 1]!;
}
const paths = fileArgs;

if (!paths.length) {
  console.error("Indica al menos un archivo .json o .boxmaper");
  process.exit(1);
}

const projects = paths.map((p) => loadProject(resolve(p)));
const map = new Map<string, ProjectState>();
for (const p of projects) {
  if (!p.id) throw new Error(`«${p.projectName}» no tiene id.`);
  map.set(p.id, p);
}

const cfg = { ...DEFAULT_SYNC_CONFIG, token: token(), author: "Dalila-cmd2" };
const repo = {
  get: (id: string) => map.get(id) ?? null,
  save: () => {},
  list: () => [...map.values()].map((p) => ({ id: p.id!, name: p.projectName })),
};

const engine = new SyncEngine({
  kv: memoryKv(),
  repo,
  getConfig: () => cfg,
  createSource: () => new GitHubSource(cfg),
  prepare: prepareRemoteProject,
});

const ids = [...map.keys()];
engine
  .publish(ids, message)
  .then((r) => {
    console.log(`Publicado datos v${r.dataVersion}: ${r.published.join(", ")} (commit ${r.commit.slice(0, 7)})`);
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
