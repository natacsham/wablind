import { z } from 'zod';

export const VERSION = '2.1.0-beta.1';
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
  omit: { label: 'Desconsiderar nesta leitura', help: 'Não apresentar nesta leitura, preservando a captura e registrando o motivo.', example: 'Ex.: Repetição sem função nesta atividade, após revisão do professor.' },
} as const;
export type Category = keyof typeof categories;
export const annotationSchema = z.object({
  id, elementId: id, category: z.enum(Object.keys(categories) as [Category, ...Category[]]),
  description: z.string().trim().min(1).max(4000), note: z.string().max(2000), author: z.string().max(150), updatedAt: z.iso.datetime(),
}).strict();
export type Annotation = z.infer<typeof annotationSchema>;
export const treatmentLabels = { preserve: 'Preservar', describe: 'Descrever', explain: 'Explicar', summarize: 'Incluir na síntese', omit: 'Desconsiderar nesta leitura' } as const;
export const classificationLabels = { heading: 'Título ou seção', paragraph: 'Trecho de texto', quote: 'Citação', code: 'Código', image: 'Imagem', list: 'Lista', table: 'Tabela', reference: 'Link ou referência' } as const;
export const relationLabels = { complementary: 'Complementar: usar em conjunto', alternative: 'Alternativa: outra forma para a mesma função', sequential: 'Sequencial: explorar depois do elemento' } as const;
const short = z.string().max(2000);
const decisionSchema = z.object({
  elementId: id, classification: z.enum(['heading', 'paragraph', 'quote', 'code', 'image', 'list', 'table', 'reference']),
  role: short, treatments: z.array(z.enum(['preserve', 'describe', 'explain', 'summarize', 'omit'])).min(1).max(6),
  description: z.string().max(4000), explanation: z.string().max(6000), rationale: short, omitReason: short,
  author: z.string().max(150), updatedAt: z.iso.datetime(),
}).strict();
export const representationSchema = z.object({
  id, elementIds: z.array(id).min(1).max(1500), title: z.string().trim().min(1).max(300), kind: z.enum(['text', 'table']),
  text: z.string().max(12000), columns: z.array(z.string().max(500)).max(30), rows: z.array(z.array(z.string().max(2000)).max(30)).max(200),
  function: short, relation: z.enum(['complementary', 'alternative', 'sequential']), condition: short, alternative: short,
  author: z.string().max(150), updatedAt: z.iso.datetime(),
}).strict().superRefine((r, ctx) => {
  if (r.kind === 'table' && (!r.columns.length || !r.rows.length || r.rows.some(row => row.length !== r.columns.length))) ctx.addIssue({ code: 'custom', message: 'A tabela elaborada precisa de cabeçalhos e linhas com a mesma quantidade de células.' });
  if (r.kind === 'text' && !r.text.trim()) ctx.addIssue({ code: 'custom', message: 'Escreva o conteúdo da representação.' });
});
export const mediationSchema = z.object({
  task: short, purpose: short, context: short, responsible: z.string().max(150),
  sourceTitle: z.string().max(300), sourceAuthor: z.string().max(500),
  rightsBasis: z.enum(['pending', 'own', 'licensed', 'permission']), rightsReference: short,
  summary: z.object({ text: z.string().max(12000), elementIds: z.array(id).max(1500) }).strict(),
  references: z.array(z.object({ id, title: z.string().min(1).max(300), url: href, author: z.string().max(500) }).strict()).max(30),
  decisions: z.array(decisionSchema).max(1500), representations: z.array(representationSchema).max(100),
}).strict();
export type Mediation = z.infer<typeof mediationSchema>;
export type ElementDecision = z.infer<typeof decisionSchema>;
export type Representation = z.infer<typeof representationSchema>;
export const documentSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]), id, title: z.string().trim().min(1).max(300), language: z.string().regex(/^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/),
  source: z.object({ url: href.optional(), capturedAt: z.iso.datetime(), hash: z.string().max(100), processorVersion: z.string().max(50), attribution: z.string().max(2000), rights: z.enum(['demo-original', 'review-required', 'authorized']) }).strict(),
  blocks: z.array(blockSchema).min(1).max(1500), annotations: z.array(annotationSchema).max(1500), warnings: z.array(z.string().max(1000)).max(200), mediation: mediationSchema.optional(),
  publicView: z.object({ elementOrder: z.array(id).min(1).max(1500), omissions: z.array(z.object({ elementId: id, reason: z.string().max(4000) }).strict()).max(1500) }).strict().optional(),
}).strict().superRefine((d, ctx) => {
  const ids = d.blocks.map(b => b.id);
  const omittedIds = d.publicView?.omissions.map(o => o.elementId) || [];
  if (d.publicView) {
    const order = d.publicView.elementOrder;
    if (new Set(order).size !== order.length || new Set(omittedIds).size !== omittedIds.length || omittedIds.some(target => ids.includes(target)) || order.some(target => !ids.includes(target) && !omittedIds.includes(target)) || [...ids, ...omittedIds].some(target => !order.includes(target))) ctx.addIssue({ code: 'custom', message: 'Manifesto público incompatível com a leitura.' });
  }
  if (d.schemaVersion === 2 && !d.mediation) ctx.addIssue({ code: 'custom', message: 'Formato 2 exige o registro de mediação.' });
  if (d.schemaVersion === 1 && d.mediation) ctx.addIssue({ code: 'custom', message: 'Contribuições novas exigem formato 2.' });
  if (d.mediation) {
    const m = d.mediation;
    if (new Set(m.decisions.map(x => x.elementId)).size !== m.decisions.length) ctx.addIssue({ code: 'custom', message: 'Decisões duplicadas para um elemento.' });
    if (new Set(m.representations.map(x => x.id)).size !== m.representations.length) ctx.addIssue({ code: 'custom', message: 'Representações duplicadas.' });
    const targets = [...m.summary.elementIds, ...m.representations.flatMap(x => x.elementIds)];
    if (m.decisions.some(x => !ids.includes(x.elementId)) || targets.some(target => !ids.includes(target) && !omittedIds.includes(target))) ctx.addIssue({ code: 'custom', message: 'Contribuição aponta para elemento inexistente nesta captura.' });
  }
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
  if (category === 'omit') return true;
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
  try { const doc = documentSchema.parse(JSON.parse(input)); if (doc.publicView) throw new Error('public-read-only'); return doc; } catch { throw new Error('Arquivo incompatível. Use uma cópia privada exportada pela WABlind, no formato 1 ou 2. Uma leitura pública não contém a captura completa para edição.'); }
}
export function imageDescription(doc: ReadingDocument, elementId: string): string | null {
  const decision = doc.mediation?.decisions.find(d => d.elementId === elementId);
  if (decision?.treatments.includes('describe') && decision.description.trim()) return decision.description;
  const legacy = doc.annotations.find(a => a.elementId === elementId && a.category === 'description');
  const block = doc.blocks.find(b => b.id === elementId);
  return legacy?.description ?? (block?.kind === 'image' ? block.alt : null);
}
export function readingProjection(doc: ReadingDocument) {
  const omissions = [...(doc.publicView?.omissions || []), ...doc.blocks.flatMap(b => {
    const d = doc.mediation?.decisions.find(d => d.elementId === b.id);
    const legacy = doc.annotations.find(a => a.elementId === b.id && a.category === 'omit');
    return d ? (d.treatments.includes('omit') ? [{ elementId: b.id, reason: d.omitReason }] : []) : legacy ? [{ elementId: b.id, reason: legacy.description }] : [];
  })];
  const omitted = new Set(omissions.map(o => o.elementId));
  const blocks = doc.blocks.filter(b => !omitted.has(b.id)).map(b => {
    const kind = doc.mediation?.decisions.find(d => d.elementId === b.id)?.classification;
    // Reclassification never fabricates data or changes the immutable capture.
    if (kind === 'heading' && 'content' in b && b.kind !== 'heading') return { id: b.id, kind: 'heading' as const, level: 2, content: b.content };
    if (kind === 'paragraph' && b.kind === 'heading') return { id: b.id, kind: 'paragraph' as const, content: b.content };
    return b;
  });
  const sections = blocks.filter(b => b.kind === 'heading' || doc.annotations.some(a => a.elementId === b.id && a.category === 'section'));
  return { blocks, sections, omissions };
}
export function elementPosition(doc: ReadingDocument, elementId: string): number {
  return (doc.publicView?.elementOrder || doc.blocks.map(b => b.id)).indexOf(elementId) + 1;
}
export function toV2(doc: ReadingDocument): ReadingDocument {
  if (doc.publicView) throw new Error('A leitura pública não inclui a captura privada. Informe a URL para iniciar outra atividade.');
  if (doc.schemaVersion === 2) return structuredClone(doc);
  const decisions: ElementDecision[] = doc.blocks.flatMap(b => {
    const annotations = doc.annotations.filter(a => a.elementId === b.id);
    if (!annotations.length) return [];
    const description = annotations.find(a => a.category === 'description')?.description || '';
    const omission = annotations.find(a => a.category === 'omit');
    return [{ elementId: b.id, classification: b.kind, role: '', treatments: [...(omission ? ['omit' as const] : ['preserve' as const]), ...(description ? ['describe' as const] : [])], description, explanation: '', rationale: '', omitReason: omission?.description || '', author: annotations[0].author, updatedAt: annotations[0].updatedAt }];
  });
  return { ...structuredClone(doc), schemaVersion: 2, mediation: { task: '', purpose: '', context: '', responsible: '', sourceTitle: doc.title, sourceAuthor: '', rightsBasis: doc.source.rights === 'demo-original' ? 'own' : 'pending', rightsReference: doc.source.rights === 'demo-original' ? 'Material demonstrativo original da WABlind.' : '', summary: { text: '', elementIds: [] }, references: [], decisions, representations: [] } };
}
export function publicationIssues(doc: ReadingDocument): string[] {
  const m = doc.mediation;
  if (!m) return inspectDocument(doc).filter(x => x.startsWith('Imagem ') || x.startsWith('Tabela '));
  const issues: string[] = [];
  if (!m.task.trim() || !m.purpose.trim() || !m.responsible.trim()) issues.push('Informe tarefa, objetivo e responsável pela mediação.');
  if (!m.sourceTitle.trim() || m.rightsBasis === 'pending' || !m.rightsReference.trim()) issues.push('Identifique a fonte e registre a licença ou autorização de uso.');
  if (m.summary.text.trim() && !m.summary.elementIds.length) issues.push('Associe a síntese aos elementos utilizados.');
  for (const d of m.decisions) {
    if (!d.role.trim() || !d.rationale.trim()) issues.push(`Elemento ${d.elementId}: informe função e justificativa.`);
    if (d.treatments.includes('omit') && !d.omitReason.trim()) issues.push(`Elemento ${d.elementId}: informe o motivo para desconsiderar.`);
    if (d.treatments.includes('describe') && !d.description.trim()) issues.push(`Elemento ${d.elementId}: escreva a descrição.`);
    if (d.treatments.includes('explain') && !d.explanation.trim()) issues.push(`Elemento ${d.elementId}: escreva a explicação.`);
  }
  for (const r of m.representations) if (!r.function.trim() || !r.condition.trim() || !r.author.trim()) issues.push(`Representação ${r.title}: informe função, condição e responsável.`);
  const visible = readingProjection(doc).blocks;
  if (!visible.length) issues.push('A leitura precisa preservar ao menos um elemento.');
  for (const b of visible) if (b.kind === 'image' && imageDescription(doc, b.id) === null) issues.push(`Imagem ${b.id}: descreva a informação ou desconsidere com justificativa.`);
  return issues;
}
export function inspectDocument(doc: ReadingDocument): string[] {
  const issues = [...doc.warnings];
  for (const b of readingProjection(doc).blocks) {
    if (b.kind === 'image' && imageDescription(doc, b.id) === null) issues.push(`Imagem ${b.id}: a fonte não fornece descrição. Requer revisão humana.`);
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
