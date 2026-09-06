import { useEffect, useState } from 'react';
import { supabase, remoteConfigured, request, loadRemote, type RemoteProject } from './api';
import type { Workspace } from '../shared/model';
export default function Account({ open, announce }: { open: (w: Workspace) => void; announce: (s: string) => void }) {
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [projects, setProjects] = useState<RemoteProject[]>([]); const [url, setUrl] = useState(''); const [permission, setPermission] = useState(false);
  async function refresh() { try { setProjects(await request<RemoteProject[]>('/projects')); setError(''); } catch (e) { setError((e as Error).message); } }
  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const listener = supabase?.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => listener?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (signedIn) void refresh(); }, [signedIn]);
  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function openProject(id: string) {
    const data = await loadRemote(id);
    open({ document: data.document, savedDocument: data.document, revisions: data.revisions.map(r => ({ id: r.id, createdAt: r.created_at, document: r.document })), publication: data.project.published_revision_id ? data.revisions.find(r => r.id === data.project.published_revision_id)?.document || null : null, remoteId: id, remoteVersion: data.project.version, ownerId: data.project.owner_id });
  }
  return <section className="account-section"><div><p className="eyebrow">ALÉM DESTE NAVEGADOR</p><h2>Projetos conectados</h2><p>Importe uma página autorizada e salve contribuições com sua equipe.</p></div>
    {!remoteConfigured ? <div className="notice"><strong>Serviço externo ainda não conectado.</strong><p>Os exemplos, o editor e as exportações locais estão disponíveis. Importação por URL e colaboração serão habilitadas após a configuração do serviço.</p></div> : <>
      {error && <p role="alert" className="error">{error}</p>}
      {!signedIn ? <form className="account-form" onSubmit={e => { e.preventDefault(); void run(async () => {
        if (!sent) { const { error } = await supabase!.auth.signInWithOtp({ email, options: { shouldCreateUser: false } }); if (error) throw new Error('Não foi possível enviar o código. Confira o e-mail e seu cadastro com a administradora.'); setSent(true); announce('Código solicitado. Confira seu e-mail.'); }
        else { const { error } = await supabase!.auth.verifyOtp({ email, token: code, type: 'email' }); if (error) throw new Error('Código inválido ou expirado. Confira o código ou solicite outro.'); setCode(''); announce('Entrada concluída.'); }
      }); }}><label htmlFor="email">E-mail cadastrado</label><input id="email" type="email" autoComplete="email" required value={email} disabled={sent} onChange={e => setEmail(e.target.value)} />{sent && <><label htmlFor="otp">Código recebido por e-mail</label><input id="otp" autoComplete="one-time-code" inputMode="numeric" required pattern="[0-9]{6,10}" value={code} onChange={e => setCode(e.target.value)} /><button type="button" onClick={() => { setSent(false); setCode(''); }}>Alterar e-mail ou solicitar outro código</button></>}<button className="primary" disabled={busy}>{busy ? 'Aguarde…' : sent ? 'Entrar com código' : 'Receber código'}</button><p className="small muted">Acesso para mediadores cadastrados pela administradora. Não há senha da WABlind para memorizar.</p></form> : <>
        <div className="actions"><button onClick={() => run(refresh)} disabled={busy}>Atualizar projetos</button><button onClick={() => run(async () => { const { error } = await supabase!.auth.signOut(); if (error) throw error; setProjects([]); announce('Sessão encerrada. As cópias locais permanecem neste navegador.'); })}>Sair da conta</button></div>
        {projects.length ? <ul className="remote-list">{projects.map(p => <li key={p.id}><span>{p.title} <small>· revisão {p.version}</small></span><button disabled={busy} onClick={() => run(() => openProject(p.id))}>Abrir projeto conectado</button></li>)}</ul> : <p>Nenhum projeto conectado encontrado. Você pode importar uma URL ou enviar um projeto local pelo editor.</p>}
        <form className="capture-form" onSubmit={e => { e.preventDefault(); void run(async () => { const capture = await request<{ id: string }>('/captures', 'POST', { url, rightsConfirmed: permission }); const result = await request<{ id: string }>('/projects', 'POST', { captureId: capture.id }); await openProject(result.id); announce('Página importada como projeto privado. Revise o conteúdo antes de publicar.'); }); }}><label htmlFor="source-url">Endereço HTTPS da página</label><input id="source-url" type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" aria-describedby="url-help" /><p className="field-help" id="url-help">Uma página por vez, em domínio habilitado pela administradora. Páginas que exigem login ou JavaScript não são suportadas.</p><label className="check"><input type="checkbox" checked={permission} required onChange={e => setPermission(e.target.checked)} />Tenho autorização para importar este conteúdo.</label><button className="primary" disabled={busy || !permission}>{busy ? 'Processando…' : 'Importar página'}</button></form>
      </>}
    </>}
  </section>;
}
