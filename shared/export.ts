import { categories, documentSchema, inspectDocument, type Inline, type Block, type ReadingDocument } from './model';
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
function inline(parts: Inline[]) { return parts.map(p => {
  let s = escapeHtml(p.text);
  if (p.strong) s = `<strong>${s}</strong>`;
  if (p.emphasis) s = `<em>${s}</em>`;
  return p.href ? `<a href="${escapeHtml(p.href)}" rel="noreferrer">${s}</a>` : s;
}).join(''); }
export function renderBlock(b: Block, doc: ReadingDocument) {
  if (b.kind === 'heading') { const level = Math.min(6, Math.max(2, b.level)); return `<h${level}>${inline(b.content)}</h${level}>`; }
  if (b.kind === 'paragraph') return `<p>${inline(b.content)}</p>`;
  if (b.kind === 'quote') return `<blockquote><p>${inline(b.content)}</p></blockquote>`;
  if (b.kind === 'code') return `<pre><code>${inline(b.content)}</code></pre>`;
  if (b.kind === 'list') { const tag = b.ordered ? 'ol' : 'ul'; return `<${tag}>${b.items.map(i => `<li>${inline(i)}</li>`).join('')}</${tag}>`; }
  if (b.kind === 'table') return `<table><caption>${escapeHtml(b.caption || 'Tabela da fonte')}</caption><tbody>${b.rows.map(r => `<tr>${r.map(c => { const tag = c.header ? 'th' : 'td'; return `<${tag}${c.header && c.scope ? ` scope="${c.scope}"` : ''}${c.colspan ? ` colspan="${c.colspan}"` : ''}${c.rowspan ? ` rowspan="${c.rowspan}"` : ''}>${inline(c.content)}</${tag}>`; }).join('')}</tr>`).join('')}</tbody></table>`;
  if (b.kind !== 'image') return '';
  const description = doc.annotations.find(a => a.elementId === b.id && a.category === 'description')?.description ?? b.alt;
  return `<figure>${b.src ? `<img src="${escapeHtml(b.src)}" alt="${escapeHtml(description ?? '')}">` : b.illustration ? '<p>Ilustração demonstrativa: Sol, nuvem, rio e setas indicando evaporação e chuva.</p>' : '<p>Imagem não incorporada. Consulte a fonte original.</p>'}<figcaption>${escapeHtml(b.caption)}${description === null ? ' — Descrição pendente de revisão.' : description ? ` — ${escapeHtml(description)}` : ''}</figcaption></figure>`;
}
export function exportHtml(input: ReadingDocument): string {
  const doc = documentSchema.parse(input);
  const warnings = inspectDocument(doc);
  return `<!doctype html><html lang="${escapeHtml(doc.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(doc.title)} — WABlind</title><style>body{font:1.125rem/1.7 system-ui;margin:2rem auto;padding:0 1rem;max-width:72ch;color:#152c26;background:#fff}a{color:#185c4c}a:focus-visible{outline:3px solid #8f3d16}img{max-width:100%;height:auto}table{border-collapse:collapse;display:block;overflow:auto}td,th{border:1px solid #53655f;padding:.5rem}aside{border-inline-start:3px solid #185c4c;padding-inline-start:1rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><a href="#content">Ir para o conteúdo</a><header><p>WABlind · versão de leitura</p><h1>${escapeHtml(doc.title)}</h1><p>${escapeHtml(doc.source.attribution)}</p>${doc.source.url ? `<a href="${escapeHtml(doc.source.url)}" rel="noreferrer">Consultar fonte original</a>` : ''}</header><nav aria-label="Seções"><ul>${doc.blocks.filter(b => b.kind === 'heading' || doc.annotations.some(a => a.elementId === b.id && a.category === 'section')).map(b => `<li><a href="#b-${b.id}">${escapeHtml(doc.annotations.find(a => a.elementId === b.id && a.category === 'section')?.description || ('content' in b ? b.content.map(i => i.text).join('') : b.id))}</a></li>`).join('')}</ul></nav><main id="content">${doc.blocks.map(b => `<section id="b-${b.id}">${renderBlock(b, doc)}${doc.annotations.filter(a => a.elementId === b.id).map(a => `<aside><p><strong>${categories[a.category].label}</strong>: ${escapeHtml(a.description)}</p>${a.note ? `<p>Finalidade pedagógica: ${escapeHtml(a.note)}</p>` : ''}</aside>`).join('')}</section>`).join('')}</main><footer>${warnings.length ? `<h2>Pendências de revisão</h2><ul>${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>` : ''}<p>Adaptação com controle humano. Verificações automáticas não comprovam conformidade de acessibilidade.</p></footer></body></html>`;
}
