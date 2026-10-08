import { useState, type FormEvent } from "react";
import { changed, type CatalogPage, type CatalogState } from "./model";
import { Icon } from "./Icon";

export function Management({
  pages,
  catalog,
}: {
  pages: CatalogPage[];
  catalog: CatalogState;
}) {
  const [selectedId, setSelectedId] = useState("");
  const selected = pages.find((page) => page.id === selectedId);

  function openEditor(event: FormEvent) {
    event.preventDefault();
    if (selected) location.hash = `/editar/${selected.id}`;
  }

  return (
    <section className="management" aria-labelledby="management-title">
      <h1 id="management-title">Área do professor</h1>
      <p className="management-intro">
        Escolha a página para marcar, descrever ou remover seus elementos.
      </p>
      <form onSubmit={openEditor}>
        <label htmlFor="managed-page">Página para editar</label>
        <div className="management-picker">
          <select
            id="managed-page"
            value={selectedId}
            required
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">Selecione uma página</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>
          <button className="primary" type="submit">
            <Icon name="edit" />
            Editar página
          </button>
        </div>
      </form>
      {selected && (
        <div className="page-selection">
          <p className="source-address">{selected.address}</p>
          <p className="hint">
            {changed(
              catalog.pages[selected.id].draft,
              catalog.pages[selected.id].published,
            )
              ? "Há alterações no rascunho ainda não salvas para leitura."
              : "A versão salva está disponível na busca."}
          </p>
          <a href={`#/pagina/${selected.id}`}>
            <Icon name="book" />
            Ver leitura de {selected.title}
          </a>
        </div>
      )}
      <p className="management-note">
        Sem login. As alterações são salvas só neste navegador.
      </p>
    </section>
  );
}
