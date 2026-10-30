const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const text=p=>fs.readFileSync(path.join(root,p),'utf8');

test('public preview remains fail-closed and Cloud Run flags require activation',()=>{
 const config=text('auth/config.js');
 const app=text('server/index.js');
 assert.match(config,/identityPlatform:\s*\{\s*enabled:\s*false/);
 assert.match(app,/businessEnabled=process\.env\.BUSINESS_API_ENABLED==='true'/);
 assert.match(app,/identityEnabled=process\.env\.IDENTITY_PLATFORM_ENABLED==='true'/);
 assert.match(app,/Business APIs require verified Identity Platform/);
 assert.match(app,/verifySessionCookie\(jwt,true\)/);
 assert.match(app,/app\.use\('\/api\/v1',session,createBusinessRouter/);
});
test('Firestore API only uses tenant-scoped records, revisions and atomic audit writes',()=>{
 const api=text('server/business-api.js'),contract=text('server/business-contract.js');
 assert.match(api,/const tenant='afrodizzyacts'/);
 assert.match(api,/\.collection\('audit'\)/);
 assert.match(api,/batch\.commit\(\)/);
 assert.match(api,/db\.runTransaction/);
 assert.match(api,/expectedRevision/);
 assert.match(api,/requireSameOrigin,requireCsrf,guard\('write'\)/);
 assert.match(api,/Deletion is disabled/);
 assert.match(contract,/Unexpected field/);
 const rules=text('firestore.rules');
 assert.match(rules,/allow read, write: if false;/);
});
test('Cloud Run image includes all UI modules, no auth bypass in preview, no seeds',()=>{
 const docker=text('server/Dockerfile');
 for(const asset of ['operations-schema.js','operations-ui.js','operations-ui.css','quotes.js','finance.js','portal-routes.js','sage-readiness.js'])
  assert.ok(docker.includes(asset),asset);
 assert.ok(!text('infra/prepare-cloud.sh').includes('sample-user'));
 assert.ok(!text('server/business-api.js').includes('seed'));
 assert.match(text('infra/deploy-cloud-run.sh'),/BUSINESS_API_ENABLED/);
 assert.match(text('infra/prepare-cloud.sh'),/CONFIRM_BILLABLE_SETUP/);
});
