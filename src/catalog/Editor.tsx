import { useRef, useState } from "react";
import {
  allowedKinds,
  changed,
  effectiveEdit,
  kinds,
  markers,
  markMain,
  originalEdit,
  publicationIssues,
  pageTitle,
  type CatalogPage,
  type Edit,
  type Edits,
  type Kind,
  type Marker,
  type PageState,
} from "./model";
import { PageContent } from "./PageContent";
import "./inspector.css";

// The rendered page is the selection surface, not a list of editable cards.
export function Editor({
  page,
  state,
  update,
  announce,
}: {
  page: CatalogPage;
  state: PageState;
  update: (state: PageState, requireStorage?: boolean) => boolean;
  announce: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [showRemoved, setShowRemoved] = useState(false);
  const [undo, setUndo] = useState<Edits | null>(null);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const issueBox = useRef<HTMLDivElement>(null);
  const selectControl = useRef<HTMLSelectElement>(null);
  const element = page.elements.find((item) => item.id === selected);
  const edit = element ? effectiveEdit(element, state.draft) : null;
  const pending = changed(state.draft, state.published);
  const removed = page.elements.filter(
    (item) => effectiveEdit(item, state.draft).hidden,
  );
  function select(id: string) {
    setSelected(id);
    requestAnimationFrame(() => panelHeading.current?.focus());
  }
  function close() {
    const id = selected;
    setSelected(null);
    requestAnimationFrame(() => {
      const button = document.querySelector<HTMLButtonElement>(
        `[data-element="${id}"] .inspect-target`,
      );
      (button ?? selectControl.current)?.focus();
    });
  }
  function replace(draft: Edits) {
    setUndo(structuredClone(state.draft));
    update({ ...state, draft });
    setIssues([]);
  }
  function change(patch: Partial<Edit>) {
    if (!element || !edit) return;
    replace({ ...state.draft, [element.id]: { ...edit, ...patch } });
  }
  function remove() {
    if (!element || !edit) return;
    const index = page.elements.findIndex((item) => item.id === element.id);
    change({ hidden: true, main: false });
    setSelected(null);
    announce(
      "Elemento excluído da leitura. Você pode desfazer ou recuperá-lo em Excluídos.",
    );
    requestAnimationFrame(() => {
      const visible = [
        ...page.elements.slice(index + 1),
        ...page.elements.slice(0, index),
      ].find((item) => !effectiveEdit(item, state.draft).hidden);
      const button = document.querySelector<HTMLButtonElement>(
        `[data-element="${visible?.id}"] .inspect-target`,
      );
      (button ?? selectControl.current)?.focus();
    });
  }
  function save() {
    const found = publicationIssues(page, state.draft);
    setIssues(found);
    if (found.length) {
      requestAnimationFrame(() => issueBox.current?.focus());
      return;
    }
    if (update({ ...state, published: structuredClone(state.draft) }, true)) {
      setUndo(null);
      announce(
        "Página salva neste navegador. A leitura da busca foi atualizada.",
      );
    }
  }
  return (
    <div className="inspector-workspace">
      <div className="inspector-bar">
        <a href="#/gestao">← Páginas</a>
        <span className="inspector-page-name">
          {pageTitle(page, state.draft)}
        </span>
        <a href={`#/previa/${page.id}`}>Ver leitura</a>
        <button className="primary" onClick={save} disabled={!pending}>
          Salvar
        </button>
      </div>
      <div className="inspector-tools">
        <p id="inspection-help">
          Passe o mouse e clique no elemento que deseja marcar. Pelo teclado,
          use Tab e Enter.
        </p>
        <div className="inspector-shortcuts">
          <label className="sr-only" htmlFor="element-select">
            Selecionar elemento
          </label>
          <select
            id="element-select"
            ref={selectControl}
            value={selected ?? ""}
            onChange={(event) =>
              event.target.value && select(event.target.value)
            }
          >
            <option value="">Selecionar elemento…</option>
            {page.elements
              .filter((item) => !effectiveEdit(item, state.draft).hidden)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {kinds[effectiveEdit(item, state.draft).kind]}:{" "}
                  {item.text.slice(0, 60)}
                </option>
              ))}
          </select>
          <button
            onClick={() => {
              if (undo) {
                update({ ...state, draft: undo });
                setUndo(null);
                setIssues([]);
                announce("Última alteração desfeita.");
              }
            }}
            disabled={!undo}
          >
            Desfazer
          </button>
          <button
            aria-expanded={showRemoved}
            aria-controls="removed-elements"
            onClick={() => setShowRemoved(!showRemoved)}
          >
            Excluídos ({removed.length})
          </button>
        </div>
      </div>
      <p className="inspector-save-note">
        Prévia local ·{" "}
        {pending
          ? "Alterações ainda não aplicadas à leitura."
          : "Leitura salva."}{" "}
        O compartilhamento online ainda não está conectado.
      </p>
      {issues.length > 0 && (
        <div className="error-box" role="alert" ref={issueBox} tabIndex={-1}>
          <h2>Revise antes de salvar</h2>
          <ul>
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      <div
        id="removed-elements"
        hidden={!showRemoved}
        className="removed-elements"
      >
        <h2>Elementos excluídos</h2>
        {removed.length ? (
          <ul>
            {removed.map((item) => (
              <li key={item.id}>
                <span>{effectiveEdit(item, state.draft).text}</span>
                <button
                  onClick={() => {
                    replace({
                      ...state.draft,
                      [item.id]: {
                        ...effectiveEdit(item, state.draft),
                        hidden: false,
                      },
                    });
                    select(item.id);
                    announce("Elemento incluído novamente.");
                  }}
                >
                  Restaurar<span className="sr-only"> {item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum elemento excluído.</p>
        )}
      </div>
      <div className={`inspector-layout${element ? " has-selection" : ""}`}>
        {element && edit && (
          <aside
            className="inspector-panel"
            aria-labelledby="inspector-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                close();
              }
            }}
          >
            <div className="inspector-panel-heading">
              <h2 id="inspector-title" ref={panelHeading} tabIndex={-1}>
                Elemento selecionado
              </h2>
              <button
                className="inspector-close"
                aria-label="Fechar opções do elemento"
                onClick={close}
              >
                ×
              </button>
            </div>
            <p className="inspector-excerpt">{edit.text.slice(0, 110)}</p>
            <label htmlFor="element-kind">Classificar como</label>
            <select
              id="element-kind"
              value={edit.kind}
              onChange={(event) => change({ kind: event.target.value as Kind })}
            >
              {allowedKinds(element).map((kind) => (
                <option value={kind} key={kind}>
                  {kinds[kind]}
                </option>
              ))}
            </select>
            <label className="inspector-check main-check">
              <input
                type="checkbox"
                checked={edit.main}
                onChange={(event) => {
                  replace(
                    markMain(
                      page,
                      state.draft,
                      element.id,
                      event.target.checked,
                    ),
                  );
                  announce(
                    event.target.checked
                      ? "Conteúdo principal definido. A leitura terá um acesso direto a este elemento."
                      : "Marcação de conteúdo principal retirada.",
                  );
                }}
              />
              Conteúdo principal da página
            </label>
            <fieldset className="inspector-markers">
              <legend>Marcações</legend>
              {(Object.entries(markers) as [Marker, string][]).map(
                ([key, label]) => (
                  <label key={key} className="inspector-check">
                    <input
                      type="checkbox"
                      checked={edit.markers.includes(key)}
                      onChange={(event) =>
                        change({
                          markers: event.target.checked
                            ? [...edit.markers, key]
                            : edit.markers.filter((item) => item !== key),
                        })
                      }
                    />
                    {label}
                  </label>
                ),
              )}
            </fieldset>
            {element.kind === "title" && (
              <>
                <label htmlFor="page-title-text">Título da página</label>
                <input
                  id="page-title-text"
                  maxLength={200}
                  value={edit.text}
                  onChange={(event) => change({ text: event.target.value })}
                />
              </>
            )}
            {(element.kind === "image" || element.illustration) && (
              <>
                <label htmlFor="element-alt">Descrição da imagem</label>
                <textarea
                  id="element-alt"
                  rows={3}
                  maxLength={1000}
                  value={edit.alt}
                  onChange={(event) => change({ alt: event.target.value })}
                />
              </>
            )}
            <details key={element.id} className="inspector-details">
              <summary>Texto e descrição</summary>
              {element.kind !== "title" && (
                <>
                  <label htmlFor="element-text">
                    {["image", "table", "list", "menu"].includes(element.kind)
                      ? "Legenda ou título"
                      : "Texto"}
                  </label>
                  <textarea
                    id="element-text"
                    rows={3}
                    maxLength={8000}
                    value={edit.text}
                    onChange={(event) => change({ text: event.target.value })}
                  />
                </>
              )}
              <label htmlFor="element-description">
                Descrição complementar
              </label>
              <textarea
                id="element-description"
                rows={3}
                maxLength={4000}
                value={edit.description}
                onChange={(event) =>
                  change({ description: event.target.value })
                }
              />
              <label htmlFor="element-tag">Outra etiqueta</label>
              <input
                id="element-tag"
                maxLength={60}
                value={edit.tag}
                onChange={(event) => change({ tag: event.target.value })}
              />
            </details>
            <div className="inspector-bottom-actions">
              <button className="inspector-delete" onClick={remove}>
                Excluir elemento
              </button>
              <button
                className="text-button"
                onClick={() => {
                  change(originalEdit(element));
                  announce(
                    "Marcações deste elemento restauradas para a origem.",
                  );
                }}
              >
                Restaurar original
              </button>
            </div>
          </aside>
        )}
        <section
          className="inspector-canvas"
          aria-label="Página em edição"
          aria-describedby="inspection-help"
        >
          <PageContent
            page={page}
            edits={state.draft}
            inspection={{ selected, select }}
          />
        </section>
      </div>
    </div>
  );
}
