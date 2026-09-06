import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { createHash, randomUUID } from 'node:crypto';
import ipaddr from 'ipaddr.js';
import { load } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { documentSchema, safeHref, type Inline, type Block, type ReadingDocument } from '../shared/model';
import { HttpError } from './errors';

const MAX_HTML = 2 * 1024 * 1024;
export function publicAddress(address: string) {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}
export function validateTarget(raw: string, hosts: string[]): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new HttpError(400, 'INVALID_URL', 'Informe um endereço HTTPS válido.'); }
  if (raw.length > 2048 || url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !hosts.includes(url.hostname.toLowerCase()) || ipaddr.isValid(url.hostname.replace(/[\[\]]/g, ''))) throw new HttpError(403, 'URL_NOT_ALLOWED', 'Este endereço não está habilitado para importação. Use HTTPS e um domínio autorizado pela administradora.');
  url.hash = ''; return url;
}
type Resource = { data: Buffer; type: string; url: string };
async function fetchResource(raw: string, hosts: string[], signal: AbortSignal, maxBytes: number, redirects = 0): Promise<Resource> {
  if (redirects > 3) throw new HttpError(422, 'REDIRECT_LIMIT', 'A página redireciona mais vezes que o permitido.');
  const url = validateTarget(raw, hosts);
  const addresses = await Promise.race([lookup(url.hostname, { all: true, verbatim: true }), new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(new HttpError(504, 'TIMEOUT', 'A importação excedeu o tempo permitido.')), { once: true }))]);
  if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new HttpError(403, 'UNSAFE_DESTINATION', 'O endereço resolve para um destino não permitido.');
  signal.throwIfAborted();
  const chosen = addresses[0];
  // Pin the verified address to the TLS connection; no second DNS lookup or shared agent.
  const resource = await new Promise<Resource & { location?: string }>((resolve, reject) => {
    const req = request(url, {
      agent: false, signal, family: chosen.family,
      lookup: ((_host: string, _options: unknown, cb: (err: Error | null, address: string, family: number) => void) => cb(null, chosen.address, chosen.family)) as never,
      headers: { 'User-Agent': 'WABlind/2.0 (single-page educational import)', Accept: 'text/html,image/png,image/jpeg,image/webp', 'Accept-Encoding': 'identity' },
    }, res => {
      const status = res.statusCode || 500;
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) { res.resume(); resolve({ data: Buffer.alloc(0), type: '', url: url.href, location: new URL(res.headers.location, url).href }); return; }
      if (status !== 200) { res.resume(); reject(new HttpError(422, 'SOURCE_UNAVAILABLE', `A fonte respondeu com status ${status}. Nenhuma autenticação será tentada.`)); return; }
      if (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity') { res.destroy(); reject(new HttpError(422, 'ENCODING_UNSUPPORTED', 'A fonte utiliza compressão não suportada nesta captura.')); return; }
      const chunks: Buffer[] = []; let bytes = 0;
      res.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > maxBytes) { res.destroy(); reject(new HttpError(413, 'CONTENT_TOO_LARGE', 'O conteúdo excede o limite de importação.')); } else chunks.push(chunk); });
      res.on('end', () => resolve({ data: Buffer.concat(chunks), type: String(res.headers['content-type'] || ''), url: url.href }));
      res.on('error', reject);
    });
    req.on('error', reject); req.setTimeout(12000, () => req.destroy(new HttpError(504, 'TIMEOUT', 'A fonte não respondeu no tempo permitido.'))); req.end();
  });
  return resource.location ? fetchResource(resource.location, hosts, signal, maxBytes, redirects + 1) : resource;
}

