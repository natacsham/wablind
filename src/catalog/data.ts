import { originalEdit, type CatalogPage, type CatalogState } from "./model";
import { withWebsiteLayout } from "./fixtures";

/** Authored, fictional examples. The .example addresses are identifiers, never fetched. */
const originalPages: CatalogPage[] = [
  {
    id: "caminho-da-agua",
    title: "O caminho da água",
    address: "https://aprender.example/caminho-da-agua",
    topic: "Ciências",
    summary: "Explore a relação entre o rio, o vapor e a chuva.",
    elements: [
      {
        id: "navigation",
        kind: "menu",
        text: "Nesta página",
        links: [
          { text: "O ciclo da água", target: "diagram" },
          { text: "Etapas", target: "steps-title" },
          { text: "Atividade", target: "activity" },
        ],
      },
      {
        id: "intro",
        kind: "paragraph",
        text: "A água circula entre rios, solo e atmosfera. Observe o esquema e acompanhe as etapas para compreender esse percurso.",
      },
      {
        id: "diagram",
        kind: "image",
        illustration: "water",
        text: "Um percurso que se repete",
        alt: "Esquema do ciclo da água: rio, vapor, nuvens e chuva.",
      },
      { id: "steps-title", kind: "paragraph", text: "Etapas do percurso" },
      {
        id: "steps",
        kind: "list",
        text: "Do rio à chuva",
        items: [
          "A energia do Sol favorece a evaporação da água.",
          "O vapor se resfria e se condensa em gotículas, formando nuvens.",
          "A água retorna à superfície como precipitação.",
          "Parte infiltra no solo e parte escoa até os rios.",
        ],
      },
      {
        id: "activity",
        kind: "paragraph",
        text: "Explique como a água de um rio pode voltar a ele depois de passar pela atmosfera.",
      },
      {
        id: "promo",
        kind: "notice",
        text: "Espaço demonstrativo de anúncio. Este aviso fictício pode ser retirado da leitura.",
      },
    ],
  },
  {
    id: "agua-em-numeros",
    title: "Água em números",
    address: "https://aprender.example/agua-em-numeros",
    topic: "Dados e comparações",
    summary: "Compare o consumo de água em três meses, com gráfico e tabela.",
    elements: [
      {
        id: "navigation",
        kind: "menu",
        text: "Nesta página",
        links: [
          { text: "Gráfico", target: "chart" },
          { text: "Valores", target: "table-title" },
          { text: "Comparação", target: "comparison" },
        ],
      },
      {
        id: "intro",
        kind: "paragraph",
        text: "Uma escola fictícia registrou seu consumo mensal de água. Os valores são inventados para esta demonstração e estão expressos em metros cúbicos (m³).",
      },
      {
        id: "chart",
        kind: "image",
        illustration: "chart",
        text: "Consumo mensal da escola",
        alt: "Gráfico de barras: março, 18 m³; abril, 12 m³; maio, 15 m³.",
      },
      { id: "table-title", kind: "paragraph", text: "Consulte os valores" },
      {
        id: "table",
        kind: "table",
        text: "Consumo de água por mês",
        columns: ["Mês", "Consumo (m³)"],
        rows: [
          ["Março", "18"],
          ["Abril", "12"],
          ["Maio", "15"],
        ],
      },
      {
        id: "comparison",
        kind: "paragraph",
        text: "Qual mês teve o menor consumo? Qual é a diferença entre março e abril? Consulte os valores antes de explicar sua comparação.",
      },
      {
        id: "promo",
        kind: "notice",
        text: "Aviso fictício: acompanhe outras notícias da escola. Não contém informação necessária para comparar os dados.",
      },
    ],
  },
  {
    id: "biblioteca-do-bairro",
    title: "Biblioteca do bairro",
    address: "https://bairro.example/biblioteca",
    topic: "Informação e serviços",
    summary:
      "Encontre horários e orientações para uma visita a uma biblioteca fictícia.",
    elements: [
      {
        id: "navigation",
        kind: "menu",
        text: "Nesta página",
        links: [
          { text: "Entrada", target: "entrance" },
          { text: "Horários", target: "hours-title" },
          { text: "Visita", target: "visit" },
        ],
      },
      {
        id: "intro",
        kind: "paragraph",
        text: "A Biblioteca das Palmeiras é um lugar fictício, criado para demonstrar a preparação de páginas. Não se trata de um serviço em funcionamento.",
      },
      {
        id: "entrance",
        kind: "image",
        illustration: "library",
        text: "Entrada da biblioteca fictícia",
        alt: "Fachada com entrada central e uma rampa de acesso à direita.",
      },
      { id: "hours-title", kind: "paragraph", text: "Horários de atendimento" },
      {
        id: "hours",
        kind: "table",
        text: "Horários fictícios",
        columns: ["Dias", "Atendimento"],
        rows: [
          ["Segunda a sexta", "9h às 18h"],
          ["Sábado", "9h às 13h"],
          ["Domingo", "Fechada"],
        ],
      },
      {
        id: "visit",
        kind: "list",
        text: "Antes de visitar",
        items: [
          "Confira o horário desejado na tabela.",
          "Escolha se deseja ler no local ou consultar o acervo.",
          "Solicite à equipe informações sobre formas de acesso ao conteúdo.",
        ],
      },
      {
        id: "promo",
        kind: "notice",
        text: "Banner fictício de divulgação. Pode ser removido para esta leitura.",
      },
    ],
  },
];

export const pages = originalPages.map(withWebsiteLayout);

export function initialCatalog(): CatalogState {
  return {
    version: 1,
    pages: Object.fromEntries(
      pages.map((page) => {
        const prepared = Object.fromEntries(
          page.elements.map((element) => [
            element.id,
            {
              ...originalEdit(element),
              kind:
                element.kind === "paragraph" && element.id.endsWith("-title")
                  ? ("heading" as const)
                  : element.kind,
              hidden: element.id === "promo",
            },
          ]),
        );
        if (page.id === "caminho-da-agua")
          prepared.diagram.description =
            "As setas representam o percurso: água do rio → vapor → nuvens → chuva → solo e rio. O esquema mostra relações entre etapas; não representa distâncias nem tempo de duração.";
        if (page.id === "agua-em-numeros")
          prepared.chart.description =
            "Março apresenta o maior consumo e abril, o menor. A redução de março para abril é de 6 m³. A tabela permite consultar cada valor sem depender da altura das barras.";
        return [
          page.id,
          {
            draft: structuredClone(prepared),
            published: structuredClone(prepared),
          },
        ];
      }),
    ),
  };
}
