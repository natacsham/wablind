import { describe, it, expect } from 'vitest';
import { publicAddress, validateTarget, parseHtml } from '../server/capture';
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
});
