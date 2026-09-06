import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const bad = [];
for (const file of files) {
  if (/(^|\/)(node_modules|test-results|playwright-report|\.svn|\.cache)\//.test(file) || /(^|\/)\.env(?!\.example$)/.test(file) || /\.(zip|pdf|sql\.dump)$/i.test(file)) bad.push(`${file}: arquivo não permitido na distribuição`);
  if (file === 'scripts/check-release.mjs') continue;
  const text = readFileSync(file, 'utf8');
  if (/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sb_secret_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,})\b/.test(text)) bad.push(`${file}: possível segredo`);
}
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log(`Verificados ${files.length} arquivos versionados; nenhum arquivo proibido ou padrão de segredo detectado. Esta triagem não substitui revisão humana.`);
