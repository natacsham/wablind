import { useEffect, useMemo, useRef, useState } from 'react';
import { type ReadingDocument } from '../../shared/model';
import { escapeHtml, renderBlock } from '../../shared/export';
import { request } from '../api';

type Preview = { html: string; elementIds: string[]; warnings: string[] };
export function SourcePreview({ doc, remoteId, selected, select }: { doc: ReadingDocument; remoteId?: string; selected: string; select: (id: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const token = useMemo(() => crypto.randomUUID(), [doc.id]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setPreview(null); setError('');
    if (remoteId) request<Preview>(`/projects/${remoteId}/preview`).then(value => { if (active) setPreview(value); }).catch(() => { if (active) setError('A prévia visual da captura está indisponível. Você pode continuar pela apresentação estruturada e pela lista de elementos.'); });
    return () => { active = false; };
  }, [remoteId, doc.id]);
  const original = useMemo(() => ({ ...doc, schemaVersion: 1 as const, annotations: [], mediation: undefined }), [doc]);
  const fallback = useMemo(() => doc.blocks.map(b => `<section data-wablind-id="${escapeHtml(b.id)}">${renderBlock(b, original)}</section>`).join(''), [doc.blocks, original]);
  const html = useMemo(() => {
    const body = preview?.html || fallback;
    const allowed = JSON.stringify(doc.blocks.map(b => b.id));
    // The only executable content is this application-owned selector. Source scripts
    // and external resources are removed on capture; opaque iframe origin is kept.
    const selector = `const token=${JSON.stringify(token)},ids=new Set(${allowed});
      function mark(id){document.querySelectorAll('[data-wablind-id]').forEach(el=>{el.classList.toggle('wablind-selected',el.getAttribute('data-wablind-id')===id);});}
      document.querySelectorAll('[data-wablind-id]').forEach(el=>{if(ids.has(el.getAttribute('data-wablind-id'))){el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','Selecionar elemento: '+(el.textContent||(el.matches('img')?el.getAttribute('alt'):el.querySelector('img')?.alt)||'imagem').slice(0,90));}});
      function choose(event){const el=event.target.closest('[data-wablind-id]');if(!el)return;const id=el.getAttribute('data-wablind-id');if(ids.has(id)){event.preventDefault();mark(id);parent.postMessage({type:'wablind-select',token,id},'*');}}
      document.addEventListener('click',e=>{e.preventDefault();choose(e);});document.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')choose(e);});
      addEventListener('message',e=>{if(e.source===parent&&e.data?.token===token&&e.data?.type==='wablind-highlight'&&ids.has(e.data.id))mark(e.data.id);});`;
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'nonce-${token}'; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>body{font:1rem/1.6 system-ui;color:#172d3c;background:white;padding:1rem;margin:0;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}td,th{border:1px solid #627486;padding:.4rem}[data-wablind-id]{cursor:pointer;scroll-margin:1rem}[data-wablind-id]:focus{outline:3px solid #6b2e96;outline-offset:3px}.wablind-selected{outline:4px solid #005d79!important;outline-offset:3px;background-color:#dff7ff!important;color:#102c3a!important}pre{white-space:pre-wrap}</style></head><body>${body}<script nonce="${token}">${selector}</script></body></html>`;
  }, [preview, fallback, doc.blocks, token]);
  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.token !== token || event.data?.type !== 'wablind-select' || typeof event.data?.id !== 'string') return;
      if (doc.blocks.some(b => b.id === event.data.id)) select(event.data.id);
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [doc.blocks, select, token]);
  function highlight() { frame.current?.contentWindow?.postMessage({ type: 'wablind-highlight', token, id: selected }, '*'); }
  useEffect(highlight, [selected, token]);
  return <>
    <p className="small">{preview ? 'Prévia isolada da página capturada; apenas estilos suportados são preservados.' : 'Apresentação estruturada da captura; não reproduz o layout original.'} Selecione um elemento aqui ou na lista equivalente.</p>
    {error && <p role="status">{error}</p>}
    {!!preview?.warnings.length && <details><summary>Limites da prévia ({preview.warnings.length})</summary><ul>{preview.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details>}
    <iframe ref={frame} title="Página-fonte: seleção de elementos" className="source-preview" sandbox="allow-scripts" srcDoc={html} onLoad={highlight} />
  </>;
}
