import type { CatalogPage, Element } from "./model";

const sites = {
  "caminho-da-agua": {
    name: "horizonte.",
    strap: "Ciência, ambiente e cotidiano",
    theme: "science",
    image: "river",
    imageText: "Um rio atravessa a paisagem",
    imageAlt: "Ilustração de um rio sinuoso entre árvores e morros, sob o sol.",
    banner: "Semana do Meio Ambiente • Descobertas para fazer em casa",
    section: "AMBIENTE / CIÊNCIA NO DIA A DIA",
    related: "O que acontece entre uma chuva e outra?",
  },
  "agua-em-numeros": {
    name: "Observatório Local",
    strap: "Dados que ajudam a compreender a cidade",
    theme: "data",
    image: "classroom",
    imageText: "Informação para acompanhar o consumo",
    imageAlt:
      "Ilustração de uma escola com janelas, árvores e um reservatório de água.",
    banner: "Feira de Ciências • Ideias que transformam a escola",
    section: "INDICADORES / ÁGUA E CONSUMO",
    related: "Aprenda a comparar números com contexto",
  },
  "biblioteca-do-bairro": {
    name: "Jornal das Palmeiras",
    strap: "Cultura, serviços e histórias do bairro",
    theme: "community",
    image: "books",
    imageText: "Um espaço para descobrir novas leituras",
    imageAlt:
      "Ilustração de livros coloridos numa estante, um livro aberto e uma luminária.",
    banner: "Circuito de Leitura • Histórias para todas as idades",
    section: "SERVIÇOS / CULTURA",
    related: "Prepare sua visita à biblioteca",
  },
} as const;

/** Own-authored website fixtures. Stable element IDs preserve earlier local annotations. */
export function withWebsiteLayout(page: CatalogPage): CatalogPage {
  const site = sites[page.id as keyof typeof sites];
  const navigation = page.elements.find(
    (element) => element.id === "navigation",
  )!;
  const content = page.elements.filter(
    (element) => element.id !== "navigation",
  );
  const opening: Element[] = [
    {
      id: "site-brand",
      kind: "paragraph",
      text: site.name,
      area: "header",
      appearance: "brand",
    },
    {
      id: "site-description",
      kind: "paragraph",
      text: site.strap + " · site fictício",
      area: "header",
      appearance: "metadata",
    },
    { ...navigation, area: "header" },
    {
      id: "top-banner",
      kind: "advertisement",
      text: site.banner,
      illustration: "campaign",
      alt: "Composição ilustrada com folhas, livros e formas geométricas. Campanha fictícia.",
      area: "banner",
      appearance: "promotion",
    },
    {
      id: "article-section",
      kind: "paragraph",
      text: site.section,
      appearance: "metadata",
    },
    { id: "page-title", kind: "title", text: page.title },
    {
      id: "byline",
      kind: "paragraph",
      text: "Redação do portal · conteúdo demonstrativo · leitura de 4 minutos",
      appearance: "metadata",
    },
  ];
  const article = content.flatMap((element) =>
    element.id === "intro"
      ? [
          element,
          {
            id: "lead-image",
            kind: "image" as const,
            illustration: site.image,
            text: site.imageText,
            alt: site.imageAlt,
          },
        ]
      : [element],
  );
  const extras: Element[] = [
    {
      id: "related-heading",
      kind: "heading",
      text: "Explore também",
      area: "sidebar",
    },
    {
      id: "related-image",
      kind: "image",
      text: site.related,
      illustration: "books",
      alt: "Livros ilustrados, um deles aberto sobre uma mesa.",
      area: "sidebar",
    },
    {
      id: "related-navigation",
      kind: "menu",
      text: "Atalhos para a reportagem",
      links: navigation.links,
      area: "sidebar",
    },
    {
      id: "sidebar-ad",
      kind: "advertisement",
      text: "Estúdio Ipê · cadernos e ideias para o seu dia. Anúncio fictício, sem oferta comercial.",
      illustration: "campaign",
      alt: "Ilustração publicitária com livro, folhas e formas geométricas.",
      area: "sidebar",
      appearance: "promotion",
    },
    {
      id: "newsletter",
      kind: "notice",
      text: "Nosso boletim reúne novas histórias toda semana. Espaço demonstrativo, sem coleta de e-mail.",
      area: "sidebar",
    },
    {
      id: "footer-menu",
      kind: "menu",
      text: "Navegação do rodapé",
      area: "footer",
      links: [
        { text: "Início da matéria", target: "page-title" },
        { text: "Conteúdo", target: "intro" },
      ],
    },
    {
      id: "site-footer",
      kind: "paragraph",
      text:
        site.name +
        " · Site fictício criado para a demonstração ELIA. Textos, anúncios e ilustrações são próprios.",
      area: "footer",
      appearance: "metadata",
    },
  ];
  return {
    ...page,
    theme: site.theme,
    elements: [...opening, ...article, ...extras],
  };
}
