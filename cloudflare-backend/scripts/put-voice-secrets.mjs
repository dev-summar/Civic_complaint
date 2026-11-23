/**
 * Push voice secrets from .dev.vars → Cloudflare Worker.
 * Never prints secret values. Usage: npm run secrets:voice
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, '.dev.vars');
if (!existsSync(path)) {
  console.error('Missing .dev.vars — copy .dev.vars.example and fill keys.');
  process.exit(1);
}

const vars = {};
for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq < 1) continue;
  vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
}

const names = [
  'BHASHINI_INFERENCE_API_KEY',
  'BHASHINI_API_KEY',
  'GEMINI_API_KEY',
  'VOICE_API_KEY',
];

let failed = 0;
for (const name of names) {
  const value = vars[name];
  if (!value || !String(value).trim()) {
    console.log(`skip ${name} (empty in .dev.vars — leave existing Worker secret)`);
    continue;
  }
  const result = spawnSync('npx', ['--yes', 'wrangler', 'secret', 'put', name], {
    cwd: root,
    input: value,
    encoding: 'utf8',
    shell: true,
  });
  if (result.status === 0) console.log(`SET ${name}`);
  else {
    failed += 1;
    console.error(`FAIL ${name}`, (result.stderr || result.stdout || '').slice(0, 200));
  }
}

if (failed) process.exit(1);
console.log('Voice secrets updated. Enable Gemini billing: https://aistudio.google.com/apikey');
console.log('Then: npx wrangler deploy');
