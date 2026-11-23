const assert = require('node:assert/strict');
const {DatabaseSync} = require('node:sqlite');
const fs = require('node:fs');
const vm = require('node:vm');
const {buildSync} = require('esbuild');
const built = buildSync({stdin:{contents:"export {default as complaints} from './src/routes/complaints'; export {default as assignments} from './src/routes/assignments'; export {signJWT} from './src/middleware/auth'; export {sendFollowups} from './src/lib/followups';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text;
const mod={exports:{}};
vm.runInThisContext('(function(module,exports){'+built+'\n})')(mod,mod.exports);
const {Hono}=require('hono');
const {complaints,assignments,signJWT,sendFollowups}=mod.exports;
const db=new DatabaseSync(':memory:');
db.exec(fs.readFileSync('schema.sql','utf8'));
const roles={a:'admin',o:'officer',w:'field_worker',c:'citizen',x:'citizen'};
for(const [id,role] of Object.entries(roles)) db.prepare("INSERT INTO users (id,name,email,password,role,created_at,updated_at) VALUES (?,?,?,'test-only',?,'2026-11-05','2026-11-05')").run(id,id,id+'@test.invalid',role);
let failAfterCommit=false;
const DB={
  prepare(query){
    const bind=(...args)=>({
      first:async()=>db.prepare(query).get(...args)??null,
      all:async()=>({results:db.prepare(query).all(...args)}),
      run:async()=>({meta:db.prepare(query).run(...args)}),
      execute:()=>/^\s*(SELECT|PRAGMA)\b/i.test(query)
        ? {results:db.prepare(query).all(...args)} : {meta:db.prepare(query).run(...args)},
    });
    return {...bind(),bind};
  },
  async batch(statements){
    db.exec('BEGIN');
    let results;
    try { results=statements.map(s=>s.execute()); db.exec('COMMIT'); }
    catch(e) { db.exec('ROLLBACK'); throw e; }
    if(failAfterCommit){failAfterCommit=false;throw new Error('Simulated lost commit response');}
    return results;
  },
};
const env={DB,JWT_SECRET:'local-test',BROADCASTER:{idFromName:()=>0,get:()=>({fetch:async()=>new Response()})},
 AI:{run:async(_,input)=>({response:JSON.stringify({category:JSON.parse(input.messages[1].content).category,severity:'moderate',urgent:true,publicImpact:true,reason:'Test assessment'})})}};
const app=new Hono().route('/complaints',complaints).route('/assignments',assignments);
const tokens={};
async function call(who,method,path,body){
 tokens[who]??=await signJWT({id:who,name:who,email:who+'@test.invalid',role:roles[who]},env.JWT_SECRET);
 const res=await app.request('http://test'+path,{method,headers:{Authorization:'Bearer '+tokens[who],'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined},env);
 const content=await res.text();
 assert.notEqual(res.status,500,content);
 return {status:res.status,...JSON.parse(content)};
}
(async()=>{
 await call('c','GET','/complaints/mine');
 db.exec("INSERT INTO zones VALUES ('z','Demo','Z',NULL,1,'2026-11-05'); INSERT INTO departments VALUES ('d','Demo','D',NULL,1,'2026-11-05'); UPDATE users SET zone_id='z',department_id='d' WHERE id IN ('o','w')");
 const cats=['garbage','potholes','broken_streetlights','water_leakage','sewage_overflow','illegal_dumping','road_damage','public_toilets','snow_blockage','dead_animals','fallen_trees','others'];
 for(const category of cats){
  db.prepare("INSERT INTO routing_rules VALUES (?, 'z','d',?,'o','a',32,74,33,75,1)").run(category,category);
  db.prepare("INSERT INTO demo_routing_targets VALUES (?,'c','w')").run(category);
 }
 const base={title:'[TEST] Drain overflow',description:'A blocked drain overflows.',category:'sewage_overflow',language:'hinglish',location:{latitude:32.7,longitude:74.8},clientRequestId:'conversation-test-request-001'};
 const replies=await Promise.all([call('c','POST','/complaints',base),call('c','POST','/complaints',base)]);
 assert.deepEqual(replies.map(r=>r.status).sort(),[200,201]);
 assert.equal(replies[0].data._id,replies[1].data._id);
 assert.equal(replies[0].data.worker_name,'w');
 assert.equal(replies[0].data.officer_name,'o');
 assert.equal(db.prepare("SELECT COUNT(*) n FROM complaints").get().n,1);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM assignments").get().n,1);
 assert.equal((await call('c','POST','/complaints',{...base,title:'Changed with reused key'})).status,409);
 for(const category of cats){
  const response=await call('c','POST','/complaints',{...base,category,clientRequestId:'conversation-test-'+category.replace(/_/g,'-')});
  assert.equal(response.status,201);
  assert.equal(response.data.status,'assigned');
  assert.equal(response.data.category,category);
  assert.equal(response.data.worker_name,'w');
 }
 for(const role of ['o','a']){
  const response=await call(role,'GET','/complaints');
  assert(response.data.some(c=>c._id===replies[0].data._id&&c.worker_name==='w'));
 }
 const jobs=await call('w','GET','/assignments');
 assert(jobs.data.some(a=>a.complaint.id===replies[0].data._id));
 const outsider=await call('x','POST','/complaints',base);
 assert.equal(outsider.status,201);
 assert.equal(outsider.data.status,'submitted');
 assert.notEqual(outsider.data._id,replies[0].data._id);
 failAfterCommit=true;
 const uncertain=await call('c','POST','/complaints',{...base,clientRequestId:'conversation-test-lost-response'});
 assert.equal(uncertain.status,200);
 const retried=await call('c','POST','/complaints',{...base,clientRequestId:'conversation-test-lost-response'});
 assert.equal(retried.data._id,uncertain.data._id);
 
 const target=replies[0].data._id;
 let detail=(await call('c','GET','/complaints/'+target)).data;
 const assignedJob=(await call('w','GET','/assignments')).data.find(job=>job.complaint.id===target);
 assert.equal((await call('w','PATCH','/assignments/'+assignedJob.id+'/status',{status:'active'})).status,200);
 assert.equal((await call('c','GET','/complaints/'+target)).data.status,'in_progress');
 const overdue=Date.parse(detail.resolution_due_at)+4*3600_000+1000;
 await sendFollowups(DB,overdue);
 detail=(await call('c','GET','/complaints/'+target)).data;
 assert(detail.escalated_at);
 const countNotices=()=>db.prepare("SELECT COUNT(*) n FROM notifications WHERE complaint_id=?").get(target).n;
 const afterEscalation=countNotices();
 await sendFollowups(DB,overdue);
 assert.equal(countNotices(),afterEscalation);
 assert(db.prepare("SELECT 1 FROM notifications WHERE complaint_id=? AND user_id='a' AND title='Resolution escalated to supervisor'").get(target));
 assert.equal((await call('w','POST','/complaints/'+target+'/resolve',{resolutionNotes:'Drain cleared and access restored.'})).status,200);
 detail=(await call('c','GET','/complaints/'+target)).data;
 assert.equal(detail.status,'resolved');
 await sendFollowups(DB,Date.parse(detail.resolved_at)+25*3600_000);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM notifications WHERE complaint_id=? AND id LIKE '%confirmation-reminder%'").get(target).n,1);
 const wrongCitizen=await call('x','POST','/complaints/'+target+'/confirm',{fixed:true});
 assert.equal(wrongCitizen.status,403);
 assert.equal((await call('c','POST','/complaints/'+target+'/confirm',{fixed:false,feedback:'Water is still overflowing.'})).status,200);
 detail=(await call('c','GET','/complaints/'+target)).data;
 assert.equal(detail.status,'in_progress');
 assert.equal(detail.reopen_count,1);
 assert.equal(detail.escalated_at,null);
 assert.equal((await call('o','PATCH','/complaints/'+target+'/triage',{priority:'medium',reason:'Access restored, further cleaning required.'})).status,200);
 assert.equal((await call('w','POST','/complaints/'+target+'/resolve',{resolutionNotes:'Final cleaning completed.'})).status,200);
 assert.equal((await call('c','POST','/complaints/'+target+'/confirm',{fixed:true})).status,200);
 assert.equal((await call('c','GET','/complaints/'+target)).data.status,'closed');
 const noticesAtClose=countNotices();
 await sendFollowups(DB,Date.now()+365*24*3600_000);
 assert.equal(countNotices(),noticesAtClose);
 const timeline=(await call('a','GET','/complaints/'+target+'/timeline')).data;
 for(const action of ['Automatically assigned','Assignment started','Resolution escalated to supervisor','Work reopened','Priority changed','Closure confirmed']){
  assert(timeline.some(event=>event.action===action),'Missing timeline action '+action);
 }
 for(const role of ['a','o']){
  const row=(await call(role,'GET','/complaints')).data.find(c=>c._id===target);
  assert.equal(row.status,'closed');
  assert.equal(row.worker_name,'w');
 }
 console.log('PASS: worker start, reminders, escalation, repeat-run deduplication, resolution, citizen-only confirmation, reopen, priority override, closure and recorded timeline.');

 console.log('PASS: all 12 demo categories, assignment names returned at filing, officer/admin/worker visibility, concurrent retries, changed-payload rejection, lost commit response and account isolation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
