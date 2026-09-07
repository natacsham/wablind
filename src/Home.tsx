import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { apiUrl, publicationsByUrl, searchPublications, type PublicationSearchItem } from './api';
import { examples } from '../shared/examples';
import type { Workspace } from '../shared/model';
import { Logo, MicrophoneIcon } from './Logo';

type Result = PublicationSearchItem & { target: string; availability?: string };
type Recognition = { lang: string; interimResults: boolean; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onerror: ((e: { error?: string }) => void) | null; onstart: (() => void) | null; onend: (() => void) | null; start(): void; stop(): void };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
function recognitionConstructor() { const w = window as SpeechWindow; return w.SpeechRecognition || w.webkitSpeechRecognition; }

export function Home({ library }: { library: Record<string, Workspace> }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const generation = useRef(0);
  const voiceAvailable = Boolean(recognitionConstructor());

  useEffect(() => {
    input.current?.focus();
    const shortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener('keydown', shortcut);
    return () => { window.removeEventListener('keydown', shortcut); generation.current++; if (recognition.current) { recognition.current.onresult = null; recognition.current.onerror = null; recognition.current.onend = null; recognition.current.stop(); } };
  }, []);

  function localResults(value: string): Result[] {
    const q = value.toLocaleLowerCase('pt-BR');
    const demo = examples.filter(e => `${e.document.title} ${e.tag} ${e.summary}`.toLocaleLowerCase('pt-BR').includes(q)).map(e => ({ id: e.document.id, title: e.document.title, sourceUrl: '', updatedAt: e.document.source.capturedAt, target: `/example/${e.document.id}`, availability: 'Exemplo próprio · disponível sem servidor' }));
    const prepared = Object.values(library).filter(w => !w.remoteId && w.publication).filter(w => `${w.publication!.title} ${w.publication!.source.url || ''}`.toLocaleLowerCase('pt-BR').includes(q)).map(w => ({ id: w.document.id, title: w.publication!.title, sourceUrl: w.publication!.source.url || '', updatedAt: w.publication!.source.capturedAt, target: `/snapshot/${w.document.id}`, availability: 'Leitura preparada somente neste navegador' }));
    return [...prepared, ...demo];
  }

  async function find(value: string, exact = false): Promise<{ items: Result[]; unavailable: boolean }> {
    const local = localResults(value);
    if (!apiUrl) return { items: local, unavailable: true };
    try {
      const remote = exact ? await publicationsByUrl(value) : await searchPublications(value);
      return { items: [...remote.map(r => ({ ...r, target: `/published/${r.id}` })), ...local], unavailable: false };
    } catch { return { items: local, unavailable: true }; }
  }

  useEffect(() => {
    const ticket = ++generation.current;
    if (query.trim().length < 2) { setResults([]); setExpanded(false); setMessage(''); return; }
    const timer = window.setTimeout(() => {
      void find(query.trim()).then(({ items, unavailable }) => {
        if (ticket !== generation.current) return;
        setResults(items); setActive(-1); setExpanded(items.length > 0);
        setMessage(items.length ? `${items.length} recurso(s) encontrado(s). Use as setas para escolher e Enter para abrir.${unavailable ? ' A busca pública está indisponível; estes resultados são locais.' : ''}` : unavailable ? 'Busca pública indisponível. Você ainda pode experimentar os exemplos próprios.' : 'Nenhum recurso publicado encontrado para essa busca.');
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, library]);

  function open(result: Result) { setExpanded(false); location.hash = result.target; }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (expanded && active >= 0 && results[active]) { open(results[active]); return; }
    const value = query.trim();
    if (!value) { setError('Digite ou fale o endereço de uma página ou um assunto.'); input.current?.focus(); return; }
    const ticket = ++generation.current;
    setBusy(true); setError(''); setVoiceMessage('');
    const exact = /^(https?:\/\/|[^\s]+\.[^\s]+)/i.test(value);
    const { items, unavailable } = await find(value, exact);
    if (ticket !== generation.current) { setBusy(false); return; }
    setBusy(false); setResults(items); setActive(-1);
    if (items.length === 1) { open(items[0]); return; }
    setExpanded(items.length > 0);
    setMessage(items.length ? `${items.length} recursos encontrados. Escolha pela finalidade da atividade.` : unavailable ? 'A busca pública está indisponível. Não foi possível verificar se essa página está na base. Os exemplos próprios continuam disponíveis.' : 'Esta página ou assunto ainda não tem um recurso publicado na WABlind.');
  }

  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') { setExpanded(false); setActive(-1); return; }
    if (!results.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setExpanded(true);
      setActive(old => event.key === 'ArrowDown' ? (old + 1) % results.length : old < 0 ? results.length - 1 : (old - 1 + results.length) % results.length);
    }
    if (expanded && active >= 0 && (event.key === 'Home' || event.key === 'End')) { event.preventDefault(); setActive(event.key === 'Home' ? 0 : results.length - 1); }
  }

  function toggleVoice() {
    if (listening) { recognition.current?.stop(); return; }
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    const rec = new Constructor(); recognition.current = rec; rec.lang = 'pt-BR'; rec.interimResults = false;
    rec.onstart = () => { setListening(true); setVoiceMessage('Escutando. Diga a URL ou o assunto. Use Parar microfone para encerrar.'); };
    rec.onresult = event => {
      const value = event.results[event.resultIndex]?.[0]?.transcript.trim();
      if (value) { setQuery(value); setError(''); setVoiceMessage(`Você disse: ${value}. Confira ou corrija o campo e selecione Buscar.`); }
    };
    rec.onerror = event => { setListening(false); setVoiceMessage(event.error === 'not-allowed' ? 'O acesso ao microfone foi recusado. Você pode digitar no campo ou autorizar o microfone nas configurações do navegador.' : 'Não foi possível reconhecer a fala. Tente novamente ou digite no campo.'); };
    rec.onend = () => { setListening(false); input.current?.focus(); };
    try { rec.start(); } catch { setListening(false); setVoiceMessage('Não foi possível iniciar o microfone. Digite no campo para continuar.'); }
  }

  return <section className="home-shell" aria-labelledby="home-title">
    <div className="search-center">
      <h1 id="home-title"><Logo large /></h1>
      <p className="home-subtitle">Mediação multimodal de conteúdo web</p>
      <p className="home-brief">Você informa a página. A WABlind baixa o conteúdo, organiza os blocos e você prepara a leitura com mediações.</p>
      <form className="home-form" role="search" aria-label="Buscar recursos preparados" onSubmit={event => { void submit(event); }}>
        <label htmlFor="student-url" className="search-label">Digite a página que você quer abrir</label>
        <div className="search-row">
          <div className="search-input-wrap">
            <input id="student-url" ref={input} type="text" role="combobox" autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search" placeholder="Cole ou fale a URL da página" value={query} aria-autocomplete="list" aria-expanded={expanded && results.length > 0} aria-controls="search-suggestions" aria-activedescendant={expanded && active >= 0 ? `search-option-${active}` : undefined} aria-describedby={`search-help${error ? ' search-error' : ''}`} aria-invalid={Boolean(error)} onKeyDown={keys} onChange={event => { generation.current++; setQuery(event.target.value); setActive(-1); setError(''); setVoiceMessage(''); setBusy(false); }} onBlur={event => { if (!event.currentTarget.form?.contains(event.relatedTarget as Node | null)) setExpanded(false); }} />
            <button type="button" className={`microphone${listening ? ' microphone-active' : ''}`} aria-label={listening ? 'Parar microfone' : 'Dizer URL ou assunto'} aria-pressed={listening} onClick={toggleVoice} disabled={!voiceAvailable} aria-describedby={!voiceAvailable ? 'voice-unavailable' : undefined} title={voiceAvailable ? 'Dizer URL ou assunto' : 'Entrada por voz indisponível neste navegador'}><MicrophoneIcon /></button>
          </div>
          <button className="primary search-submit" disabled={busy}>{busy ? 'Buscando…' : 'Abrir'}</button>
        </div>
        <p id="search-help" className="field-help">Se essa página já tiver uma leitura preparada, ela aparece aqui. Caso contrário, use materiais demonstrativos.</p>
        {!voiceAvailable && <p id="voice-unavailable" className="voice-unavailable">Voz indisponível neste navegador. A busca por texto continua disponível.</p>}
        {error && <p id="search-error" role="alert" className="error">{error}</p>}
        <p role="status" className="search-message">{voiceMessage || message}</p>
        <ul id="search-suggestions" role="listbox" aria-label="Recursos encontrados" className="suggestion-list" hidden={!expanded || !results.length}>
          {results.map((r, i) => <li role="option" aria-selected={i === active} id={`search-option-${i}`} key={`${r.target}-${i}`} className={`suggestion-option${i === active ? ' is-active' : ''}`} onMouseDown={event => event.preventDefault()} onClick={() => open(r)}><strong>{r.title}</strong>{r.purpose && <span>{r.purpose}</span>}<span className="muted">{r.availability || r.sourceUrl}</span></li>)}
        </ul>
      </form>
      <a className="demo-entry" href="#/examples">Experimentar com conteúdo demonstrativo</a>
    </div>
  </section>;
}
