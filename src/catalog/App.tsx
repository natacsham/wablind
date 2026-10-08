import { useEffect, useRef, useState } from "react";
import { pages, initialCatalog } from "./data";
import {
  loadState,
  parseState,
  STORAGE_KEY,
  pageTitle,
  type CatalogState,
  type PageState,
} from "./model";
import { Search } from "./Search";
import { Management } from "./Management";
import { Editor } from "./Editor";
import { PageContent } from "./PageContent";
import { Icon } from "./Icon";
import "./catalog.css";

function routeNow() {
  return location.hash.replace(/^#\/?/, "").split("/");
}
const titles: Record<string, string> = {
  "": "Buscar páginas",
  gestao: "Gerenciar páginas",
  editar: "Preparar página",
  pagina: "Leitura",
  previa: "Prévia da leitura",
  sobre: "Sobre a demonstração",
};

export default function CatalogApp() {
  const [initial] = useState(() => loadState(pages, initialCatalog()));
  const [catalog, setCatalog] = useState<CatalogState>(initial.state);
  const [storageError, setStorageError] = useState(initial.error);
  const storageBlocked = useRef(Boolean(initial.error));
  const [route, setRoute] = useState(routeNow);
  const [status, setStatus] = useState("");
  const main = useRef<HTMLElement>(null);
  const page = pages.find((item) => item.id === route[1]);
  const section = route[0] || "";
  const publishedPages = pages.map((item) => ({
    ...item,
    title: pageTitle(item, catalog.pages[item.id].published),
  }));
  const currentTitle = page
    ? pageTitle(
        page,
        catalog.pages[page.id][
          ["editar", "previa"].includes(section) ? "draft" : "published"
        ],
      )
    : "";
  useEffect(() => {
    function hashChanged() {
      setRoute(routeNow());
      setStatus("");
      requestAnimationFrame(() => main.current?.focus());
    }
    window.addEventListener("hashchange", hashChanged);
    return () => window.removeEventListener("hashchange", hashChanged);
  }, []);
  useEffect(() => {
    document.title = `${currentTitle ? `${currentTitle} · ` : ""}${titles[section] || "Página não encontrada"} — ELIA`;
  }, [section, currentTitle]);
  useEffect(() => {
    function synchronize(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setCatalog(parseState(event.newValue, pages));
        setStatus(
          "A cópia local foi atualizada por outra aba deste navegador.",
        );
      } catch {
        storageBlocked.current = true;
        setStorageError(
          "Outra aba gravou dados incompatíveis. Suas alterações continuam apenas nesta aba, sem substituir aquela cópia.",
        );
      }
    }
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);
  function update(
    id: string,
    state: PageState,
    requireStorage = false,
  ): boolean {
    const next: CatalogState = {
      ...catalog,
      pages: { ...catalog.pages, [id]: state },
    };
    if (storageBlocked.current) {
      if (!requireStorage) setCatalog(next);
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setCatalog(next);
      setStorageError("");
      return true;
    } catch {
      if (!requireStorage) setCatalog(next);
      setStorageError(
        "O navegador não permitiu salvar. Suas alterações continuam apenas nesta aba e serão perdidas ao fechá-la.",
      );
      return false;
    }
  }
  return (
    <div className="site-shell">
      <a
        className="skip-link"
        href="#conteudo"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Ir para o conteúdo
      </a>
      <header className="site-header">
        <a className="brand" href="#/" aria-label="ELIA — início">
          <span className="brand-symbol" aria-hidden="true">
            <Icon name="book" />
          </span>
          <span>ELIA</span>
        </a>
        <nav aria-label="Principal">
          <a href="#/" aria-current={section === "" ? "page" : undefined}>
            <Icon name="search" />
            Buscar páginas
          </a>
          <a
            href="#/gestao"
            aria-current={
              ["gestao", "editar"].includes(section) ? "page" : undefined
            }
          >
            <Icon name="edit" />
            Área do professor
          </a>
          <a
            href="#/sobre"
            aria-current={section === "sobre" ? "page" : undefined}
          >
            <Icon name="info" />
            Sobre
          </a>
        </nav>
      </header>
      <main
        id="conteudo"
        className={`main-content${section === "editar" ? " wide" : ""}`}
        ref={main}
        tabIndex={-1}
      >
        {!["", "gestao", "editar"].includes(section) && (
          <p className="local-note">
            Prévia técnica: a edição compartilhada entre visitantes ainda não
            está conectada.
          </p>
        )}
        {storageError && (
          <p className="error-box" role="alert">
            {storageError}
          </p>
        )}
        <div className="app-status" role="status">
          {status}
        </div>
        {section === "" ? (
          <Search pages={publishedPages} />
        ) : section === "gestao" ? (
          <Management pages={publishedPages} catalog={catalog} />
        ) : section === "editar" && page ? (
          <Editor
            key={page.id}
            page={page}
            state={catalog.pages[page.id]}
            update={(value, requireStorage) =>
              update(page.id, value, requireStorage)
            }
            announce={setStatus}
          />
        ) : ["pagina", "previa"].includes(section) && page ? (
          <>
            <div className="reading-toolbar">
              <a href={section === "previa" ? `#/editar/${page.id}` : "#/"}>
                ← {section === "previa" ? "Voltar à edição" : "Voltar à busca"}
              </a>
            </div>
            {section === "previa" && (
              <p className="local-note">
                Prévia do rascunho. Para atualizar a busca, volte à edição e
                escolha “Salvar”.
              </p>
            )}
            <PageContent
              page={page}
              edits={
                catalog.pages[page.id][
                  section === "previa" ? "draft" : "published"
                ]
              }
            />
          </>
        ) : section === "sobre" ? (
          <article className="about-page">
            <p className="eyebrow">Protótipo de pesquisa</p>
            <h1>Da WABlind à ELIA</h1>
            <p className="about-lead">
              ELIA significa{" "}
              <strong>Edição e Leitura com Interação Acessível</strong>. O nome
              acompanha o propósito desta versão: preparar páginas com mediação
              humana e oferecer formas de localizar e ler seu conteúdo.
            </p>
            <h2>Uma história que permanece</h2>
            <p>
              WABlind é o nome histórico da ferramenta documentada nas
              publicações da pesquisa. ELIA nomeia esta reconstrução, sem
              renomear os estudos nem atribuir à versão atual os resultados das
              avaliações anteriores.
            </p>
            <p>
              Permanece a ideia central: o professor examina os elementos da
              página, classifica sua função, descreve informações visuais e
              retira o que não deve aparecer na leitura preparada.
            </p>
            <p>
              A ferramenta integra a trajetória do doutorado sobre o Arcabouço
              Multimodal para Acessibilidade Digital. Nessa trajetória, a
              preparação de páginas ajuda a examinar como pessoas, tarefas e
              representações do conteúdo se relacionam. ELIA não executa a
              ontologia MADO nem recebe automaticamente decisões do AgMADO.
            </p>
            <h2>Experimente em três passos</h2>
            <ol>
              <li>Na área do professor, abra uma das páginas fictícias.</li>
              <li>
                Selecione um elemento e ajuste sua classificação, descrição ou
                presença na leitura.
              </li>
              <li>
                Salve e abra a página pelo nome ou pelo endereço do catálogo.
              </li>
            </ol>
            <h2>O que esta versão faz</h2>
            <p>
              Esta é uma reconstrução demonstrativa do fluxo, não a execução do
              código histórico. Usa apenas materiais fictícios próprios: não
              captura sites externos, não pede conta e não coleta dados de
              estudantes.
            </p>
            <p>
              Rascunhos e leituras são guardados no armazenamento local do
              navegador. Não há sincronização entre dispositivos ou visitantes.
              O compartilhamento online entre visitantes está em preparação.
            </p>
            <h2>Acessibilidade e controle</h2>
            <p>
              Você pode pesquisar e editar com teclado. Títulos, tabelas e
              descrições têm estrutura para leitura por tecnologias assistivas.
              A descrição de uma imagem deve comunicar sua informação relevante;
              acrescentar um marcador ou vários formatos, por si só, não
              assegura acessibilidade.
            </p>
            <p>
              O protótipo exige JavaScript. A avaliação técnica não substitui
              testes com pessoas com deficiência e leitores de tela. Não há
              declaração de conformidade integral.
            </p>
            <h2>Busca por voz, com controle</h2>
            <p>
              Na busca, use “Falar” para dizer o nome de uma página. O microfone
              só é solicitado nessa ação. Use “Parar” para finalizar ou Escape
              para cancelar. O texto reconhecido aparece no campo para revisão;
              nenhuma página é aberta automaticamente. Digitar continua sendo
              uma alternativa completa, inclusive quando a voz não estiver
              disponível.
            </p>
            <p>
              O reconhecimento depende do navegador, da permissão do microfone
              e, em alguns navegadores, de conexão com um serviço externo. ELIA
              não grava áudio nem salva o termo de busca, mas o navegador pode
              enviar áudio ao seu provedor de reconhecimento. A escuta é
              encerrada ao sair da busca, ocultar a aba ou atingir o limite de
              uma tentativa.
            </p>
            <h2>Pesquisa e desenvolvimento</h2>
            <p>
              <a
                href="https://doi.org/10.5753/cbie.sbie.2018.1153"
                rel="noreferrer"
              >
                Artigo sobre a WABlind e sua avaliação de comunicabilidade
              </a>
              . Resultados históricos não são atribuídos a esta interface.
            </p>
            <p>
              <a href="https://github.com/natacsham/wablind" rel="noreferrer">
                Código-fonte e documentação no GitHub
              </a>
            </p>
            <p>Versão 3.1.0-demo.1 · Desenvolvido por Natacsha Melo.</p>
          </article>
        ) : (
          <section className="page-heading">
            <h1>Página não encontrada</h1>
            <p>Escolha uma das páginas disponíveis no catálogo.</p>
            <a href="#/">Voltar à busca</a>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <p>
          ELIA <span aria-hidden="true">/</span> Demonstração de pesquisa
        </p>
        <p>
          Páginas fictícias. Edição local, sem cadastro.{" "}
          <a href="#/sobre">Entenda o projeto</a>
        </p>
      </footer>
    </div>
  );
}
