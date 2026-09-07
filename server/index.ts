import { createApp } from './app';
const list = (value = '') => value.split(',').map(s => s.trim()).filter(Boolean);
const app = createApp({ supabaseUrl: process.env.SUPABASE_URL || '', publicKey: process.env.SUPABASE_PUBLISHABLE_KEY || '', serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '', professorEmail: process.env.PROFESSOR_EMAIL || '', origins: list(process.env.ALLOWED_ORIGINS), hosts: list(process.env.ALLOWED_CAPTURE_HOSTS).map(s => s.toLowerCase()) });
const server = app.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log('WABlind API listening'));
server.requestTimeout = 30000;
server.headersTimeout = 10000;
process.on('SIGTERM', () => server.close());
