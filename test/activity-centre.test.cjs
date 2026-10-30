const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const routes=require('../portal-routes.js');
const source=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('task navigation has valid independent routes and page rendering',()=>{
 assert.equal(routes.fromHash('#tasks'),'Tasks');
 assert.equal(routes.hashFor('Tasks'),'#tasks');
 assert.ok(routes.groups.some(([,values])=>values.includes('Tasks')));
 const app=source('portal-app.js');
 assert.match(app,/DizzyActivity\.renderTasks\(\)/);
 assert.match(app,/DizzyActivity\?\.setIdentity\(verifiedStaff\)/);
 const shell=source('portal-shell.js');
 assert.match(shell,/DizzyActivity\?\.renderSummary/);
 assert.match(shell,/name==='Tasks'&&role==='agent'/);
});
test('activity scripts loaded in safe order and protected on Cloud Run',()=>{
 const html=source('portal.html'),server=source('server/index.js'),docker=source('server/Dockerfile');
 assert.ok(html.indexOf('src="./activity.js"')>html.indexOf('src="./portal-shell.js"'));
 assert.ok(html.indexOf('src="./activity.js"')<html.indexOf('src="./portal-app.js"'));
 assert.match(html,/activity\.css/);
 assert.ok(server.includes("'activity.js'"));
 assert.ok(server.includes("'activity.css'"));
 assert.match(server,/app\.use\('\/api\/v1\/activity',session,createActivityRouter/);
 assert.match(server,/process\.env\.ACTIVITY_API_ENABLED==='true'/);
 assert.match(docker,/activity\.js activity\.css/);
});
test('activity API writes require CSRF+Origin, allowlist, linked record existence and audit',()=>{
 const api=source('server/activity-api.js');
 assert.match(api,/requireSameOrigin,requireCsrf/);
 assert.match(api,/checkTaskCreation/);
 assert.match(api,/linkedRecord\(db,data\.relatedModule,data\.relatedId\)\.get\(\)/);
 assert.match(api,/batch\.commit\(\)/);
 assert.match(api,/db\.runTransaction/);
 assert.match(api,/expectedRevision/);
 assert.match(api,/Task access denied/);
 assert.match(api,/page\.filter\(doc=>canReadTask\(req\.identity,doc\.data\(\)\)\)/);
 assert.doesNotMatch(api,/setInterval|seedTask|demoData|localStorage/);
 const rules=source('firestore.rules');
 assert.match(rules,/allow read, write: if false/);
});
test('preview does not fetch tasks or fabricate assignments before authentication',()=>{
 const script=source('activity.js');
 assert.match(script,/const isVerified=\(\)=>root\.DIZZYOPS_AUTH_CONFIG\?\.identityPlatform\?\.enabled===true/);
 assert.match(script,/if\(!isVerified\(\)\)/);
 assert.match(script,/No tasks or sample records/);
 assert.match(script,/credentials:'same-origin'/);
 assert.match(script,/X-CSRF-Token/);
 assert.doesNotMatch(script,/localStorage|seedData|fakeNotifications/);
});
test('activity indexes are present and deployment activation remains disabled',()=>{
 const indexes=JSON.parse(source('firestore.indexes.json'));
 const taskIndexes=indexes.indexes.filter(x=>x.collectionGroup==='tasks');
 assert.ok(taskIndexes.some(x=>x.fields.some(f=>f.fieldPath==='assigneeEmail')));
 assert.ok(taskIndexes.some(x=>x.fields.some(f=>f.fieldPath==='status')));
 assert.match(source('server/.env.example'),/ACTIVITY_API_ENABLED=false/);
 assert.match(source('infra/deploy-cloud-run.sh'),/ACTIVITY_API_ENABLED=\$\{ACTIVITY_API_ENABLED:-false\}/);
});
