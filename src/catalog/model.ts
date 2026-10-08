import { z } from "zod";

export const kinds = {
  title: "Título da página",
  paragraph: "Texto",
  heading: "Título de seção",
  image: "Imagem",
  list: "Lista",
  table: "Tabela",
  notice: "Aviso",
  menu: "Menu de navegação",
  advertisement: "Propaganda",
} as const;
export const markers = {
  important: "Informação importante",
  instruction: "Instrução",
  complementary: "Conteúdo complementar",
  review: "Revisar depois",
} as const;
export type Marker = keyof typeof markers;
export type Kind = keyof typeof kinds;
export type Element = {
  id: string;
  kind: Kind;
  text: string;
  illustration?:
    | "water"
    | "chart"
    | "library"
    | "river"
    | "classroom"
    | "books"
    | "campaign";
  area?: "header" | "banner" | "article" | "sidebar" | "footer";
  appearance?: "brand" | "metadata" | "promotion";
  alt?: string;
  items?: string[];
  columns?: string[];
  rows?: string[][];
  links?: { text: string; target: string }[];
};
export type CatalogPage = {
  id: string;
  title: string;
  address: string;
  summary: string;
  topic: string;
  theme?: "science" | "data" | "community";
  elements: Element[];
};

const editSchema = z
  .object({
    kind: z.enum([
      "title",
      "paragraph",
      "heading",
      "image",
      "list",
      "table",
      "notice",
      "menu",
      "advertisement",
    ]),
    text: z.string().max(8000),
    alt: z.string().max(1000),
    description: z.string().max(4000),
    tag: z.string().max(60),
    hidden: z.boolean(),
    markers: z
      .array(z.enum(["important", "instruction", "complementary", "review"]))
      .max(4)
      .default([]),
    main: z.boolean().default(false),
  })
  .strict();
export type Edit = z.infer<typeof editSchema>;
export type Edits = Record<string, Edit>;
export type PageState = { draft: Edits; published: Edits };
export type CatalogState = { version: 1; pages: Record<string, PageState> };
export const STORAGE_KEY = "wablind.catalog.v1";

export function originalEdit(element: Element): Edit {
  return {
    kind: element.kind,
    text: element.text,
    alt: element.alt || "",
    description: "",
    tag: "",
    hidden: false,
    markers: [],
    main: false,
  };
}
export function effectiveEdit(element: Element, edits: Edits): Edit {
  return edits[element.id] ?? originalEdit(element);
}
export function allowedKinds(element: Element): Kind[] {
  if (element.illustration && element.kind === "advertisement")
    return ["advertisement", "image"];
  return ["paragraph", "heading", "notice", "advertisement"].includes(
    element.kind,
  )
    ? ["paragraph", "heading", "notice", "advertisement"]
    : [element.kind];
}
export function pageTitle(page: CatalogPage, edits: Edits): string {
  const title = page.elements.find((element) => element.kind === "title");
  return title ? effectiveEdit(title, edits).text : page.title;
}
// Assign one focus target, without deleting the other page information.
export function markMain(
  page: CatalogPage,
  edits: Edits,
  id: string,
  active: boolean,
): Edits {
  return Object.fromEntries(
    page.elements.map((element) => {
      const edit = effectiveEdit(element, edits);
      return [
        element.id,
        {
          ...edit,
          main: active
            ? element.id === id
            : element.id === id
              ? false
              : edit.main,
        },
      ];
    }),
  );
}
export function changed(draft: Edits, published: Edits): boolean {
  return JSON.stringify(draft) !== JSON.stringify(published);
}
export function searchPages(
  pages: CatalogPage[],
  query: string,
): CatalogPage[] {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  const terms = normalize(query)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split(/\s+/)
    .filter(Boolean);
  return pages.filter((page) =>
    terms.every((term) =>
      normalize(
        `${page.title} ${page.address} ${page.topic} ${page.summary}`,
      ).includes(term),
    ),
  );
}
export function publicationIssues(page: CatalogPage, edits: Edits): string[] {
  const visible = page.elements.filter(
    (element) => !effectiveEdit(element, edits).hidden,
  );
  const issues: string[] = [];
  const title = page.elements.find((element) => element.kind === "title");
  if (
    title &&
    (effectiveEdit(title, edits).hidden ||
      !effectiveEdit(title, edits).text.trim())
  )
    issues.push("Mantenha um título para identificar a página.");
  if (
    visible.filter((element) => effectiveEdit(element, edits).main).length > 1
  )
    issues.push(
      "Escolha apenas um elemento como conteúdo principal da página.",
    );
  if (!visible.length) issues.push("Mantenha ao menos um elemento na página.");
  for (const element of visible) {
    const edit = effectiveEdit(element, edits);
    if (!allowedKinds(element).includes(edit.kind))
      issues.push(
        `A classificação de “${element.text}” não é compatível com seu conteúdo.`,
      );
    if (!edit.text.trim())
      issues.push(`Preencha o texto ou a legenda de “${element.text}”.`);
    if ((element.kind === "image" || element.illustration) && !edit.alt.trim())
      issues.push(`Descreva a informação da imagem “${element.text}”.`);
  }
  return issues;
}

// Only known fixture pages/elements and compatible classifications are accepted.
// No HTML, remote asset URL or executable markup enters the rendering pipeline.
export function parseState(raw: string, pages: CatalogPage[]): CatalogState {
  if (raw.length > 250_000) throw new Error("Cópia local acima do limite.");
  const schema = z
    .object({
      version: z.literal(1),
      pages: z.record(
        z.string(),
        z
          .object({
            draft: z.record(z.string(), editSchema),
            published: z.record(z.string(), editSchema),
          })
          .strict(),
      ),
    })
    .strict();
  const state = schema.parse(JSON.parse(raw));
  if (Object.keys(state.pages).length !== pages.length)
    throw new Error("Catálogo incompatível.");
  for (const [id, value] of Object.entries(state.pages)) {
    const page = pages.find((item) => item.id === id);
    if (!page) throw new Error("Página desconhecida.");
    for (const edits of [value.draft, value.published])
      for (const [elementId, edit] of Object.entries(edits)) {
        const element = page.elements.find((item) => item.id === elementId);
        if (!element || !allowedKinds(element).includes(edit.kind))
          throw new Error("Elemento incompatível.");
      }
    if (publicationIssues(page, value.published).length)
      throw new Error("Leitura salva incompleta.");
  }
  return state;
}

export function loadState(
  pages: CatalogPage[],
  initial: CatalogState,
): { state: CatalogState; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return {
      state: raw ? parseState(raw, pages) : structuredClone(initial),
      error: "",
    };
  } catch {
    return {
      state: structuredClone(initial),
      error:
        "Não foi possível recuperar a cópia local. O catálogo de demonstração foi aberto sem substituir seus dados. As alterações feitas agora continuarão apenas nesta aba.",
    };
  }
}
