/**
 * Genera un proyecto de demostración en data-repo/ (para validar el pipeline de datos).
 * Uso: npm run seed:data
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createModuleFromCatalog } from "../src/data/deviceCatalog";
import { createEmptyBuilding, createEmptySubProject } from "../src/data/sampleProject";
import { serializeEnvelope, serializeManifest } from "../src/sync/canonical";
import { sha256Hex } from "../src/sync/sha256";
import { PROJECTS_DIR } from "../src/sync/types";
const DEMO_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const root = resolve("data-repo");
const proyectosDir = join(root, PROJECTS_DIR);

mkdirSync(proyectosDir, { recursive: true });

const building = createEmptyBuilding("Demostración BoxMaper", "Ejemplo — reemplazar con tu obra");
building.id = DEMO_ID;
const sp = createEmptySubProject("Planta ejemplo", "192.168.1.10");
const mod = createModuleFromCatalog("ext-relay", "Rele demo", "", "Salón")!;
mod.terminals[0].connectedElement = "Luz de ejemplo";
sp.modules = [{ ...mod, id: crypto.randomUUID() }];
building.subProjects = [sp];

const projectPath = `${PROJECTS_DIR}/${DEMO_ID}.json`;
const projectText = serializeEnvelope(building);
const projectSha = sha256Hex(projectText);
writeFileSync(join(root, projectPath), projectText, "utf8");

const manifest = {
  format: "boxmaper-manifest",
  schema: 1,
  dataVersion: 1,
  publishedAt: new Date().toISOString(),
  publishedBy: "BoxMaper seed",
  message: "Proyecto de demostración inicial (sustituir al publicar obra real)",
  projects: [
    {
      id: DEMO_ID,
      name: building.projectName,
      path: projectPath,
      sha256: projectSha,
      rev: 1,
      updatedAt: new Date().toISOString(),
    },
  ],
};
writeFileSync(join(root, "boxmaper-data.json"), serializeManifest(manifest), "utf8");
console.log(`OK: demo en ${root} (${projectPath})`);
