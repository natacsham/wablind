import { describe, expect, it } from 'vitest';
import { examples } from '../shared/examples';
import { documentSchema, toV2, publicationIssues, readingProjection, newWorkspace, saveRevision, parseDocument, type ElementDecision } from '../shared/model';
import { exportHtml } from '../shared/export';
const decision = (elementId: string, values: Partial<ElementDecision> = {}): ElementDecision => ({ elementId, classification: 'paragraph', role: 'Orientar a comparação', treatments: ['preserve'], description: '', explanation: '', rationale: 'Relaciona os dados à tarefa', omitReason: '', author: 'Teste sintético', updatedAt: '2026-09-07T12:00:00.000Z', ...values });
describe('mediação formato 2', () => {
  it('converts without modifying original capture or inventing pedagogical roles', () => {
    const original = structuredClone(examples[0].document);
    original.annotations = [{ id: 'legacy', elementId: 'water-intro', category: 'main', description: 'Leia primeiro', note: '', author: 'Legado', updatedAt: original.source.capturedAt }];
    const previous = JSON.stringify(original); const converted = toV2(original);
    expect(JSON.stringify(original)).toBe(previous);
    expect(converted.source).toEqual(original.source); expect(converted.blocks).toEqual(original.blocks);
    expect(converted.mediation?.decisions[0].role).toBe(''); expect(converted.annotations).toEqual(original.annotations);
    expect(parseDocument(JSON.stringify(converted))).toEqual(converted);
  });
  it('applies omission consistently to reading, export and section index, without deleting capture', () => {
    const doc = toV2(examples[0].document);
    doc.mediation!.decisions.push(decision('water-heading', { classification: 'heading', treatments: ['omit'], omitReason: 'Título redundante para esta leitura.' }));
    expect(readingProjection(doc).blocks.some(b => b.id === 'water-heading')).toBe(false);
    expect(readingProjection(doc).sections.some(b => b.id === 'water-heading')).toBe(false);
    expect(exportHtml(doc)).not.toContain('Um ciclo, diferentes caminhos');
    expect(exportHtml(doc)).toContain('Título redundante');
    expect(doc.blocks.some(b => b.id === 'water-heading')).toBe(true);
  });
  it('requires provenance and validates representation origins on reimport', () => {
    const doc = toV2(examples[1].document); const m = doc.mediation!;
    Object.assign(m, { task: 'Comparar os valores', purpose: 'Expressar a comparação', responsible: 'Professor sintético', sourceTitle: doc.title });
    expect(publicationIssues(doc)).toEqual([]);
    m.summary.text = 'As duas mudas cresceram dois centímetros.';
    expect(publicationIssues(doc)).toContain('Associe a síntese aos elementos utilizados.');
    m.summary.elementIds = ['garden-table']; expect(publicationIssues(doc)).toEqual([]);
    m.summary.elementIds = ['not-present']; expect(documentSchema.safeParse(doc).success).toBe(false);
  });
  it('does not automatically turn selected material into an authored summary', () => {
    const doc = toV2(examples[1].document);
    doc.mediation!.decisions.push(decision('garden-intro', { treatments: ['preserve', 'explain', 'summarize'], explanation: 'Confira os cabeçalhos.' }));
    expect(doc.mediation!.summary.text).toBe('');
    expect(exportHtml(doc)).toContain('Confira os cabeçalhos.');
    expect(exportHtml(doc)).not.toContain('Síntese elaborada');
  });
  it('retains fixed published snapshots when a restored draft includes a previously omitted element', () => {
    let w = saveRevision(newWorkspace(toV2(examples[1].document)));
    w.document.mediation!.decisions.push(decision('garden-intro', { treatments: ['omit'], omitReason: 'Redundante' }));
    w = saveRevision(w); w.publication = structuredClone(w.savedDocument);
    w.document = structuredClone(w.revisions[0].document);
    expect(readingProjection(w.document).blocks.length).toBe(5);
    expect(readingProjection(w.publication!).blocks.length).toBe(4);
  });
  it('rejects executable reference URLs and invalid tables', () => {
    const doc = toV2(examples[1].document);
    doc.mediation!.references.push({ id: 'ref', title: 'Ataque', url: 'javascript:alert(1)', author: '' });
    expect(documentSchema.safeParse(doc).success).toBe(false);
  });
});
