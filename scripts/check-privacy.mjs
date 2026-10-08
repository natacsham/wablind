import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = '.';
const deny = [
  /natacsha/i,
  /natacsham/i,
  /C:\Users\natac/i,
  /\/Users\/natac/i,
  /@gmail\.com/i,
];

const excludeDir = new Set(['node_modules', '.git', 'dist', 'dist-server', 'playwright-report', 'test-results', '.vite']);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (excludeDir.has(entry)) continue;
      walk(path, files);
      continue;
    }
    if (entry === '.env' || entry.endsWith('.env') || entry.endsWith('.log')) continue;
    files.push(path);
  }
  return files;
}

const files = walk(root);
const findings = [];

for (const file of files) {
  if (file.endsWith('scripts/check-privacy.mjs') || file.endsWith('scripts\\check-privacy.mjs') || file.includes('check-privacy.mjs')) continue;
  let text = readFileSync(file, 'utf8');
  // The existing public author credit is not participant data. No broader allowlist.
  if (file.replace(/\\/g, '/') === 'src/App.tsx') text = text.replace('<span className="footer-credit">Natacsha Melo · UFAM · PPGI</span>', '');
  // Explicit public author credit and the public project URLs are intentional.
  // Participant records, personal email addresses and local paths remain blocked.
  const publicFiles = new Set(['README.md', 'docs/DEPLOY.md', 'src/catalog/App.tsx', 'public/apresentacao.html']);
  if (publicFiles.has(file.replace(/\\/g, '/'))) {
    text = text.replaceAll('https://github.com/natacsham/wablind', 'https://github.com/owner/project')
      .replaceAll('https://natacsham.github.io/wablind/', 'https://owner.github.io/project/')
      .replaceAll('Natacsha Melo', 'Autora');
  }
  // Existing public publication metadata and repository addresses are not
  // participant records. Allow only these known strings in their source files.
  const historicalPublicMetadata = {
    'docs/ENTREGA.md': ['natacsham/wablind'],
    'docs/MATRIZ-HISTORICA.md': ['Raposo, Natacsha; Castro, Thais; Castro, Alberto.'],
    'docs/REQUISITOS.md': ['trajetória de Natacsha'],
    'public/examples/comparacao.html': ['Autoria: Natacsha Melo, para a demonstração WABlind, 2026. UFAM · PPGI.'],
    'render.yaml': ['https://natacsham.github.io'],
    'src/History.tsx': ['Natacsha Melo · Universidade Federal do Amazonas (UFAM) · Programa de Pós-Graduação em Informática (PPGI).', 'Raposo, Natacsha; Castro, Thais; Castro, Alberto.'],
  };
  for (const credit of historicalPublicMetadata[file.replace(/\\/g, '/')] ?? []) {
    text = text.replaceAll(credit, 'PUBLIC_METADATA');
  }
  for (const pattern of deny) {
    const match = text.match(pattern);
    if (match) {
      findings.push({ file: file.replace(/\\/g, '/'), match: match[0] });
      break;
    }
  }
}

if (findings.length > 0) {
  for (const item of findings) {
    console.log(`${item.file} -> ${item.match}`);
  }
  throw new Error(`Check-privacy: encontrados ${findings.length} arquivo(s) com possíveis dados pessoais.`);
}

console.log('Check-privacy: nenhum padrão bloqueado encontrado.');
