import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { blockText, kindLabels, inspectDocument, publicationIssues, saveRevision, documentSchema, toV2, readingProjection, type ReadingDocument, type Workspace, type Representation } from '../shared/model';
import { download } from './storage';
import { exportHtml } from '../shared/export';
import { request, remoteConfigured, supabase } from './api';
import { DecisionForm, RepresentationForm, ResourceForm } from './editor/forms';
import { SourcePreview } from './editor/SourcePreview';
import './editor.css';

export default function Editor({ workspace: w, update, announce }: { workspace: Workspace; update: (w: Workspace, expectedDocument?: ReadingDocument) => void; announce: (s: string) => void }) {
  const doc = useMemo(() => toV2(w.document), [w.document]);
  const m = doc.mediation!;
  const [selected, setSelected] = useState(doc.blocks[0].id);
  const [panel, setPanel] = useState<'elements' | 'source' | 'edit'>('source');
  const [epoch, setEpoch] = useState(0);
  const [editingRepresentation, setEditingRepresentation] = useState<Representation>();
  const [undo, setUndo] = useState<ReadingDocument[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string>();
  const [rights, setRights] = useState(false);
  const [pendingFields, setPendingFields] = useState<Record<string, boolean>>(() => {
    const recovered: Record<string, boolean> = {};
    try { Object.keys(sessionStorage).filter(key => key === `wablind.resource.${doc.id}` || ['decision', 'representation'].some(type => key.startsWith(`wablind.${type}.${doc.id}.`))).forEach(key => { recovered[key] = true; }); } catch { /* storage availability is reported by the form */ }
    return recovered;
  });
  const markPending = useCallback((key: string, value: boolean) => setPendingFields(prev => prev[key] === value ? prev : { ...prev, [key]: value }), []);
  const pendingKeys = Object.keys(pendingFields).filter(key => pendingFields[key]);
  const heading = useRef<HTMLHeadingElement>(null);
  const selectedBlock = doc.blocks.find(b => b.id === selected) || doc.blocks[0];
  const dirty = JSON.stringify(doc) !== JSON.stringify(w.savedDocument);
  const issues = [...new Set([...inspectDocument(doc), ...publicationIssues(doc)])];
  const omitted = new Set(readingProjection(doc).omissions.map(o => o.elementId));

  useEffect(() => { supabase?.auth.getUser().then(({ data }) => setUserId(data.user?.id)); }, []);
  useEffect(() => {
    if (!dirty && !pendingKeys.length) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty, pendingKeys.length]);

  const choose = useCallback((id: string) => {
    setSelected(id); setEditingRepresentation(undefined); setPanel('edit');
    announce('Elemento selecionado. A seleção não aplica uma marcação.');
    setTimeout(() => heading.current?.focus(), 0);
  }, [announce]);
  function focusEditor(id: string) { choose(id); setTimeout(() => heading.current?.focus(), 0); }
  function change(next: ReadingDocument, message = 'Alteração aplicada ao rascunho. Salve a revisão quando terminar.') {
    if (busy) throw new Error('Aguarde o salvamento antes de aplicar outra alteração.');
    const validated = documentSchema.parse(next);
    const activeId = document.activeElement?.id;
    const focusResource = !!document.activeElement?.closest('.resource-settings');
    setUndo(prev => [...prev, doc].slice(-20));
    update({ ...w, document: validated });
    setEpoch(v => v + 1); setError(''); setRights(false); announce(message);
    setTimeout(() => { const target = activeId ? document.getElementById(activeId) : null; if (target && target.getClientRects().length) target.focus(); else if (focusResource) document.querySelector<HTMLElement>('.resource-settings > summary')?.focus(); else heading.current?.focus(); }, 0);
  }
  function readyToSave() {
    if (!pendingKeys.length) return true;
    setError('Há texto ainda não aplicado. Aplique ou descarte os formulários indicados antes de salvar, restaurar ou publicar.');
    return false;
  }
  async function save() {
    if (!readyToSave()) return;
    setError(''); setBusy(true);
    try {
      let next = saveRevision({ ...w, document: doc });
      if (w.remoteId) {
        const response = await request<{ version: number; document: ReadingDocument }>(`/projects/${w.remoteId}/revisions`, 'POST', { document: doc, expectedVersion: w.remoteVersion });
        next = { ...saveRevision({ ...w, document: documentSchema.parse(response.document) }), remoteVersion: response.version };
      }
      update(next, w.document);
      announce(w.remoteId ? 'Revisão salva no serviço e neste navegador. A publicação não foi alterada.' : 'Revisão salva neste navegador. Exporte uma cópia para guardar fora dele.');
    } catch (e) { setError(`${(e as Error).message} O rascunho foi mantido neste navegador.`); }
    finally { setBusy(false); }
  }
  async function sendRemote() {
    if (!readyToSave()) return;
    setError(''); setBusy(true);
    try {
      const response = await request<{ id: string; version: number; owner_id: string; document: ReadingDocument }>('/projects', 'POST', { document: doc });
      update({ ...saveRevision({ ...w, document: documentSchema.parse(response.document) }), remoteId: response.id, remoteVersion: response.version, ownerId: response.owner_id }, w.document);
      setUserId(response.owner_id); announce('Atividade privada salva no serviço. Publicar é uma ação separada.');
    } catch (e) { setError(`${(e as Error).message} O rascunho local foi preservado.`); }
    finally { setBusy(false); }
  }
  async function publish(remove = false) {
    if (!remove && (!readyToSave() || dirty || !w.savedDocument)) return;
    if (!remove && publicationIssues(doc).length) { setError('Revise as pendências indicadas antes de disponibilizar a leitura.'); return; }
    setError(''); setBusy(true);
    try {
      if (!w.remoteId) {
        update({ ...w, publication: structuredClone(w.savedDocument!) });
        announce('Leitura preparada apenas neste navegador. Não foi criada uma publicação on-line.'); return;
      }
      await request(`/projects/${w.remoteId}/publication`, remove ? 'DELETE' : 'POST', remove ? undefined : { expectedVersion: w.remoteVersion, rightsConfirmed: rights });
      update({ ...w, publication: remove ? null : structuredClone(w.savedDocument!) }, w.document);
      announce(remove ? 'Publicação retirada.' : 'Revisão publicada. Novas edições continuarão privadas até outra publicação.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function resumePending(key: string) {
    const tail = key.split('.').at(-1)!;
    const rep = m.representations.find(r => r.id === tail);
    if (rep) { choose(rep.elementIds[0]); setEditingRepresentation(rep); }
    else if (doc.blocks.some(b => b.id === tail)) choose(tail);
    if (key.includes('.resource.')) {
      const details = document.querySelector<HTMLDetailsElement>('.resource-settings');
      if (details) details.open = true;
      document.getElementById('resource-title')?.focus();
    } else setTimeout(() => { const details = document.querySelector<HTMLDetailsElement>('.related-editor'); if (details && key.includes('.representation.')) details.open = true; heading.current?.focus(); }, 0);
  }

  return <>
    <div className="page-heading editor-heading"><div><a className="back-link" href="#/projects">← Área do professor</a><p className="eyebrow">ESPAÇO DE MEDIAÇÃO</p><h1>{doc.title}</h1><p>Selecione um elemento, defina seu papel na atividade e prepare a leitura.</p></div><span className="status-pill">{w.remoteId ? 'Atividade conectada' : 'Demonstração local'}</span></div>
    {w.document.schemaVersion === 1 && <p className="migration-note">Esta edição usa o formato 2. A captura e as revisões anteriores serão preservadas. Funções e justificativas antigas não serão inventadas.</p>}
    <div className="editor-toolbar"><span>{pendingKeys.length ? 'Texto ainda não aplicado' : dirty ? 'Rascunho · revisão não salva' : 'Revisão salva'}</span><div className="actions"><button disabled={!undo.length || busy} onClick={() => { if (!readyToSave()) return; update({ ...w, document: undo.at(-1)! }); setUndo(prev => prev.slice(0, -1)); setEpoch(v => v + 1); announce('Última alteração desfeita no rascunho.'); }}>Desfazer</button><a className="button" href={`#/read/${doc.id}`}>Prévia do leitor</a><button className="primary" onClick={save} disabled={busy || (!dirty && !pendingKeys.length)}>{busy ? 'Aguarde…' : 'Salvar revisão'}</button></div></div>
    {!!pendingKeys.length && <aside className="pending-forms" aria-label="Formulários em edição"><p>{pendingKeys.length} formulário(s) com texto ainda não aplicado. Trocar de elemento não apaga esse texto.</p><ul>{pendingKeys.map(key => <li key={key}><button onClick={() => resumePending(key)}>Retomar {key.includes('.resource.') ? 'dados da atividade' : key.includes('.decision.') ? 'marcação' : 'representação'} {key.split('.').at(-1) === doc.id ? '' : key.split('.').at(-1)}</button></li>)}</ul></aside>}
    {error && <p className="error" role="alert">{error}</p>}
    <fieldset disabled={busy} className="editing-fields"><legend className="sr-only">Edição da atividade</legend>
    <ResourceForm key={`resource-${epoch}`} doc={doc} pending={markPending} apply={(title, metadata) => change({ ...doc, title, mediation: { ...m, ...metadata } })} />
    <nav className="editor-panel-switch" aria-label="Painéis de edição">{(['elements', 'source', 'edit'] as const).map((id, i) => <button key={id} aria-pressed={panel === id} onClick={() => setPanel(id)}>{['Elementos', 'Página-fonte', 'Marcação'][i]}</button>)}</nav>
    <div className="mediation-grid" data-panel={panel}>
      <aside className="elements-panel"><h2>Elementos da fonte</h2><p>{doc.blocks.length} elementos · {m.decisions.length} decisões aplicadas</p><ol className="element-list">{doc.blocks.map((b, i) => <li key={b.id}><button aria-pressed={selected === b.id} onClick={() => choose(b.id)}><span className="element-number">{i + 1}</span><span><span className="element-kind">{kindLabels[b.kind]}</span><span className="element-text">{blockText(b).slice(0, 95)}</span>{m.decisions.some(d => d.elementId === b.id) && <span className="marked">Marcação aplicada</span>}{omitted.has(b.id) && <span className="omit-state">Desconsiderado na leitura</span>}</span></button></li>)}</ol></aside>
      <section className="content-panel" aria-labelledby="source-heading"><h2 id="source-heading">Página-fonte</h2><SourcePreview doc={doc} remoteId={w.remoteId} selected={selected} select={choose} /><button className="full" onClick={() => focusEditor(selected)}>Editar elemento selecionado</button></section>
      <aside className="marker-panel"><h2 ref={heading} tabIndex={-1}>Editar elemento selecionado</h2><p className="selected-summary">{kindLabels[selectedBlock.kind]}: {blockText(selectedBlock).slice(0, 160)}</p>
        <DecisionForm key={`decision-${selected}-${epoch}`} doc={doc} elementId={selectedBlock.id} pending={markPending} apply={decision => change({ ...doc, mediation: { ...m, decisions: [...m.decisions.filter(d => d.elementId !== decision.elementId), decision] } })} />
        {m.decisions.some(d => d.elementId === selected) && <button className="text-button" onClick={() => { if (!readyToSave()) return; change({ ...doc, annotations: doc.annotations.filter(a => a.elementId !== selected), mediation: { ...m, decisions: m.decisions.filter(d => d.elementId !== selected) } }, 'Marcação removida. O elemento volta à apresentação original. Você pode desfazer.'); }}>Remover marcação e preservar elemento</button>}
        <details className="related-editor"><summary>Representações relacionadas ({m.representations.filter(r => r.elementIds.includes(selected)).length})</summary><p>Associe uma orientação, explicação ou tabela e indique como trabalha com o elemento para esta tarefa.</p>
          <ul>{m.representations.filter(r => r.elementIds.includes(selected)).map(r => <li key={r.id}><strong>{r.title}</strong><p>{r.function}</p><div className="actions"><button onClick={() => setEditingRepresentation(r)}>Editar {r.title}</button><button onClick={() => { if (!readyToSave()) return; setEditingRepresentation(undefined); change({ ...doc, mediation: { ...m, representations: m.representations.filter(item => item.id !== r.id) } }, 'Representação removida do rascunho. Você pode desfazer.'); }}>Remover {r.title}</button></div></li>)}</ul>
          {editingRepresentation && <button onClick={() => setEditingRepresentation(undefined)}>Criar outra representação</button>}
          <RepresentationForm key={`representation-${selected}-${editingRepresentation?.id}-${epoch}`} doc={doc} elementId={selected} current={editingRepresentation} pending={markPending} apply={representation => { change({ ...doc, mediation: { ...m, representations: [...m.representations.filter(r => r.id !== representation.id), representation] } }); setEditingRepresentation(undefined); }} />
        </details>
      </aside>
    </div>
    </fieldset>
    <section className="review-section"><h2>Revisar, salvar e disponibilizar</h2>
      <details open={issues.length > 0}><summary>Pendências e avisos ({issues.length})</summary><p>Estas regras são limitadas. Não substituem a revisão humana de conteúdo e acessibilidade.</p>{issues.length ? <ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul> : <p>Nenhuma pendência detectada pelas regras desta versão.</p>}</details>
      <details><summary>Contribuições aplicadas ({m.decisions.length})</summary><ul>{m.decisions.map(d => <li key={d.elementId}><strong>{kindLabels[doc.blocks.find(b => b.id === d.elementId)!.kind]} · {d.role}</strong><p>{d.rationale}</p><p>{d.author} · {new Date(d.updatedAt).toLocaleString('pt-BR')}</p><button onClick={() => focusEditor(d.elementId)}>Editar contribuição</button></li>)}</ul></details>
      <details><summary>Histórico ({w.revisions.length} revisões)</summary><p>Restaurar cria um rascunho. A publicação existente permanece intacta.</p>{w.revisions.length ? <ol>{[...w.revisions].reverse().map((revision, i) => <li key={revision.id}>{new Date(revision.createdAt).toLocaleString('pt-BR')} <button onClick={() => { if (readyToSave()) change(toV2(revision.document), 'Revisão restaurada como rascunho. A publicação não mudou.'); }}>Restaurar revisão {w.revisions.length - i}</button></li>)}</ol> : <p>Salve a primeira revisão para iniciar o histórico.</p>}</details>
      <div className="export-box"><h3>Guardar uma cópia</h3><div className="actions"><button onClick={() => download(`${doc.id}.json`, JSON.stringify(doc, null, 2), 'application/json')}>Exportar JSON</button><button onClick={() => download(`${doc.id}.html`, exportHtml(doc), 'text/html')}>Exportar leitura HTML</button>{!w.remoteId && remoteConfigured && <button disabled={busy} onClick={sendRemote}>Salvar atividade privada on-line</button>}</div><p>O JSON inclui a captura privada e as contribuições aplicadas. O HTML contém a leitura organizada. Campos ainda não aplicados não entram na exportação.</p></div>
      <div className="publication-box"><h3>{w.remoteId ? 'Publicação' : 'Leitura local'}</h3>{w.remoteId ? <><label className="check"><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} />Revisei esta versão e confirmo as condições de autorização registradas.</label><div className="actions"><button className="primary" disabled={busy || dirty || !rights || userId !== w.ownerId} onClick={() => publish()}>Publicar revisão salva</button>{w.publication && <><a href={`#/published/${w.remoteId}`}>Abrir publicação</a><button disabled={busy || userId !== w.ownerId} onClick={() => publish(true)}>Retirar publicação</button></>}</div><p>Somente a pessoa proprietária publica. Salvar alterações não atualiza automaticamente a versão pública.</p></> : <><button disabled={dirty || busy} onClick={() => publish()}>Preparar leitura local da revisão salva</button>{w.publication && <a className="inline-link" href={`#/snapshot/${doc.id}`}>Abrir versão local preparada</a>}<p>Disponível apenas neste navegador. Para outra pessoa acessar, é necessário conectar o serviço e publicar.</p></>}</div>
    </section>
  </>;
}
