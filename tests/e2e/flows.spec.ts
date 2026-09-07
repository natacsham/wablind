import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { examples } from '../../shared/examples';
import { toV2, newWorkspace, saveRevision } from '../../shared/model';

test('home focuses the large search and keyboard suggestion opens in same tab', async ({ page, context }) => {
  await page.goto('./');
  const search = page.getByRole('combobox', { name: 'Encontre uma página ou um assunto' });
  await expect(search).toBeFocused();
  expect((await search.boundingBox())!.height).toBeGreaterThanOrEqual(72);
  await expect(page.getByRole('button', { name: 'Dizer URL ou assunto' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Área do professor', exact: true })).toBeVisible();
  await search.fill('água');
  await expect(page.getByRole('option', { name: /Uma viagem com a água/ })).toBeVisible();
  await search.press('ArrowDown');
  await expect(search).toBeFocused();
  await search.press('Enter');
  await expect(page).toHaveURL(/#\/example\/ciclo-da-agua$/);
  await expect(page.getByRole('heading', { name: 'Fonte original' })).toBeVisible();
  expect(context.pages()).toHaveLength(1);
});

test('empty search has an associated recoverable error and escape closes suggestions', async ({ page }) => {
  await page.goto('./');
  const search = page.getByRole('combobox');
  await search.press('Enter');
  await expect(search).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toContainText('Digite ou fale');
  await search.fill('horta');
  await expect(page.getByRole('option')).toBeVisible();
  await search.press('ArrowDown'); await search.press('Escape');
  await expect(search).toHaveAttribute('aria-expanded', 'false');
  await expect(search).toBeFocused();
});

test('reader and HTML export agree on omission, source and multimodal contributions', async ({ page }) => {
  const doc = toV2(examples[1].document);
  const m = doc.mediation!;
  m.task = 'Comparar o crescimento das mudas.'; m.purpose = 'Distinguir valores e variação.'; m.responsible = 'Professor demonstrativo';
  m.summary = { text: 'As duas mudas cresceram dois centímetros.', elementIds: ['garden-table'] };
  m.decisions = [{ elementId: 'garden-intro', classification: 'paragraph', role: 'Contexto de demonstração', treatments: ['omit'], description: '', explanation: '', rationale: 'Foco nesta comparação.', omitReason: 'Contexto registrado junto à fonte.', author: 'Professor demonstrativo', updatedAt: '2026-09-07T12:00:00.000Z' }];
  m.representations = [{ id: 'comparison', elementIds: ['garden-table'], title: 'Uma relação para comparar', kind: 'text', text: 'Ambas aumentaram dois centímetros.', columns: [], rows: [], function: 'Explicitar a variação para comparação.', relation: 'complementary', condition: 'Explorar junto à tabela.', alternative: 'Percorrer cabeçalhos e linhas.', author: 'Professor demonstrativo', updatedAt: '2026-09-07T12:00:00.000Z' }];
  const w = saveRevision(newWorkspace(doc)); w.publication = doc;
  await page.addInitScript(value => localStorage.setItem('wablind.workspace.v1', JSON.stringify(value)), { [doc.id]: w });
  await page.goto(`./#/snapshot/${doc.id}`);
  await expect(page.getByText('Uma turma acompanha duas mudas', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Síntese do professor' })).toBeVisible();
  await expect(page.getByText('Complementar: usar em conjunto').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Representações relacionadas' })).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar HTML', exact: true }).click();
  const downloaded = await downloadEvent;
  const stream = await downloaded.createReadStream(); let html = '';
  for await (const chunk of stream!) html += chunk.toString();
  expect(html).not.toContain('Uma turma acompanha duas mudas');
  expect(html).toContain('As duas mudas cresceram dois centímetros.');
  expect(html).toContain('Fonte original');
  expect(html).toContain('Uma relação para comparar');
  await page.getByText('Opções de leitura', { exact: true }).click();
  await page.getByLabel('Tamanho do texto').selectOption('1.4');
  await page.getByLabel('Aumentar espaçamento').check();
  await page.reload();
  await page.getByText('Opções de leitura', { exact: true }).click();
  await expect(page.getByLabel('Tamanho do texto')).toHaveValue('1.4');
});

test('malformed backup does not replace saved work', async ({ page }) => {
  await page.goto('./#/projects');
  await page.getByText('Recuperar uma cópia de segurança JSON', { exact: true }).click();
  await page.getByLabel('Arquivo JSON exportado').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":9}') });
  await expect(page.getByRole('alert')).toContainText('Arquivo incompatível');
  await expect(page.getByRole('heading', { name: 'Trabalhos neste navegador' })).toBeVisible();
});

test('failed account download offers explicit reload and retains local work', async ({ page }) => {
  const saved = saveRevision(newWorkspace(examples[1].document));
  await page.addInitScript(value => localStorage.setItem('wablind.workspace.v1', JSON.stringify(value)), { [saved.document.id]: saved });
  await page.route(/\/assets\/Account-[^/]+\.js$/, route => route.abort('failed'));
  await page.goto('./#/projects');
  const errorHeading = page.getByRole('heading', { name: 'Não foi possível abrir a conta do professor' });
  await expect(errorHeading).toBeVisible({ timeout: 30000 });
  await expect(errorHeading).toBeFocused();
  await expect(page.getByRole('button', { name: 'Recarregar página' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continuar edição: Pequenas descobertas na horta' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wablind.workspace.v1') || '{}').horta.document.title)).toBe('Pequenas descobertas na horta');
});

for (const route of ['', '#/projects', '#/history', '#/help', '#/examples', '#/example/horta']) test(`accessible landmarks and mobile reflow ${route || 'home'}`, async ({ page }) => {
  await page.goto('./' + route);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
