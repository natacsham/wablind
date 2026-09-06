import { createClient } from '@supabase/supabase-js';
import { documentSchema, type ReadingDocument } from '../shared/model';
export const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const authUrl = import.meta.env.VITE_SUPABASE_URL;
const authKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = authUrl && authKey ? createClient(authUrl, authKey, { auth: { detectSessionInUrl: false, persistSession: true, autoRefreshToken: true, storage: sessionStorage } }) : null;
export const remoteConfigured = Boolean(apiUrl && supabase);
export class ApiError extends Error { constructor(message: string, public status: number, public code: string) { super(message); } }
export async function request<T>(path: string, method = 'GET', body?: unknown, authenticated = true): Promise<T> {
  if (!apiUrl) throw new ApiError('O serviço externo ainda não foi configurado. A demonstração local continua disponível.', 503, 'NOT_CONFIGURED');
  const session = authenticated ? (await supabase?.auth.getSession())?.data.session : null;
  if (authenticated && !session) throw new ApiError('Entre novamente. Seu rascunho local foi preservado.', 401, 'SESSION_REQUIRED');
  let response: Response;
  try {
    response = await fetch(apiUrl + '/v1' + path, { method, headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(35000), referrerPolicy: 'no-referrer' });
  } catch { throw new ApiError('Não foi possível alcançar o serviço. Seu rascunho permanece neste navegador. Tente novamente.', 503, 'UNAVAILABLE'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(result.error?.message || 'Não foi possível concluir a operação.', response.status, result.error?.code || 'ERROR');
  return result as T;
}
export type RemoteProject = { id: string; owner_id: string; title: string; version: number; updated_at: string; published_revision_id: string | null };
export type RemoteDetail = { project: RemoteProject; document: ReadingDocument; revisions: { id: string; created_at: string; document: ReadingDocument }[]; members: { user_id: string }[] };
export async function loadRemote(id: string) {
  const data = await request<RemoteDetail>(`/projects/${encodeURIComponent(id)}`);
  data.document = documentSchema.parse(data.document);
  data.revisions = data.revisions.map(r => ({ ...r, document: documentSchema.parse(r.document) }));
  return data;
}
