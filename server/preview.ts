import { load } from 'cheerio';
import { parse, generate, walk, type Declaration } from 'css-tree';
import { blockText, type ReadingDocument } from '../shared/model';
import { HttpError } from './errors';

export type SourcePreview = { html: string; elementIds: string[]; warnings: string[] };

const properties = new Set(('color background-color font-family font-size font-style font-weight line-height letter-spacing text-align text-decoration text-transform white-space overflow-wrap word-break display width max-width min-width height max-height min-height margin margin-top margin-right margin-bottom margin-left margin-inline margin-block padding padding-top padding-right padding-bottom padding-left padding-inline padding-block border border-width border-style border-color border-radius border-collapse border-spacing vertical-align box-sizing gap row-gap column-gap flex flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-content align-self justify-content grid-template-columns grid-template-rows grid-column grid-row list-style-type object-fit').split(' '));
const functions = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'calc', 'min', 'max', 'clamp', 'repeat', 'minmax']);
function safeDeclaration(node: Declaration) {
  if (!properties.has(node.property.toLowerCase()) || node.important) return false;
  let safe = true;
  walk(node.value, child => {
    if (['Url', 'Raw', 'Atrule'].includes(child.type)) safe = false;
    if (child.type === 'Function' && !functions.has(child.name.toLowerCase())) safe = false;
    if (child.type === 'Identifier' && /[\\]|expression|javascript|behavior|-moz-binding/i.test(child.name)) safe = false;
  });
  return safe;
}
/** Parse CSS as an AST; only inert layout/typography declarations survive. */
export function sanitizeCss(css: string, inline = false): string {
  if (css.length > 200000) return '';
  try {
    const ast = parse(css, { context: inline ? 'declarationList' : 'stylesheet', parseValue: true, parseCustomProperty: true });
    walk(ast, {
      visit: 'Atrule', enter(_node, item, list) { list.remove(item); return this.skip; },
    });
    walk(ast, {
      visit: 'Rule', enter(node, item, list) {
        let safe = node.prelude?.type === 'SelectorList';
        if (node.prelude) walk(node.prelude, n => {
          if (['Raw', 'AttributeSelector', 'PseudoElementSelector', 'PseudoClassSelector'].includes(n.type)) safe = false;
        });
        if (!safe) { list.remove(item); return this.skip; }
      },
    });
    walk(ast, { visit: 'Declaration', enter(node, item, list) { if (!safeDeclaration(node)) list.remove(item); } });
    return generate(ast).replace(/</g, '\\3c ');
  } catch { return ''; }
}

const tags = new Set('div span p article main header footer nav aside section h1 h2 h3 h4 h5 h6 ul ol li dl dt dd table caption colgroup col thead tbody tfoot tr td th figure figcaption img a strong b em i u s small sub sup br hr blockquote pre code abbr time mark label'.split(' '));
const attributes = new Set(['id', 'class', 'lang', 'dir', 'title', 'colspan', 'rowspan', 'scope', 'start', 'reversed']);

/** Private source preview, never used as the public reading representation. */
export function sanitizePreview(mappedHtml: string, document: ReadingDocument): SourcePreview {
  const $ = load(mappedHtml);
  const blockIds = new Set(document.blocks.map(b => b.id));
  const warnings = ['Prévia aproximada: scripts, formulários, estilos externos, fontes externas e conteúdo incorporado não são executados. Use a lista de elementos para a edição por teclado.'];
  const styles = $('style').toArray().map(el => sanitizeCss($(el).text())).join('\n');
  $('script,style,link,meta,base,template,noscript').remove();
  $('iframe,object,embed,svg,math,canvas,audio,video').each((_, el) => {
    const id = $(el).attr('data-wablind-id');
    const block = document.blocks.find(b => b.id === id);
    if (block) { const substitute = $('<p></p>').attr('data-wablind-id', block.id).text(blockText(block)); $(el).replaceWith(substitute); }
    else $(el).remove();
  });
  $('input,select,textarea,button').each((_, el) => {
    const label = $(el).text() || $(el).attr('aria-label') || '';
    $(el).replaceWith($('<span></span>').text(label));
  });
  $('body *').toArray().forEach(el => {
    if (!tags.has(el.tagName)) { $(el).replaceWith($(el).contents()); return; }
    const ownId = el.attribs['data-wablind-id'];
    const sourceStyle = el.attribs.style;
    for (const name of Object.keys(el.attribs)) if (!attributes.has(name)) $(el).removeAttr(name);
    if (ownId && blockIds.has(ownId)) $(el).attr('data-wablind-id', ownId);
    if (sourceStyle) { const safe = sanitizeCss(sourceStyle, true); if (safe) $(el).attr('style', safe); }
    if (el.tagName === 'img') {
      const block = document.blocks.find(b => b.id === ownId);
      if (block?.kind === 'image' && block.src) $(el).attr('src', block.src).attr('alt', block.alt || '');
      else { const placeholder = $('<span></span>').text(block?.kind === 'image' ? block.alt || 'Imagem não incorporada' : 'Imagem não incorporada'); if (ownId && blockIds.has(ownId)) placeholder.attr('data-wablind-id', ownId); $(el).replaceWith(placeholder); }
    }
  });
  const seen = new Set<string>();
  $('[data-wablind-id]').each((_, el) => {
    const id = $(el).attr('data-wablind-id')!;
    if (seen.has(id)) $(el).removeAttr('data-wablind-id'); else seen.add(id);
  });
  const missing = document.blocks.filter(b => !seen.has(b.id));
  if (missing.length) {
    warnings.push('Alguns elementos foram separados do layout original para manter sua seleção e seu conteúdo.');
    missing.forEach(b => { $('body').append($('<p></p>').attr('data-wablind-id', b.id).text(blockText(b))); seen.add(b.id); });
  }
  const base = 'html{color-scheme:light}body{margin:1rem;font:1rem/1.6 system-ui;color:#172635;background:white}img{max-width:100%;height:auto}pre{white-space:pre-wrap}table{max-width:100%}[data-wablind-id]{cursor:pointer}[data-wablind-id]:hover{outline:3px solid #1559b6}';
  const result = { html: `<style>${styles}\n${base}</style>${$('body').html() || ''}`, elementIds: [...seen], warnings };
  if (Buffer.byteLength(JSON.stringify(result)) > 5 * 1024 * 1024) throw new HttpError(413, 'CONTENT_TOO_LARGE', 'A prévia excede o limite de 5 MB.');
  return result;
}
