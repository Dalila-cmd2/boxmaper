import { describe, expect, it } from "vitest";
import { createModuleFromCatalog } from "../data/deviceCatalog";
import { createEmptyProject } from "../data/sampleProject";
import { buildTechnicalPdf } from "./pdfGenerator";

describe("buildTechnicalPdf", () => {
  it("genera un PDF con al menos una página y cabecera %PDF", () => {
    const p = createEmptyProject("Prueba PDF", "Local");
    const mod = createModuleFromCatalog("ext-relay", "Rele 1", "", "Cocina")!;
    mod.terminals[0].connectedElement = "Luz cocina";
    p.modules = [{ ...mod, id: "m1" }];
    const doc = buildTechnicalPdf(p);
    const bytes = doc.output("arraybuffer") as ArrayBuffer;
    expect(bytes.byteLength).toBeGreaterThan(2000);
    const head = new TextDecoder().decode(new Uint8Array(bytes).slice(0, 8));
    expect(head.startsWith("%PDF")).toBe(true);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });
});
