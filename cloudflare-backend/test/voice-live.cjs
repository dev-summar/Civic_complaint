// Read-only quality checks against a deployed worker. Never submits complaints.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SWACHHSETU_TEST_URL || 'https://swachhsetu-api.summar-adm.workers.dev';
const cases = [
  ['en', 'Hello, can you help me?', null],
  ['hi', 'मुझे एक शिकायत करनी है।', null],
  ['hinglish', 'Mujhe ek complaint karni hai.', null],
  ['en', 'The drain outside the school is blocked and overflowing.', 'sewage_overflow'],
  ['hi', 'स्कूल के बाहर नाली बंद है और गंदा पानी सड़क पर बह रहा है।', 'sewage_overflow'],
  ['hinglish', 'School ke bahar naali overflow ho rahi hai, bachchon ko nikalne mein dikkat hai.', 'sewage_overflow'],
  ['hinglish', 'Gali ki streetlight teen din se nahi jal rahi.', 'broken_streetlights'],
  ['en', 'A water supply pipe is leaking outside my house.', 'water_leakage'],
  ['hinglish', 'Nahi, light theek hai. Correction: sadak par bada gaddha hai.', 'potholes', [
    {role: 'user', content: 'Streetlight kharab hai.'},
    {role: 'assistant', content: 'Theek hai. Map par jagah chunein.'},
  ]],
];
(async () => {
  assert(process.env.SWACHHSETU_TEST_EMAIL && process.env.SWACHHSETU_TEST_PASSWORD, 'Set test login environment variables');
  const health = await fetch(base + '/health', {signal: AbortSignal.timeout(10000)});
  assert.equal(health.status, 200);
  const login = await fetch(base + '/api/v1/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: process.env.SWACHHSETU_TEST_EMAIL, password: process.env.SWACHHSETU_TEST_PASSWORD}), signal: AbortSignal.timeout(20000)});
  const auth = await login.json();
  assert.equal(login.status, 200, 'Test login failed');
  const token = auth.data.accessToken;
  assert(token, 'Login did not return a token');
  const results = [];
  for (const [language, text, category, history = []] of cases) {
    const start = performance.now();
    const response = await fetch(base + '/api/v1/ai/report-chat', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token}, body: JSON.stringify({language, messages: [...history, {role: 'user', content: text}]}), signal: AbortSignal.timeout(30000)});
    const result = await response.json();
    const elapsedMs = Math.round(performance.now() - start);
    const data = result.data;
    const checks = {status: response.status === 200, category: category ? data?.draft?.category === category : data?.draft === null, spoken: typeof data?.spokenReply === 'string' && (language === 'en' || /[\u0900-\u097f]/.test(data.spokenReply))};
    results.push({language, text, elapsedMs, checks, data, status: response.status});
    console.log(JSON.stringify({language, expectedCategory: category, actualCategory: data?.draft?.category ?? null, elapsedMs, checks}));
  }
  fs.mkdirSync('.wrangler', {recursive: true});
  fs.writeFileSync('.wrangler/voice-live-report.json', JSON.stringify({testedAt: new Date().toISOString(), results}, null, 2));
  assert(results.every(result => Object.values(result.checks).every(Boolean)), 'Some live voice checks failed. See .wrangler/voice-live-report.json');
  console.log('All ' + results.length + ' live multilingual checks passed. No complaints created.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
