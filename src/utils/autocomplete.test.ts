import { describe, expect, it } from "vitest";
import { createModuleFromCatalog } from "../data/deviceCatalog";
import { createEmptyProject } from "../data/sampleProject";
import { filterSuggestions } from "./autocomplete";
import { collectAutocompleteTerms } from "./search";

describe("filterSuggestions", () => {
  const terms = ["Luz salón", "Luz cocina", "Persiana suite", "Enchufe pasillo"];

  it("no sugiere nada con menos de 2 letras", () => {
    expect(filterSuggestions(terms, "")).toEqual([]);
    expect(filterSuggestions(terms, "L")).toEqual([]);
  });

  it("filtra sin distinguir mayúsculas y por coincidencia parcial", () => {
    expect(filterSuggestions(terms, "luz")).toEqual(["Luz salón", "Luz cocina"]);
    expect(filterSuggestions(terms, "SUITE")).toEqual(["Persiana suite"]);
  });

  it("no repite el valor exacto ya escrito", () => {
    expect(filterSuggestions(terms, "Luz salón")).toEqual([]);
  });

  it("con showOnFocus lista todo aunque el campo esté vacío", () => {
    expect(filterSuggestions(terms, "", true)).toEqual(terms);
  });
});

describe("collectAutocompleteTerms", () => {
  it("recoge lo escrito en cualquier borne del proyecto (fuente común de tabla y pinout)", () => {
    const p = createEmptyProject("Piso", "");
    const a = createModuleFromCatalog("ext-relay", "R1", "", "")!;
    const b = createModuleFromCatalog("ext-relay", "R2", "", "")!;
    a.terminals[0].connectedElement = "Luz salón";
    b.terminals[1].connectedElement = "Persiana suite";
    b.terminals[1].loadType = "230V";
    p.modules = [
      { ...a, id: "a" },
      { ...b, id: "b" },
    ];
    const terms = collectAutocompleteTerms(p);
    expect(terms).toContain("Luz salón");
    expect(terms).toContain("Persiana suite");
    expect(filterSuggestions(terms, "pers")).toEqual(["Persiana suite"]);
  });
});
