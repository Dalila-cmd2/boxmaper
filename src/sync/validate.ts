import { PROJECTS_DIR, SUPPORTED_SCHEMA, type Manifest, type ProjectEnvelope } from "./types";

/**
 * Validaciones estrictas. Se ejecutan:
 *  - antes de PUBLICAR (para no subir datos rotos),
 *  - antes de APLICAR en cada equipo (para no instalar datos rotos),
 *  - en el repositorio de datos (workflow de GitHub) tras cada cambio.
 * Devuelven una lista de problemas; vacía = todo correcto.
 */

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const SHA_PATTERN = /^[0-9a-f]{64}$/;
export const MAX_PROJECT_BYTES = 8 * 1024 * 1024;

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function optionalString(o: Obj, key: string, where: string, errors: string[]) {
  if (o[key] !== undefined && o[key] !== null && typeof o[key] !== "string") {
    errors.push(`${where}: «${key}» debe ser texto.`);
  }
}

function validateModules(modules: unknown, where: string, errors: string[]) {
  if (!Array.isArray(modules)) {
    errors.push(`${where}: «modules» debe ser una lista.`);
    return;
  }
  const moduleIds = new Set<string>();
  modules.forEach((m, mi) => {
    const mw = `${where} › aparato ${mi + 1}`;
    if (!isObj(m)) {
      errors.push(`${mw}: no es un objeto válido.`);
      return;
    }
    for (const key of ["id", "catalogId", "typeName", "alias"] as const) {
      if (typeof m[key] !== "string" || !(m[key] as string).length) {
        errors.push(`${mw}: falta «${key}».`);
      }
    }
    if (typeof m.macOrSerial !== "string") errors.push(`${mw}: «macOrSerial» debe ser texto.`);
    // Se acepta cualquier categoría con texto: una versión nueva de la app puede añadir categorías.
    if (typeof m.category !== "string" || !m.category.length) {
      errors.push(`${mw}: falta «category».`);
    }
    optionalString(m, "zone", mw, errors);
    optionalString(m, "panelName", mw, errors);
    if (typeof m.id === "string") {
      if (moduleIds.has(m.id)) errors.push(`${mw}: id de aparato repetido.`);
      moduleIds.add(m.id);
    }
    if (!Array.isArray(m.terminals)) {
      errors.push(`${mw}: «terminals» debe ser una lista.`);
      return;
    }
    const termIds = new Set<string>();
    m.terminals.forEach((t, ti) => {
      const tw = `${mw} › borne ${ti + 1}`;
      if (!isObj(t)) {
        errors.push(`${tw}: no es un objeto válido.`);
        return;
      }
      if (typeof t.id !== "string" || !t.id.length) errors.push(`${tw}: falta «id».`);
      else if (termIds.has(t.id)) errors.push(`${tw}: id de borne repetido.`);
      else termIds.add(t.id);
      if (typeof t.borne !== "string") errors.push(`${tw}: «borne» debe ser texto.`);
      if (typeof t.connectedElement !== "string") errors.push(`${tw}: «connectedElement» debe ser texto.`);
      for (const key of ["room", "loadType", "cableRun", "panelTerminal", "protection", "observaciones"]) {
        optionalString(t, key, tw, errors);
      }
    });
  });
}

export function validateProject(project: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(project)) return ["El proyecto no es un objeto válido."];
  if (project.version !== 2) errors.push("«version» debe ser 2.");
  if (project.projectKind !== "standalone" && project.projectKind !== "building") {
    errors.push("«projectKind» debe ser «standalone» o «building».");
  }
  if (typeof project.id !== "string" || !ID_PATTERN.test(project.id)) {
    errors.push("«id» del proyecto ausente o con caracteres no permitidos.");
  }
  if (typeof project.projectName !== "string" || !project.projectName.trim()) {
    errors.push("«projectName» no puede estar vacío.");
  }
  if (typeof project.location !== "string") errors.push("«location» debe ser texto.");
  optionalString(project, "miniserverIp", "Proyecto", errors);
  optionalString(project, "installerCompany", "Proyecto", errors);
  optionalString(project, "installerTechnician", "Proyecto", errors);

  if (project.projectKind === "building") {
    if (!Array.isArray(project.subProjects)) {
      errors.push("Un edificio debe tener la lista «subProjects».");
    } else {
      const subIds = new Set<string>();
      project.subProjects.forEach((sp, i) => {
        const sw = `Subproyecto ${i + 1}`;
        if (!isObj(sp)) {
          errors.push(`${sw}: no es un objeto válido.`);
          return;
        }
        if (typeof sp.id !== "string" || !sp.id) errors.push(`${sw}: falta «id».`);
        else if (subIds.has(sp.id)) errors.push(`${sw}: id repetido.`);
        else subIds.add(sp.id);
        if (typeof sp.name !== "string" || !sp.name.trim()) errors.push(`${sw}: falta «name».`);
        validateModules(sp.modules, `${sw} (${String(sp.name ?? "")})`, errors);
      });
    }
  } else {
    validateModules(project.modules, "Proyecto", errors);
  }
  return errors;
}

