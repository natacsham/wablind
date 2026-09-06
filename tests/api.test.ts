import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
const config = { supabaseUrl: '', publicKey: '', serviceKey: '', origins: ['https://natacsham.github.io'], hosts: [] };
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
});
