import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createModuleFromCatalog, normalizeProject } from "../data/deviceCatalog";
import { createEmptyBuilding, createEmptyProject, createEmptySubProject } from "../data/sampleProject";
import type { DeviceModule, ProjectState } from "../types/project";
import { migrateProjectState } from "../utils/projectModel";
import { contentHash, serializeEnvelope, serializeManifest, stableStringify, toPublishable } from "./canonical";
import { DEFAULT_SYNC_CONFIG } from "./config";
import { SyncEngine, type ProjectRepo } from "./engine";
import { memoryKv } from "./kv";
import { MemorySource } from "./memorySource";
import { sha256Hex } from "./sha256";
import { MANIFEST_PATH, SyncError, type SyncConfig } from "./types";
import { validateManifest, validateProject } from "./validate";

// ------------------------------------------------------------------ utilidades de prueba
const prepare = (s: ProjectState) => normalizeProject(migrateProjectState(s) ?? s);

function memoryRepo(): ProjectRepo & { map: Map<string, ProjectState> } {
  const map = new Map<string, ProjectState>();
  return {
    map,
    get: (id) => {
      const v = map.get(id);
      return v ? structuredClone(v) : null;
    },
    save: (s) => void map.set(s.id!, structuredClone(s)),
    list: () => [...map.values()].map((p) => ({ id: p.id!, name: p.projectName })),
  };
}

/** Un «equipo» con su propio almacenamiento, conectado al mismo servidor. */
function device(server: MemorySource, over: Partial<SyncConfig> = {}) {
  const repo = memoryRepo();
  const kv = memoryKv();
  const applied: string[][] = [];
  let tick = 0;
  const engine = new SyncEngine({
    kv,
    repo,
    getConfig: () => ({ ...DEFAULT_SYNC_CONFIG, token: "x", author: "Test", ...over }),
    createSource: () => server,
    prepare,
    onApplied: (ids) => applied.push(ids),
    now: () => new Date(Date.UTC(2026, 9, 12, 12, 0, tick++)),
  });
  return { engine, repo, kv, applied };
}

function mod(alias: string, zone = "", catalogId = "ext-relay"): DeviceModule {
  const base = createModuleFromCatalog(catalogId, alias, "", zone)!;
  return { ...base, id: crypto.randomUUID() };
}

function building(name = "Ordino Diamat"): ProjectState {
  const p = createEmptyBuilding(name, "Ordino");
  const s1 = createEmptySubProject("Planta 1", "10.0.0.1");
  s1.modules = [mod("Rele 1", "Salón")];
  const s2 = createEmptySubProject("Planta 2", "10.0.0.2");
  s2.modules = [mod("Rele 2")];
  s1.modules[0].terminals[0].connectedElement = "Luz salón";
  return { ...p, subProjects: [s1, s2] };
}

// ------------------------------------------------------------------ pruebas
describe("sha256", () => {
  it("coincide con la implementación de Node (incluye acentos y textos largos)", () => {
    for (const text of ["", "abc", "Ficha técnica — niño ñ €", "x".repeat(10_000), "é".repeat(777)]) {
      expect(sha256Hex(text)).toBe(createHash("sha256").update(text, "utf8").digest("hex"));
    }
  });
});

