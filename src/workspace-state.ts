import type { ReadingDocument, Workspace } from '../shared/model';

/** A delayed server response may save an older revision without replacing newer editing. */
export function reconcileWorkspace(current: Workspace | undefined, incoming: Workspace, expectedDocument?: ReadingDocument): Workspace {
  if (!current || !expectedDocument) return incoming;
  const staleVersion = current.remoteVersion !== undefined && (incoming.remoteVersion === undefined || current.remoteVersion > incoming.remoteVersion);
  const draftChanged = JSON.stringify(current.document) !== JSON.stringify(expectedDocument);
  if (!staleVersion && !draftChanged) return incoming;
  const revisions = new Map([...current.revisions, ...incoming.revisions].map(revision => [revision.id, revision]));
  return {
    ...(staleVersion ? current : incoming),
    document: current.document,
    revisions: [...revisions.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-30),
  };
}
