import { describe, expect, it } from "vitest";
import { createModuleFromCatalog } from "../data/deviceCatalog";
import { createEmptyBuilding, createEmptyProject, createEmptySubProject } from "../data/sampleProject";
import { buildPdfSections } from "./pdfSections";

describe("buildPdfSections", () => {
  it("edificio: un apartado por subproyecto", () => {
    const p = createEmptyBuilding("Edificio", "Madrid");
    const a = createEmptySubProject("Planta 1", "10.0.0.1");
    const b = createEmptySubProject("Planta 2", "10.0.0.2");
    p.subProjects = [a, b];
    const sections = buildPdfSections(p);
    expect(sections).toHaveLength(2);
    expect(sections[0].kind).toBe("Subproyecto");
    expect(sections[0].title).toBe("Planta 1");
  });

  it("piso: agrupa por zona y marca sin zona para revisión", () => {
    const p = createEmptyProject("Piso", "Barcelona");
    const zoned = createModuleFromCatalog("ext-relay", "R1", "", "Salón")!;
    const bare = createModuleFromCatalog("ext-relay", "R2", "", "")!;
    p.modules = [{ ...zoned, id: "m1" }, { ...bare, id: "m2" }];
    const sections = buildPdfSections(p);
    expect(sections).toHaveLength(2);
    expect(sections.find((s) => s.title === "Salón")?.modules).toHaveLength(1);
    const review = sections.find((s) => s.review);
    expect(review?.title).toContain("Sin zona");
  });

  it("filtra un solo subproyecto si se pide", () => {
    const p = createEmptyBuilding("X", "");
    p.subProjects = [createEmptySubProject("A", ""), createEmptySubProject("B", "")];
    expect(buildPdfSections(p, { onlySubProjectId: p.subProjects![0].id })).toHaveLength(1);
  });
});
