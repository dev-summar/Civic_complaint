const assert = require('node:assert/strict');
const {DatabaseSync} = require('node:sqlite');
const fs = require('node:fs');
const vm = require('node:vm');
const {buildSync} = require('esbuild');
const built = buildSync({stdin: {contents: "export {ensureSchema} from './src/lib/schema';", resolveDir: process.cwd()}, bundle: true, write: false, platform: 'node', format: 'cjs'}).outputFiles[0].text;
function newIsolate() {
  const mod = {exports: {}};
  vm.runInThisContext('(function(module,exports){' + built + '\n})')(mod, mod.exports);
  return mod.exports.ensureSchema;
}
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync('schema.sql', 'utf8'));
let calls = [], batches = 0, failNext = false;
const DB = {
  prepare(query) {
    const execute = () => {
      calls.push(query);
      return /^\s*(SELECT|PRAGMA)\b/i.test(query) ? {results: db.prepare(query).all()} : {meta: db.prepare(query).run()};
    };
    return {execute, run: async () => execute()};
  },
  async batch(statements) {
    batches++;
    if (failNext) { failNext = false; throw new Error('Temporary database failure'); }
    db.exec('BEGIN');
    try { const results = statements.map(statement => statement.execute()); db.exec('COMMIT'); return results; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  },
};
(async () => {
  await newIsolate()(DB);
  assert(db.prepare("SELECT name FROM sqlite_master WHERE name='complaint_submission_keys'").get());
  assert(db.prepare('PRAGMA table_info(complaints)').all().some(column => column.name === 'ai_summary'));
  const afterUpgrade = newIsolate();
  calls = []; batches = 0;
  await Promise.all([afterUpgrade(DB), afterUpgrade(DB), afterUpgrade(DB)]);
  assert.equal(batches, 1, 'Concurrent cold requests must share one metadata batch');
  assert.equal(calls.length, 4);
  assert(!calls.some(query => /ALTER|CREATE/.test(query)), 'An upgraded database must not perform cold-start DDL');
  await afterUpgrade(DB);
  assert.equal(batches, 1, 'Warm requests must not repeat even the metadata batch');
  const retry = newIsolate();
  failNext = true;
  await assert.rejects(retry(DB), /Temporary/);
  await retry(DB);
  assert.equal(batches, 3, 'A failed check must remain retryable');
  console.log('PASS: legacy upgrade, one-batch cold check, concurrent-request coalescing, zero warm-check queries, failure retry.');
})().catch(error => { console.error(error); process.exitCode = 1; });
