/* Route-only SaaS preferences: no sample business data and no permission trust. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const routes=require('../portal-routes.js');
const shell=require('../portal-shell.js');
const root=path.join(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
function mockStorage(){
 const map=new Map();
 return {getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>{map.set(key,value)},
   raw:map};
}
test('deep links include the SaaS directory and personal workspace',()=>{
 assert.equal(routes.fromHash('#workspaces'),'Workspaces');
 assert.equal(routes.fromHash('#mywork'),'MyWork');
 assert.equal(routes.hashFor('MyWork'),'#mywork');
 assert.equal(routes.fromHash('#invoices'),'Invoices');
 assert.equal(routes.fromHash('#unrecognized-route'),'Dashboard');
 assert.equal(new Set(routes.sections.map(([,id])=>id)).size,routes.sections.length);
});
test('route preferences persist only allowlisted module IDs, no records or PII',()=>{
 const storage=mockStorage(),prefs=shell.createModel(routes,{storage});
 assert.deepEqual(prefs.pins,[]);
 assert.deepEqual(prefs.recent,[]);
 assert.equal(prefs.togglePin('Bookings'),true);
 assert.equal(prefs.togglePin('Clients'),true);
 assert.equal(prefs.togglePin('<img onerror=alert(1)>'),false);
 assert.equal(prefs.togglePin('Signout'),false);
 assert.deepEqual(prefs.pins,['Bookings','Clients']);
 prefs.setActive('Jobs');
 prefs.setActive('Performers');
 prefs.setActive('Jobs');
 assert.deepEqual(prefs.recent.slice(0,2),['Jobs','Performers']);
 const raw=storage.getItem(shell.storageKey('preview'));
 assert.ok(raw.includes('Bookings'));
 assert.ok(!raw.includes('customerEmail'));
 const refreshed=shell.createModel(routes,{storage});
 assert.deepEqual(refreshed.pins,['Bookings','Clients']);
 assert.deepEqual(refreshed.recent.slice(0,2),['Jobs','Performers']);
});
test('storage is scoped by verified user ID and fails gracefully when disabled',()=>{
 const storage=mockStorage(),prefs=shell.createModel(routes,{storage});
 prefs.togglePin('Performers');
 prefs.setIdentity({uid:'approved_01',role:'operations'});
 assert.deepEqual(prefs.pins,[]);
 prefs.togglePin('Jobs');
 prefs.setIdentity({uid:'approved_02',role:'operations'});
 assert.deepEqual(prefs.pins,[]);
 prefs.setIdentity({uid:'approved_01',role:'operations'});
 assert.deepEqual(prefs.pins,['Jobs']);
 prefs.setIdentity(null);
 assert.deepEqual(prefs.pins,['Performers']);
 const broken={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 const fallback=shell.createModel(routes,{storage:broken});
 assert.deepEqual(fallback.pins,[]);
 assert.equal(fallback.togglePin('Bookings'),true);
 assert.deepEqual(fallback.pins,['Bookings']);
});
test('damaged or tampered preference arrays cannot inject arbitrary pages',()=>{
 const storage=mockStorage();
 storage.setItem(shell.storageKey('preview'),JSON.stringify({
   pins:['Clients','Clients','Signout','../../auth','Invoices','Dashboard'],
   recent:['Documents',null,'Unknown','Documents'],
   collapsed:['FINANCE','HIDDEN_GROUP','FINANCE']
 }));
 const p=shell.readPreferences(storage,'preview',routes);
 assert.deepEqual(p.pins,['Clients','Invoices','Dashboard']);
 assert.deepEqual(p.recent,['Documents']);
 assert.deepEqual(p.collapsed,['FINANCE']);
});
test('pin and recent limits, collapsible sections and no fake record state',()=>{
 const storage=mockStorage(),m=shell.createModel(routes,{storage});
 const ids=routes.groups.flatMap(([,members])=>members);
 ids.slice(0,9).forEach(id=>m.togglePin(id));
 assert.ok(m.pins.length<=8);
 const ninth=ids.find(id=>!m.pins.includes(id));
 assert.equal(m.togglePin(ninth),false);
 for(const id of ids)m.setActive(id);
 assert.ok(m.recent.length<=7);
 assert.equal(m.toggleGroup('FINANCE'),true);
 assert.ok(m.collapsed.includes('FINANCE'));
 assert.equal(m.toggleGroup('FINANCE'),true);
 assert.ok(!m.collapsed.includes('FINANCE'));
 assert.equal(m.toggleGroup('UNRECOGNIZED'),false);
});
test('role-aware navigation is UX only and respects explicit backend capabilities',()=>{
 const m=shell.createModel(routes);
 assert.equal(m.allowed('Documents'),true); // public preview has no API access
 m.setIdentity({uid:'approved_01',role:'operations'});
 assert.equal(m.allowed('Documents'),false);
 assert.equal(m.allowed('Quotes'),false);
 assert.equal(m.allowed('Bookings'),true);
 m.setCapabilities({Bookings:{read:false},Clients:{read:true},Jobs:{read:false}});
 assert.equal(m.allowed('Bookings'),false);
 assert.equal(m.allowed('Clients'),true);
 assert.equal(m.allowed('Jobs'),false);
 m.setIdentity({uid:'approved_02',role:'agent'});
 assert.equal(m.allowed('Performers'),false);
 assert.equal(m.allowed('Reports'),false);
 m.setIdentity({uid:'approved_03',role:'administrator'});
 assert.equal(m.allowed('Documents'),true);
 assert.equal(m.allowed('Settings'),true);
});
test('search supports synonyms, pinned priority and only known module destinations',()=>{
 const m=shell.createModel(routes);
 m.togglePin('Bookings');
 assert.equal(m.search('enquiry')[0][1],'Bookings');
 assert.equal(m.search('customer')[0][1],'Clients');
 assert.equal(m.search('sage')[0][1],'Integrations');
 assert.equal(m.search('post-job')[0][1],'FollowUp');
 assert.equal(m.search('my work')[0][1],'MyWork');
 assert.equal(m.search('nonsense-no-module').length,0);
 assert.ok(m.search('').every(([label,id])=>routes.sections.some(x=>x[1]===id)));
});
test('portal, Cloud Run, and CI load and protect the new shell',()=>{
 const html=file('portal.html'),app=file('portal-app.js'),server=file('server/index.js');
 assert.ok(html.indexOf('src="./portal-shell.js"')<html.indexOf('src="./portal-app.js"'));
 assert.ok(html.includes('portal-shell.css'));
 for(const marker of ['workspace-breadcrumb','workspace-apps','workspace-mywork','workspace-search-trigger','workspace-pin'])
  assert.ok(html.includes('id="'+marker+'"'),marker);
 assert.ok(app.includes('DizzyShell.mount('));
 assert.ok(app.includes('shell.renderWorkspaces()'));
 assert.ok(app.includes('shell.renderMyWork()'));
 assert.ok(app.includes('shell.setIdentity(verifiedStaff)'));
 assert.ok(app.includes("'/api/v1/capabilities'"));
 for(const f of ['portal-shell.js','portal-shell.css'])assert.ok(server.includes("'"+f+"'"),f);
 assert.match(server,/app\.get\('\/'\+part,session/);
 assert.match(file('auth/config.js'),/identityPlatform:\s*\{\s*enabled:\s*false/);
 const script=file('portal-shell.js');
 assert.doesNotMatch(script,/sampleData|seedRecords|clientSecret|apiKey|document\.cookie/);
});
