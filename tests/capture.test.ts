import { describe, it, expect } from 'vitest';
import { publicAddress, validateTarget, parseHtml, parseHtmlWithPreview } from '../server/capture';
import { sanitizeCss } from '../server/preview';
import { load } from 'cheerio';
import { blockText } from '../shared/model';
describe('safe capture boundary', () => {
  it.each(['127.0.0.1', '10.0.0.1', '192.168.1.1', '172.16.1.1', '169.254.169.254', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '0.0.0.0', '100.64.0.1', '224.0.0.1', '192.0.2.1'])('rejects nonpublic address %s', address => expect(publicAddress(address)).toBe(false));
  it('accepts a routable address', () => expect(publicAddress('8.8.8.8')).toBe(true));
  it.each(['http://example.org', 'https://example.org:8443', 'https://user:pass@example.org', 'https://example.org.evil.test', 'file:///etc/passwd', 'https://127.0.0.1', 'https://sub.example.org'])('rejects target %s', url => expect(() => validateTarget(url, ['example.org'])).toThrow());
  it('accepts only exact configured HTTPS hosts', () => expect(validateTarget('https://example.org/a#section', ['example.org']).href).toBe('https://example.org/a'));
  it('fails closed with no allowlist', () => expect(() => validateTarget('https://example.org', [])).toThrow());
  it('preserves readable content, links and table semantics without source scripts', () => {
    const doc = parseHtml('<html lang="pt-BR"><title>Título</title><body><h1>Olá</h1><p>Texto <strong>importante</strong> e <a href="/ref">referência</a>.</p><img src="/a.png"><table><caption>Dados</caption><tr><th scope="col">Medida</th><td>10</td></tr></table><script>alert(1)</script><p onclick="evil()">Fim</p></body></html>', 'https://example.org/article');
    expect(doc.blocks.map(blockText).join(' ')).toContain('Texto importante e referência.');
    expect(JSON.stringify(doc)).not.toContain('onclick'); expect(JSON.stringify(doc)).not.toContain('alert(1)');
    expect(doc.blocks.find(b => b.kind === 'image')?.alt).toBeNull();
    const table = doc.blocks.find(b => b.kind === 'table'); expect(table?.rows[0][0].scope).toBe('col');
    expect(JSON.stringify(doc)).toContain('https://example.org/ref');
  });
  it('preserves text in nested lists and flags the simplified structure', () => {
    const doc = parseHtml('<ul><li>A<ul><li>B</li></ul></li></ul>', 'https://example.org');
    expect(doc.blocks.map(blockText).join('')).toContain('B'); expect(doc.warnings.join(' ')).toContain('hierarquia');
  });
  it('rejects empty script-only applications', () => expect(() => parseHtml('<script>render()</script>', 'https://example.org')).toThrow());
  it('creates an exact element map and inert visual preview without trusting source identifiers', () => {
    const { document, preview } = parseHtmlWithPreview('<style>@import "https://evil.test/style.css";p{color:blue;background-image:url(https://evil.test/track)}.layout{display:grid;gap:1rem}</style><div class="layout" data-wablind-id="spoofed"><h1>Título</h1><p onclick="evil()">Antes <img src="https://evil.test/track" onerror="evil()"> depois</p><a href="https://evil.test/go" target="_top">Leia</a><table><tr><th>A</th><td>B</td></tr></table><iframe src="https://evil.test"></iframe><form action="https://evil.test"><input value="Nome"><button>Enviar</button></form><script>alert(1)</script></div>', 'https://example.org');
    const $ = load(preview.html);
    const ids = $('[data-wablind-id]').toArray().map(el => $(el).attr('data-wablind-id'));
    expect(ids.sort()).toEqual(document.blocks.map(b => b.id).sort());
    expect(preview.elementIds.sort()).toEqual(ids);
    expect(preview.html).not.toMatch(/spoofed|onerror|onclick|<script|<iframe|<form|<input|<button|href=|src=|@import|url\(/i);
    expect(preview.html).toContain('display:grid');
    expect(preview.html).toContain('color:blue');
    expect(document.blocks.map(blockText).join(' ')).toContain('depois');
  });
  it('parses CSS and denies network, escaped URLs, expressions and unsafe selectors', () => {
    expect(sanitizeCss('p{background-image:u\\72l(https://evil.test);color:red;behavior:url(x)}@font-face{src:url(x)}a[href]{color:green}p:hover{color:pink}')).toBe('p{color:red}');
    expect(sanitizeCss('color: red; width: expression(alert(1)); position: fixed; padding: 1rem', true)).toBe('color:red;padding:1rem');
    expect(sanitizeCss('font-size:var(--evil);background-color:rgb(10 20 30)', true)).toBe('background-color:rgb(10 20 30)');
  });
});
