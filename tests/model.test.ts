import { describe, it, expect } from 'vitest';
import { examples } from '../shared/examples';
import { documentSchema, parseDocument, newWorkspace, saveRevision, inspectDocument } from '../shared/model';
import { exportHtml } from '../shared/export';
describe('documents and revisions', () => {
  it.each(examples)('validates $document.id and roundtrips without data loss', ({ document }) => { expect(parseDocument(JSON.stringify(document))).toEqual(document); });
  it('keeps published and saved snapshots independent of future edits', () => {
    let w = saveRevision(newWorkspace(examples[0].document)); w.publication = structuredClone(w.savedDocument);
    w.document.title = 'Changed';
    expect(w.savedDocument?.title).not.toBe('Changed'); expect(w.publication?.title).not.toBe('Changed'); expect(w.revisions[0].document.title).not.toBe('Changed');
  });
  it('rejects unsupported versions, duplicate IDs, invalid categories and orphan annotations', () => {
    const doc = structuredClone(examples[0].document);
    expect(() => parseDocument(JSON.stringify({ ...doc, schemaVersion: 2 }))).toThrow();
    expect(documentSchema.safeParse({ ...doc, blocks: [doc.blocks[0], doc.blocks[0]] }).success).toBe(false);
    expect(documentSchema.safeParse({ ...doc, annotations: [{ id: 'a', elementId: 'missing', category: 'main', description: 'Text', note: '', author: 'test', updatedAt: new Date().toISOString() }] }).success).toBe(false);
  });
  it('rejects script links and remote image tracking in JSON imports', () => {
    const doc = structuredClone(examples[0].document);
    expect(documentSchema.safeParse({ ...doc, blocks: [{ id: 'a', kind: 'paragraph', content: [{ text: 'run', href: 'javascript:alert(1)' }] }] }).success).toBe(false);
    expect(documentSchema.safeParse({ ...doc, blocks: [{ id: 'a', kind: 'image', caption: '', alt: 'x', src: 'https://tracker.example/pixel' }] }).success).toBe(false);
    expect(documentSchema.safeParse({ ...doc, blocks: [{ id: 'a', kind: 'image', caption: '', alt: 'x', src: 'data:image/svg+xml;base64,PHN2Zz4=' }] }).success).toBe(false);
  });
  it('escapes annotation text in HTML exports', () => {
    const doc = structuredClone(examples[0].document);
    doc.annotations.push({ id: 'a', elementId: 'water-intro', category: 'main', description: '<script>alert(1)</script>', note: '<img onerror=alert(1)>', author: 'test', updatedAt: new Date().toISOString() });
    const html = exportHtml(doc); expect(html).not.toContain('<script>'); expect(html).not.toContain('<img onerror'); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('Content-Security-Policy');
  });
  it('does not mark a missing image description as repaired', () => { expect(inspectDocument(examples[0].document)).toContainEqual(expect.stringContaining('revisão humana')); });
});
