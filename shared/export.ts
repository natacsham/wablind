import { categories, documentSchema, inspectDocument, readingProjection, imageDescription, relationLabels, elementPosition, type Inline, type Block, type ReadingDocument, type Representation } from './model';

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
function inline(parts: Inline[]) { return parts.map(p => {
  let s = escapeHtml(p.text);
  if (p.strong) s = `<strong>${s}</strong>`;
  if (p.emphasis) s = `<em>${s}</em>`;
  return p.href ? `<a href="${escapeHtml(p.href)}" rel="noreferrer">${s}</a>` : s;
}).join(''); }
export function sectionLabel(doc: ReadingDocument, b: Block): string { return doc.annotations.find(a => a.elementId === b.id && a.category === 'section')?.description || ('content' in b ? b.content.map(i => i.text).join('') : `Elemento ${elementPosition(doc, b.id)}`); }
export function readingRepresentations(doc: ReadingDocument): Representation[] {
  const visible = new Set(readingProjection(doc).blocks.map(b => b.id));
  return doc.mediation?.representations.filter(r => r.elementIds.some(id => visible.has(id))) || [];
}
export function readingAnnotations(doc: ReadingDocument, elementId: string) {
  const d = doc.mediation?.decisions.find(d => d.elementId === elementId);
  return doc.annotations.filter(a => a.elementId === elementId && a.category !== 'omit' && !(a.category === 'description' && d?.treatments.includes('describe') && d.description.trim()));
}
export function renderBlock(b: Block, doc: ReadingDocument) {
  if (b.kind === 'heading') { const level = Math.min(6, Math.max(2, b.level)); return `<h${level}>${inline(b.content)}</h${level}>`; }
  if (b.kind === 'paragraph') return `<p>${inline(b.content)}</p>`;
  if (b.kind === 'quote') return `<blockquote><p>${inline(b.content)}</p></blockquote>`;
  if (b.kind === 'code') return `<pre><code>${inline(b.content)}</code></pre>`;
  if (b.kind === 'list') { const tag = b.ordered ? 'ol' : 'ul'; return `<${tag}>${b.items.map(i => `<li>${inline(i)}</li>`).join('')}</${tag}>`; }
  if (b.kind === 'table') return `<div class="table-scroll" role="region" aria-label="${escapeHtml(b.caption || 'Tabela da fonte')}" tabindex="0"><table><caption>${escapeHtml(b.caption || 'Tabela da fonte')}</caption><tbody>${b.rows.map(r => `<tr>${r.map(c => { const tag = c.header ? 'th' : 'td'; return `<${tag}${c.header && c.scope ? ` scope="${c.scope}"` : ''}${c.colspan ? ` colspan="${c.colspan}"` : ''}${c.rowspan ? ` rowspan="${c.rowspan}"` : ''}>${inline(c.content)}</${tag}>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  if (b.kind !== 'image') return '';
  const description = imageDescription(doc, b.id);
  return `<figure>${b.src ? `<img src="${escapeHtml(b.src)}" alt="${escapeHtml(description ?? '')}">` : b.illustration ? '<p>Ilustração demonstrativa: Sol, nuvem, rio e setas indicando evaporação e chuva.</p>' : '<p>Imagem não incorporada. Consulte a fonte original.</p>'}<figcaption>${escapeHtml(b.caption)}${description === null ? ' — Descrição pendente de revisão.' : description ? ` — ${escapeHtml(description)}` : ''}</figcaption></figure>`;
}
function paragraphs(value: string) { return value.split(/\n\s*\n/).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join(''); }
function elementLinks(doc: ReadingDocument, ids: string[]) { const visible = new Set(readingProjection(doc).blocks.map(b => b.id)); return ids.map(id => visible.has(id) ? `<a href="#b-${id}">Elemento ${elementPosition(doc, id)}</a>` : `Elemento ${elementPosition(doc, id)} (desconsiderado nesta leitura)`).join(' · '); }
function representation(r: Representation, doc: ReadingDocument) {
  return `<section id="representation-${r.id}"><h3>${escapeHtml(r.title)}</h3><p><strong>${escapeHtml(relationLabels[r.relation])}</strong></p><p>Ajuda a: ${escapeHtml(r.function)}</p><p>Quando utilizar: ${escapeHtml(r.condition)}</p>${r.alternative ? `<p>Outra possibilidade: ${escapeHtml(r.alternative)}</p>` : ''}${r.kind === 'table' ? `<div class="table-scroll" role="region" aria-label="${escapeHtml(r.title)}" tabindex="0"><table><caption>${escapeHtml(r.title)}</caption><thead><tr>${r.columns.map(c => `<th scope="col">${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${r.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : paragraphs(r.text)}<p>Contribuição de ${escapeHtml(r.author || 'mediador não identificado')}. Baseada em: ${elementLinks(doc, r.elementIds)}.</p></section>`;
}
export function exportHtml(input: ReadingDocument): string {
  const doc = documentSchema.parse(input);
  const { blocks, sections, omissions } = readingProjection(doc);
  const m = doc.mediation;
  const warnings = inspectDocument(doc);
  const representations = readingRepresentations(doc);
  return `<!doctype html><html lang="${escapeHtml(doc.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(doc.title)} — WABlind</title><style>body{font:1.125rem/1.7 system-ui;margin:2rem auto;padding:0 1rem;max-width:76ch;color:#20213c;background:#fff}a{color:#3432a1}a:focus-visible,summary:focus-visible,[tabindex]:focus-visible{outline:3px solid #a03712;outline-offset:3px}img{max-width:100%;height:auto}.table-scroll{overflow:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #697080;padding:.5rem;text-align:left}aside{border-inline-start:3px solid #4735c9;padding-inline-start:1rem}pre{white-space:pre-wrap;overflow-wrap:anywhere}section{margin-block:2rem}p{overflow-wrap:anywhere}details{margin-block:1rem}</style></head><body><a href="#content">Ir para o conteúdo</a><header><p>WABlind · leitura mediada</p><h1>${escapeHtml(doc.title)}</h1>${m?.purpose ? `<p>Objetivo: ${escapeHtml(m.purpose)}</p>` : ''}${m?.task ? `<p>Atividade: ${escapeHtml(m.task)}</p>` : ''}<section aria-labelledby="source-title"><h2 id="source-title">Fonte original</h2><p>${escapeHtml(m?.sourceTitle || doc.title)}</p><p>Autoria da fonte: ${escapeHtml(m?.sourceAuthor || doc.source.attribution)}</p>${doc.source.url ? `<p><a href="${escapeHtml(doc.source.url)}" rel="noreferrer">Consultar fonte original</a></p>` : '<p>Material demonstrativo próprio da WABlind.</p>'}<p>Capturada em ${escapeHtml(new Date(doc.source.capturedAt).toLocaleDateString('pt-BR'))}. Responsável pela mediação: ${escapeHtml(m?.responsible || 'não informado nesta versão')}.</p></section></header>${sections.length ? `<nav aria-label="Seções da leitura"><ul>${sections.map(b => `<li><a href="#b-${b.id}">${escapeHtml(sectionLabel(doc, b))}</a></li>`).join('')}</ul></nav>` : ''}<main id="content">${m?.summary.text.trim() ? `<section><h2>Síntese do professor</h2>${paragraphs(m.summary.text)}<p>Elementos utilizados: ${elementLinks(doc, m.summary.elementIds)}.</p></section>` : ''}${m?.context ? `<p>Condições desta atividade: ${escapeHtml(m.context)}</p>` : ''}${blocks.map(b => {
    const d = m?.decisions.find(d => d.elementId === b.id);
    return `<section id="b-${b.id}">${renderBlock(b, doc)}${d?.role ? `<p>Função nesta atividade: ${escapeHtml(d.role)}</p>` : ''}${d?.treatments.includes('describe') && d.description && b.kind !== 'image' ? `<aside><p>Descrição do professor</p>${paragraphs(d.description)}</aside>` : ''}${d?.treatments.includes('explain') && d.explanation ? `<aside><p>Explicação do professor</p>${paragraphs(d.explanation)}</aside>` : ''}${readingAnnotations(doc, b.id).map(a => `<aside><p><strong>${categories[a.category].label}</strong>: ${escapeHtml(a.description)}</p>${a.note ? `<p>Finalidade pedagógica: ${escapeHtml(a.note)}</p>` : ''}<p>Contribuição de ${escapeHtml(a.author || 'mediador não identificado')}.</p></aside>`).join('')}${d?.rationale ? `<details><summary>Sobre esta mediação</summary><p>${escapeHtml(d.rationale)}</p><p>Contribuição de ${escapeHtml(d.author || m?.responsible || 'mediador não identificado')}.</p></details>` : ''}</section>`;
}).join('')}${representations.length ? `<section><h2>Representações relacionadas</h2>${representations.map(r => representation(r, doc)).join('')}</section>` : ''}${m?.references.length ? `<section><h2>Referências complementares</h2><ul>${m.references.map(r => `<li><a href="${escapeHtml(r.url)}" rel="noreferrer">${escapeHtml(r.title)}</a>${r.author ? ` — ${escapeHtml(r.author)}` : ''}</li>`).join('')}</ul></section>` : ''}</main><footer>${omissions.length ? `<details><summary>${omissions.length} elemento(s) desconsiderado(s) nesta leitura</summary><ul>${omissions.map(o => `<li>Elemento ${elementPosition(doc, o.elementId)}: ${escapeHtml(o.reason || 'Motivo não registrado na versão histórica.')}</li>`).join('')}</ul></details>` : ''}${warnings.length ? `<details><summary>Pendências de revisão</summary><ul>${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul></details>` : ''}<p>Versão mediada, distinta da fonte original. Verificações automáticas não comprovam conformidade de acessibilidade.</p></footer></body></html>`;
}

/** Text for browser speech follows the same projection as screen and HTML export. */
export function readingText(doc: ReadingDocument): string {
  const { blocks, omissions } = readingProjection(doc);
  const m = doc.mediation;
  const parts = [doc.title, m?.purpose, m?.task, `Fonte original: ${m?.sourceTitle || doc.title}. ${m?.sourceAuthor || doc.source.attribution}`, `Mediação: ${m?.responsible || 'responsável não informado'}.`, m?.summary.text ? `Síntese do professor: ${m.summary.text}` : '', m?.context];
  for (const b of blocks) {
    if ('content' in b) parts.push(b.content.map(p => p.text).join(''));
    else if (b.kind === 'list') parts.push(...b.items.map(i => i.map(p => p.text).join('')));
    else if (b.kind === 'table') parts.push(b.caption, ...b.rows.map(row => row.map(c => c.content.map(p => p.text).join('')).join('; ')));
    else parts.push(b.caption, imageDescription(doc, b.id) ?? 'Descrição contextual pendente.');
    const d = m?.decisions.find(d => d.elementId === b.id);
    if (d?.role) parts.push(`Função nesta atividade: ${d.role}`);
    if (d?.treatments.includes('describe') && b.kind !== 'image') parts.push(`Descrição do professor: ${d.description}`);
    if (d?.treatments.includes('explain')) parts.push(`Explicação do professor: ${d.explanation}`);
    parts.push(...readingAnnotations(doc, b.id).map(a => `${categories[a.category].label}. ${a.description}. ${a.note}`));
  }
  for (const r of readingRepresentations(doc)) parts.push(r.title, relationLabels[r.relation], `Ajuda a: ${r.function}`, `Quando utilizar: ${r.condition}`, r.kind === 'text' ? r.text : [r.columns.join('; '), ...r.rows.map(row => row.join('; '))].join('. '), r.alternative, `Contribuição de ${r.author}.`);
  if (omissions.length) parts.push(`${omissions.length} elementos desconsiderados nesta leitura.`, ...omissions.map(o => o.reason));
  return parts.filter(Boolean).join('\n\n');
}
