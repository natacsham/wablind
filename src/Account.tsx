import { useEffect, useState } from 'react';
import { remoteConfigured, request, loadRemote, supabase, signInProfessor, type RemoteProject } from './api';
import { toV2, type Mediation, type Workspace } from '../shared/model';

export default function Account({ open, announce }: { open: (w: Workspace) => void; announce: (s: string) => void }) {
  const [username, setUsername] = useState('professor');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<RemoteProject[]>([]);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [rightsBasis, setRightsBasis] = useState<Mediation['rightsBasis']>('pending');
  const [rightsReference, setRightsReference] = useState('');

  useEffect(() => {
    let mounted = true;
    void supabase?.auth.getSession().then(({ data, error }) => { if (mounted) { setSignedIn(Boolean(data.session)); if (error) setError('Não foi possível recuperar a sessão. Entre novamente.'); } });
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => { if (mounted) { setSignedIn(Boolean(session)); if (!session) setProjects([]); } });
    return () => { mounted = false; subscription?.data.subscription.unsubscribe(); };
  }, []);

  async function refresh() { setProjects(await request<RemoteProject[]>('/projects')); }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível concluir. Suas informações foram preservadas.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (signedIn) void run(refresh); }, [signedIn]);

  async function openProject(id: string, initialRights?: { rightsBasis: Mediation['rightsBasis']; rightsReference: string }) {
    const data = await loadRemote(id);
    const document = toV2(data.document);
    if (initialRights && document.mediation) Object.assign(document.mediation, initialRights);
    open({ document, savedDocument: data.document,
      revisions: data.revisions.map(r => ({ id: r.id, createdAt: r.created_at, document: r.document })),
      publication: data.project.published_revision_id ? data.revisions.find(r => r.id === data.project.published_revision_id)?.document || null : null,
      remoteId: id, remoteVersion: data.project.version, ownerId: data.project.owner_id });
  }

  async function capture() {
    if (rightsBasis === 'pending' || !rightsReference.trim()) throw new Error('Informe a condição de uso e sua referência antes de abrir a página.');
    let target: URL;
    try { target = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`); } catch { throw new Error('Informe um endereço válido, por exemplo https://exemplo.org/pagina.'); }
    if (target.protocol !== 'https:' || target.username || target.password) throw new Error('Informe uma página pública com HTTPS e sem credenciais no endereço.');
    announce('Buscando e preparando a página. Isso pode levar alguns instantes.');
    const capture = await request<{ id: string }>('/captures', 'POST', { url: target.href, rightsConfirmed: true, rightsBasis, rightsReference: rightsReference.trim() });
    const result = await request<{ id: string }>('/projects', 'POST', { captureId: capture.id, ...(title.trim() ? { title: title.trim() } : {}) });
    await openProject(result.id, { rightsBasis, rightsReference: rightsReference.trim() });
    announce('Página carregada. Selecione os elementos e prepare sua atividade.');
  }

  return <section className="account-section" aria-label="Conta e páginas do professor">
    {!remoteConfigured ? <div className="notice"><strong>A área conectada ainda não está disponível.</strong><p>A entrada da conta, a captura de URLs e a publicação precisam do serviço configurado. Você já pode editar os exemplos próprios abaixo, salvar e reabrir neste navegador.</p></div> : <>
      {error && <p role="alert" className="error" id="account-error">{error}</p>}
      {!signedIn ? <form className="account-form" aria-labelledby="account-title" onSubmit={event => { event.preventDefault(); void run(async () => { await signInProfessor(username, password); setPassword(''); announce('Entrada concluída. Sua área do professor está disponível.'); }); }}>
        <h2 id="account-title">Entre na sua conta</h2>
        <label htmlFor="username">Usuário</label><input id="username" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} aria-describedby={error ? 'account-error' : undefined} />
        <label htmlFor="password">Senha</label><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} aria-describedby={error ? 'account-error' : undefined} />
        <label className="check"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} />Mostrar senha</label>
        <button className="primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar na área do professor'}</button>
        <p className="field-help">Use a conta fornecida pela administradora. O navegador pode preencher ou guardar sua senha.</p>
      </form> : <>
        <div className="account-heading"><p>Conta do professor conectada</p><button disabled={busy} onClick={() => { void run(async () => { const { error } = await supabase!.auth.signOut(); if (error) throw error; setProjects([]); announce('Você saiu da conta. Os rascunhos permanecem neste navegador e podem ser acessados por outras pessoas que utilizem este perfil.'); }); }}>Sair da conta</button></div><p className="field-help">Este navegador guarda cópias dos seus trabalhos para recuperar falhas de conexão. Em um computador compartilhado, use um perfil pessoal: sair da conta não apaga essas cópias.</p>
        <form className="capture-form" aria-labelledby="capture-title" onSubmit={event => { event.preventDefault(); void run(capture); }}>
          <h2 id="capture-title">Prepare uma página para sua atividade</h2>
          <label htmlFor="source-url">URL da página</label><input id="source-url" type="text" inputMode="url" autoCapitalize="none" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://exemplo.org/pagina" aria-describedby="url-help" />
          <p className="field-help" id="url-help">A página será carregada automaticamente. Cada abertura cria uma nova atividade; retome trabalhos existentes na lista abaixo.</p>
          <label htmlFor="resource-title">Título da atividade (opcional)</label><input id="resource-title" maxLength={300} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Comparar o consumo de água" />
          <fieldset><legend>Condição de uso da fonte</legend>
            <label htmlFor="rights-basis">Como este conteúdo pode ser utilizado?</label><select id="rights-basis" value={rightsBasis} onChange={event => setRightsBasis(event.target.value as Mediation['rightsBasis'])} required><option value="pending">Selecione a condição</option><option value="own">Conteúdo próprio</option><option value="licensed">Licença permite este uso</option><option value="permission">Autorização do titular</option></select>
            <label htmlFor="rights-reference">Referência da licença ou autorização</label><textarea id="rights-reference" required maxLength={2000} rows={3} value={rightsReference} onChange={event => setRightsReference(event.target.value)} placeholder="Identifique a licença e seu endereço, ou a autorização recebida." />
            <p className="field-help">A captura só aceita domínios habilitados pela administradora. Registrar esta informação não libera automaticamente qualquer página.</p>
          </fieldset>
          <button className="primary" disabled={busy}>{busy ? 'Carregando página…' : 'Abrir página e criar atividade'}</button>
        </form>
        <section aria-labelledby="remote-pages-title" className="remote-projects"><div className="section-heading"><h2 id="remote-pages-title">Minhas páginas e atividades</h2><button disabled={busy} onClick={() => { void run(refresh); }}>Atualizar lista</button></div>
          {projects.length ? <ul className="project-list">{projects.map(p => <li key={p.id}><div><h3>{p.title}</h3><p>Revisão {p.version} · {p.published_revision_id ? 'Com versão publicada' : 'Rascunho privado'}</p></div><button disabled={busy} onClick={() => { void run(() => openProject(p.id)); }}>Continuar: {p.title}</button></li>)}</ul> : <p>{busy ? 'Carregando atividades…' : 'Nenhuma atividade salva nesta conta.'}</p>}
        </section>
      </>}
    </>}
  </section>;
}
