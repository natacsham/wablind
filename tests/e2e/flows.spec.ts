import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
test('local annotation, revision, reading and roundtrip', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Explorar: Uma viagem com a água' }).click();
  await page.getByRole('button', { name: /02.*Imagem/ }).click();
  await page.getByLabel('Descrição (obrigatória)').fill('O Sol aquece o rio; a água evapora e retorna como chuva.');
  await page.getByLabel('Finalidade pedagógica').fill('Relacionar as etapas do ciclo.');
  await page.getByRole('button', { name: 'Aplicar ao trecho' }).click();
  await expect(page.getByText('Rascunho · revisão não salva', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar revisão', exact: true }).click();
  await expect(page.getByText('✓ Revisão salva', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('✓ Revisão salva', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Prévia da leitura' }).click();
  await expect(page.getByRole('img', { name: 'O Sol aquece o rio; a água evapora e retorna como chuva.' })).toBeVisible();
  const htmlDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar HTML', exact: true }).click();
  expect((await htmlDownload).suggestedFilename()).toMatch(/\.html$/);
  await page.getByRole('link', { name: 'Voltar à edição' }).click();
  const jsonDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await jsonDownload; const path = await download.path();
  const document = JSON.parse(await readFile(path!, 'utf8')); expect(document.annotations).toHaveLength(1);
  await page.getByRole('link', { name: 'Meus projetos', exact: true }).click();
  await page.getByLabel('Reimportar projeto JSON').setInputFiles(path!);
  await expect(page.getByText('1 marcações', { exact: false })).toBeVisible();
});
test('undo, removal and restoration preserve revisions', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: 'Explorar: Ler o céu, fazer perguntas' }).click();
  await page.getByLabel('Descrição (obrigatória)').fill('Texto principal.'); await page.getByRole('button', { name: 'Aplicar ao trecho' }).click();
  await page.getByRole('button', { name: 'Salvar revisão', exact: true }).click();
  await page.getByRole('button', { name: 'Remover esta marcação' }).click();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(page.getByLabel('Descrição (obrigatória)')).toHaveValue('Texto principal.');
  await page.getByText('Histórico (1 revisões)', { exact: true }).click();
  await page.getByRole('button', { name: 'Restaurar revisão 1' }).click();
  await expect(page.getByLabel('Descrição (obrigatória)')).toHaveValue('Texto principal.');
});
test('keyboard can enter editor and apply a marker', async ({ page }) => {
  await page.goto('./'); await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Ir para o conteúdo principal' })).toBeFocused(); await page.keyboard.press('Enter');
  const start = page.getByRole('button', { name: 'Explorar: Pequenas descobertas na horta' }); await start.focus(); await page.keyboard.press('Enter');
  const choose = page.getByRole('button', { name: /03.*Tabela/ }); await choose.focus(); await page.keyboard.press('Space');
  const description = page.getByLabel('Descrição (obrigatória)'); await description.focus(); await page.keyboard.type('Compare cada coluna com o dia indicado.');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Aplicar ao trecho' })).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Atualizar marcação' })).toBeVisible();
});
test('rejects malformed import and keeps existing projects', async ({ page }) => {
  await page.goto('./#/projects'); await page.getByLabel('Reimportar projeto JSON').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":9}') });
  await expect(page.getByRole('alert')).toContainText('Arquivo incompatível');
  await expect(page.getByText('Serviço externo ainda não conectado.')).toBeVisible();
});
test('local publication is a fixed snapshot, not a public link', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: 'Explorar: Ler o céu, fazer perguntas' }).click();
  await page.getByRole('button', { name: 'Salvar revisão', exact: true }).click(); await page.getByRole('button', { name: 'Preparar leitura local da revisão salva' }).click();
  await page.getByLabel('Descrição (obrigatória)').fill('Nova edição privada'); await page.getByRole('button', { name: 'Aplicar ao trecho' }).click();
  await page.getByRole('link', { name: 'Abrir versão local preparada' }).click();
  await expect(page.getByText('Nova edição privada')).toHaveCount(0); await expect(page.getByText('Revisão preparada · somente local')).toBeVisible();
});
for (const route of ['', '#/projects', '#/about', '#/help']) test(`a11y and mobile reflow ${route || 'home'}`, async ({ page }) => {
  await page.goto('./' + route);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
test('editor and reading accessibility with screenshot evidence', async ({ page }) => {
  await page.goto('./'); await page.screenshot({ path: 'test-results/home.png', fullPage: true });
  await page.getByRole('button', { name: 'Explorar: Pequenas descobertas na horta' }).click();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: 'test-results/editor.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('link', { name: 'Prévia da leitura' }).click();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});
