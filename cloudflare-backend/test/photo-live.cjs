// Real image inference and photo -> conversational draft checks. No complaints are filed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SWACHHSETU_TEST_URL || 'https://swachhsetu-api.summar-adm.workers.dev';
const cases = [
  {file: 'photo-check.jpg', language: 'en', status: 'no_clear_issue', categories: ['others']},
  {file: 'photo-litter.jpg', language: 'en', status: 'no_clear_issue', categories: ['others']}, // bottle on a restaurant table
  {file: 'photo-people.jpg', language: 'en', status: 'no_clear_issue', categories: ['others']},
  {file: 'photo-taco-40.jpg', language: 'en', status: 'issue_visible', categories: ['garbage']},
  {file: 'photo-pothole.jpg', language: 'en', status: 'issue_visible', categories: ['road_damage', 'potholes']},
  {file: 'photo-taco-200.jpg', language: 'hi', status: 'issue_visible', categories: ['garbage']},
  {file: 'photo-taco-40.jpg', language: 'hinglish', status: 'issue_visible', categories: ['garbage']},
];
const sources = {
  'photo-check.jpg': 'https://raw.githubusercontent.com/biankatpas/Cracks-and-Potholes-in-Road-Images-Dataset/master/Dataset/1007599_RS_386_386RS289112_28920/1007599_RS_386_386RS289112_28920_RAW.jpg',
  'photo-litter.jpg': 'https://img.tacodataset.org/thumb/33978196618_640.jpg',
  'photo-people.jpg': 'https://raw.githubusercontent.com/ultralytics/yolov5/master/data/images/zidane.jpg',
  'photo-taco-40.jpg': 'https://img.tacodataset.org/thumb/47066072084_640.jpg',
  'photo-pothole.jpg': 'https://raw.githubusercontent.com/biankatpas/Cracks-and-Potholes-in-Road-Images-Dataset/master/Dataset/883075_RS_290_290RS150131_16105/883075_RS_290_290RS150131_16105_RAW.jpg',
  'photo-taco-200.jpg': 'https://img.tacodataset.org/thumb/48694212917_640.jpg',
};
(async () => {
  assert(process.env.SWACHHSETU_TEST_EMAIL && process.env.SWACHHSETU_TEST_PASSWORD, 'Set test login environment variables');
  fs.mkdirSync('.wrangler', {recursive: true});
  for (const [file, url] of Object.entries(sources)) {
    if (fs.existsSync('.wrangler/' + file)) continue;
    const image = await fetch(url, {signal: AbortSignal.timeout(20000)});
    assert.equal(image.status, 200, 'Public fixture download failed');
    const bytes = Buffer.from(await image.arrayBuffer());
    assert(bytes.length <= 1_048_576, 'Public fixture is too large');
    fs.writeFileSync('.wrangler/' + file, bytes);
  }
  const login = await fetch(base + '/api/v1/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: process.env.SWACHHSETU_TEST_EMAIL, password: process.env.SWACHHSETU_TEST_PASSWORD}), signal: AbortSignal.timeout(20000)});
  const auth = await login.json();
  assert.equal(login.status, 200);
  const headers = {'Content-Type': 'application/json', Authorization: 'Bearer ' + auth.data.accessToken};
  const results = [];
  for (const item of cases) {
    const image = fs.readFileSync('.wrangler/' + item.file).toString('base64');
    const start = performance.now();
    const response = await fetch(base + '/api/v1/ai/classify', {method: 'POST', headers, body: JSON.stringify({image, language: item.language}), signal: AbortSignal.timeout(30000)});
    const body = await response.json();
    const elapsedMs = Math.round(performance.now() - start);
    const data = body.data;
    const checks = {http: response.status === 200, status: data?.status === item.status, category: item.categories.includes(data?.category), negativeDoesNotDraft: item.status === 'issue_visible' || (data?.summary === '' && data?.title === ''), speech: typeof data?.spokenSummary === 'string' && (item.language === 'en' || /[\u0900-\u097f]/.test(data.spokenSummary))};
    if (item.language === 'hi') checks.displayLanguage = /[\u0900-\u097f]/.test(data?.summary || '');
    if (item.language === 'hinglish') checks.displayLanguage = !/[\u0900-\u097f]/.test(data?.summary || '') && /\b(hai|hain|par|mein|ek|padi|dikhayi)\b/i.test(data?.summary || '');
    let chat;
    if (data?.status === 'issue_visible' && data.confidence === 'high' && item.file !== 'photo-pothole.jpg') {
      const prefix = {en: 'Use this photo description for my complaint:', hi: 'मेरी शिकायत के लिए फ़ोटो का यह विवरण इस्तेमाल करें:', hinglish: 'Meri complaint ke liye photo ki yeh description use karein:'}[item.language];
      const chatResponse = await fetch(base + '/api/v1/ai/report-chat', {method: 'POST', headers, body: JSON.stringify({language: item.language, messages: [{role: 'user', content: prefix + ' ' + data.summary}], confirmedPhotoDraft: {title: data.title, description: data.summary, category: data.category}}), signal: AbortSignal.timeout(30000)});
      chat = await chatResponse.json();
      checks.conversationalDraft = chatResponse.status === 200 && chat.data?.draft?.category === data.category;
      checks.confirmedDescriptionPreserved = chat.data?.draft?.description === data.summary;
    }
    results.push({...item, elapsedMs, checks, data, chat});
    console.log(JSON.stringify({file: item.file, language: item.language, elapsedMs, checks, summary: data?.summary, evidence: data?.evidence}));
  }
  fs.writeFileSync('.wrangler/photo-live-report.json', JSON.stringify({testedAt: new Date().toISOString(), results}, null, 2));
  assert(results.every(result => Object.values(result.checks).every(Boolean)), 'Photo checks failed; see .wrangler/photo-live-report.json');
  console.log('All ' + results.length + ' real-photo checks passed, including photo-to-chat drafting. No complaints created.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
