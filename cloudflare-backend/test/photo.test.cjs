const assert = require('node:assert/strict');
const vm = require('node:vm');
const {buildSync} = require('esbuild');
const {Hono} = require('hono');
const built = buildSync({stdin: {contents: "export {default as ai} from './src/routes/ai'; export {signJWT} from './src/middleware/auth';", resolveDir: process.cwd()}, bundle: true, write: false, platform: 'node', format: 'cjs'}).outputFiles[0].text;
const mod = {exports: {}};
vm.runInThisContext('(function(module,exports){' + built + '\n})')(mod, mod.exports);
const {ai, signJWT} = mod.exports;
let answer, captured, translation;
const env = {
  JWT_SECRET: 'photo-contract-test-only',
  DB: {prepare: () => ({run: async () => ({})}), batch: async () => []},
  AI: {run: async (model, input) => {
    if (model.includes('qwen')) return {response: JSON.stringify(typeof translation === 'function' ? translation(input) : translation || answer)};
    captured = {model, input};
    return {response: typeof answer === 'string' ? answer : JSON.stringify(answer)};
  }},
};
const app = new Hono().route('/ai', ai);
// A signature-only fixture is sufficient for request/response contract tests;
// actual decoding and visual grounding are checked with real photos in photo-live.cjs.
const image = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]).toString('base64');
const visible = {status: 'issue_visible', confidence: 'high', category: 'garbage', priority: 'low', title: 'Discarded bottle', summary: 'A plastic bottle is lying in grass beside a wall.', spokenSummary: 'A plastic bottle is lying in grass beside a wall.', evidence: 'A bottle is lying in dry grass beside a wall.'};
(async () => {
  const token = await signJWT({id: 'photo-test', name: 'Citizen', email: 'citizen@test.invalid', role: 'citizen'}, env.JWT_SECRET);
  async function call(body, authenticated = true) {
    const response = await app.request('http://test/ai/classify', {method: 'POST', headers: {'Content-Type': 'application/json', ...(authenticated ? {Authorization: 'Bearer ' + token} : {})}, body: JSON.stringify(body)}, env);
    return {status: response.status, ...await response.json()};
  }
  assert.equal((await call({image}, false)).status, 401);
  for (const invalid of ['', 'not-base64!', Buffer.from('<svg></svg>').toString('base64'), 'a'.repeat(1_400_101)]) {
    assert.equal((await call({image: invalid})).status, 400);
  }
  assert.equal((await call({image, language: 'invalid'})).status, 400);
  answer = visible;
  const result = await call({image});
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, visible);
  assert.equal(captured.model, '@cf/meta/llama-4-scout-17b-16e-instruct');
  assert.equal(captured.input.messages[1].content[0].image_url.url, 'data:image/jpeg;base64,' + image, 'Image bytes must reach the multimodal model');
  assert(captured.input.response_format.json_schema.required.includes('evidence'));
  answer = {...visible, status: 'no_clear_issue', category: 'garbage', priority: 'high'};
  const negative = (await call({image})).data;
  assert.equal(negative.category, 'others');
  assert.equal(negative.priority, 'low');
  assert.equal(negative.summary, '', 'Do not fill a complaint from a negative photo');
  assert.equal(negative.title, '');
  assert(negative.message.includes('cannot see'));
  answer = {...visible, confidence: 'low'};
  const uncertain = (await call({image, language: 'hinglish'})).data;
  assert.equal(uncertain.status, 'unclear');
  assert.equal(uncertain.summary, '');
  assert(/[\u0900-\u097f]/.test(uncertain.spokenSummary));
  for (const bad of ['A pile of garbage', {...visible, priority: 'critical'}, {...visible, evidence: ''}, {...visible, category: 'made_up'}]) {
    answer = bad;
    assert.equal((await call({image})).status, 503, 'Malformed AI output must not become a guessed complaint');
  }
  answer = visible;
  const englishSpeech = await call({image, language: 'hi'});
  assert.equal(englishSpeech.status, 200, 'A photo reading must survive a translation miss');
  assert.equal(englishSpeech.data.summary, visible.summary);
  translation = {title: 'फेंकी हुई बोतल', summary: 'घास में बोतल पड़ी है।', spokenSummary: 'घास में बोतल पड़ी है।'};
  const hindi = await call({image, language: 'hi'});
  assert.equal(hindi.status, 200);
  assert.equal(hindi.data.category, 'garbage');
  assert.equal(hindi.data.summary, translation.summary);
  translation = input => input.messages[0].content.includes('Transliterate the supplied Hindi')
    ? {title: 'Phenki hui bottle', summary: 'Ghaas mein bottle padi hai.'}
    : {title: 'फेंकी हुई बोतल', summary: 'घास में बोतल पड़ी है।', spokenSummary: 'घास में बोतल पड़ी है।'};
  const hinglish = await call({image, language: 'hinglish'});
  assert.equal(hinglish.status, 200);
  assert.equal(hinglish.data.summary, 'Ghaas mein bottle padi hai.');
  assert.equal(hinglish.data.spokenSummary, 'घास में बोतल पड़ी है।');
  console.log('Photo contracts passed: image validation, actual multimodal input, grounded structure, no-issue/uncertainty gating, no keyword fallback, speech language.');
})().catch(error => { console.error(error); process.exitCode = 1; });
