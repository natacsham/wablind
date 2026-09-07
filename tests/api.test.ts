import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
const config = { supabaseUrl: '', publicKey: '', serviceKey: '', origins: ['https://natacsham.github.io'], hosts: [] };
const configured = { ...config, supabaseUrl: 'https://example.supabase.co', publicKey: 'public-placeholder', serviceKey: 'server-placeholder', professorEmail: 'teacher@example.test' };
afterEach(() => vi.restoreAllMocks());
describe('API boundary', () => {
  it('reports unconfigured service without exposing configuration', async () => {
    const res = await request(createApp(config)).get('/health'); expect(res.status).toBe(200); expect(res.body.status).toBe('not-configured'); expect(JSON.stringify(res.body)).not.toContain('serviceKey');
  });
  it('fails closed when storage is not configured', async () => {
    const res = await request(createApp(config)).post('/v1/projects').send({}); expect(res.status).toBe(503); expect(res.body.error.code).toBe('NOT_CONFIGURED');
  });
  it('denies unlisted origins', async () => {
    const res = await request(createApp(config)).get('/v1/projects').set('Origin', 'https://evil.example'); expect(res.status).toBe(403);
  });
  it('requires verified authentication for private endpoints', async () => {
    const app = createApp({ ...config, supabaseUrl: 'https://example.supabase.co', publicKey: 'public-placeholder', serviceKey: 'server-placeholder' });
    const res = await request(app).get('/v1/projects'); expect(res.status).toBe(401); expect(res.body.error.code).toBe('SESSION_REQUIRED');
  });
  it('handles malformed JSON without leaking parser details', async () => {
    const res = await request(createApp(config)).post('/v1/projects').set('Content-Type', 'application/json').send('{broken'); expect(res.status).toBe(400); expect(res.body.error.code).toBe('INVALID_JSON');
  });
  it('routes public searches and URL lists before UUID publications without login', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify([{ id: '00000000-0000-4000-8000-000000000001', title: 'Atividade', source_url: 'https://example.org/Read?A=1', updated_at: '2026-09-07T00:00:00Z', purpose: 'Comparar' }]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const app = createApp(configured);
    const search = await request(app).get('/v1/publications/search?q=Atividade');
    expect(search.status).toBe(200);
    const list = await request(app).get('/v1/publications/by-url').query({ url: 'https://example.org/Read?A=1' });
    expect(list.status).toBe(200); expect(list.body[0].purpose).toBe('Comparar');
    expect(fetch.mock.calls.some(([url]) => String(url).includes('wablind_publications_by_url'))).toBe(true);
  });
  it('authenticates the configured professor account without returning private configuration', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ access_token: 'session-token', refresh_token: 'refresh-token', expires_in: 3600, token_type: 'bearer', user: { id: '00000000-0000-4000-8000-000000000001', email: configured.professorEmail } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const response = await request(createApp(configured)).post('/v1/auth/login').send({ username: 'professor', password: 'a-private-password' });
    expect(response.status).toBe(200); expect(response.body).toEqual({ access_token: 'session-token', refresh_token: 'refresh-token' });
    expect(JSON.stringify(response.body)).not.toMatch(/teacher@example|private-password|server-placeholder/);
    expect(String(fetch.mock.calls[0][1]?.body)).toContain(configured.professorEmail);
  });
  it('limits login attempts and denies unauthenticated private previews', async () => {
    const app = createApp(configured);
    for (let n = 0; n < 5; n++) expect((await request(app).post('/v1/auth/login').send({ username: 'someone', password: 'wrong' })).status).toBe(401);
    const limited = await request(app).post('/v1/auth/login').send({ username: 'professor', password: 'wrong' });
    expect(limited.status).toBe(429); expect(limited.body.error.code).toBe('LOGIN_LIMIT');
    const preview = await request(app).get('/v1/projects/00000000-0000-4000-8000-000000000001/preview');
    expect(preview.status).toBe(401);
  });
});