describe("formato y validación", () => {
  it("un proyecto real pasa la validación", () => {
    expect(validateProject(building())).toEqual([]);
    expect(validateProject(createEmptyProject("Piso", "Madrid"))).toEqual([]);
  });

  it("detecta datos rotos", () => {
    const p = building();
    p.subProjects![0].modules[0].terminals[0].borne = 5 as unknown as string;
    p.subProjects![1].id = p.subProjects![0].id;
    const errors = validateProject(p);
    expect(errors.join(" ")).toContain("borne");
    expect(errors.join(" ")).toContain("repetido");
    expect(validateProject({ version: 2 }).length).toBeGreaterThan(0);
  });

  it("rechaza rutas peligrosas en el índice", () => {
    const manifest = {
      format: "boxmaper-manifest",
      schema: 1,
      dataVersion: 1,
      publishedAt: "x",
      projects: [{ id: "../../etc", name: "x", path: "../../etc.json", sha256: "0".repeat(64), rev: 1, updatedAt: "x" }],
    };
    expect(validateManifest(manifest).length).toBeGreaterThan(0);
  });

  it("el estado de pantalla no cuenta como cambio", () => {
    const p = building();
    const moved = structuredClone(p);
    moved.activeSubProjectId = p.subProjects![0].id;
    moved.subProjects![0].selectedModuleId = p.subProjects![0].modules[0].id;
    expect(contentHash(moved)).toBe(contentHash(p));
    expect(toPublishable(moved).activeSubProjectId).toBeNull();
  });

  it("preparar un proyecto es idempotente (no genera falsos cambios)", () => {
    const p = building();
    const once = prepare(p);
    expect(contentHash(prepare(once))).toBe(contentHash(once));
  });

  it("la serialización es estable (mismo contenido, mismo texto)", () => {
    const p = building();
    expect(serializeEnvelope(p)).toBe(serializeEnvelope(structuredClone(p)));
    expect(stableStringify({ b: 1, a: { d: 1, c: 2 } })).toBe(stableStringify({ a: { c: 2, d: 1 }, b: 1 }));
  });
});

describe("instalar una vez y recibir cambios sin reinstalar", () => {
  it("el editor publica y otro equipo lo recibe; luego cambios de tablas y subproyectos también", async () => {
    const server = new MemorySource();
    const editor = device(server);
    const reader = device(server);

    const p = building();
    editor.repo.save(prepare(p));
    const first = await editor.engine.publish([p.id!], "Primera publicación");
    expect(first.dataVersion).toBe(1);

    // El lector recibe el proyecto completo.
    const r1 = await reader.engine.check();
    expect(r1.applied).toEqual([p.id]);
    expect(reader.repo.get(p.id!)?.subProjects).toHaveLength(2);
    expect(reader.applied).toEqual([[p.id]]);

    // Sin cambios: no hace nada.
    const r2 = await reader.engine.check();
    expect(r2.upToDate).toBe(true);
    expect(reader.applied).toHaveLength(1);

    // El editor agrega un subproyecto, cambia una tabla y corrige un dato.
    const edited = editor.repo.get(p.id!)!;
    edited.subProjects![0].modules[0].terminals[1].connectedElement = "Persiana salón";
    edited.subProjects![1].name = "Planta 2 (reformada)";
    const s3 = createEmptySubProject("Sótano", "10.0.0.3");
    s3.modules = [mod("Rele sótano", "Garaje")];
    edited.subProjects!.push(s3);
    editor.repo.save(edited);
    expect(editor.engine.pendingChanges().map((c) => c.kind)).toEqual(["modified"]);
    const second = await editor.engine.publish([p.id!], "Agrego sótano y corrijo persianas");
    expect(second.dataVersion).toBe(2);
    expect(editor.engine.pendingChanges()).toEqual([]);

    // El lector lo recibe solo, conservando una copia de seguridad de lo anterior.
    const r3 = await reader.engine.check();
    expect(r3.applied).toEqual([p.id]);
    const got = reader.repo.get(p.id!)!;
    expect(got.subProjects).toHaveLength(3);
    expect(got.subProjects![0].modules[0].terminals[1].connectedElement).toBe("Persiana salón");
    expect(reader.engine.listBackups()).toHaveLength(1);
    expect(reader.engine.readState().dataVersion).toBe(2);
  });

  it("no publica si no hay cambios reales ni si falta permiso de escritura", async () => {
    const server = new MemorySource();
    const editor = device(server);
    const p = building();
    editor.repo.save(prepare(p));
    await editor.engine.publish([p.id!], "uno");
    await expect(editor.engine.publish([p.id!], "otra vez")).rejects.toThrow(/No hay cambios reales/);

    const readOnly = device(new MemorySource(false));
    readOnly.repo.save(prepare(p));
    await expect(readOnly.engine.publish([p.id!], "x")).rejects.toMatchObject({ code: "no-write" });
  });
});

