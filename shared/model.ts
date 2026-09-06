import { z } from 'zod';

export const VERSION = '2.0.0-beta.1';
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const text = z.string().max(30000);
export function safeHref(value: string): boolean {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password && value.length <= 2048; } catch { return false; }
}
const href = z.string().refine(safeHref, 'O endereço precisa ser HTTP ou HTTPS, sem credenciais.');
export const inlineSchema = z.object({ text, href: href.optional(), strong: z.boolean().optional(), emphasis: z.boolean().optional() }).strict();
const inlines = z.array(inlineSchema).max(2000);
export const blockSchema = z.discriminatedUnion('kind', [
  z.object({ id, kind: z.literal('heading'), level: z.number().int().min(1).max(6), content: inlines }).strict(),
  z.object({ id, kind: z.enum(['paragraph', 'quote', 'code']), content: inlines }).strict(),
  z.object({ id, kind: z.literal('list'), ordered: z.boolean(), items: z.array(inlines).max(1000) }).strict(),
  z.object({ id, kind: z.literal('table'), caption: text, rows: z.array(z.array(z.object({ content: inlines, header: z.boolean(), colspan: z.number().int().min(1).max(100).optional(), rowspan: z.number().int().min(1).max(100).optional(), scope: z.enum(['row', 'col', 'rowgroup', 'colgroup']).optional() }).strict()).max(100)).max(1000) }).strict(),
  z.object({ id, kind: z.literal('image'), alt: text.nullable(), caption: text, originalUrl: href.optional(), src: z.string().max(750000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).optional(), illustration: z.enum(['water', 'leaves', 'sky']).optional() }).strict(),
]);
export type Inline = z.infer<typeof inlineSchema>;
export type Block = z.infer<typeof blockSchema>;
export const categories = {
  section: { label: 'Título ou seção', help: 'Identifique uma seção para facilitar a navegação.', example: 'Ex.: Como a água retorna aos rios.' },
  main: { label: 'Conteúdo principal', help: 'Destaque o trecho central para a atividade, sem apagar os demais.', example: 'Ex.: Observe esta explicação antes de responder.' },
  description: { label: 'Descrição de imagem', help: 'Descreva a informação visual relevante para esta leitura.', example: 'Ex.: Setas mostram a passagem da água do rio para as nuvens.' },
  list: { label: 'Lista', help: 'Acrescente uma orientação para interpretar os itens.', example: 'Ex.: Materiais necessários para a observação.' },
  table: { label: 'Tabela', help: 'Explique como ler os dados e as relações entre linhas e colunas.', example: 'Ex.: Compare o consumo nas duas situações.' },
  reference: { label: 'Link ou referência', help: 'Explique a finalidade de uma referência existente.', example: 'Ex.: Leitura complementar sobre o tema.' },
  authorship: { label: 'Autoria', help: 'Identifique a autoria ou procedência sem substituir os créditos originais.', example: 'Ex.: Material didático demonstrativo da WABlind.' },
  activity: { label: 'Atividade complementar', help: 'Proponha uma atividade relacionada ao conteúdo.', example: 'Ex.: Explique com suas palavras o percurso apresentado.' },
} as const;
export type Category = keyof typeof categories;
export const annotationSchema = z.object({
  id, elementId: id, category: z.enum(Object.keys(categories) as [Category, ...Category[]]),
  description: z.string().trim().min(1).max(4000), note: z.string().max(2000), author: z.string().max(150), updatedAt: z.iso.datetime(),
}).strict();
export type Annotation = z.infer<typeof annotationSchema>;
export const documentSchema = z.object({
  schemaVersion: z.literal(1), id, title: z.string().trim().min(1).max(300), language: z.string().regex(/^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/),
  source: z.object({ url: href.optional(), capturedAt: z.iso.datetime(), hash: z.string().max(100), processorVersion: z.string().max(50), attribution: z.string().max(2000), rights: z.enum(['demo-original', 'review-required', 'authorized']) }).strict(),
  blocks: z.array(blockSchema).min(1).max(1500), annotations: z.array(annotationSchema).max(1500), warnings: z.array(z.string().max(1000)).max(200),
}).strict().superRefine((d, ctx) => {
  const ids = d.blocks.map(b => b.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Elementos com identificadores repetidos.' });
  if (new Set(d.annotations.map(a => a.id)).size !== d.annotations.length) ctx.addIssue({ code: 'custom', message: 'Marcações repetidas.' });
  const keys = new Set<string>();
  d.annotations.forEach(a => {
    if (!ids.includes(a.elementId)) ctx.addIssue({ code: 'custom', message: 'Marcação sem elemento correspondente.' });
    const key = a.elementId + ':' + a.category;
    if (keys.has(key)) ctx.addIssue({ code: 'custom', message: 'Categoria repetida no mesmo elemento.' });
    keys.add(key);
    const block = d.blocks.find(b => b.id === a.elementId);
    if (block && !canAnnotate(block, a.category)) ctx.addIssue({ code: 'custom', message: 'Categoria incompatível com o elemento.' });
  });
});
export type ReadingDocument = z.infer<typeof documentSchema>;
export function canAnnotate(block: Block, category: Category) {
  if (category === 'description') return block.kind === 'image';
  if (category === 'list') return block.kind === 'list';
  if (category === 'table') return block.kind === 'table';
  if (category === 'section') return ['heading', 'paragraph'].includes(block.kind);
  return true;
}
export function blockText(block: Block): string {
  if ('content' in block) return block.content.map(i => i.text).join('');
  if (block.kind === 'list') return block.items.map(i => i.map(s => s.text).join('')).join('; ');
  if (block.kind === 'table') return block.caption || block.rows.map(r => r.map(c => c.content.map(i => i.text).join('')).join(' | ')).join('; ');
  return block.caption || block.alt || 'Imagem sem descrição';
}
export const kindLabels: Record<Block['kind'], string> = { heading: 'Título', paragraph: 'Parágrafo', quote: 'Citação', code: 'Código', list: 'Lista', table: 'Tabela', image: 'Imagem' };
export function parseDocument(input: string): ReadingDocument {
  if (new TextEncoder().encode(input).length > MAX_FILE_BYTES) throw new Error('O arquivo excede o limite de 5 MB.');
  try { return documentSchema.parse(JSON.parse(input)); } catch { throw new Error('Arquivo incompatível. Use um JSON exportado pela WABlind, no formato 1, com marcações válidas.'); }
}
export function inspectDocument(doc: ReadingDocument): string[] {
  const issues = [...doc.warnings];
  for (const b of doc.blocks) {
    if (b.kind === 'image' && b.alt === null && !doc.annotations.some(a => a.elementId === b.id && a.category === 'description')) issues.push(`Imagem ${b.id}: a fonte não fornece descrição. Requer revisão humana.`);
    if (b.kind === 'table' && !b.rows.some(r => r.some(c => c.header))) issues.push(`Tabela ${b.id}: não foram identificados cabeçalhos.`);
  }
  return [...new Set(issues)];
}
export type Revision = { id: string; createdAt: string; document: ReadingDocument };
export type Workspace = { document: ReadingDocument; revisions: Revision[]; savedDocument: ReadingDocument | null; publication: ReadingDocument | null; remoteId?: string; remoteVersion?: number; ownerId?: string };
export function newWorkspace(document: ReadingDocument): Workspace {
  return { document: structuredClone(document), revisions: [], savedDocument: null, publication: null };
}
export function saveRevision(w: Workspace): Workspace {
  const document = structuredClone(w.document);
  return { ...w, savedDocument: document, revisions: [...w.revisions, { id: crypto.randomUUID(), createdAt: new Date().toISOString(), document }].slice(-30) };
}
