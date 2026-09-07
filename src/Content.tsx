import { useState, type CSSProperties, type ReactNode } from 'react';
import { categories, type Inline, type Block, type ReadingDocument, inspectDocument, imageDescription, readingProjection, relationLabels, elementPosition } from '../shared/model';
import { readingAnnotations, readingRepresentations, sectionLabel } from '../shared/export';
import { initialReadingPreferences, ReadingControls } from './ReadingControls';

export function InlineContent({ parts }: { parts: Inline[] }) {
  return <>{parts.map((part, index) => { let child: ReactNode = part.text; if (part.strong) child = <strong>{child}</strong>; if (part.emphasis) child = <em>{child}</em>; return part.href ? <a key={index} href={part.href} rel="noreferrer">{child}</a> : <span key={index}>{child}</span>; })}</>;
}
export function WaterIllustration({ description }: { description: string | null }) {
  return <svg className="water-illustration" viewBox="0 0 600 230" role="img" aria-label={description || 'Ilustração do ciclo da água; descrição contextual ainda não adicionada.'}>
    <rect width="600" height="230" rx="16" fill="#eff2ff" /><circle cx="90" cy="63" r="27" fill="#eea120" /><path d="M0 184Q80 150 160 186T320 185T480 180T600 180V230H0Z" fill="#168aa0" /><path d="M180 166Q157 122 211 72M199 76l15-7-1 17M368 91q48 29 28 76m-8-11 6 16 15-9" fill="none" stroke="#31329e" strokeWidth="5" strokeLinecap="round" /><path d="M240 77q-20-35 13-41 17-37 49-8 37-8 41 23 30 29-8 35H256q-13 0-16-9" fill="#fff" stroke="#515578" strokeWidth="2" /><text x="135" y="123" fontSize="17" fill="#22264a">vapor</text><text x="421" y="135" fontSize="17" fill="#22264a">chuva</text><text x="274" y="212" fontSize="17" fill="#fff">rio</text>
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
  const description = imageDescription(doc, b.id);
  return <figure>{b.illustration ? <WaterIllustration description={description} /> : b.src ? <img src={b.src} alt={description ?? ''} /> : <p className="image-placeholder">Imagem não incorporada. Consulte a fonte original.</p>}<figcaption>{b.caption}{description === null ? <span className="pending"> · Descrição contextual pendente</span> : description ? <span> — {description}</span> : null}</figcaption></figure>;
}
function Paragraphs({ text }: { text: string }) { return <>{text.split(/\n\s*\n/).map((p, i) => <p className="authored-text" key={i}>{p}</p>)}</>; }
function focusElement(id: string) { const el = window.document.getElementById(id); el?.scrollIntoView({ block: 'start' }); el?.focus(); }
function ElementLinks({ doc, ids }: { doc: ReadingDocument; ids: string[] }) {
  const visible = new Set(readingProjection(doc).blocks.map(b => b.id));
  return <>{ids.map((id, i) => <span key={id}>{i > 0 ? ' · ' : ''}{visible.has(id) ? <a href={`#b-${id}`} onClick={event => { event.preventDefault(); focusElement(`b-${id}`); }}>Elemento {elementPosition(doc, id)}</a> : <span>Elemento {elementPosition(doc, id)} (desconsiderado nesta leitura)</span>}</span>)}</>;
}
export function Reading({ document: doc }: { document: ReadingDocument }) {
  const [preferences, setPreferences] = useState(initialReadingPreferences);
  const { blocks, sections, omissions } = readingProjection(doc);
  const m = doc.mediation;
  const representations = readingRepresentations(doc);
  const issues = inspectDocument(doc);
  return <div className="reading-layout"><aside className="reading-index"><p className="eyebrow">EXPLORE ESTA LEITURA</p><nav aria-label="Seções da leitura"><ul><li><a href="#reading-title" onClick={event => { event.preventDefault(); focusElement('reading-title'); }}>Início e fonte</a></li>{m?.summary.text.trim() && <li><a href="#reading-summary" onClick={event => { event.preventDefault(); focusElement('reading-summary'); }}>Síntese do professor</a></li>}{sections.map(b => <li key={b.id}><a href={`#b-${b.id}`} onClick={event => { event.preventDefault(); focusElement('b-' + b.id); }}>{sectionLabel(doc, b)}</a></li>)}{representations.length > 0 && <li><a href="#related-presentations" onClick={event => { event.preventDefault(); focusElement('related-presentations'); }}>Representações relacionadas</a></li>}</ul></nav><p className="muted">A fonte e as contribuições do professor são identificadas. Você escolhe como explorar.</p></aside>
    <article className={`reading-paper${preferences.spacing ? ' reading-spaced' : ''}`} lang={doc.language} style={{ '--reading-scale': preferences.size } as CSSProperties}>
      <p className="eyebrow">LEITURA MEDIADA</p><h1 id="reading-title" tabIndex={-1}>{doc.title}</h1>
      {m?.purpose && <p><strong>Objetivo:</strong> {m.purpose}</p>}{m?.task && <p><strong>Atividade:</strong> {m.task}</p>}
      <section className="reading-source" aria-labelledby="source-heading"><h2 id="source-heading">Fonte original</h2><p>{m?.sourceTitle || doc.title}</p><p><strong>Autoria da fonte:</strong> {m?.sourceAuthor || doc.source.attribution}</p>{doc.source.url ? <p><a href={doc.source.url} rel="noreferrer">Consultar fonte original</a><span className="source-url">{doc.source.url}</span></p> : <p>Material demonstrativo próprio da WABlind.</p>}<p>Capturada em <time dateTime={doc.source.capturedAt}>{new Date(doc.source.capturedAt).toLocaleDateString('pt-BR')}</time>.</p><p><strong>Responsável pela mediação:</strong> {m?.responsible || 'não informado nesta versão'}</p></section>
      <ReadingControls document={doc} preferences={preferences} onChange={setPreferences} />
      {m?.context && <p><strong>Condições desta atividade:</strong> {m.context}</p>}
      {m?.summary.text.trim() && <section className="reading-summary" id="reading-summary" tabIndex={-1}><h2>Síntese do professor</h2><Paragraphs text={m.summary.text} /><p className="source">Elementos utilizados: <ElementLinks doc={doc} ids={m.summary.elementIds} />.</p></section>}
      {!blocks.length && <p>Esta leitura não possui trechos visíveis com a configuração atual.</p>}
      {blocks.map(b => {
        const d = m?.decisions.find(d => d.elementId === b.id);
        const related = representations.filter(r => r.elementIds.includes(b.id));
        return <section className="reading-block" key={b.id} id={'b-' + b.id} tabIndex={-1} aria-label={`Elemento ${elementPosition(doc, b.id)}`}><BlockContent block={b} document={doc} />
          {d?.role && <p className="element-purpose"><strong>Função nesta atividade:</strong> {d.role}</p>}
          {d?.treatments.includes('describe') && d.description && b.kind !== 'image' && <aside className="annotation"><p className="annotation-label">Descrição do professor</p><Paragraphs text={d.description} /></aside>}
          {d?.treatments.includes('explain') && d.explanation && <aside className="annotation"><p className="annotation-label">Explicação do professor</p><Paragraphs text={d.explanation} /></aside>}
          {readingAnnotations(doc, b.id).map(a => <aside className={`annotation annotation-${a.category}`} key={a.id}><p className="annotation-label">{categories[a.category].label}</p><p>{a.description}</p>{a.note && <p>Finalidade pedagógica: {a.note}</p>}<p className="source">Contribuição de {a.author || 'mediador não identificado'}.</p></aside>)}
          {related.length > 0 && <div className="related-links"><p>Explore também:</p><ul>{related.map(r => <li key={r.id}><a href={`#representation-${r.id}`} onClick={event => { event.preventDefault(); focusElement(`representation-${r.id}`); }}>{r.title}</a> — {relationLabels[r.relation]}</li>)}</ul></div>}
          {d?.rationale && <details className="mediation-details"><summary>Sobre esta mediação</summary><p>{d.rationale}</p><p className="source">Contribuição de {d.author || m?.responsible || 'mediador não identificado'} · <time dateTime={d.updatedAt}>{new Date(d.updatedAt).toLocaleDateString('pt-BR')}</time>.</p></details>}
        </section>;
      })}
      {representations.length > 0 && <section id="related-presentations" tabIndex={-1}><h2>Representações relacionadas</h2>{representations.map(r => <section className="related-presentation" id={`representation-${r.id}`} key={r.id} tabIndex={-1}><h3>{r.title}</h3><p className="relation-label">{relationLabels[r.relation]}</p><p><strong>Ajuda a:</strong> {r.function}</p><p><strong>Quando utilizar:</strong> {r.condition}</p>{r.alternative && <p><strong>Outra possibilidade:</strong> {r.alternative}</p>}{r.kind === 'table' ? <div className="table-scroll" role="region" aria-label={r.title} tabIndex={0}><table><caption>{r.title}</caption><thead><tr>{r.columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead><tbody>{r.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div> : <Paragraphs text={r.text} />}<p className="source">Contribuição de {r.author || 'mediador não identificado'}. Baseada em: <ElementLinks doc={doc} ids={r.elementIds} />.</p></section>)}</section>}
      {m?.references.length ? <section><h2>Referências complementares</h2><ul>{m.references.map(r => <li key={r.id}><a href={r.url} rel="noreferrer">{r.title}</a>{r.author ? ` — ${r.author}` : ''}</li>)}</ul></section> : null}
      {omissions.length > 0 && <details className="review-issues"><summary>{omissions.length} elemento(s) desconsiderado(s) nesta leitura</summary><ul>{omissions.map(o => <li key={o.elementId}>Elemento {elementPosition(doc, o.elementId)}: {o.reason || 'Motivo não registrado na versão histórica.'}</li>)}</ul></details>}
      {issues.length > 0 && <details className="review-issues"><summary>{issues.length} pendência(s) de revisão</summary><ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></details>}
    </article>
  </div>;
}