describe("seguridad y confiabilidad", () => {
  it("todo o nada: un archivo corrupto no cambia NINGÚN dato del equipo", async () => {
    const server = new MemorySource();
    const editor = device(server);
    const a = building("A");
    const b = building("B");
    editor.repo.save(prepare(a));
    editor.repo.save(prepare(b));
    await editor.engine.publish([a.id!, b.id!], "dos proyectos");

    // Se corrompe el segundo archivo en el servidor (la huella ya no coincide).
    server.corrupt[`proyectos/${b.id}.json`] = "{ esto no es el archivo";
    const reader = device(server);
    await expect(reader.engine.check()).rejects.toMatchObject({ code: "invalid" });
    expect(reader.repo.list()).toEqual([]);
    expect(reader.engine.readState().dataVersion).toBeNull();

    // Al repararse el servidor, se recupera solo.
    server.corrupt = {};
    const ok = await reader.engine.check();
    expect(ok.applied.sort()).toEqual([a.id, b.id].sort());
  });

  it("rechaza datos con huella correcta pero estructura inválida", async () => {
    const server = new MemorySource();
    const bad = building();
    bad.subProjects![0].modules[0].terminals[0].borne = 7 as unknown as string;
    const text = serializeEnvelope(bad);
    const manifest = {
      format: "boxmaper-manifest",
      schema: 1,
      dataVersion: 1,
      publishedAt: "2026-10-12T00:00:00Z",
      projects: [
        { id: bad.id, name: bad.projectName, path: `proyectos/${bad.id}.json`, sha256: sha256Hex(text), rev: 1, updatedAt: "x" },
      ],
    };
    await server.rawCommit([
      { path: `proyectos/${bad.id}.json`, text },
      { path: MANIFEST_PATH, text: serializeManifest(manifest) },
    ]);
    const reader = device(server);
    await expect(reader.engine.check()).rejects.toMatchObject({ code: "invalid" });
    expect(reader.repo.list()).toEqual([]);
  });

  it("no publica datos inválidos", async () => {
    const server = new MemorySource();
    const editor = device(server);
    const bad = building();
    bad.subProjects![0].modules[0].terminals[0].connectedElement = undefined as unknown as string;
    editor.repo.save(bad);
    await expect(editor.engine.publish([bad.id!], "mal")).rejects.toMatchObject({ code: "invalid" });
  });

  it("un formato más nuevo que el de la app pide actualizar la aplicación", async () => {
    const server = new MemorySource();
    const manifest = { format: "boxmaper-manifest", schema: 99, dataVersion: 1, publishedAt: "x", projects: [] };
    await server.rawCommit([{ path: MANIFEST_PATH, text: serializeManifest(manifest) }]);
    const reader = device(server);
    await expect(reader.engine.check()).rejects.toMatchObject({ code: "schema" });
  });

  it("una respuesta atrasada (versión más vieja) se ignora", async () => {
    const server = new MemorySource();
    const editor = device(server);
    const p = building();
    editor.repo.save(prepare(p));
    await editor.engine.publish([p.id!], "v1");
    const reader = device(server);
    await reader.engine.check();
    const fresh = editor.repo.get(p.id!)!;
    fresh.projectName = "Cambio";
    editor.repo.save(fresh);
    await editor.engine.publish([p.id!], "v2");
    await reader.engine.check();

    server.corrupt[MANIFEST_PATH] = (await server.readText(MANIFEST_PATH, "c1"))!;
    const r = await reader.engine.check();
    expect(r.upToDate).toBe(true);
    expect(reader.repo.get(p.id!)?.projectName).toBe("Cambio");
  });

  it("sin conexión no se pierde ni se cambia nada", async () => {
    const server = new MemorySource();
    const reader = device(server);
    const local = createEmptyProject("Mío", "");
    reader.repo.save(local);
    server.failNextRead = "sin red";
    await expect(reader.engine.check()).rejects.toMatchObject({ code: "network" });
    expect(reader.repo.get(local.id!)).not.toBeNull();
  });
});

