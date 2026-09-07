import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { classificationLabels, relationLabels, representationSchema, treatmentLabels, type ElementDecision, type Mediation, type ReadingDocument, type Representation } from '../../shared/model';

type Pending = (key: string, value: boolean) => void;
function sameShape(value: unknown, example: unknown): boolean {
  if (Array.isArray(example)) return Array.isArray(value) && (!example.length || value.every(v => sameShape(v, example[0])));
  if (example && typeof example === 'object') return !!value && typeof value === 'object' && !Array.isArray(value) && Object.entries(example).every(([k, v]) => sameShape((value as Record<string, unknown>)[k], v));
  return typeof value === typeof example;
}
function useDraft<T>(key: string, initial: T, pending: Pending) {
  const [value, set] = useState<T>(() => { try { const saved = JSON.parse(sessionStorage.getItem(key) || 'null'); return sameShape(saved, initial) ? saved as T : initial; } catch { return initial; } });
  const [storageError, setStorageError] = useState('');
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  useEffect(() => { pending(key, dirty); }, [key, dirty, pending]);
  function update(next: T) { set(next); try { if (JSON.stringify(next) === JSON.stringify(initial)) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(next)); setStorageError(''); } catch { setStorageError('Não foi possível guardar o texto provisório. Aplique as alterações antes de sair.'); } }
  function clear() { try { sessionStorage.removeItem(key); } catch { /* in-memory draft remains */ } pending(key, false); }
  function discard() { set(initial); clear(); }
  return { value, update, clear, discard, storageError, dirty };
}
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) { return <div className="mediation-field"><label htmlFor={id}>{label}</label>{children}</div>; }

