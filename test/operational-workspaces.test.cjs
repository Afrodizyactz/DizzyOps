/* Phase 02. Tests use no customer, performer, job, or finance fixtures. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const schema=require('../operations-schema.js');

test('operational schema defines all existing non-finance workspaces with unique fields',()=>{
 const expected=['Bookings','Jobs','Performers','Clients','Partners','Inventory','Assets','Fabrication','Documents','FollowUp'];
 assert.deepEqual(Object.keys(schema.schemas),expected);
 for(const [name,model] of Object.entries(schema.schemas)){
   assert.ok(model.apiPath.startsWith('/api/v1/modules/'),name);
   assert.ok(model.fields.length>=10,name);
   assert.ok(model.steps.length>=4,name);
   assert.ok(model.statuses.length>=4,name);
   const keys=model.fields.map(f=>f.key);
   assert.equal(new Set(keys).size,keys.length,'duplicate fields in '+name);
   assert.ok(model.columns.every(c=>c==='status'||keys.includes(c)));
   assert.ok(model.fields.some(f=>f.required));
   assert.ok(schema.validate(name,{}).length>0,'no required-field enforcement for '+name);
 }
});

test('reject invalid date, email, inventory and workflow values',()=>{
 assert.ok(schema.validate('Clients',{email:'invalid'}).some(x=>x.includes('email')));
 assert.ok(schema.validate('Inventory',{quantity:'1',availableQuantity:'2'}).some(x=>x.includes('Available quantity')));
 assert.ok(schema.validate('Inventory',{quantity:'1.5'}).some(x=>x.includes('non-negative number')));
 assert.ok(schema.validate('Bookings',{startTime:'18:00',endTime:'15:00'}).some(x=>x.includes('End time')));
 assert.ok(schema.validate('Assets',{pickupDate:'2026-11-12',deliveryDate:'2026-11-11'}).some(x=>x.includes('Delivery date')));
 assert.ok(schema.validate('Bookings',{status:'Not an approved state'}).some(x=>x.includes('Invalid record status')));
 assert.ok(schema.validate('Documents',{classification:'Public by accident'}).some(x=>x.includes('invalid option')));
 assert.ok(schema.validate('Bookings',{eventDate:'not a date'}).some(x=>x.includes('invalid date')));
 assert.ok(schema.validate('Missing',{}).includes('Unknown module'));
});

test('public staging preview renders empty modules without calling business APIs',()=>{
 const view={innerHTML:''},subtitle={textContent:''};
 const document={
   getElementById:id=>id==='view'?view:id==='subtitle'?subtitle:null,
   querySelectorAll:()=>[]
 };
 let calls=0;
 const window={DizzyOperationsSchema:schema,DIZZYOPS_AUTH_CONFIG:{identityPlatform:{enabled:false}}};
 const context={window,document,fetch:()=>{calls++;throw Error('Never fetch live records in public preview')},URLSearchParams,console};
 vm.runInNewContext(read('operations-ui.js'),context,{filename:'operations-ui.js'});
 for(const name of Object.keys(schema.schemas)){
   assert.equal(window.DizzyOperations.render(name,null),true);
   assert.match(view.innerHTML,/Design preview/);
   assert.match(view.innerHTML,/No .*records available/);
   assert.match(view.innerHTML,/Inspect blank form/);
 }
 assert.equal(calls,0);
 window.DizzyOperations.renderReports();
 assert.match(view.innerHTML,/No verified data/);
 window.DizzyOperations.renderSettings();
 assert.match(view.innerHTML,/no live settings service/i);
 window.DizzyOperations.renderDashboard();
 assert.match(view.innerHTML,/no sample bookings/i);
 assert.equal(calls,0);
});

test('all business assets are wired before portal app and protected on Cloud Run',()=>{
 const html=read('portal.html'),server=read('server/index.js');
 const scripts=['operations-schema.js','operations-ui.js','portal-app.js'];
 const indices=scripts.map(s=>html.indexOf('src="./'+s+'"'));
 assert.ok(indices.every(x=>x>=0));
 assert.ok(indices[0]<indices[1]&&indices[1]<indices[2]);
 assert.match(html,/operations-ui\.css/);
 for(const name of ['operations-schema.js','operations-ui.js','operations-ui.css'])
   assert.ok(server.includes("'"+name+"'"),'Missing session-protected asset '+name);
 const app=read('portal-app.js');
 assert.match(app,/DizzyOperations\.render\(name,verifiedStaff\)/);
 assert.match(app,/DizzyOperations\.renderDashboard\(\)/);
 assert.match(app,/DizzyOperations\.renderReports\(\)/);
 assert.match(app,/DizzyOperations\.renderSettings\(\)/);
 assert.match(server,/app\.get\('\/portal\.html',session/);
});

test('business writes are fail-closed without authenticated permissions, CSRF and same-origin requests',()=>{
 const script=read('operations-ui.js');
 assert.match(script,/identityPlatform\?\.enabled===true/);
 assert.match(script,/\/api\/v1\/capabilities/);
 assert.match(script,/isStaff\(\)\|\|!capability\(name\)\.write/);
 assert.match(script,/X-CSRF-Token/);
 assert.match(script,/credentials:'same-origin'/);
 assert.match(script,/expectedRevision/);
 assert.doesNotMatch(script,/localStorage|sessionStorage|sampleRecords|demoRecords|seedData/);
});
