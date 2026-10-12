import type { ProjectState } from "../types/project";
import { sha256Hex } from "./sha256";
import { SUPPORTED_SCHEMA, type ProjectEnvelope } from "./types";

/** JSON con claves ordenadas: el mismo contenido siempre da el mismo texto (y la misma huella). */
export function stableStringify(value: unknown, indent = 2): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(v as Record<string, unknown>).sort()) {
        const item = (v as Record<string, unknown>)[key];
        if (item !== undefined) out[key] = sort(item);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(sort(value), null, indent);
}

/**
 * Quita lo que es solo «estado de pantalla» (qué módulo está seleccionado,
 * en qué subproyecto estás…). Eso no es contenido del proyecto y no debe
 * contar como un cambio ni publicarse.
 */
export function toPublishable(state: ProjectState): ProjectState {
  const clean: ProjectState = {
    ...state,
    selectedModuleId: null,
    highlightedTerminalId: null,
    activeSubProjectId: null,
  };
  if (clean.subProjects) {
    clean.subProjects = clean.subProjects.map((sp) => ({
      ...sp,
      selectedModuleId: null,
      highlightedTerminalId: null,
    }));
  }
  const extra = clean as unknown as Record<string, unknown>;
  delete extra.exportedAt;
  delete extra.exportKind;
  delete extra.format;
  return clean;
}

/** Huella del contenido real de un proyecto (ignora el estado de pantalla). */
export function contentHash(state: ProjectState): string {
  return sha256Hex(stableStringify(toPublishable(state)));
}

export function serializeEnvelope(state: ProjectState): string {
  const envelope: ProjectEnvelope = {
    format: "boxmaper-project",
    schema: SUPPORTED_SCHEMA,
    project: toPublishable(state),
  };
  return stableStringify(envelope) + "\n";
}

export function serializeManifest(manifest: unknown): string {
  return stableStringify(manifest) + "\n";
}
