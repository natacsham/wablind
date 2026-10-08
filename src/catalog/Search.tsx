import { useEffect, useRef, useState, type FormEvent } from "react";
import { searchPages, type CatalogPage } from "./model";
import { Icon } from "./Icon";
import { useVoiceSearch } from "./useVoiceSearch";

export function Search({ pages }: { pages: CatalogPage[] }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(-1);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const voice = useVoiceSearch((text) => {
    setQuery(text);
    setActive(-1);
    setExpanded(true);
    requestAnimationFrame(() => input.current?.focus());
  });
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
    voice.cancel();
    location.hash = `/pagina/${id}`;
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    voice.cancel();
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
              <Icon name="search" />
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
                maxLength={200}
                value={query}
                placeholder="Ex.: água, biblioteca ou aprender.example…"
                onChange={(event) => {
                  voice.cancel();
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
            <button
              className={`voice-button${voice.busy ? " is-listening" : ""}`}
              type="button"
              onClick={voice.busy ? voice.stop : voice.start}
              disabled={!voice.supported || voice.phase === "stopping"}
              aria-describedby="voice-note"
            >
              <Icon name={voice.busy ? "stop" : "mic"} />
              {voice.phase === "stopping"
                ? "Encerrando"
                : voice.busy
                  ? "Parar"
                  : "Falar"}
            </button>
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
            Digite{voice.supported ? " ou fale" : ""} o nome para ver as páginas
            disponíveis.
          </p>
          <p id="voice-note" className="voice-note">
            {voice.supported
              ? "Ao usar o microfone, o navegador pode enviar áudio ao serviço de reconhecimento. O ELIA não grava o áudio."
              : "Busca por voz indisponível neste navegador. Você pode digitar normalmente."}
          </p>
          <p className="voice-status" role="status">
            {voice.message}
          </p>
          {voice.provisional && (
            <p className="voice-preview">Ouvindo: {voice.provisional}</p>
          )}
          <p className="search-status" role="status">
            {voice.busy ? "" : message}
          </p>
        </form>
      </section>
      <nav className="available-pages" aria-label="Páginas disponíveis">
        <p>Páginas disponíveis</p>
        <ul>
          {pages.map((page) => (
            <li key={page.id}>
              <a href={`#/pagina/${page.id}`}>
                <Icon name="book" />
                {page.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