export function validateEnvelope(value: unknown): string[] {
  if (!isObj(value)) return ["El archivo del proyecto no es un objeto JSON."];
  if (value.format !== "boxmaper-project") return ["El archivo no es un proyecto de BoxMaper."];
  if (typeof value.schema !== "number") return ["Falta el número de formato («schema»)."];
  if (value.schema > SUPPORTED_SCHEMA) {
    return [
      `Los datos usan un formato más nuevo (${value.schema}) que el que entiende esta versión de BoxMaper (${SUPPORTED_SCHEMA}). Actualizá la aplicación.`,
    ];
  }
  return validateProject(value.project);
}

export function validateManifest(value: unknown): string[] {
  const errors: string[] = [];
  if (!isObj(value)) return ["El índice de datos no es un objeto JSON."];
  if (value.format !== "boxmaper-manifest") return ["El índice no es un índice de BoxMaper."];
  if (typeof value.schema !== "number") return ["Falta el número de formato («schema»)."];
  if (value.schema > SUPPORTED_SCHEMA) {
    return [
      `Los datos usan un formato más nuevo (${value.schema}) que el que entiende esta versión de BoxMaper (${SUPPORTED_SCHEMA}). Actualizá la aplicación.`,
    ];
  }
  if (!Number.isInteger(value.dataVersion) || (value.dataVersion as number) < 0) {
    errors.push("«dataVersion» debe ser un entero mayor o igual a 0.");
  }
  if (typeof value.publishedAt !== "string") errors.push("Falta «publishedAt».");
  if (!Array.isArray(value.projects)) {
    errors.push("Falta la lista «projects».");
    return errors;
  }
  const ids = new Set<string>();
  value.projects.forEach((p, i) => {
    const w = `Proyecto ${i + 1} del índice`;
    if (!isObj(p)) {
      errors.push(`${w}: no es un objeto válido.`);
      return;
    }
    if (typeof p.id !== "string" || !ID_PATTERN.test(p.id)) {
      errors.push(`${w}: id ausente o con caracteres no permitidos.`);
      return;
    }
    if (ids.has(p.id)) errors.push(`${w}: id repetido.`);
    ids.add(p.id);
    if (p.path !== `${PROJECTS_DIR}/${p.id}.json`) errors.push(`${w}: ruta inesperada «${String(p.path)}».`);
    if (typeof p.sha256 !== "string" || !SHA_PATTERN.test(p.sha256)) errors.push(`${w}: huella inválida.`);
    if (!Number.isInteger(p.rev) || (p.rev as number) < 1) errors.push(`${w}: «rev» inválido.`);
    if (typeof p.name !== "string") errors.push(`${w}: falta «name».`);
    if (typeof p.updatedAt !== "string") errors.push(`${w}: falta «updatedAt».`);
  });
  return errors;
}

export function parseManifest(text: string): Manifest {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("El índice de datos no es un JSON válido.");
  }
  const errors = validateManifest(value);
  if (errors.length) throw new Error(errors.join(" "));
  return value as Manifest;
}

export function parseEnvelope(text: string): ProjectEnvelope {
  if (text.length > MAX_PROJECT_BYTES) throw new Error("El archivo del proyecto es demasiado grande.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("El archivo del proyecto no es un JSON válido.");
  }
  const errors = validateEnvelope(value);
  if (errors.length) throw new Error(errors.slice(0, 6).join(" "));
  return value as ProjectEnvelope;
}