export type ResourceMetadata = Omit<Mediation, 'decisions' | 'representations'>;
export function ResourceForm({ doc, apply, pending }: { doc: ReadingDocument; apply: (title: string, m: ResourceMetadata) => void; pending: Pending }) {
  const { decisions: _decisions, representations: _representations, ...metadata } = doc.mediation!;
  const initial = { title: doc.title, ...metadata };
  const draft = useDraft(`wablind.resource.${doc.id}`, initial, pending);
  const m = draft.value;
  const put = (values: Partial<typeof m>) => draft.update({ ...m, ...values });
  const [error, setError] = useState('');
  function submit(e: FormEvent) { e.preventDefault(); if (!m.title.trim()) { setError('Dê um título à atividade.'); return; } const { title, ...mediation } = m; try { apply(title, mediation); draft.clear(); setError(''); } catch { setError('Confira os dados da atividade e os endereços das referências. O texto foi preservado.'); } }
  return <details className="resource-settings" open={!doc.mediation?.task}>
    <summary>Atividade, fonte e síntese opcional</summary>
    <form onSubmit={submit}>
      <div className="form-columns">
        <Field id="resource-title" label="Título desta atividade"><input id="resource-title" maxLength={300} value={m.title} onChange={e => put({ title: e.target.value })} required /></Field>
        <Field id="mediator-name" label="Responsável pela mediação"><input id="mediator-name" maxLength={150} value={m.responsible} onChange={e => put({ responsible: e.target.value })} /></Field>
        <Field id="task" label="O que o estudante precisa realizar?"><textarea id="task" rows={2} maxLength={2000} value={m.task} onChange={e => put({ task: e.target.value })} placeholder="Ex.: comparar os valores de dois meses." /></Field>
        <Field id="purpose" label="Qual é o objetivo da atividade?"><textarea id="purpose" rows={2} maxLength={2000} value={m.purpose} onChange={e => put({ purpose: e.target.value })} /></Field>
      </div>
      <Field id="context" label="Condições relevantes de uso (opcional)"><textarea id="context" rows={2} maxLength={2000} value={m.context} onChange={e => put({ context: e.target.value })} placeholder="Recursos disponíveis, barreiras observadas e alternativas necessárias. Não inclua dados pessoais de estudantes." /></Field>
      <fieldset><legend>Fonte original e permissão de uso</legend>
        <p>{doc.source.url ? <a href={doc.source.url} rel="noreferrer">{doc.source.url}</a> : 'Material demonstrativo próprio'} · Captura de {new Date(doc.source.capturedAt).toLocaleDateString('pt-BR')}</p>
        <div className="form-columns">
          <Field id="source-title" label="Título da fonte"><input id="source-title" maxLength={300} value={m.sourceTitle} onChange={e => put({ sourceTitle: e.target.value })} /></Field>
          <Field id="source-author" label="Autoria original (se conhecida)"><input id="source-author" maxLength={500} value={m.sourceAuthor} onChange={e => put({ sourceAuthor: e.target.value })} /></Field>
        </div>
        <Field id="rights-basis" label="Base para utilizar e publicar o conteúdo"><select id="rights-basis" value={m.rightsBasis} onChange={e => put({ rightsBasis: e.target.value as Mediation['rightsBasis'] })}><option value="pending">Pendente de verificação</option><option value="own">Conteúdo próprio</option><option value="licensed">Licença que permite este uso</option><option value="permission">Autorização do titular</option></select></Field>
        <Field id="rights-reference" label="Identifique a licença ou autorização"><textarea id="rights-reference" rows={2} maxLength={2000} value={m.rightsReference} onChange={e => put({ rightsReference: e.target.value })} placeholder="Nome e endereço da licença, ou referência à autorização. Não inclua dados privados." /></Field>
      </fieldset>
      <fieldset><legend>Síntese elaborada pelo professor (opcional)</legend>
        <p>Escreva com suas palavras e indique os elementos utilizados. Marcar trechos não produz uma síntese automaticamente.</p>
        <Field id="summary-text" label="Texto da síntese"><textarea id="summary-text" rows={5} maxLength={12000} value={m.summary.text} onChange={e => put({ summary: { ...m.summary, text: e.target.value } })} /></Field>
        <div className="source-choices">{doc.blocks.map((b, i) => <label className="check" key={b.id}><input type="checkbox" checked={m.summary.elementIds.includes(b.id)} onChange={e => put({ summary: { ...m.summary, elementIds: e.target.checked ? [...m.summary.elementIds, b.id] : m.summary.elementIds.filter(id => id !== b.id) } })} />Elemento {i + 1}: {classificationLabels[b.kind]}{doc.mediation!.decisions.some(d => d.elementId === b.id && d.treatments.includes('summarize')) ? ' — indicado para a síntese' : ''}</label>)}</div>
      </fieldset>
      <fieldset><legend>Referências complementares</legend>
        {m.references.map((r, i) => <div className="reference-form" key={r.id}><Field id={`ref-title-${i}`} label={`Título da referência ${i + 1}`}><input id={`ref-title-${i}`} required value={r.title} maxLength={300} onChange={e => put({ references: m.references.map(x => x.id === r.id ? { ...x, title: e.target.value } : x) })} /></Field><Field id={`ref-url-${i}`} label="Endereço da referência"><input id={`ref-url-${i}`} type="url" required value={r.url} onChange={e => put({ references: m.references.map(x => x.id === r.id ? { ...x, url: e.target.value } : x) })} /></Field><Field id={`ref-author-${i}`} label="Autoria da referência"><input id={`ref-author-${i}`} value={r.author} maxLength={500} onChange={e => put({ references: m.references.map(x => x.id === r.id ? { ...x, author: e.target.value } : x) })} /></Field><button type="button" onClick={() => put({ references: m.references.filter(x => x.id !== r.id) })}>Remover referência {i + 1}</button></div>)}
        <button type="button" disabled={m.references.length >= 30} onClick={() => put({ references: [...m.references, { id: crypto.randomUUID(), title: '', url: '', author: '' }] })}>Adicionar referência</button>
      </fieldset>
      {(error || draft.storageError) && <p role="alert">{error || draft.storageError}</p>}
      <button className="primary" type="submit">Aplicar dados da atividade</button>
      {draft.dirty && <button type="button" onClick={draft.discard}>Descartar alterações destes dados</button>}
    </form>
  </details>;
}

