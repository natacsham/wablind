import { describe, expect, it } from 'vitest';
import { examples } from '../shared/examples';
import { newWorkspace, saveRevision } from '../shared/model';
import { reconcileWorkspace } from '../src/workspace-state';

describe('delayed remote responses', () => {
  it('keeps newer editing and acknowledges the revision actually saved by the server', () => {
    const initial = newWorkspace(examples[0].document);
    const incoming = { ...saveRevision(initial), remoteId: 'project', remoteVersion: 2 };
    const current = structuredClone(initial);
    current.document.title = 'Edição iniciada enquanto a resposta estava pendente';
    const result = reconcileWorkspace(current, incoming, initial.document);
    expect(result.document.title).toBe(current.document.title);
    expect(result.savedDocument?.title).toBe(initial.document.title);
    expect(result.remoteVersion).toBe(2);
    expect(result.revisions).toEqual(incoming.revisions);
  });
  it('does not roll back server version, saved revision or publication on out-of-order response', () => {
    const old = newWorkspace(examples[0].document);
    const incoming = { ...saveRevision(old), remoteId: 'project', remoteVersion: 2 };
    const current = { ...saveRevision(old), remoteId: 'project', remoteVersion: 3 };
    current.document.title = 'Título atual';
    current.savedDocument!.title = 'Título salvo na revisão 3';
    current.publication = structuredClone(current.savedDocument);
    const result = reconcileWorkspace(current, incoming, old.document);
    expect(result.remoteVersion).toBe(3);
    expect(result.savedDocument).toEqual(current.savedDocument);
    expect(result.publication).toEqual(current.publication);
    expect(result.revisions).toHaveLength(2);
  });
});
