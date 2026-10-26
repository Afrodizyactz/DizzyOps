/* No example records or backend authentication bypass. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');const src=name=>fs.readFileSync(path.join(root,name),'utf8');
const routes=require('../portal-routes.js');
test('routes resolve deep links, back links and unknown paths',()=>{
assert.equal(routes.fromHash('#quotes'),'Quotes');
assert.equal(routes.fromHash('#follow-up'),'FollowUp');
assert.equal(routes.fromHash('#account-settings'),'AccountSettings');
assert.equal(routes.fromHash('#invalid'),'Dashboard');
assert.equal(routes.fromHash('#%no'),'Dashboard');
assert.equal(routes.hashFor('Integrations'),'#integrations');
assert.equal(routes.normalize('Overview'),'Dashboard');
assert.equal(new Set(routes.sections.map(x=>x[1])).size,routes.sections.length);
assert.ok(routes.groups.some(([name,keys])=>name==='ADMIN'&&keys.includes('Integrations')));
});
test('financial modules remain unavailable without a verified staff identity',()=>{
assert.equal(routes.isFinance('Quotes'),true);
assert.equal(routes.isFinance('Reports'),false);
assert.equal(routes.canRenderFinance(null,true),false);
assert.equal(routes.canRenderFinance({email:'staff@example.invalid',role:'finance'},false),false);
assert.equal(routes.canRenderFinance({email:'staff@example.invalid',role:'finance'},true),true);
});
test('portal loads module scripts in order and provides a mobile backdrop',()=>{
const html=src('portal.html');let last=-1;
for(const file of ['portal-routes.js','quotes.js','finance.js','sage-readiness.js','portal-app.js']){
const pos=html.indexOf('src="./'+file+'"');assert.ok(pos>last,'missing or unordered '+file);last=pos}
assert.match(html,/id="sidebar-backdrop"/);
assert.match(html,/aria-controls="sidebar"/);
assert.match(html,/portal-ui\.css/);
});
test('UI routing calls modules only through staff verification',()=>{
const app=src('portal-app.js');
for(const check of ['DizzyQuotes.render()','DizzyFinance.render(name)','DizzySage.attach(name)',
'DizzySage.render()','DizzyRoutes.canRenderFinance(verifiedStaff','/auth/me','popstate','sidebar-backdrop','history.pushState'])
assert.ok(app.includes(check),'routing missing '+check);
});
test('production routes protect the workspace, including scripts and CSS',()=>{
const code=src('server/index.js');
assert.match(code,/app\.get\('\/portal\.html',session/);
assert.match(code,/app\.get\('\/'\+part,session/);
for(const file of ['portal-routes.js','portal-ui.css','portal-app.js','quotes.js','finance.js','sage-readiness.js'])
assert.ok(code.includes("'"+file+"'"),'protected file missing '+file);
assert.match(code,/verifySessionCookie/);
assert.match(src('auth/config.js'),/identityPlatform:\s*\{\s*enabled:\s*false/);
});
