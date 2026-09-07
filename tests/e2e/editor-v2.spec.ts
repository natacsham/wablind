import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openEditor(page: Page, title = 'Pequenas descobertas na horta') {
  await page.goto('./#/examples');
  await page.getByRole('button', { name: `Editar exemplo: ${title}`, exact: true }).click();
  await page.getByText('Carregando editor…', { exact: true }).waitFor({ state: 'hidden', timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'Elementos da fonte' })).toBeVisible();
}
async function metadata(page: Page) {
  await page.getByLabel('Responsável pela mediação', { exact: true }).fill('Professor de teste sintético');
  await page.getByLabel('O que o estudante precisa realizar?').fill('Comparar os valores das duas mudas.');
  await page.getByLabel('Qual é o objetivo da atividade?').fill('Expressar uma comparação baseada nos registros.');
  await page.getByRole('button', { name: 'Aplicar dados da atividade', exact: true }).click();
}
async function mark(page: Page, role = 'Orientar a comparação') {
  await page.getByLabel('2. Para que serve nesta atividade?').fill(role);
  await page.getByLabel('Por que essas escolhas são adequadas à atividade?').fill('A orientação relaciona os valores à tarefa.');
  await page.getByRole('button', { name: 'Aplicar marcação', exact: true }).click();
}

test('draft survives element switching; save, restore and export agree on omission', async ({ page }) => {
  await openEditor(page); await metadata(page);
  await page.getByLabel('2. Para que serve nesta atividade?').fill('Texto ainda em preparação');
  await page.locator('.element-list button').nth(1).click();
  await page.locator('.element-list button').nth(0).click();
  await expect(page.getByLabel('2. Para que serve nesta atividade?')).toHaveValue('Texto ainda em preparação');
  await page.getByRole('button', { name: 'Salvar revisão', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('texto ainda não aplicado');
  await mark(page); await page.getByRole('button', { name: 'Salvar revisão', exact: true }).click();
  await page.getByLabel('Desconsiderar nesta leitura', { exact: true }).check();
  await page.getByLabel('Motivo para desconsiderar nesta leitura').fill('Introdução repetida na orientação da atividade.');
  await page.getByRole('button', { name: 'Aplicar marcação', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar revisão', exact: true }).click();
  await page.getByRole('link', { name: 'Prévia do leitor', exact: true }).click();
  await expect(page.locator('main')).not.toContainText('Uma turma acompanha duas mudas');
  await expect(page.locator('main')).toContainText('Introdução repetida');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar HTML', exact: true }).click();
  const download = await downloadEvent; const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString()).not.toContain('Uma turma acompanha duas mudas');
  await page.getByRole('link', { name: 'Voltar à edição', exact: false }).click();
  await page.getByText('Histórico (2 revisões)', { exact: true }).click();
  await page.getByRole('button', { name: 'Restaurar revisão 1', exact: true }).click();
  await page.getByRole('link', { name: 'Prévia do leitor', exact: true }).click();
  await expect(page.locator('main')).toContainText('Uma turma acompanha duas mudas');
});

test('visual and accessible element selection have the same target; iframe stays isolated', async ({ page }) => {
  await openEditor(page);
  const iframe = page.locator('iframe.source-preview');
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');
  await page.frameLocator('iframe.source-preview').locator('[data-wablind-id="garden-table"]').click();
  await expect(page.locator('.element-list button').nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('1. O que é este elemento?')).toHaveValue('table');
  await page.locator('.element-list button').nth(0).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Editar elemento selecionado', exact: true })).toBeFocused();
  await expect(page.frameLocator('iframe.source-preview').locator('[data-wablind-id="garden-intro"]')).toHaveClass(/wablind-selected/);
});

test('manual representations persist without manufacturing a synthesis', async ({ page }) => {
  await openEditor(page); await metadata(page);
  await page.getByText('Representações relacionadas (0)', { exact: true }).click();
  await page.getByLabel('Título da representação', { exact: true }).fill('Roteiro de comparação');
  await page.getByLabel('Conteúdo elaborado', { exact: true }).fill('Leia a linha inicial e depois a final. Expresse a diferença.');
  await page.getByLabel('O que esta representação ajuda a realizar?').fill('Relacionar duas linhas antes de comparar.');
  await page.getByLabel('Quando e como usar em conjunto?').fill('Use junto à tabela; o estudante decide a ordem de exploração.');
  await page.getByRole('button', { name: 'Aplicar representação', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar revisão', exact: true }).click();
  await page.reload();
  await page.getByRole('link', { name: 'Prévia do leitor', exact: true }).click();
  await expect(page.locator('main')).toContainText('Roteiro de comparação');
  await expect(page.locator('main')).toContainText('Relacionar duas linhas');
  await expect(page.getByRole('heading', { name: /Síntese/ })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('editor at 320 CSS pixels keeps focus and draft when changing panels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('./#/examples');
  await page.getByRole('button', { name: 'Editar exemplo: Pequenas descobertas na horta', exact: true }).click();
  await page.getByRole('button', { name: 'Elementos', exact: true }).click();
  await page.locator('.element-list button').nth(2).click();
  await expect(page.getByRole('heading', { name: 'Editar elemento selecionado', exact: true })).toBeFocused();
  await page.getByLabel('2. Para que serve nesta atividade?').fill('Comparar sem perder a seleção.');
  await page.getByRole('button', { name: 'Página-fonte', exact: true }).click();
  await page.getByRole('button', { name: 'Marcação', exact: true }).click();
  await expect(page.getByLabel('2. Para que serve nesta atividade?')).toHaveValue('Comparar sem perder a seleção.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
