import { documentSchema, type Workspace } from '../shared/model';
const KEY = 'wablind.workspace.v1';
export function readLibrary(): Record<string, Workspace> {
  const raw = localStorage.getItem(KEY);
  if (!raw) return {};
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Os projetos locais precisam ser recuperados. Não reinicie o navegador antes de exportar uma cópia.');
  const result: Record<string, Workspace> = {};
  for (const [key, value] of Object.entries(data)) {
    const w = value as Workspace;
    const document = documentSchema.parse(w.document);
    result[key] = { ...w, document, revisions: (w.revisions || []).slice(-30).map(r => ({ ...r, document: documentSchema.parse(r.document) })), savedDocument: w.savedDocument ? documentSchema.parse(w.savedDocument) : null, publication: w.publication ? documentSchema.parse(w.publication) : null };
  }
  return result;
}
export function writeLibrary(library: Record<string, Workspace>) { localStorage.setItem(KEY, JSON.stringify(library)); }
export function download(filename: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
