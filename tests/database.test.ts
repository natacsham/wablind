import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { examples } from '../shared/examples';
import { documentSchema, toV2 } from '../shared/model';
let db: PGlite;
const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';
let project: string;
let publishedProject: string;
async function asUser(id: string | null, role = 'authenticated') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
  await db.exec(`set role ${role}`);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,name text,bucket_id text); alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
    insert into auth.users values ('${alice}','alice@example.test',now()),('${bob}','bob@example.test',now());`);
  await db.exec(await readFile(new URL('../supabase/migrations/202609060001_wablind.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609070002_mediation.sql', import.meta.url), 'utf8'));
}, 60000);
afterAll(async () => { await db?.close(); });
it('isolates projects, controls invitations, locks revisions and publication', async () => {
  await asUser(alice);
  const created = await db.query<{ result: { id: string } }>('select public.wablind_create_project($1::jsonb) as result', [JSON.stringify(examples[1].document)]);
  project = created.rows[0].result.id;
  expect((await db.query('select * from public.wablind_projects')).rows).toHaveLength(1);
  await asUser(bob);
  expect((await db.query('select * from public.wablind_projects')).rows).toHaveLength(0);
  expect((await db.query('select * from public.wablind_revisions')).rows).toHaveLength(0);
  await expect(db.query('select public.wablind_save_revision($1,$2::jsonb,1)', [project, JSON.stringify(examples[1].document)])).rejects.toThrow('FORBIDDEN');
  await expect(db.query('select public.wablind_publish($1,1)', [project])).rejects.toThrow('FORBIDDEN');
  await asUser(alice);
  await db.query('select public.wablind_add_member($1,$2)', [project, 'bob@example.test']);
  await db.query('select public.wablind_publish($1,1)', [project]);
  await asUser(bob);
  const edited = structuredClone(examples[1].document);
  edited.annotations = [{ id: 'marker', elementId: 'garden-intro', category: 'main', description: 'Revisão privada', note: '', author: 'forged', updatedAt: new Date().toISOString() }];
  await db.query('select public.wablind_save_revision($1,$2::jsonb,1)', [project, JSON.stringify(edited)]);
  await expect(db.query('select public.wablind_save_revision($1,$2::jsonb,1)', [project, JSON.stringify(edited)])).rejects.toThrow('CONFLICT');
  await expect(db.query('update public.wablind_projects set version=99 where id=$1', [project])).rejects.toThrow('permission denied');
  await asUser(null, 'anon');
  const pub = await db.query<{ result: { annotations: unknown[] } }>('select public.wablind_publication($1) as result', [project]);
  expect(pub.rows[0].result.annotations).toHaveLength(0);
  await expect(db.query('select * from public.wablind_revisions')).rejects.toThrow('permission denied');
  await asUser(alice);
  await db.query('select public.wablind_publish($1,2)', [project]);
  const published = await db.query<{ result: { annotations: { author: string }[] } }>('select public.wablind_publication($1) as result', [project]);
  expect(published.rows[0].result.annotations[0].author).toBe('Mediação WABlind');
  await db.query('select public.wablind_unpublish($1)', [project]);
  await asUser(null, 'anon');
  await expect(db.query('select public.wablind_publication($1)', [project])).rejects.toThrow('NOT_FOUND');
}, 30000);
it('prevents source rebinding and enforces the daily capture quota', async () => {
  await asUser(alice);
  const edited = structuredClone(examples[1].document); edited.source.hash = 'changed';
  await expect(db.query('select public.wablind_save_revision($1,$2::jsonb,2)', [project, JSON.stringify(edited)])).rejects.toThrow('INVALID_DOCUMENT');
  for (let i = 0; i < 20; i++) await db.query('select public.wablind_capture_quota()');
  await expect(db.query('select public.wablind_capture_quota()')).rejects.toThrow('quota');
});
it('blocks publication of undescribed images and revokes editing', async () => {
  await asUser(alice);
  const created = await db.query<{ result: { id: string } }>('select public.wablind_create_project($1::jsonb) as result', [JSON.stringify(examples[0].document)]);
  await expect(db.query('select public.wablind_publish($1,1)', [created.rows[0].result.id])).rejects.toThrow('missing image description');
  await db.query('select public.wablind_remove_member($1,$2)', [project,bob]);
  await asUser(bob);
  expect((await db.query('select * from public.wablind_projects')).rows).toHaveLength(0);
  await expect(db.query('select public.wablind_save_revision($1,$2::jsonb,2)', [project,JSON.stringify(examples[1].document)])).rejects.toThrow('FORBIDDEN');
});

it('locates published and editable projects by URL', async () => {
  await asUser(alice);
  const prepared = structuredClone(examples[1].document);
  prepared.source.url = 'https://wablind.app/projeto/agua?cap=1';
  const created = await db.query<{ result: { id: string } }>('select public.wablind_create_project($1::jsonb) as result', [JSON.stringify(prepared)]);
  publishedProject = created.rows[0].result.id;
  await db.query('select public.wablind_publish($1,1)', [publishedProject]);
  await asUser(null, 'anon');
  const byUrl = await db.query<{ publication_id: string }>('select public.wablind_publication_by_url($1) as publication_id', ['https://WABlind.app/projeto/agua?cap=1#activity']);
  expect(byUrl.rows[0].publication_id).toBe(publishedProject);
  const search = await db.query<{ id: string; title: string; source_url: string; updated_at: string }>('select * from public.wablind_search_publications($1,8)', ['agua']);
  expect(search.rows.length).toBeGreaterThan(0);
  expect(search.rows.some(row => row.source_url === 'https://wablind.app/projeto/agua?cap=1')).toBe(true);
  await asUser(bob);
  const notOwned = await db.query<{ id: string }>('select public.wablind_project_by_url($1) as id', ['https://wablind.app/projeto/agua?cap=1']);
  expect(notOwned.rows[0].id as unknown).toBeNull();
});

it('preserves case-sensitive paths, queries and separate public activities without exposing drafts', async () => {
  await asUser(alice);
  const doc = structuredClone(examples[1].document);
  doc.source.url = 'https://wablind.app/projeto/agua?cap=1';
  doc.title = 'Segunda atividade';
  const created = await db.query<{ result: { id: string } }>('select public.wablind_create_project($1::jsonb) as result', [JSON.stringify(doc)]);
  await db.query('select public.wablind_publish($1,1)', [created.rows[0].result.id]);
  doc.title = 'Rascunho secreto';
  await db.query('select public.wablind_create_project($1::jsonb)', [JSON.stringify(doc)]);
  await asUser(null, 'anon');
  const all = await db.query<{ title: string }>('select * from public.wablind_publications_by_url($1)', [doc.source.url]);
  expect(all.rows).toHaveLength(2);
  expect(all.rows.map(r => r.title)).not.toContain('Rascunho secreto');
  for (const url of ['https://wablind.app/Projeto/agua?cap=1','https://wablind.app/projeto/agua?cap=2','https://wablind.app/projeto/agua/?cap=1']) {
    expect((await db.query('select * from public.wablind_publications_by_url($1)', [url])).rows).toHaveLength(0);
  }
  await expect(db.query('select * from public.wablind_projects')).rejects.toThrow('permission denied');
});

it('upgrades v1 drafts without rebinding sources and enforces mediated publication criteria in the database', async () => {
  await asUser(alice);
  const old = structuredClone(examples[0].document);
  const created = await db.query<{ result: { id: string } }>('select public.wablind_create_project($1::jsonb) as result', [JSON.stringify(old)]);
  const id = created.rows[0].result.id;
  const doc = toV2(old);
  await db.query('select public.wablind_save_revision($1,$2::jsonb,1)', [id, JSON.stringify(doc)]);
  await expect(db.query('select public.wablind_publish($1,2)', [id])).rejects.toThrow('review required');
  Object.assign(doc.mediation!, { task: 'Comparar as etapas', purpose: 'Reconhecer a relação entre etapas', responsible: 'Professor responsável' });
  const image = doc.blocks.find(b => b.kind === 'image')!;
  doc.mediation!.decisions.push({ elementId: image.id, classification: 'image', role: 'Ilustração complementar', treatments: ['omit'], description: '', explanation: '', rationale: 'A atividade utiliza a relação textual apresentada.', omitReason: '', author: 'forged', updatedAt: '2020-01-01T00:00:00Z' });
  await db.query('select public.wablind_save_revision($1,$2::jsonb,2)', [id, JSON.stringify(doc)]);
  await expect(db.query('select public.wablind_publish($1,3)', [id])).rejects.toThrow('omission reason');
  doc.mediation!.decisions[0].omitReason = 'Imagem não necessária à tarefa textual escolhida.';
  doc.mediation!.representations.push({ id: 'representation-1', elementIds: [doc.blocks[0].id], title: 'Explicação das relações', kind: 'text', text: 'As etapas formam uma sequência que se repete.', columns: [], rows: [], function: 'Explicar a relação entre etapas', relation: 'complementary', condition: 'Após a leitura das etapas', alternative: 'Navegação pelos títulos', author: 'forged', updatedAt: '2020-01-01T00:00:00Z' });
  const saved = await db.query<{ result: { document: typeof doc } }>('select public.wablind_save_revision($1,$2::jsonb,3) as result', [id, JSON.stringify(doc)]);
  expect(saved.rows[0].result.document.mediation!.decisions[0].author).toBe(alice);
  expect(saved.rows[0].result.document.mediation!.representations[0].author).toBe(alice);
  await db.query('select public.wablind_publish($1,4)', [id]);
  const rebound = structuredClone(doc); rebound.blocks[0].id = 'changed';
  await expect(db.query('select public.wablind_save_revision($1,$2::jsonb,4)', [id, JSON.stringify(rebound)])).rejects.toThrow('new source');
  await expect(db.query('select public.wablind_save_revision($1,$2::jsonb,4)', [id, JSON.stringify(old)])).rejects.toThrow('downgrade');
  await asUser(null, 'anon');
  const pub = await db.query<{ result: typeof doc }>('select public.wablind_publication($1) as result', [id]);
  expect(pub.rows[0].result.mediation!.decisions).toHaveLength(0);
  expect(pub.rows[0].result.publicView!.omissions[0].elementId).toBe(image.id);
  expect(pub.rows[0].result.mediation!.representations[0].author).toBe('Professor responsável');
  expect(JSON.stringify(pub.rows)).not.toContain(alice);
});

it('links private preview captures transactionally and prevents another user claiming them', async () => {
  await asUser(null, 'service_role');
  const capture = '00000000-0000-4000-8000-000000000099';
  await db.query('insert into public.wablind_captures(id,owner_id,document,storage_path,preview_path) values($1,$2,$3::jsonb,$4,$5)', [capture,alice,JSON.stringify(examples[1].document),`${alice}/source.json`,`${alice}/preview.json`]);
  await asUser(bob);
  await expect(db.query('select public.wablind_create_from_capture($1)', [capture])).rejects.toThrow('FORBIDDEN');
  expect((await db.query('select * from public.wablind_captures where id=$1', [capture])).rows).toHaveLength(0);
  await asUser(alice);
  const created = await db.query<{ result: { id: string } }>('select public.wablind_create_from_capture($1,$2) as result', [capture,'Atividade com captura visual']);
  const linked = await db.query<{ capture_id: string }>('select capture_id from public.wablind_projects where id=$1', [created.rows[0].result.id]);
  expect(linked.rows[0].capture_id).toBe(capture);
  await asUser(null, 'anon');
  await expect(db.query('select preview_path from public.wablind_captures')).rejects.toThrow('permission denied');
});

it('does not allow new publication of an unreviewed legacy capture', async () => {
  await asUser(alice);
  const doc = structuredClone(examples[1].document);
  doc.source.rights = 'review-required';
  const created = await db.query<{ result: { id: string } }>('select public.wablind_create_project($1::jsonb) as result', [JSON.stringify(doc)]);
  await expect(db.query('select public.wablind_publish($1,1)', [created.rows[0].result.id])).rejects.toThrow('source rights review');
});

it('rejects direct RPC attempts to bypass shape, reference and cardinality constraints', async () => {
  await asUser(alice);
  const base = toV2(examples[1].document);
  Object.assign(base.mediation!, { task: 'Comparar', purpose: 'Reconhecer relações', responsible: 'Professor responsável' });
  const decision = { elementId: base.blocks[0].id, classification: 'paragraph' as const, role: 'Introduzir', treatments: ['preserve' as const], description: '', explanation: '', rationale: 'Iniciar a atividade', omitReason: '', author: 'forged', updatedAt: '2026-09-07T00:00:00Z' };
  const representation = { id: 'rep', elementIds: [base.blocks[0].id], title: 'Comparação', kind: 'table' as const, text: '', columns: ['Tipo','Valor'], rows: [['A','1']], function: 'Comparar', relation: 'complementary' as const, condition: 'Durante a leitura', alternative: '', author: 'forged', updatedAt: '2026-09-07T00:00:00Z' };
  const invalid: unknown[] = [
    { ...base, mediation: { ...base.mediation, decisions: [{ ...decision, treatments: [] }] } },
    { ...base, mediation: { ...base.mediation, decisions: [{ ...decision, treatments: [null] }] } },
    { ...base, mediation: { ...base.mediation, decisions: [{ ...decision, elementId: 'missing' }] } },
    { ...base, mediation: { ...base.mediation, decisions: [decision,decision] } },
    { ...base, mediation: { ...base.mediation, representations: [{ ...representation, elementIds: [] }] } },
    { ...base, mediation: { ...base.mediation, representations: [{ ...representation, rows: [['A']] }] } },
    { ...base, mediation: { ...base.mediation, representations: [{ ...representation, rows: [[['nested'],'1']] }] } },
    { ...base, mediation: { ...base.mediation, representations: Array.from({ length: 101 }, (_, i) => ({ ...representation, id: `r${i}` })) } },
    { ...base, mediation: { ...base.mediation, references: [{ id: 'ref', title: 'Malicioso', url: 'javascript:alert(1)', author: '' }] } },
    { ...base, mediation: { ...base.mediation, references: Array.from({ length: 31 }, (_, i) => ({ id: `r${i}`, title: 'Fonte', url: 'https://example.org', author: '' })) } },
    { ...base, mediation: { ...base.mediation, summary: { text: 'Síntese', elementIds: ['missing'] } } },
    { ...base, mediation: { ...base.mediation, summary: { text: 123, elementIds: [] } } },
  ];
  for (const doc of invalid) await expect(db.query('select public.wablind_create_project($1::jsonb)', [JSON.stringify(doc)])).rejects.toThrow('INVALID_DOCUMENT');
  const created = await db.query<{ result: { id: string } }>('select public.wablind_create_project($1::jsonb) as result', [JSON.stringify(base)]);
  await expect(db.query('select public.wablind_save_revision($1,$2::jsonb,1)', [created.rows[0].result.id,JSON.stringify(invalid[0])])).rejects.toThrow('INVALID_DOCUMENT');
});

it('does not publish a legacy table without headers by bypassing the API', async () => {
  await asUser(alice);
  const doc = structuredClone(examples[1].document);
  const table = doc.blocks.find(b => b.kind === 'table')!;
  table.rows.forEach(row => row.forEach(cell => { cell.header = false; delete cell.scope; }));
  const created = await db.query<{ result: { id: string } }>('select public.wablind_create_project($1::jsonb) as result', [JSON.stringify(doc)]);
  await expect(db.query('select public.wablind_publish($1,1)', [created.rows[0].result.id])).rejects.toThrow('missing table headers');
});

it('public RPC excludes raw omitted source and its contributions while retaining a safe provenance manifest', async () => {
  await asUser(alice);
  const doc = toV2(examples[1].document);
  Object.assign(doc.mediation!, { task: 'Comparar os dados', purpose: 'Reconhecer relações', responsible: 'Professor responsável' });
  const hidden = doc.blocks[0].id; const visible = doc.blocks[1].id;
  doc.blocks[0] = { id: hidden, kind: 'paragraph', content: [{ text: 'RAW-SOURCE-SECRET' }] };
  doc.annotations = [{ id: 'hidden-annotation', elementId: hidden, category: 'main', description: 'RAW-ANNOTATION-SECRET', note: 'PRIVATE-NOTE-SECRET', author: 'forged', updatedAt: '2026-09-07T00:00:00Z' }];
  doc.mediation!.decisions = [{ elementId: hidden, classification: 'paragraph', role: 'Conteúdo repetido', treatments: ['omit'], description: 'RAW-DECISION-SECRET', explanation: '', rationale: 'A atividade utiliza outro trecho.', omitReason: 'Repetição não necessária nesta tarefa.', author: 'forged', updatedAt: '2026-09-07T00:00:00Z' }];
  const representation = { id: 'hidden-representation', elementIds: [hidden], title: 'Representação privada', kind: 'text' as const, text: 'RAW-REPRESENTATION-SECRET', columns: [], rows: [], function: 'Explicar', relation: 'complementary' as const, condition: 'Durante a leitura', alternative: '', author: 'forged', updatedAt: '2026-09-07T00:00:00Z' };
  doc.mediation!.representations = [representation, { ...representation, id: 'mixed', elementIds: [hidden,visible], title: 'Relação revisada', text: 'Conteúdo preparado pelo professor para publicação.' }];
  doc.mediation!.summary = { text: 'Síntese revisada com sua procedência.', elementIds: [hidden,visible] };
  const created = await db.query<{ result: { id: string } }>('select public.wablind_create_project($1::jsonb) as result', [JSON.stringify(doc)]);
  const id = created.rows[0].result.id;
  await db.query('select public.wablind_publish($1,1)', [id]);
  const privateRevision = await db.query('select document from public.wablind_revisions where project_id=$1', [id]);
  expect(JSON.stringify(privateRevision.rows)).toContain('RAW-SOURCE-SECRET');
  await asUser(null, 'anon');
  const result = await db.query<{ result: typeof doc }>('select public.wablind_publication($1) as result', [id]);
  const publicDoc = result.rows[0].result;
  expect(documentSchema.safeParse(publicDoc).success).toBe(true);
  expect(JSON.stringify(publicDoc)).not.toMatch(/RAW-.*-SECRET|PRIVATE-NOTE-SECRET/);
  expect(publicDoc.blocks.some(b => b.id === hidden)).toBe(false);
  expect(publicDoc.annotations).toHaveLength(0);
  expect(publicDoc.mediation!.decisions).toHaveLength(0);
  expect(publicDoc.mediation!.representations.map(r => r.id)).toEqual(['mixed']);
  expect(publicDoc.mediation!.representations[0].elementIds).toEqual([hidden,visible]);
  expect(publicDoc.publicView).toEqual({ elementOrder: doc.blocks.map(b => b.id), omissions: [{ elementId: hidden, reason: 'Repetição não necessária nesta tarefa.' }] });
  await asUser(alice);
  await expect(db.query('select public.wablind_create_project($1::jsonb)', [JSON.stringify(publicDoc)])).rejects.toThrow('public view');
  await expect(db.query('select public.wablind_save_revision($1,$2::jsonb,1)', [id,JSON.stringify(publicDoc)])).rejects.toThrow('public view');
});
