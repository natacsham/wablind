import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { VERSION, documentSchema, newWorkspace, parseDocument, type ReadingDocument, type Workspace } from '../shared/model';
import { examples } from '../shared/examples';
import { readLibrary, writeLibrary, download } from './storage';
import { Reading } from './Content';
import { exportHtml } from '../shared/export';
import { request } from './api';
import { Home } from './Home';
import { Logo } from './Logo';
import { History, Help } from './History';
import { reconcileWorkspace } from './workspace-state';
import { LoadBoundary } from './LoadBoundary';
const Editor = lazy(() => import('./Editor'));
const Account = lazy(() => import('./Account'));

function initialLibrary() {
  try { return { library: readLibrary(), error: '' }; }
  catch { return { library: {} as Record<string, Workspace>, error: 'Não foi possível recuperar os trabalhos deste navegador. Os dados existentes foram preservados; exporte qualquer trabalho novo antes de fechar a página.' }; }
}
export default function App() {
  const [initial] = useState(initialLibrary);
  const [library, setLibrary] = useState<Record<string, Workspace>>(initial.library);
  const [storageError, setStorageError] = useState(initial.error);
  const [route, setRoute] = useState(location.hash.slice(1) || '/');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [publicDoc, setPublicDoc] = useState<ReadingDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [resetId, setResetId] = useState('');
  const main = useRef<HTMLElement>(null);
  const routeParts = route.split('?')[0].split('/').filter(Boolean);
  const page = routeParts[0] || '';
  const id = routeParts[1];
  const current = id ? library[id] : undefined;
  const readingDoc = page === 'published' ? publicDoc : page === 'example' ? examples.find(e => e.document.id === id)?.document : page === 'snapshot' ? current?.publication : current?.document;
  function announce(message: string) { setStatus(message); }

  useEffect(() => {
    const listener = () => { setRoute(location.hash.slice(1) || '/'); setError(''); setStatus(''); };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    const titles: Record<string, string> = { projects: 'Área do professor', read: 'Prévia da leitura', snapshot: 'Leitura preparada neste navegador', published: 'Leitura publicada', example: 'Exemplo demonstrativo', examples: 'Exemplos demonstrativos', about: 'A evolução da WABlind', history: 'A evolução da WABlind', help: 'Ajuda e acessibilidade' };
    document.title = `${titles[page] || 'Buscar uma página'} — WABlind`;
    if (page) main.current?.focus();
  }, [route]);
  useEffect(() => {
    if (page !== 'published' || !id) return;
    let active = true;
    setPublicDoc(null); setLoading(true); setError('');
    void request<{ document: ReadingDocument }>(`/publications/${encodeURIComponent(id)}`, 'GET', undefined, false)
      .then(data => { if (active) setPublicDoc(documentSchema.parse(data.document)); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível abrir a publicação.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [route, retry]);

  function persist(w: Workspace, expectedDocument?: ReadingDocument) {
    setLibrary(previous => {
      const next = { ...previous, [w.document.id]: reconcileWorkspace(previous[w.document.id], w, expectedDocument) };
      if (!initial.error) try { writeLibrary(next); setStorageError(''); } catch { setStorageError('Não foi possível gravar neste navegador. Exporte o JSON antes de fechar a página.'); }
      return next;
    });
  }
  function start(doc: ReadingDocument, fresh = false) {
    if (fresh || !library[doc.id]) persist(newWorkspace(doc));
    setResetId(''); location.hash = '/edit/' + doc.id;
  }
  function openRemote(w: Workspace) {
    const old = library[w.document.id];
    const draftPrefixes = ['wablind.resource.', 'wablind.decision.', 'wablind.representation.', 'wablind.form-drafts.'];
    const pending = old ? Object.keys(sessionStorage).filter(key => draftPrefixes.some(prefix => key === prefix + old.document.id || key.startsWith(prefix + old.document.id + '.'))).map(key => ({ key, value: sessionStorage.getItem(key)! })) : [];
    if (old && (JSON.stringify(old.document) !== JSON.stringify(old.savedDocument) || pending.length)) {
      if (old.remoteVersion === w.remoteVersion) {
        announce('Continuando seu rascunho neste navegador, incluindo campos ainda não aplicados.');
        location.hash = '/edit/' + old.document.id;
        return;
      }
      if (initial.error) throw new Error('Não foi possível preservar o rascunho local. Abra-o na lista e exporte uma cópia antes de carregar outra revisão.');
      const copy = structuredClone(old);
      const copyId = crypto.randomUUID();
      copy.document.id = copyId;
      copy.document.title = `${copy.document.title.slice(0, 270)} (rascunho preservado)`;
      if (copy.savedDocument) copy.savedDocument.id = copyId;
      for (const revision of copy.revisions) revision.document.id = copyId;
      delete copy.remoteId; delete copy.remoteVersion; delete copy.ownerId; copy.publication = null;
      const next = { ...library, [copyId]: copy, [w.document.id]: w };
      try {
        for (const draft of pending) {
          const prefix = draftPrefixes.find(prefix => draft.key === prefix + old.document.id || draft.key.startsWith(prefix + old.document.id + '.'))!;
          sessionStorage.setItem(prefix + copyId + draft.key.slice((prefix + old.document.id).length), draft.value);
        }
        writeLibrary(next);
      } catch { throw new Error('Não foi possível preservar todos os campos do rascunho. A revisão da conta não foi aberta. Retome o trabalho local e exporte uma cópia.'); }
      setLibrary(next);
      try { for (const draft of pending) sessionStorage.removeItem(draft.key); }
      catch { announce('O rascunho foi preservado em cópia. Retome e revise os campos antes de abrir a versão da conta.'); location.hash = '/edit/' + copyId; return; }
      announce('A conta tem uma revisão mais recente. Seu rascunho e os campos ainda não aplicados foram preservados numa cópia local.');
    } else {
      persist(w);
    }
    location.hash = '/edit/' + w.document.id;
  }

  const exampleCards = <ul className="example-grid">{examples.map(e => <li className="example-card" key={e.document.id}><p className="eyebrow">{e.tag}</p><h3>{e.document.title}</h3><p>{e.summary}</p><div className="actions"><button className="primary" onClick={() => start(e.document)}>Editar exemplo: {e.document.title}</button><a className="button" href={`#/example/${e.document.id}`}>Ler exemplo</a></div>{library[e.document.id] && <div className="reset-example">{resetId === e.document.id ? <><p>Reiniciar remove somente o rascunho e o histórico deste exemplo neste navegador. Exporte o JSON antes se quiser guardar as alterações.</p><button onClick={() => start(e.document, true)}>Confirmar reinício do exemplo</button><button onClick={() => setResetId('')}>Cancelar reinício</button></> : <button className="text-button" onClick={() => setResetId(e.document.id)}>Reiniciar exemplo</button>}</div>}</li>)}</ul>;

  return <div className={`app-shell${!page ? ' app-home' : ''}`}>
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); main.current?.focus(); }}>Ir para o conteúdo principal</a>
    <header className="site-header"><a className="brand" href="#/" aria-label="WABlind, início"><Logo /></a><nav aria-label="Navegação principal"><a href="#/projects" aria-current={page === 'projects' ? 'page' : undefined}>Área do professor</a><a href="#/help" aria-current={page === 'help' ? 'page' : undefined}>Ajuda</a></nav></header>
    <div className="status-region" role="status">{status}</div>
    <main id="main" ref={main} tabIndex={-1}>
      {storageError && <p className="error" role="alert">{storageError}</p>}{error && <p className="error" role="alert">{error}</p>}
      {!page && <Home library={library} />}
      {page === 'projects' && <><div className="page-heading"><p className="eyebrow">CONTEÚDO, ATIVIDADE E MEDIAÇÃO</p><h1>Área do professor</h1><p>Abra uma página, selecione seus elementos e prepare as formas de explorar sua atividade.</p></div><LoadBoundary area="a conta do professor"><Suspense fallback={<p role="status">Carregando conta…</p>}><Account open={openRemote} announce={announce} /></Suspense></LoadBoundary>
        <section className="local-projects" aria-labelledby="local-title"><h2 id="local-title">Trabalhos neste navegador</h2><p>Rascunhos e leituras locais não ficam disponíveis para outras pessoas na internet.</p>{Object.values(library).length ? <ul className="project-list">{Object.values(library).map(w => <li key={w.document.id}><div><h3>{w.document.title}</h3><p>{w.revisions.length} revisão(ões) · {w.remoteId ? 'Rascunho da conta, preservado neste navegador' : 'Trabalho local'}</p></div><div className="actions"><a className="button" href={`#/edit/${w.document.id}`}>Continuar edição: {w.document.title}</a>{w.publication && !w.remoteId && <a href={`#/snapshot/${w.document.id}`}>Abrir leitura local</a>}</div></li>)}</ul> : <p>Nenhum trabalho salvo neste navegador.</p>}
          <details className="file-recovery"><summary>Recuperar uma cópia de segurança JSON</summary><p>Esta opção recupera trabalho já exportado pela WABlind. Para começar com um site, informe a URL na área conectada.</p><label htmlFor="backup-file">Arquivo JSON exportado</label><input id="backup-file" type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; if (file) void file.text().then(text => { const doc = parseDocument(text); if (library[doc.id]) { doc.id = crypto.randomUUID(); doc.title = `${doc.title.slice(0, 275)} (cópia recuperada)`; } persist(newWorkspace(doc)); announce('Cópia recuperada. Abra o trabalho na lista.'); }).catch(e => setError(e instanceof Error ? e.message : 'Arquivo incompatível.')); event.target.value = ''; }} /></details>
        </section><section className="examples-section"><h2>Experimente sem conta</h2><p>Materiais próprios, editáveis localmente, disponíveis mesmo sem o serviço de captura.</p>{exampleCards}</section></>}
      {page === 'examples' && <section className="examples-section"><div className="page-heading"><p className="eyebrow">DEMONSTRAÇÃO LOCAL</p><h1>Experimente a mediação</h1><p>Três materiais próprios para selecionar, classificar e preparar representações. Alterações ficam neste navegador e podem ser reiniciadas.</p></div>{exampleCards}</section>}
      {page === 'edit' && (current ? <LoadBoundary key={id} area="o editor" saveCopy={() => download(`${current.document.id}.json`, JSON.stringify(current.document, null, 2), 'application/json')}><Suspense fallback={<p role="status">Carregando editor…</p>}><Editor key={id} workspace={current} update={persist} announce={announce} /></Suspense></LoadBoundary> : <Missing />)}
      {['read', 'snapshot', 'published', 'example'].includes(page) && (loading ? <p role="status">Carregando leitura…</p> : readingDoc ? <><div className="reader-toolbar"><a href={page === 'published' || page === 'example' ? '#/' : `#/edit/${id}`}>← {page === 'published' || page === 'example' ? 'Voltar à busca' : 'Voltar à edição'}</a><span>{page === 'published' ? 'Revisão publicada' : page === 'snapshot' ? 'Revisão preparada · somente neste navegador' : page === 'example' ? 'Conteúdo demonstrativo próprio' : 'Prévia do rascunho'}</span><button onClick={() => download(`${readingDoc.id}.html`, exportHtml(readingDoc), 'text/html')}>Exportar HTML</button></div><Reading key={`${page}-${id}`} document={readingDoc} /></> : page === 'published' ? <div className="empty-state"><h1>Leitura não disponível</h1><p>A publicação pode ter sido retirada ou o serviço pode estar indisponível.</p><button onClick={() => setRetry(v => v + 1)}>Tentar novamente</button><a className="button" href="#/">Voltar à busca</a></div> : <Missing />)}
      {(page === 'about' || page === 'history') && <History />}{page === 'help' && <Help />}
      {page && !['projects', 'edit', 'read', 'snapshot', 'published', 'example', 'examples', 'about', 'history', 'help'].includes(page) && <Missing />}
    </main>
    <footer className="site-footer"><div><span className="footer-credit">Natacsha Melo · UFAM · PPGI</span><span className="footer-version">{VERSION} · Mediação multimodal de conteúdo web</span></div><nav aria-label="Informações da WABlind"><a href="#/history">A evolução da WABlind</a><a href="#/help">Ajuda e acessibilidade</a></nav></footer>
  </div>;
}
function Missing() { return <div className="empty-state"><h1>Recurso não encontrado</h1><p>Retome um trabalho salvo ou escolha um exemplo.</p><a href="#/projects" className="button primary">Ir para a área do professor</a></div>; }
