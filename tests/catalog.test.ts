import { describe, expect, it } from "vitest";
import { pages, initialCatalog } from "../src/catalog/data";
import {
  allowedKinds,
  markMain,
  effectiveEdit,
  originalEdit,
  parseState,
  publicationIssues,
  searchPages,
} from "../src/catalog/model";
import { exportPage } from "../src/catalog/export";

describe("catalog demonstration", () => {
  it("matches accent-insensitive names and catalog addresses, never the web", () => {
    expect(searchPages(pages, "AGUA")).toHaveLength(2);
    expect(searchPages(pages, "https://bairro.example/biblioteca/")[0].id).toBe(
      "biblioteca-do-bairro",
    );
    expect(searchPages(pages, "google.com")).toHaveLength(0);
  });
  it("starts with independent drafts and validated prepared readings", () => {
    const state = initialCatalog();
    for (const page of pages)
      expect(publicationIssues(page, state.pages[page.id].published)).toEqual(
        [],
      );
    state.pages["caminho-da-agua"].draft.intro.text = "Rascunho";
    expect(state.pages["caminho-da-agua"].published.intro.text).not.toBe(
      "Rascunho",
    );
    expect(parseState(JSON.stringify(state), pages)).toEqual(state);
  });
  it("does not accept unknown pages, keys, elements, excessive payloads or invalid media conversions", () => {
    const state = initialCatalog();
    state.pages["caminho-da-agua"].draft.diagram.kind = "paragraph";
    expect(() => parseState(JSON.stringify(state), pages)).toThrow();
    expect(() => parseState('{"version":1,"pages":{}}', pages)).toThrow();
    expect(() => parseState(" ".repeat(250_001), pages)).toThrow();
    const extra = initialCatalog();
    extra.pages.unknown = extra.pages["caminho-da-agua"];
    expect(() => parseState(JSON.stringify(extra), pages)).toThrow();
  });
  it("blocks empty readings, empty text and missing image descriptions", () => {
    const page = pages[0];
    const state = initialCatalog().pages[page.id];
    state.draft.diagram.alt = "";
    expect(publicationIssues(page, state.draft).join(" ")).toContain(
      "Descreva",
    );
    state.draft.diagram.hidden = true;
    expect(publicationIssues(page, state.draft)).toEqual([]);
    for (const edit of Object.values(state.draft)) edit.hidden = true;
    expect(publicationIssues(page, state.draft)).toContain(
      "Mantenha ao menos um elemento na página.",
    );
  });
  it("retains source data and makes semantic reclassification explicit", () => {
    const original = structuredClone(pages[0]);
    const state = initialCatalog().pages[original.id];
    state.draft["steps-title"].kind = "heading";
    expect(pages[0]).toEqual(original);
    expect(
      allowedKinds(original.elements.find((item) => item.id === "diagram")!),
    ).toEqual(["image"]);
    const heading = original.elements.find(
      (item) => item.id === "steps-title",
    )!;
    expect(originalEdit(heading).kind).toBe("paragraph");
    expect(effectiveEdit(heading, {})).toEqual(originalEdit(heading));
  });
  it("keeps one focus target, preserves annotations and exposes a real reading shortcut", () => {
    const page = pages[0];
    let draft = initialCatalog().pages[page.id].draft;
    draft.intro.markers = ["important", "instruction"];
    draft = markMain(page, draft, "intro", true);
    draft = markMain(page, draft, "diagram", true);
    expect(draft.intro.main).toBe(false);
    expect(draft.diagram.main).toBe(true);
    expect(draft.intro.markers).toEqual(["important", "instruction"]);
    const html = exportPage(page, draft);
    expect(html).toContain('href="#page-element-diagram"');
    expect(html).toContain('aria-label="Conteúdo principal da página"');
    expect(html).toContain("Informação importante");
    expect(html).toContain('<nav class="page-menu"');
    draft.intro.main = true;
    expect(publicationIssues(page, draft).join(" ")).toContain("apenas um");
  });
  it("loads earlier local edits without losing text when new annotation fields are missing", () => {
    const legacy = JSON.parse(JSON.stringify(initialCatalog()));
    for (const value of Object.values(legacy.pages) as any[]) {
      for (const edits of [value.draft, value.published])
        for (const edit of Object.values(edits) as any[]) {
          delete edit.main;
          delete edit.markers;
        }
      delete value.draft.navigation;
      delete value.published.navigation;
    }
    legacy.pages["caminho-da-agua"].draft.intro.text = "Texto já editado";
    const parsed = parseState(JSON.stringify(legacy), pages);
    expect(parsed.pages["caminho-da-agua"].draft.intro.text).toBe(
      "Texto já editado",
    );
    expect(parsed.pages["caminho-da-agua"].draft.intro.markers).toEqual([]);
    expect(parsed.pages["caminho-da-agua"].draft.intro.main).toBe(false);
  });
  it("exports standalone semantic HTML and escapes authored input", () => {
    const page = pages[0];
    const state = initialCatalog().pages[page.id];
    state.published.intro.text = "<script>alert(1)</script>";
    const html = exportPage(page, state.published);
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("<h2>Etapas do percurso</h2>");
    expect(html).not.toContain("Espaço demonstrativo de anúncio");
    expect(html).not.toContain("<script src");
  });
  it("exports table headers and text equivalents without remote image requests", () => {
    const page = pages[1];
    const html = exportPage(page, initialCatalog().pages[page.id].published);
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain("18 m³");
    expect(html).not.toContain('<img src="https:');
  });
});
