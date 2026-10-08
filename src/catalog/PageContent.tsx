import type { MouseEvent } from "react";
import { EditorialArtwork } from "./EditorialArtwork";
import {
  effectiveEdit,
  kinds,
  markers,
  type CatalogPage,
  type Edit,
  type Element,
  type Edits,
} from "./model";

function followAnchor(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "center" });
}

export function Illustration({
  type,
  alt,
}: {
  type: Element["illustration"];
  alt: string;
}) {
  return (
    <svg
      viewBox="0 0 600 240"
      role="img"
      aria-label={alt}
      className="page-illustration"
      focusable="false"
    >
      <rect width="600" height="240" rx="6" fill="#eaf1ee" />
      {["river", "classroom", "books", "campaign"].includes(type ?? "") ? (
        <EditorialArtwork type={type} />
      ) : type === "water" ? (
        <>
          <circle cx="65" cy="51" r="24" fill="#b56924" />
          <path
            d="M0 198Q100 155 200 198T400 198T600 198V240H0Z"
            fill="#236e83"
          />
          <path
            d="M210 82q-21-32 14-42 18-28 44-6 37-13 43 20 31 33-11 36H232Z"
            fill="white"
            stroke="#294b45"
            strokeWidth="3"
          />
          <path
            d="M149 172V90m-9 13 9-13 9 13M352 102v66m-9-13 9 13 9-13"
            fill="none"
            stroke="#294b45"
            strokeWidth="4"
          />
          <text x="67" y="144" fill="#163d38" fontSize="19">
            vapor
          </text>
          <text x="374" y="144" fill="#163d38" fontSize="19">
            chuva
          </text>
          <rect x="258" y="200" width="46" height="32" rx="5" fill="#236e83" />
          <text x="267" y="222" fill="white" fontSize="19">
            rio
          </text>
          <text x="222" y="119" fill="#163d38" fontSize="19">
            nuvens
          </text>
        </>
      ) : type === "chart" ? (
        <>
          <path
            d="M65 30V195H540"
            stroke="#294b45"
            strokeWidth="2"
            fill="none"
          />
          {[
            { x: 120, h: 126, label: "Março", value: 18 },
            { x: 270, h: 84, label: "Abril", value: 12 },
            { x: 420, h: 105, label: "Maio", value: 15 },
          ].map((item) => (
            <g key={item.label}>
              <rect
                x={item.x}
                y={195 - item.h}
                width="68"
                height={item.h}
                fill="#246759"
              />
              <text
                x={item.x + 34}
                y={184 - item.h}
                textAnchor="middle"
                fill="#173f37"
                fontSize="20"
              >
                {item.value} m³
              </text>
              <text
                x={item.x + 34}
                y="220"
                textAnchor="middle"
                fill="#173f37"
                fontSize="20"
              >
                {item.label}
              </text>
            </g>
          ))}
        </>
      ) : (
        <>
          <rect
            x="90"
            y="63"
            width="360"
            height="133"
            fill="#f7f5ef"
            stroke="#294b45"
            strokeWidth="3"
          />
          <rect x="220" y="116" width="70" height="80" fill="#246759" />
          <rect
            x="116"
            y="114"
            width="70"
            height="40"
            fill="#c5ddd7"
            stroke="#294b45"
            strokeWidth="2"
          />
          <rect
            x="332"
            y="114"
            width="70"
            height="40"
            fill="#c5ddd7"
            stroke="#294b45"
            strokeWidth="2"
          />
          <path
            d="M290 196h100l145 23H90"
            stroke="#294b45"
            strokeWidth="4"
            fill="none"
          />
          <text x="270" y="94" textAnchor="middle" fill="#173f37" fontSize="20">
            Biblioteca das Palmeiras
          </text>
        </>
      )}
    </svg>
  );
}

