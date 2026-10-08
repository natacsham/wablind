import { useEffect, useRef, useState, type FormEvent } from "react";
import { searchPages, type CatalogPage } from "./model";

export function Search({ pages }: { pages: CatalogPage[] }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(-1);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const results = searchPages(pages, query);
  const open = expanded && query.trim().length > 0 && results.length > 0;
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setMessage(
          query.trim()
            ? `${results.length} página${results.length === 1 ? "" : "s"} encontrada${results.length === 1 ? "" : "s"} no catálogo.`
            : "",
        ),
      250,
    );
    return () => clearTimeout(timer);
  }, [query, results.length]);
  function navigate(id: string) {
    location.hash = `/pagina/${id}`;
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) {
      setMessage("Digite o nome ou o endereço de uma página do catálogo.");
      input.current?.focus();
      return;
    }
    if (results.length === 1) navigate(results[0].id);
    else {
      setExpanded(true);
      input.current?.focus();
      setMessage(
        results.length
          ? "Escolha uma das sugestões. Use as setas e Enter ou clique no resultado."
          : "Nenhuma página encontrada. Experimente água ou biblioteca. A busca consulta apenas este catálogo.",
      );
    }
  }
  return (
    <>
      <section className="search-hero" aria-labelledby="search-title">
        <h1 id="search-title">Encontre uma página</h1>
        <form
          role="search"
          aria-label="Buscar no catálogo"
          onSubmit={submit}
          className="catalog-search"
        >
          <label htmlFor="page-search">Nome ou endereço da página</label>
          <div className="search-line">
            <div className="search-input-shell">
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                aria-hidden="true"
                focusable="false"
              >
                <circle
                  cx="10"
                  cy="10"
                  r="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="m15 15 5 5" stroke="currentColor" strokeWidth="2" />
              </svg>
              <input
                ref={input}
                id="page-search"
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls="page-suggestions"
                aria-activedescendant={
                  open && active >= 0
                    ? `suggestion-${results[active]?.id}`
                    : undefined
                }
                aria-describedby="search-hint"
                autoComplete="off"
                value={query}
                placeholder="Ex.: água, biblioteca ou aprender.example…"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(-1);
                  setExpanded(true);
                }}
                onFocus={() => setExpanded(true)}
                onBlur={() => {
                  setExpanded(false);
                  setActive(-1);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setExpanded(false);
                    setActive(-1);
                  }
                  if (
                    results.length &&
                    query.trim() &&
                    ["ArrowDown", "ArrowUp"].includes(event.key)
                  ) {
                    event.preventDefault();
                    setExpanded(true);
                    setActive((current) =>
                      event.key === "ArrowDown"
                        ? (current + 1) % results.length
                        : current <= 0
                          ? results.length - 1
                          : current - 1,
                    );
                  }
                  if (
                    event.key === "Enter" &&
                    open &&
                    active >= 0 &&
                    results[active]
                  ) {
                    event.preventDefault();
                    navigate(results[active].id);
                  }
                }}
              />
            </div>
            <button className="primary" type="submit">
              Buscar
            </button>
          </div>
          <ul
            id="page-suggestions"
            role="listbox"
            aria-label="Páginas encontradas"
            className="suggestions"
            hidden={!open}
          >
            {results.map((page, index) => (
              <li
                id={`suggestion-${page.id}`}
                key={page.id}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => navigate(page.id)}
              >
                <strong>{page.title}</strong>
                <span>{page.address.replace("https://", "")}</span>
              </li>
            ))}
          </ul>
          <p id="search-hint" className="hint">
            Digite para ver as páginas disponíveis nesta demonstração.
          </p>
          <p className="search-status" role="status">
            {message}
          </p>
        </form>
      </section>
      <nav className="available-pages" aria-label="Páginas disponíveis">
        <p>Páginas disponíveis</p>
        <ul>
          {pages.map((page) => (
            <li key={page.id}>
              <a href={`#/pagina/${page.id}`}>{page.title}</a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