describe("conflictos y cambios simultáneos", () => {
  async function setup() {
    const server = new MemorySource();
    const editor = device(server);
    const reader = device(server);
    const p = building();
    editor.repo.save(prepare(p));
    await editor.engine.publish([p.id!], "v1");
    await reader.engine.check();
    return { server, editor, reader, id: p.id! };
  }

  it("si el lector tiene cambios propios y llega una actualización, NO se pisan y se puede elegir", async () => {
    const { editor, reader, id } = await setup();

    const mine = reader.repo.get(id)!;
    mine.subProjects![0].modules[0].terminals[0].connectedElement = "MI CAMBIO LOCAL";
    reader.repo.save(mine);

    const theirs = editor.repo.get(id)!;
    theirs.projectName = "Ordino Diamat v2";
    editor.repo.save(theirs);
    await editor.engine.publish([id], "v2");

    const r = await reader.engine.check();
    expect(r.conflicts).toEqual([id]);
    expect(r.applied).toEqual([]);
    expect(reader.repo.get(id)!.subProjects![0].modules[0].terminals[0].connectedElement).toBe("MI CAMBIO LOCAL");
    expect(reader.engine.getConflicts()).toHaveLength(1);

    // Usar la versión del servidor: se guarda copia de lo local antes.
    reader.engine.resolveConflict(id, "server");
    expect(reader.repo.get(id)!.projectName).toBe("Ordino Diamat v2");
    expect(reader.engine.getConflicts()).toHaveLength(0);
    const backups = reader.engine.listBackups();
    expect(backups).toHaveLength(1);

    // …y la copia permite recuperar lo que había (incluido «MI CAMBIO LOCAL»).
    reader.engine.restoreBackup(id, backups[0].at);
    expect(reader.repo.get(id)!.subProjects![0].modules[0].terminals[0].connectedElement).toBe("MI CAMBIO LOCAL");
  });

  it("conservar la versión propia la deja lista para publicar encima", async () => {
    const { editor, reader, id } = await setup();
    const mine = reader.repo.get(id)!;
    mine.subProjects![1].name = "Planta 2 — mía";
    reader.repo.save(mine);
    const theirs = editor.repo.get(id)!;
    theirs.location = "Otra";
    editor.repo.save(theirs);
    await editor.engine.publish([id], "v2");

    await reader.engine.check();
    reader.engine.resolveConflict(id, "mine");
    expect(reader.engine.pendingChanges().map((c) => c.kind)).toEqual(["modified"]);
    const pub = await reader.engine.publish([id], "mi versión encima");
    expect(pub.dataVersion).toBe(3);
  });

  it("publicar sin haber actualizado antes se rechaza (no se pisa el trabajo ajeno)", async () => {
    const { editor, reader, id } = await setup();
    const a = editor.repo.get(id)!;
    a.location = "Cambio del editor";
    editor.repo.save(a);
    await editor.engine.publish([id], "v2");

    const b = reader.repo.get(id)!;
    b.projectName = "Cambio del lector";
    reader.repo.save(b);
    await expect(reader.engine.publish([id], "pisando")).rejects.toMatchObject({ code: "conflict" });
  });

  it("si dos publican a la vez, el servidor rechaza al segundo", async () => {
    const server = new MemorySource();
    const a = device(server);
    const p = building();
    a.repo.save(prepare(p));
    // Se simula que otro publica justo entre medio.
    const original = server.head.bind(server);
    server.head = async () => {
      const h = await original();
      await server.rawCommit([{ path: "otro.txt", text: "x" }]);
      return h;
    };
    await expect(a.engine.publish([p.id!], "x")).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("historial y vuelta atrás", () => {
  it("se vuelve a una versión anterior y los demás equipos la reciben", async () => {
    const server = new MemorySource();
    const editor = device(server);
    const reader = device(server);
    const p = building();
    editor.repo.save(prepare(p));
    await editor.engine.publish([p.id!], "versión buena");
    await reader.engine.check();

    const broken = editor.repo.get(p.id!)!;
    broken.subProjects = [broken.subProjects![0]];
    broken.projectName = "ROTO";
    editor.repo.save(broken);
    await editor.engine.publish([p.id!], "cambio con error");
    await reader.engine.check();
    expect(reader.repo.get(p.id!)!.projectName).toBe("ROTO");

    const history = await editor.engine.history();
    expect(history.map((h) => h.message)).toEqual(["cambio con error", "versión buena"]);

    const restored = await editor.engine.restoreFromHistory(history[1].id);
    expect(restored.dataVersion).toBe(3);

    // El historial conserva todo (no se borra nada).
    expect((await editor.engine.history()).length).toBe(3);

    await reader.engine.check();
    const back = reader.repo.get(p.id!)!;
    expect(back.projectName).toBe("Ordino Diamat");
    expect(back.subProjects).toHaveLength(2);
  });

  it("restaurar quita del servidor lo que no existía en esa versión (pero no del equipo)", async () => {
    const server = new MemorySource();
    const editor = device(server);
    const a = building("A");
    const b = building("B");
    editor.repo.save(prepare(a));
    await editor.engine.publish([a.id!], "solo A");
    editor.repo.save(prepare(b));
    await editor.engine.publish([b.id!], "A y B");

    const reader = device(server);
    await reader.engine.check();
    expect(reader.repo.list()).toHaveLength(2);

    const history = await editor.engine.history();
    await editor.engine.restoreFromHistory(history[1].id);
    const r = await reader.engine.check();
    expect(r.unlinked).toEqual([b.id]);
    // El proyecto B sigue en el equipo del lector: no se borra información.
    expect(reader.repo.get(b.id!)).not.toBeNull();
  });
});

describe("primer arranque sin datos publicados", () => {
  it("no trata como error un repositorio vacío", async () => {
    const server = new MemorySource();
    const reader = device(server);
    const r = await reader.engine.check();
    expect(r.upToDate).toBe(true);
    expect(r.applied).toEqual([]);
    expect(r.dataVersion).toBeNull();
  });
});

describe("cambio de fuente de datos", () => {
  it("al cambiar de repositorio se reinicia el seguimiento pero se conservan los proyectos", async () => {
    const s1 = new MemorySource();
    const s2 = new MemorySource();
    const editor = device(s1);
    const p = building();
    editor.repo.save(prepare(p));
    await editor.engine.publish([p.id!], "v1");
    await editor.engine.publish([p.id!], "v1").catch(() => undefined);

    let current = s1;
    const repo = memoryRepo();
    const kv = memoryKv();
    let repoName = "uno";
    const engine = new SyncEngine({
      kv,
      repo,
      getConfig: () => ({ ...DEFAULT_SYNC_CONFIG, token: "x", repo: repoName }),
      createSource: () => current,
      prepare,
    });
    await engine.check();
    expect(repo.list()).toHaveLength(1);
    expect(engine.readState().dataVersion).toBe(1);

    current = s2; // fuente nueva y vacía: se reinicia el seguimiento
    repoName = "dos";
    const afterSwitch = await engine.check();
    expect(afterSwitch.upToDate).toBe(true);
    expect(repo.list()).toHaveLength(1);
    expect(engine.readState().dataVersion).toBeNull();
  });
});