export function ElementContent({
  element,
  edit,
  inspecting = false,
  visibleIds,
}: {
  element: Element;
  edit: Edit;
  inspecting?: boolean;
  visibleIds?: Set<string>;
}) {
  return (
    <>
      {(edit.tag || edit.markers.some((marker) => marker !== "review")) && (
        <p className="element-tag">
          {[
            edit.tag,
            ...edit.markers
              .filter((marker) => marker !== "review")
              .map((marker) => markers[marker]),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {edit.kind === "title" ? (
        <h1>{edit.text}</h1>
      ) : edit.kind === "menu" ? (
        <nav className="page-menu" aria-label={edit.text}>
          <ul>
            {element.links
              ?.filter((link) => !visibleIds || visibleIds.has(link.target))
              .map((link) => (
                <li key={link.target}>
                  <a
                    href={`#page-element-${link.target}`}
                    tabIndex={inspecting ? -1 : undefined}
                    onClick={(event) =>
                      followAnchor(event, `page-element-${link.target}`)
                    }
                  >
                    {link.text}
                  </a>
                </li>
              ))}
          </ul>
        </nav>
      ) : edit.kind === "advertisement" ? (
        <aside className="page-ad" aria-label="Propaganda">
          <span className="ad-label">Publicidade · exemplo fictício</span>
          {element.illustration && (
            <Illustration type={element.illustration} alt={edit.alt} />
          )}
          <p>{edit.text}</p>
        </aside>
      ) : edit.kind === "heading" ? (
        <h2>{edit.text}</h2>
      ) : edit.kind === "image" ? (
        <figure>
          <Illustration
            type={element.illustration}
            alt={edit.alt || "Descrição desta imagem ainda não preenchida."}
          />
          <figcaption>{edit.text}</figcaption>
        </figure>
      ) : edit.kind === "list" ? (
        <>
          <p className="list-label">{edit.text}</p>
          <ul>
            {element.items?.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      ) : edit.kind === "table" ? (
        <div className="table-wrap">
          <table>
            <caption>{edit.text}</caption>
            <thead>
              <tr>
                {element.columns?.map((column, index) => (
                  <th key={index} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {element.rows?.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th scope="row" key={cellIndex}>
                        {cell}
                      </th>
                    ) : (
                      <td key={cellIndex}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={edit.kind === "notice" ? "page-notice" : undefined}>
          {edit.text}
        </p>
      )}
      {edit.description && (
        <div className="element-description">
          <p className="description-label">Descrição complementar</p>
          <p>{edit.description}</p>
        </div>
      )}
    </>
  );
}

export function PageContent({
  page,
  edits,
  inspection,
}: {
  page: CatalogPage;
  edits: Edits;
  inspection?: { selected: string | null; select: (id: string) => void };
}) {
  const visible = page.elements.filter(
    (element) => !effectiveEdit(element, edits).hidden,
  );
  const visibleIds = new Set(visible.map((element) => element.id));
  const mainElement = visible.find(
    (element) => effectiveEdit(element, edits).main,
  );
  function renderElement(element: Element) {
    const edit = effectiveEdit(element, edits);
    return (
      <div
        className={`document-element${inspection ? " inspectable" : ""}${inspection?.selected === element.id ? " inspecting-selected" : ""}${element.appearance ? " element-" + element.appearance : ""}`}
        key={element.id}
        id={`page-element-${element.id}`}
        data-element={element.id}
        tabIndex={-1}
        role={edit.main && !inspection ? "region" : undefined}
        aria-label={
          edit.main && !inspection ? "Conteúdo principal da página" : undefined
        }
      >
        <ElementContent
          element={element}
          edit={edit}
          inspecting={Boolean(inspection)}
          visibleIds={visibleIds}
        />
        {inspection && (
          <button
            type="button"
            className="inspect-target"
            aria-label={`Selecionar ${kinds[edit.kind]}: ${edit.text.slice(0, 90)}`}
            aria-pressed={inspection.selected === element.id}
            onClick={() => inspection.select(element.id)}
          >
            <span className="inspect-label" aria-hidden="true">
              {kinds[edit.kind]}
              {edit.main ? " · Conteúdo principal" : ""} · Selecionar
            </span>
          </button>
        )}
      </div>
    );
  }
  function area(name: Element["area"]) {
    return visible
      .filter((element) => (element.area ?? "article") === name)
      .map(renderElement);
  }
  const side = area("sidebar");
  return (
    <div
      className={`document-paper site-page theme-${page.theme ?? "science"}`}
    >
      <header className="page-masthead">{area("header")}</header>
      {mainElement && !inspection && (
        <a
          className="main-jump"
          href={`#page-element-${mainElement.id}`}
          onClick={(event) =>
            followAnchor(event, `page-element-${mainElement.id}`)
          }
        >
          Ir direto ao conteúdo principal
        </a>
      )}
      <div className="site-banner">{area("banner")}</div>
      <div className={`site-columns${side.length ? "" : " without-sidebar"}`}>
        <article className="site-article">{area("article")}</article>
        {side.length > 0 && (
          <aside
            className="site-sidebar"
            aria-label="Conteúdo complementar do site"
          >
            {side}
          </aside>
        )}
      </div>
      <footer className="page-site-footer">{area("footer")}</footer>
    </div>
  );
}
