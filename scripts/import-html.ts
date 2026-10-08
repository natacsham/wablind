import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { parseHtml } from '../server/capture';
import { safeHref, toV2 } from '../shared/model';

// Reuse the existing extractor. This command never fetches a URL or runs source scripts.
async function main() {
  const { values } = parseArgs({ options: {
    input: { type: 'string' }, source: { type: 'string' }, output: { type: 'string' },
    'rights-confirmed': { type: 'boolean', default: false },
  } });
  if (!values.input || !values.source || !values.output || !values['rights-confirmed']) {
    throw new Error('Uso: pnpm import:html --input pagina.html --source https://endereco-da-fonte --output atividade.json --rights-confirmed. Use apenas conteúdo próprio ou autorizado.');
  }
  if (!safeHref(values.source) || new URL(values.source).protocol !== 'https:') throw new Error('Informe a URL HTTPS da fonte, sem credenciais. Ela será registrada; não será acessada.');
  const input = resolve(values.input); const output = resolve(values.output);
  if (input === output) throw new Error('A saída deve ser diferente da fonte.');
  const info = await stat(input);
  if (!info.isFile() || info.size > 2 * 1024 * 1024) throw new Error('Informe um arquivo HTML de até 2 MB.');
  const bytes = await readFile(input);
  if (bytes.length > 2 * 1024 * 1024) throw new Error('O arquivo excede 2 MB.');
  const document = toV2(parseHtml(bytes.toString('utf8'), values.source));
  document.warnings.push('Importação de HTML local: recursos externos não foram baixados. Confira a fonte e registre a autorização antes de disponibilizar a leitura.');
  await writeFile(output, JSON.stringify(document, null, 2), { encoding: 'utf8', flag: 'wx' });
  console.log(`Preparados ${document.blocks.length} elementos. Importe o JSON na Área do professor. A fonte não foi modificada e nenhum arquivo existente foi substituído.`);
}
void main().catch(error => { console.error(error instanceof Error ? error.message : 'Não foi possível importar.'); process.exitCode = 1; });