export function DecisionForm({ doc, elementId, apply, pending }: { doc: ReadingDocument; elementId: string; apply: (d: ElementDecision) => void; pending: Pending }) {
  const block = doc.blocks.find(b => b.id === elementId)!;
  const current = doc.mediation!.decisions.find(d => d.elementId === elementId);
  const initial: ElementDecision = current || { elementId, classification: block.kind, role: '', treatments: ['preserve'], description: '', explanation: '', rationale: '', omitReason: '', author: doc.mediation!.responsible, updatedAt: doc.source.capturedAt };
  const draft = useDraft(`wablind.decision.${doc.id}.${elementId}`, initial, pending);
  const d = draft.value;
  const put = (v: Partial<ElementDecision>) => draft.update({ ...d, ...v });
  const [error, setError] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!d.treatments.length) { setError('Escolha ao menos um tratamento.'); return; }
    if (d.treatments.includes('omit') && !d.omitReason.trim()) { setError('Explique por que este elemento será desconsiderado.'); return; }
    try { apply({ ...d, author: doc.mediation!.responsible || 'Professor — demonstração local', updatedAt: new Date().toISOString() }); draft.clear(); setError(''); } catch { setError('Não foi possível aplicar a marcação. Confira os campos; o texto foi preservado.'); }
  }
  return <form onSubmit={submit}>
    <Field id="classification" label="1. O que é este elemento?"><select id="classification" value={d.classification} onChange={e => put({ classification: e.target.value as ElementDecision['classification'] })}>{Object.entries(classificationLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
    <p className="field-help">A classificação confirma sua interpretação; a captura original permanece preservada. Para outra estrutura, acrescente uma representação.</p>
    <Field id="element-role" label="2. Para que serve nesta atividade?"><textarea id="element-role" rows={3} maxLength={2000} value={d.role} onChange={e => put({ role: e.target.value })} placeholder="Ex.: apresenta os valores que o estudante precisa comparar." required /></Field>
    <fieldset><legend>3. Como será apresentado?</legend>{Object.entries(treatmentLabels).map(([key, label]) => <label className="check" key={key}><input type="checkbox" checked={d.treatments.includes(key as ElementDecision['treatments'][number])} onChange={e => put({ treatments: e.target.checked ? [...d.treatments, key as ElementDecision['treatments'][number]] : d.treatments.filter(t => t !== key) })} />{label}</label>)}</fieldset>
    {d.treatments.includes('describe') && <Field id="element-description" label="Descrição contextual"><textarea id="element-description" required rows={5} maxLength={4000} value={d.description} onChange={e => put({ description: e.target.value })} /></Field>}
    {d.treatments.includes('explain') && <Field id="element-explanation" label="Explicação do professor"><textarea id="element-explanation" required rows={4} maxLength={6000} value={d.explanation} onChange={e => put({ explanation: e.target.value })} /></Field>}
    {d.treatments.includes('summarize') && <p>Este elemento será indicado para a síntese. Escreva o texto em “Atividade, fonte e síntese opcional”.</p>}
    {d.treatments.includes('omit') && <p>Desconsiderar prevalece nesta leitura: o elemento e suas contribuições ficam fora da apresentação pública. Suas outras escolhas permanecem guardadas para uma eventual restauração.</p>}
    {d.treatments.includes('omit') && <Field id="omit-reason" label="Motivo para desconsiderar nesta leitura"><textarea id="omit-reason" required rows={3} maxLength={2000} value={d.omitReason} onChange={e => put({ omitReason: e.target.value })} /></Field>}
    <Field id="decision-rationale" label="Por que essas escolhas são adequadas à atividade?"><textarea id="decision-rationale" required rows={3} maxLength={2000} value={d.rationale} onChange={e => put({ rationale: e.target.value })} /></Field>
    {(error || draft.storageError) && <p className="error" role="alert">{error || draft.storageError}</p>}
    <button className="primary full" type="submit">Aplicar marcação</button>
    {draft.dirty && <button type="button" onClick={draft.discard}>Descartar alteração desta marcação</button>}
  </form>;
}

export function RepresentationForm({ doc, elementId, current, apply, pending }: { doc: ReadingDocument; elementId: string; current?: Representation; apply: (r: Representation) => void; pending: Pending }) {
  const initial: Representation = current || { id: `representation-${elementId}`, elementIds: [elementId], title: '', kind: 'text', text: '', columns: ['Categoria', 'Valor'], rows: [['', '']], function: '', relation: 'complementary', condition: '', alternative: '', author: doc.mediation!.responsible, updatedAt: doc.source.capturedAt };
  const draft = useDraft(`wablind.representation.${doc.id}.${current?.id || elementId}`, initial, pending);
  const r = draft.value;
  const put = (v: Partial<Representation>) => draft.update({ ...r, ...v });
  const [error, setError] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    const result = representationSchema.safeParse({ ...r, id: current?.id || crypto.randomUUID(), author: doc.mediation!.responsible || 'Professor — demonstração local', updatedAt: new Date().toISOString() });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    try { apply(result.data); draft.clear(); setError(''); } catch { setError('Não foi possível aplicar a representação. Confira os campos; o texto foi preservado.'); }
  }
  return <form className="representation-form" onSubmit={submit}>
    <h3>{current ? 'Editar representação relacionada' : 'Adicionar representação relacionada'}</h3>
    <Field id="representation-title" label="Título da representação"><input id="representation-title" value={r.title} maxLength={300} required onChange={e => put({ title: e.target.value })} /></Field>
    <fieldset><legend>Elementos de origem</legend><div className="source-choices">{doc.blocks.map((b, i) => <label className="check" key={b.id}><input type="checkbox" checked={r.elementIds.includes(b.id)} onChange={e => put({ elementIds: e.target.checked ? [...r.elementIds, b.id] : r.elementIds.filter(id => id !== b.id) })} />{i + 1}. {classificationLabels[b.kind]}</label>)}</div></fieldset>
    <Field id="representation-kind" label="Formato"><select id="representation-kind" value={r.kind} onChange={e => put({ kind: e.target.value as Representation['kind'] })}><option value="text">Texto estruturado para leitura visual ou assistiva</option><option value="table">Tabela com cabeçalhos</option></select></Field>
    {r.kind === 'text' ? <Field id="representation-text" label="Conteúdo elaborado"><textarea id="representation-text" required rows={5} maxLength={12000} value={r.text} onChange={e => put({ text: e.target.value })} /></Field> : <fieldset><legend>Dados elaborados pelo professor</legend><p>Transcreva apenas dados conferidos na fonte. Não estime valores ausentes.</p><div className="table-scroll"><table><caption>Edição da tabela</caption><thead><tr>{r.columns.map((col, i) => <th key={i} scope="col"><label className="sr-only" htmlFor={`col-${i}`}>Cabeçalho {i + 1}</label><input id={`col-${i}`} value={col} required maxLength={500} onChange={e => put({ columns: r.columns.map((c, k) => k === i ? e.target.value : c) })} /></th>)}</tr></thead><tbody>{r.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}><label className="sr-only" htmlFor={`cell-${i}-${j}`}>Linha {i + 1}, {r.columns[j]}</label><input id={`cell-${i}-${j}`} value={cell} maxLength={2000} onChange={e => put({ rows: r.rows.map((rr, k) => k === i ? rr.map((c, l) => l === j ? e.target.value : c) : rr) })} /></td>)}</tr>)}</tbody></table></div><div className="actions"><button type="button" disabled={r.rows.length >= 200} onClick={() => put({ rows: [...r.rows, r.columns.map(() => '')] })}>Adicionar linha</button><button type="button" disabled={r.columns.length >= 10} onClick={() => put({ columns: [...r.columns, 'Novo cabeçalho'], rows: r.rows.map(row => [...row, '']) })}>Adicionar coluna</button><button type="button" disabled={r.rows.length <= 1} onClick={() => put({ rows: r.rows.slice(0, -1) })}>Remover última linha</button></div></fieldset>}
    <Field id="representation-function" label="O que esta representação ajuda a realizar?"><textarea id="representation-function" required rows={2} maxLength={2000} value={r.function} onChange={e => put({ function: e.target.value })} /></Field>
    <Field id="representation-relation" label="Relação com o elemento de origem"><select id="representation-relation" value={r.relation} onChange={e => put({ relation: e.target.value as Representation['relation'] })}>{Object.entries(relationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
    <Field id="representation-condition" label="Quando e como usar em conjunto?"><textarea id="representation-condition" required rows={3} maxLength={2000} value={r.condition} onChange={e => put({ condition: e.target.value })} /></Field>
    <Field id="representation-alternative" label="Alternativa se este recurso não puder ser utilizado (opcional)"><textarea id="representation-alternative" rows={2} maxLength={2000} value={r.alternative} onChange={e => put({ alternative: e.target.value })} /></Field>
    {(error || draft.storageError) && <p className="error" role="alert">{error || draft.storageError}</p>}
    <button className="primary" type="submit">Aplicar representação</button>
    {draft.dirty && <button type="button" onClick={draft.discard}>Descartar alteração desta representação</button>}
  </form>;
}
