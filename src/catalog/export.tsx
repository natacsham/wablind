import { renderToStaticMarkup } from "react-dom/server";
import { PageContent } from "./PageContent";
import { pageTitle, type CatalogPage, type Edits } from "./model";

const portableStyle = `:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f5f6f3;color:#182c28;font:1.125rem/1.65 system-ui,sans-serif}main{max-width:52rem;margin:2rem auto;padding:clamp(1rem,4vw,3rem);background:#fff}h1{font-size:2rem;line-height:1.2}h2{font-size:1.4rem}p,li{overflow-wrap:anywhere}figure{margin:0}svg{width:100%;height:auto}figcaption,.eyebrow,.document-credit{font-size:.95rem;color:#40574f}.document-element{margin:1.6rem 0}.element-description{border-left:3px solid #286453;padding-left:1rem}.description-label{font-weight:700}table{border-collapse:collapse;width:100%}th,td{border:1px solid #70877f;padding:.65rem;text-align:left}caption{text-align:left;font-weight:700;margin-bottom:.5rem}.skip{position:absolute;left:-10000px}.skip:focus{position:static}a{color:#175646}:focus-visible{outline:3px solid #9a4a19;outline-offset:4px}.element-tag{font-weight:700}.page-notice{padding:1rem;background:#f1f3f0}@media print{body{background:white}main{margin:0;padding:0}figure,table{break-inside:avoid}}`;

export function exportPage(
  page: CatalogPage,
  edits: Edits,
  pageStyles = "",
): string {
  return (
    "<!doctype html>" +
    renderToStaticMarkup(
      <html lang="pt-BR">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="referrer" content="no-referrer" />
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"
          />
          <title>{`${pageTitle(page, edits)} — ELIA`}</title>
          <style>{portableStyle + pageStyles}</style>
        </head>
        <body>
          <a className="skip" href="#conteudo">
            Ir para o conteúdo
          </a>
          <main id="conteudo" tabIndex={-1}>
            <PageContent page={page} edits={edits} />
          </main>
        </body>
      </html>,
    )
  );
}
