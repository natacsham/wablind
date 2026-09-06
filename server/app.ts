import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { capturePage } from './capture';
import { HttpError } from './errors';
import { documentSchema, VERSION } from '../shared/model';
import { exportHtml } from '../shared/export';

export type Config = { supabaseUrl: string; publicKey: string; serviceKey: string; origins: string[]; hosts: string[] };
type Session = { userId: string; db: SupabaseClient };
const uuid = z.uuid();
function dataOrThrow<T>(data: T, error: { code?: string; message: string } | null): NonNullable<T> {
  if (error) {
    if (/CONFLICT/.test(error.message)) throw new HttpError(409, 'REVISION_CONFLICT', 'Outra revisão foi salva. Seu rascunho local foi preservado. Exporte-o e reabra o projeto conectado para comparar.');
    if (/FORBIDDEN|42501/.test(error.message + error.code)) throw new HttpError(403, 'FORBIDDEN', 'Você não tem autorização para esta operação.');
    if (/NOT_FOUND/.test(error.message)) throw new HttpError(404, 'NOT_FOUND', 'Projeto ou publicação não encontrado.');
    if (/INVALID_DOCUMENT/.test(error.message)) throw new HttpError(422, 'INVALID_DOCUMENT', 'O documento ou sua fonte precisa ser revisado.');
    throw new HttpError(503, 'STORAGE_UNAVAILABLE', 'O armazenamento não concluiu a operação. Nenhuma confirmação de salvamento foi emitida.');
  }
  if (data === null || data === undefined) throw new HttpError(404, 'NOT_FOUND', 'Registro não encontrado.');
  return data as NonNullable<T>;
}
export function createApp(config: Config) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); if (req.headers.origin && !config.origins.includes(req.headers.origin)) return next(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origem não autorizada.')); next(); });
  app.use(cors({ origin: config.origins, methods: ['GET', 'POST', 'DELETE'], allowedHeaders: ['Authorization', 'Content-Type'], maxAge: 600 }));
  app.use(express.json({ limit: '5mb' }));
  app.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMIT', message: 'Muitas solicitações. Aguarde um minuto antes de tentar novamente.' } } }));
  const configured = Boolean(config.supabaseUrl && config.publicKey && config.serviceKey);
  const admin = configured ? createClient(config.supabaseUrl, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  app.get('/health', (_req, res) => res.json({ status: configured ? 'ready-to-check' : 'not-configured', version: VERSION }));
  app.use('/v1', (_req, _res, next) => configured ? next() : next(new HttpError(503, 'NOT_CONFIGURED', 'O serviço externo ainda não foi configurado. Use a demonstração local.')));
  const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bearer = req.headers.authorization;
      if (!bearer?.startsWith('Bearer ') || bearer.length > 10000) throw new HttpError(401, 'SESSION_REQUIRED', 'Entre novamente. Seu rascunho local permanece disponível.');
      const token = bearer.slice(7);
      const db = createClient(config.supabaseUrl, config.publicKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await db.auth.getUser(token);
      if (error || !data.user) throw new HttpError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente; o rascunho foi preservado.');
      res.locals.session = { userId: data.user.id, db } satisfies Session;
      next();
    } catch (e) { next(e); }
  };
  const session = (res: Response) => res.locals.session as Session;
  const rpc = async (db: SupabaseClient, name: string, args: Record<string, unknown> = {}) => { const { data, error } = await db.rpc(name, args); return dataOrThrow(data, error); };
  app.get('/v1/publications/:id', async (req, res) => {
    const id = uuid.parse(req.params.id);
    const db = createClient(config.supabaseUrl, config.publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const doc = documentSchema.parse(await rpc(db, 'wablind_publication', { p_id: id }));
    res.json({ document: doc });
  });
  app.use('/v1', authenticate);
  const captureLimit = rateLimit({ windowMs: 60000, limit: 5, keyGenerator: (_req, res) => session(res).userId, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'CAPTURE_LIMIT', message: 'Limite de cinco capturas por minuto atingido.' } } });
  app.post('/v1/captures', captureLimit, async (req, res) => {
    const input = z.object({ url: z.string().max(2048), rightsConfirmed: z.literal(true) }).strict().parse(req.body);
    const { db, userId } = session(res);
    // Atomic database quota works across service instances and restarts.
    await rpc(db, 'wablind_capture_quota');
    const doc = await capturePage(input.url, config.hosts);
    const id = randomUUID(); const path = `${userId}/${id}.json`;
    const uploaded = await admin!.storage.from('wablind-captures').upload(path, JSON.stringify(doc), { contentType: 'application/json', upsert: false });
    dataOrThrow(uploaded.data, uploaded.error);
    const inserted = await admin!.from('wablind_captures').insert({ id, owner_id: userId, document: doc, storage_path: path }).select('id').single();
    if (inserted.error) { await admin!.storage.from('wablind-captures').remove([path]); dataOrThrow(inserted.data, inserted.error); }
    res.status(201).json({ id, document: doc });
  });
  app.get('/v1/captures/:id', async (req, res) => {
    const { data, error } = await session(res).db.from('wablind_captures').select('id,document').eq('id', uuid.parse(req.params.id)).single();
    const capture = dataOrThrow(data, error); res.json({ id: capture.id, document: documentSchema.parse(capture.document) });
  });
  app.get('/v1/projects', async (_req, res) => {
    const { data, error } = await session(res).db.from('wablind_projects').select('id,owner_id,title,version,updated_at,published_revision_id').order('updated_at', { ascending: false });
    res.json(dataOrThrow(data, error));
  });
  app.post('/v1/projects', async (req, res) => {
    const input = z.union([z.object({ document: documentSchema }).strict(), z.object({ captureId: uuid }).strict()]).parse(req.body);
    const { db } = session(res);
    let document;
    if ('captureId' in input) { const result = await db.from('wablind_captures').select('document').eq('id', input.captureId).single(); document = documentSchema.parse(dataOrThrow(result.data, result.error).document); }
    else document = input.document;
    const created = await rpc(db, 'wablind_create_project', { p_document: document });
    res.status(201).json(created);
  });
  app.get('/v1/projects/:id', async (req, res) => {
    const { db } = session(res); const id = uuid.parse(req.params.id);
    const p = await db.from('wablind_projects').select('*').eq('id', id).single();
    const project = dataOrThrow(p.data, p.error);
    const r = await db.from('wablind_revisions').select('id,created_at,document').eq('project_id', id).order('created_at', { ascending: false }).limit(30);
    const revisions = dataOrThrow(r.data, r.error).map(r => ({ ...r, document: documentSchema.parse(r.document) }));
    const current = await db.from('wablind_revisions').select('document').eq('id', project.current_revision_id).single();
    const m = await db.from('wablind_members').select('user_id').eq('project_id', id);
    res.json({ project, document: documentSchema.parse(dataOrThrow(current.data, current.error).document), revisions: revisions.reverse(), members: dataOrThrow(m.data, m.error) });
  });
  app.post('/v1/projects/:id/revisions', async (req, res) => {
    const input = z.object({ document: documentSchema, expectedVersion: z.number().int().positive() }).strict().parse(req.body);
    res.status(201).json(await rpc(session(res).db, 'wablind_save_revision', { p_id: uuid.parse(req.params.id), p_document: input.document, p_expected: input.expectedVersion }));
  });
  app.post('/v1/projects/:id/publication', async (req, res) => {
    const input = z.object({ expectedVersion: z.number().int().positive(), rightsConfirmed: z.literal(true) }).strict().parse(req.body);
    res.json(await rpc(session(res).db, 'wablind_publish', { p_id: uuid.parse(req.params.id), p_expected: input.expectedVersion }));
  });
  app.delete('/v1/projects/:id/publication', async (req, res) => res.json(await rpc(session(res).db, 'wablind_unpublish', { p_id: uuid.parse(req.params.id) })));
  app.post('/v1/projects/:id/members', async (req, res) => {
    const input = z.object({ email: z.email().max(254) }).strict().parse(req.body);
    res.json(await rpc(session(res).db, 'wablind_add_member', { p_id: uuid.parse(req.params.id), p_email: input.email }));
  });
  app.delete('/v1/projects/:id/members/:userId', async (req, res) => res.json(await rpc(session(res).db, 'wablind_remove_member', { p_id: uuid.parse(req.params.id), p_user: uuid.parse(req.params.userId) })));
  app.get('/v1/projects/:id/export', async (req, res) => {
    const { db } = session(res); const project = await db.from('wablind_projects').select('current_revision_id').eq('id', uuid.parse(req.params.id)).single();
    const revision = await db.from('wablind_revisions').select('document').eq('id', dataOrThrow(project.data, project.error).current_revision_id).single();
    const doc = documentSchema.parse(dataOrThrow(revision.data, revision.error).document);
    if (req.query.format === 'html') res.setHeader('Content-Disposition', 'attachment; filename="wablind.html"').type('html').send(exportHtml(doc));
    else res.setHeader('Content-Disposition', 'attachment; filename="wablind.json"').json(doc);
  });
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.')));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) return res.status(422).json({ error: { code: 'INVALID_INPUT', message: 'Dados inválidos. Confira o endereço, o arquivo e os campos obrigatórios.' } });
    if (error instanceof HttpError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    if ((error as { type?: string })?.type === 'entity.too.large') return res.status(413).json({ error: { code: 'CONTENT_TOO_LARGE', message: 'O conteúdo excede 5 MB.' } });
    if (error instanceof SyntaxError) return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON inválido.' } });
    console.error('WABlind request failed', { type: error instanceof Error ? error.name : 'UnknownError' });
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Não foi possível concluir. Preserve seu rascunho e tente novamente.' } });
  });
  return app;
}