export function parseHtml(html: string, sourceUrl: string): ReadingDocument {
  const $ = load(html);
  const warnings: string[] = [];
  const blocks: Block[] = [];
  const nextId = () => `element-${blocks.length + 1}`;
  if ($('script,style').length) warnings.push('Scripts e estilos da fonte não foram executados nem incorporados.');
  if ($('form,input,select,textarea,button').length) warnings.push('A fonte contém controles interativos. Apenas seu texto foi preservado; a interação não é reproduzida.');
  $('script,style,template,svg').each((_, el) => { if (el.tagName === 'svg') warnings.push('Um gráfico SVG não foi incorporado. Consulte a fonte e acrescente uma descrição.'); });
  $('script,style,template').remove();
  function absolute(h: string | undefined) { if (!h) return undefined; try { const u = new URL(h, sourceUrl).href; return safeHref(u) ? u : undefined; } catch { return undefined; } }
  function parts(nodes: AnyNode[], style: Partial<Inline> = {}): Inline[] {
    return nodes.flatMap(node => {
      if (node.type === 'text') return [{ text: node.data.replace(/\s+/g, ' '), ...style }];
      if (node.type !== 'tag') return [];
      const name = node.name;
      if (['script', 'style', 'template'].includes(name)) return [];
      if (name === 'br') return [{ text: '\n' }];
      if (name === 'img') return [{ text: node.attribs.alt || '[Imagem: consulte a fonte]' }];
      return parts(node.children, { ...style, ...(['strong', 'b'].includes(name) ? { strong: true } : {}), ...(['em', 'i'].includes(name) ? { emphasis: true } : {}), ...(name === 'a' && absolute(node.attribs.href) ? { href: absolute(node.attribs.href) } : {}) });
    });
  }
  const blockTags = new Set(['p', 'div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'blockquote', 'pre', 'figure', 'img', 'dl', 'details', 'form']);
  function walk(nodes: AnyNode[]) {
    let pending: AnyNode[] = [];
    function flush() { const content = parts(pending); if (content.some(p => p.text.trim())) blocks.push({ id: nextId(), kind: 'paragraph', content }); pending = []; }
    for (const node of nodes) {
      if (node.type !== 'tag') { pending.push(node); continue; }
      const el = node as Element; const tag = el.name;
      if (!blockTags.has(tag) && !['iframe', 'video', 'audio', 'svg', 'canvas', 'embed', 'object'].includes(tag)) { pending.push(node); continue; }
      flush();
      if (/^h[1-6]$/.test(tag)) blocks.push({ id: nextId(), kind: 'heading', level: Number(tag[1]), content: parts(el.children) });
      else if (tag === 'img') {
        blocks.push({ id: nextId(), kind: 'image', alt: el.attribs.alt ?? null, caption: $(el).closest('figure').find('figcaption').first().text().trim(), ...(absolute(el.attribs.src) ? { originalUrl: absolute(el.attribs.src) } : {}) });
      } else if (tag === 'ul' || tag === 'ol') {
        if ($(el).find('ul,ol').length) { warnings.push('Uma lista aninhada exige revisão da hierarquia; seus itens foram preservados em sequência.'); }
        blocks.push({ id: nextId(), kind: 'list', ordered: tag === 'ol', items: $(el).children('li').toArray().map(li => parts(li.children)) });
      } else if (tag === 'table') {
        blocks.push({ id: nextId(), kind: 'table', caption: $(el).find('caption').first().text().trim(), rows: $(el).find('tr').toArray().map(row => $(row).children('td,th').toArray().map(cell => ({ content: parts(cell.children), header: cell.name === 'th', ...(['row', 'col', 'rowgroup', 'colgroup'].includes(cell.attribs.scope) ? { scope: cell.attribs.scope as 'row' | 'col' } : {}), ...(cell.attribs.colspan ? { colspan: Number(cell.attribs.colspan) } : {}), ...(cell.attribs.rowspan ? { rowspan: Number(cell.attribs.rowspan) } : {}) }))) });
      } else if (tag === 'pre' || tag === 'blockquote') {
        blocks.push({ id: nextId(), kind: tag === 'pre' ? 'code' : 'quote', content: tag === 'pre' ? [{ text: $(el).text() }] : parts(el.children) });
      } else if (['iframe', 'video', 'audio', 'svg', 'canvas', 'embed', 'object'].includes(tag)) {
        const label = $(el).attr('aria-label') || $(el).find('title').first().text() || $(el).text().trim();
        warnings.push(`Conteúdo ${tag} não incorporado; requer alternativa e revisão humana.`);
        blocks.push({ id: nextId(), kind: 'paragraph', content: [{ text: label || `Conteúdo ${tag}: consultar a fonte original.`, href: sourceUrl }] });
      } else walk(el.children);
      if (blocks.length > 1500) throw new HttpError(413, 'TOO_MANY_ELEMENTS', 'A página excede 1.500 elementos.');
    }
    flush();
  }
  walk($('body').contents().toArray());
  if (!blocks.length) throw new HttpError(422, 'CONTENT_UNSUPPORTED', 'Nenhum conteúdo de leitura foi encontrado. Páginas dependentes de JavaScript não são suportadas.');
  const lang = $('html').attr('lang');
  if (!lang) warnings.push('A fonte não declara idioma; português foi adotado provisoriamente. Revise antes de publicar.');
  const data = { schemaVersion: 1, id: randomUUID(), title: $('title').text().trim().slice(0, 300) || 'Página importada', language: lang || 'pt-BR', source: { url: sourceUrl, capturedAt: new Date().toISOString(), hash: createHash('sha256').update(html).digest('hex'), processorVersion: 'html-1', attribution: `Fonte: ${sourceUrl}. Créditos e condições de uso devem ser conferidos antes da publicação.`, rights: 'review-required' }, blocks, annotations: [], warnings: [...new Set(warnings)].slice(0, 200) };
  const parsed = documentSchema.safeParse(data);
  if (!parsed.success) throw new HttpError(422, 'CONTENT_UNSUPPORTED', 'A estrutura da página excede o formato suportado. A fonte não foi alterada.');
  return parsed.data;
}
export async function capturePage(url: string, hosts: string[]) {
  const signal = AbortSignal.timeout(20000);
  try {
    const resource = await fetchResource(url, hosts, signal, MAX_HTML);
    if (!/^text\/html(?:;|$)/i.test(resource.type)) throw new HttpError(415, 'CONTENT_UNSUPPORTED', 'A fonte precisa fornecer uma página HTML.');
    const charset = resource.type.match(/charset=["']?([^;\s"']+)/i)?.[1];
    if (charset && !/^(utf-8|utf8|us-ascii)$/i.test(charset)) throw new HttpError(415, 'CHARSET_UNSUPPORTED', 'A codificação desta página não é suportada.');
    const doc = parseHtml(resource.data.toString('utf8'), resource.url);
    let images = 0;
    for (const b of doc.blocks) {
      if (b.kind !== 'image' || !b.originalUrl) continue;
      if (++images > 6) { doc.warnings.push(`Imagem ${b.id}: não incorporada por limite de recursos.`); continue; }
      try {
        const img = await fetchResource(b.originalUrl, hosts, signal, 350000);
        const mime = img.type.split(';')[0].toLowerCase();
        const signature = mime === 'image/png' ? img.data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : mime === 'image/jpeg' ? img.data[0] === 255 && img.data[1] === 216 && img.data[2] === 255 : mime === 'image/webp' ? img.data.toString('ascii', 0, 4) === 'RIFF' && img.data.toString('ascii', 8, 12) === 'WEBP' : false;
        if (!signature) throw new Error('Unsupported image');
        b.src = `data:${mime};base64,${img.data.toString('base64')}`;
      } catch { doc.warnings.push(`Imagem ${b.id}: não incorporada. Consulte a fonte e revise a alternativa textual.`); }
    }
    return documentSchema.parse(doc);
  } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(504, 'CAPTURE_FAILED', 'Não foi possível importar a página dentro dos limites de segurança e tempo.'); }
}
