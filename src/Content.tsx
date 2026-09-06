import type { ReactNode } from 'react';
import { categories, type Inline, type Block, type ReadingDocument, inspectDocument } from '../shared/model';
export function InlineContent({ parts }: { parts: Inline[] }) {
  return <>{parts.map((part, index) => {
    let child: ReactNode = part.text;
    if (part.strong) child = <strong>{child}</strong>;
    if (part.emphasis) child = <em>{child}</em>;
    return part.href ? <a key={index} href={part.href} rel="noreferrer">{child}</a> : <span key={index}>{child}</span>;
  })}</>;
}
export function WaterIllustration({ description }: { description: string | null }) {
  return <svg className="water-illustration" viewBox="0 0 600 230" role="img" aria-label={description || 'Ilustração do ciclo da água; descrição contextual ainda não adicionada.'}>
    <rect width="600" height="230" rx="16" fill="#eef2df" />
    <circle cx="90" cy="63" r="27" fill="#d68e31" />
    <path d="M0 184Q80 150 160 186T320 185T480 180T600 180V230H0Z" fill="#70a5a1" />
    <path d="M180 166Q157 122 211 72M199 76l15-7-1 17M368 91q48 29 28 76m-8-11 6 16 15-9" fill="none" stroke="#143f36" strokeWidth="5" strokeLinecap="round" />
    <path d="M240 77q-20-35 13-41 17-37 49-8 37-8 41 23 30 29-8 35H256q-13 0-16-9" fill="#fff" stroke="#64756e" strokeWidth="2" />
    <text x="135" y="123" fontSize="17" fill="#143f36">vapor</text><text x="421" y="135" fontSize="17" fill="#143f36">chuva</text><text x="274" y="212" fontSize="17" fill="#143f36">rio</text>
  </svg>;
}
export function BlockContent({ block: b, document: doc }: { block: Block; document: ReadingDocument }) {
  if (b.kind === 'heading') { const Tag = `h${Math.min(6, Math.max(2, b.level))}` as 'h2'; return <Tag><InlineContent parts={b.content} /></Tag>; }
  if (b.kind === 'paragraph') return <p><InlineContent parts={b.content} /></p>;
  if (b.kind === 'quote') return <blockquote><p><InlineContent parts={b.content} /></p></blockquote>;
  if (b.kind === 'code') return <pre><code><InlineContent parts={b.content} /></code></pre>;
  if (b.kind === 'list') { const Tag = b.ordered ? 'ol' : 'ul'; return <Tag>{b.items.map((i, k) => <li key={k}><InlineContent parts={i} /></li>)}</Tag>; }
  if (b.kind === 'table') return <div className="table-scroll" role="region" aria-label={b.caption || 'Tabela da fonte'} tabIndex={0}><table><caption>{b.caption || 'Tabela da fonte'}</caption><tbody>{b.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => { const Tag = cell.header ? 'th' : 'td'; return <Tag key={c} scope={cell.header ? cell.scope : undefined} colSpan={cell.colspan} rowSpan={cell.rowspan}><InlineContent parts={cell.content} /></Tag>; })}</tr>)}</tbody></table></div>;
  if (b.kind !== 'image') return null;
  const description = doc.annotations.find(a => a.elementId === b.id && a.category === 'description')?.description ?? b.alt;
  return <figure>{b.illustration ? <WaterIllustration description={description} /> : b.src ? <img src={b.src} alt={description ?? ''} /> : <p className="image-placeholder">Imagem não incorporada. Consulte a fonte original.</p>}<figcaption>{b.caption}{description === null ? <span className="pending"> · Descrição contextual pendente</span> : description ? <span> — {description}</span> : null}</figcaption></figure>;
}
export function Reading({ document: doc }: { document: ReadingDocument }) {
  const sections = doc.blocks.filter(b => b.kind === 'heading' || doc.annotations.some(a => a.elementId === b.id && a.category === 'section'));
  const issues = inspectDocument(doc);
  return <div className="reading-layout"><aside className="reading-index"><p className="eyebrow">NESTA LEITURA</p><nav aria-label="Seções da leitura"><ul>{sections.map(b => <li key={b.id}><a href={`#${location.hash.slice(1).split('?')[0]}?section=${b.id}`} onClick={e => { e.preventDefault(); const el = window.document.getElementById('block-' + b.id); el?.scrollIntoView(); el?.focus(); }}>{doc.annotations.find(a => a.elementId === b.id && a.category === 'section')?.description || ('content' in b ? b.content.map(i => i.text).join('') : b.id)}</a></li>)}</ul></nav><p className="muted">A ordem e o conteúdo da fonte são preservados. As contribuições aparecem junto ao trecho.</p></aside><article className="reading-paper" lang={doc.language}>
    <p className="eyebrow">LEITURA MEDIADA</p><h1>{doc.title}</h1><p className="source">{doc.source.attribution}</p>{doc.source.url && <a href={doc.source.url} rel="noreferrer">Consultar fonte original ↗</a>}
    {doc.blocks.map(b => <section className="reading-block" key={b.id} id={'block-' + b.id} tabIndex={-1}><BlockContent block={b} document={doc} />{doc.annotations.filter(a => a.elementId === b.id).map(a => <aside className={`annotation annotation-${a.category}`} key={a.id}><p className="annotation-label">{categories[a.category].label}</p><p>{a.description}</p>{a.note && <p className="muted">Finalidade pedagógica: {a.note}</p>}</aside>)}</section>)}
    {issues.length > 0 && <details className="review-issues"><summary>{issues.length} pendência(s) de revisão</summary><ul>{issues.map((i, k) => <li key={k}>{i}</li>)}</ul></details>}
  </article></div>;
}
