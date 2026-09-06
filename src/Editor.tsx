import { useEffect, useRef, useState, type FormEvent } from 'react';
import { categories, canAnnotate, blockText, kindLabels, inspectDocument, saveRevision, documentSchema, type ReadingDocument, type Category, type Workspace, type Annotation } from '../shared/model';
import { BlockContent } from './Content';
import { download } from './storage';
import { exportHtml } from '../shared/export';
import { request, remoteConfigured, supabase } from './api';

export default function Editor({ workspace: w, update, announce }: { workspace: Workspace; update: (w: Workspace) => void; announce: (s: string) => void }) {
  const doc = w.document;
  const [selected, setSelected] = useState(doc.blocks[0].id);
  const [category, setCategory] = useState<Category>('main');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [undo, setUndo] = useState<Workspace[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string>();
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState<{ user_id: string }[]>([]);
  const [rights, setRights] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const block = doc.blocks.find(b => b.id === selected) || doc.blocks[0];
  const existing = doc.annotations.find(a => a.elementId === block.id && a.category === category);
  const dirty = JSON.stringify(doc) !== JSON.stringify(w.savedDocument);
  const issues = inspectDocument(doc);
  useEffect(() => { supabase?.auth.getUser().then(({ data }) => setUserId(data.user?.id)); }, []);
  useEffect(() => { if (w.remoteId) request<{ members: { user_id: string }[] }>(`/projects/${w.remoteId}`).then(data => setMembers(data.members)).catch(() => {}); }, [w.remoteId]);
  useEffect(() => { setDescription(existing?.description || ''); setNote(existing?.note || ''); }, [selected, category, existing?.id, existing?.updatedAt]);
  function choose(id: string, focus = false) {
    const next = doc.blocks.find(b => b.id === id)!;
    setSelected(id); setCategory(next.kind === 'image' ? 'description' : next.kind === 'table' ? 'table' : next.kind === 'list' ? 'list' : 'main');
    setError(''); announce('Elemento selecionado. Nenhuma marcação foi aplicada ainda.');
    if (focus) setTimeout(() => heading.current?.focus(), 0);
  }
  function change(next: Workspace) { setUndo(prev => [...prev, w].slice(-20)); update(next); }
  function apply(e: FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setError('Escreva uma descrição antes de aplicar a marcação.'); return; }
    const annotation: Annotation = { id: existing?.id || crypto.randomUUID(), elementId: block.id, category, description: description.trim(), note: note.trim(), author: userId || 'Mediação local', updatedAt: new Date().toISOString() };
    change({ ...w, document: { ...doc, annotations: [...doc.annotations.filter(a => a.id !== annotation.id), annotation] } });
    setError(''); announce('Marcação aplicada ao rascunho. Salve uma revisão para concluir.');
  }
  async function save() {
    setError(''); setBusy(true);
    try {
      let next = saveRevision(w);
      if (w.remoteId) {
        const response = await request<{ version: number; document: ReadingDocument }>(`/projects/${w.remoteId}/revisions`, 'POST', { document: doc, expectedVersion: w.remoteVersion });
        const canonical = documentSchema.parse(response.document);
        next = { ...saveRevision({ ...w, document: canonical }), remoteVersion: response.version };
      }
      update(next); announce(w.remoteId ? 'Revisão salva no serviço e neste navegador.' : 'Revisão salva neste navegador. Exporte uma cópia para guardar fora dele.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function sendRemote() {
    setError(''); setBusy(true);
    try {
      const response = await request<{ id: string; version: number; owner_id: string; document: ReadingDocument }>('/projects', 'POST', { document: doc });
      update({ ...saveRevision({ ...w, document: documentSchema.parse(response.document) }), remoteId: response.id, remoteVersion: response.version, ownerId: response.owner_id });
      setUserId(response.owner_id); announce('Projeto privado criado no serviço. Publicar é uma ação separada.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function publish(remove = false) {
    setError(''); setBusy(true);
    try {
      if (!w.remoteId) {
        update({ ...w, publication: structuredClone(w.savedDocument!) });
        announce('Versão de leitura preparada apenas neste navegador. Ela ainda não é um link público.');
        return;
      }
      await request(`/projects/${w.remoteId}/publication`, remove ? 'DELETE' : 'POST', remove ? undefined : { expectedVersion: w.remoteVersion, rightsConfirmed: rights });
      update({ ...w, publication: remove ? null : structuredClone(w.savedDocument!) });
      announce(remove ? 'Publicação retirada.' : 'Versão publicada. Novas edições continuarão privadas até outra publicação.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <>
    <div className="page-heading editor-heading"><div><a className="back-link" href="#/projects">← Meus projetos</a><p className="eyebrow">ESPAÇO DE MEDIAÇÃO</p><h1>{doc.title}</h1><p className="muted">Selecione um trecho. Dê contexto. Construa uma leitura.</p></div><span className="status-pill">{w.remoteId ? 'Projeto conectado' : 'Demonstração local'}</span></div>
    <div className="editor-toolbar"><span className={dirty ? 'unsaved' : 'saved'}>{dirty ? '● Rascunho · revisão não salva' : '✓ Revisão salva'}</span><div className="actions"><button disabled={!undo.length || busy} onClick={() => { update(undo[undo.length - 1]); setUndo(undo.slice(0, -1)); announce('Última alteração desfeita.'); }}>Desfazer</button><a className="button" href={`#/read/${doc.id}`}>Prévia da leitura</a><button className="primary" onClick={save} disabled={busy || !dirty}>{busy ? 'Aguarde…' : 'Salvar revisão'}</button></div></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="editor-grid">
      <aside className="elements-panel"><h2>Elementos</h2><p className="small muted">{doc.blocks.length} trechos · {doc.annotations.length} marcações</p><ol className="element-list">{doc.blocks.map((b, i) => <li key={b.id}><button aria-pressed={selected === b.id} onClick={() => choose(b.id)}><span className="element-number">{String(i + 1).padStart(2, '0')}</span><span><span className="element-kind">{kindLabels[b.kind]}</span><span className="element-text">{blockText(b).slice(0, 85)}{blockText(b).length > 85 ? '…' : ''}</span>{doc.annotations.some(a => a.elementId === b.id) && <span className="marked">✓ Com marcação</span>}</span></button></li>)}</ol></aside>
      <section className="content-panel" aria-labelledby="source-heading"><div className="panel-heading"><h2 id="source-heading">Conteúdo da fonte</h2><span className="small muted">Ordem preservada</span></div>{doc.blocks.map(b => <div key={b.id} className={`content-block ${selected === b.id ? 'selected' : ''}`}><div className="block-bar"><span>{kindLabels[b.kind]} {selected === b.id ? '· Selecionado' : ''}</span><button className="text-button" onClick={() => choose(b.id, true)} aria-label={`Marcar ${kindLabels[b.kind].toLowerCase()}: ${blockText(b).slice(0, 55)}`}>Marcar trecho</button></div><BlockContent block={b} document={doc} />{doc.annotations.filter(a => a.elementId === b.id).map(a => <span className="marker-tag" key={a.id}>{categories[a.category].label}</span>)}</div>)}</section>
      <aside className="marker-panel"><p className="eyebrow">CONTEXTO HUMANO</p><h2 ref={heading} tabIndex={-1}>Adicionar marcação</h2><p className="selected-summary">Selecionado: {kindLabels[block.kind].toLowerCase()} · {blockText(block).slice(0, 100)}</p><form onSubmit={apply}>
        <label htmlFor="category">Tipo de marcador</label><select id="category" value={category} onChange={e => setCategory(e.target.value as Category)}>{Object.entries(categories).filter(([key]) => canAnnotate(block, key as Category)).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}</select>
        <p className="field-help" id="marker-help">{categories[category].help} {categories[category].example}</p>
        <label htmlFor="description">Descrição <span className="muted">(obrigatória)</span></label><textarea id="description" rows={5} maxLength={4000} required value={description} aria-describedby="marker-help" onChange={e => setDescription(e.target.value)} />
        <label htmlFor="pedagogy">Finalidade pedagógica <span className="muted">(opcional)</span></label><textarea id="pedagogy" rows={3} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} />
        <div className="marker-preview"><span className="small">PRÉVIA DO MARCADOR</span><strong>{categories[category].label}</strong><p>{description || 'Sua descrição aparecerá junto ao trecho na leitura.'}</p></div>
        <button className="primary full" type="submit">{existing ? 'Atualizar marcação' : 'Aplicar ao trecho'}</button>
      </form>{existing && <button className="danger text-button" onClick={() => { change({ ...w, document: { ...doc, annotations: doc.annotations.filter(a => a.id !== existing.id) } }); setDescription(''); setNote(''); announce('Marcação removida. Você pode desfazer.'); }}>Remover esta marcação</button>}</aside>
    </div>
    <section className="review-section"><div><p className="eyebrow">REVISÃO E CONTINUIDADE</p><h2>Seu trabalho não termina no marcador.</h2><p>Revise as contribuições, guarde uma cópia e prepare a leitura.</p></div>
      <details><summary>Contribuições ({doc.annotations.length})</summary>{doc.annotations.length ? <ul className="contributions">{doc.annotations.map(a => <li key={a.id}><strong>{categories[a.category].label}</strong><p>{a.description}</p><p className="small muted">{a.author === 'Mediação local' ? a.author : 'Mediador identificado no projeto'} · {new Date(a.updatedAt).toLocaleString('pt-BR')}</p><button onClick={() => { setSelected(a.elementId); setCategory(a.category); heading.current?.focus(); }}>Editar contribuição</button></li>)}</ul> : <p>Nenhuma marcação aplicada ainda.</p>}</details>
      <details><summary>Revisão técnica ({issues.length} pendências)</summary><p>Esta triagem não comprova conformidade. Revise a informação e o contexto.</p><ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>{!issues.length && <p>Nenhuma pendência detectada pelas regras limitadas desta versão.</p>}</details>
      <details><summary>Histórico ({w.revisions.length} revisões)</summary><p>Restaurar cria um rascunho; não modifica a versão publicada.</p>{w.revisions.length ? <ol>{[...w.revisions].reverse().map((r, i) => <li key={r.id}>{new Date(r.createdAt).toLocaleString('pt-BR')} · {r.document.annotations.length} marcações <button onClick={() => { change({ ...w, document: structuredClone(r.document) }); announce('Revisão restaurada como rascunho.'); }}>Restaurar revisão {w.revisions.length - i}</button></li>)}</ol> : <p>Salve a primeira revisão para iniciar o histórico.</p>}</details>
      <div className="export-box"><h3>Guardar e compartilhar</h3><div className="actions"><button onClick={() => download(`${doc.id}.json`, JSON.stringify(doc, null, 2), 'application/json')}>Exportar JSON</button><button onClick={() => download(`${doc.id}.html`, exportHtml(doc), 'text/html')}>Exportar leitura HTML</button>{!w.remoteId && remoteConfigured && <button disabled={busy} onClick={sendRemote}>Salvar como projeto privado on-line</button>}</div><p className="small muted">O JSON preserva conteúdo e marcações do rascunho, não contas ou histórico. O HTML é uma versão independente para leitura.</p>
        {w.remoteId ? <><label className="check"><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} />Confirmo a revisão do conteúdo e a autorização para disponibilizar esta versão.</label><div className="actions"><button className="primary" disabled={busy || dirty || !rights || userId !== w.ownerId} onClick={() => publish()}>Publicar revisão salva</button>{w.publication && <><a href={`#/published/${w.remoteId}`}>Abrir publicação</a><button disabled={busy || userId !== w.ownerId} onClick={() => publish(true)}>Retirar publicação</button></>}</div><p className="small">Somente a pessoa proprietária do projeto publica. Pendências de conteúdo devem ser revisadas antes da confirmação.</p></> : <><button disabled={dirty || busy} onClick={() => publish()}>Preparar leitura local da revisão salva</button>{w.publication && <a className="inline-link" href={`#/snapshot/${doc.id}`}>Abrir versão local preparada</a>}<p className="small muted">Não gera um link público. Para disponibilizar on-line, conecte um projeto ao serviço.</p></>}
      </div>
      {w.remoteId && userId === w.ownerId && <details><summary>Compartilhar a edição</summary><p>Informe o e-mail de um mediador já cadastrado pela administradora.</p><form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await request(`/projects/${w.remoteId}/members`, 'POST', { email: memberEmail }); setMemberEmail(''); const data = await request<{ members: { user_id: string }[] }>(`/projects/${w.remoteId}`); setMembers(data.members); announce('Acesso de mediação concedido.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}><label htmlFor="member-email">E-mail do mediador</label><input id="member-email" type="email" required value={memberEmail} onChange={e => setMemberEmail(e.target.value)} /><button disabled={busy}>Conceder acesso</button></form><ul>{members.map(member => <li key={member.user_id}>Mediador {member.user_id.slice(0, 8)} <button disabled={busy} onClick={async () => { setBusy(true); try { await request(`/projects/${w.remoteId}/members/${member.user_id}`, 'DELETE'); setMembers(members.filter(m => m.user_id !== member.user_id)); announce('Acesso de edição retirado. Cópias já exportadas não podem ser revogadas.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>Retirar acesso de {member.user_id.slice(0, 8)}</button></li>)}</ul></details>}
    </section>
  </>;
}
