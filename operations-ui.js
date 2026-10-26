/* DizzyOps operational workspaces: zero seed records, same-origin API contract.
 * Without a verified staff session and an explicit backend capability, business writes NEVER run.
 */
(function(root){
'use strict';
const model=root.DizzyOperationsSchema;
if(!model)throw new Error('Operational schema is required');
const state=new Map();
let active=null,staff=null,capabilities=null,capPromise=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const safeId=value=>encodeURIComponent(String(value));
function initial(){return {tab:'records',query:'',status:'',sort:'',sortDirection:'asc',
  records:[],cursor:null,nextCursor:null,history:[],loaded:false,loading:false,
  error:'',notice:'',editing:null,validation:[],workflowChecked:new Set(),requestId:0};}
function getState(name){if(!state.has(name))state.set(name,initial());return state.get(name)}
function isStaff(){return root.DIZZYOPS_AUTH_CONFIG?.identityPlatform?.enabled===true&&!!staff&&!!staff.email&&!!staff.role}
function capability(name){if(!isStaff()||!capabilities||typeof capabilities!=='object')return {read:false,write:false,remove:false};
  const raw=capabilities.modules?.[name];return {read:raw?.read===true,write:raw?.write===true,remove:raw?.delete===true}}
function canWrite(name){return capability(name).write}
async function jsonGet(url){
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
 if(response.status===401||response.status===403)throw Error('Access denied. Sign in again or contact an administrator.');
 if(!response.ok)throw Error('The secure data service is not ready ('+response.status+').');
 return response.json();
}
async function checkCapabilities(){
 if(!isStaff())return null;
 if(capPromise)return capPromise;
 capPromise=jsonGet('/api/v1/capabilities').then(result=>{
   if(result?.version!==1||!result?.modules||Array.isArray(result.modules))throw Error('Invalid API capability response');
   capabilities=result;return result;
 }).catch(()=>{capabilities={version:1,modules:{}};return capabilities});
 return capPromise;
}
async function mutate(name,method,id,body){
 if(!isStaff()||!capability(name).write)throw Error('Saving is unavailable until the secure data service is configured.');
 if(method==='DELETE'&&!capability(name).remove)throw Error('Deletion is not permitted.');
 const csrf=await jsonGet('/auth/csrf');
 if(!csrf?.csrfToken)throw Error('Missing verified CSRF token');
 const path=model.schemas[name].apiPath+(id?'/'+safeId(id):'');
 const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',
   headers:{Accept:'application/json','Content-Type':'application/json','X-CSRF-Token':csrf.csrfToken},
   body:JSON.stringify(body||{})});
 if(response.status===401||response.status===403)throw Error('Not authorized for this operation.');
 if(response.status===409)throw Error('This record changed. Reload it before editing.');
 if(!response.ok)throw Error('The secure service could not complete the request ('+response.status+').');
 return response.status===204?null:response.json();
}
function pageBanner(name){
 const ready=capability(name).read;
 return '<div class="ops-notice" role="note"><strong>'+(ready?'Authenticated workspace':'Design preview — not connected')+'</strong><p>'+
  (ready?'Records are retrieved from the authorized backend; updates require explicit server permission.':
   'No live records, sample data, or database are connected. Do not enter confidential client, performer or financial details. Forms can be inspected and validated locally, but nothing is saved or transmitted.')+
  '</p></div>';
}
function fieldInput(field,value){
 const id='ops-field-'+field.key,label=esc(field.label)+(field.required?' <span aria-hidden="true">*</span>':'');
 const help=field.help?'<small>'+esc(field.help)+'</small>':'';
 const required=field.required?' required':'';
 const raw=esc(value??'');
 let control='';
 if(field.type==='textarea')control='<textarea id="'+id+'" name="'+esc(field.key)+'" rows="3"'+required+'>'+raw+'</textarea>';
 else if(field.type==='select')control='<select id="'+id+'" name="'+esc(field.key)+'"'+required+'><option value="">Select an option</option>'+
  field.options.map(option=>'<option value="'+esc(option)+'"'+(String(value??'')===option?' selected':'')+'>'+esc(option)+'</option>').join('')+'</select>';
 else {
  const type=field.type==='money'||field.type==='integer'?'number':field.type;
  const constraints=field.type==='money'?' min="0" step="0.01"':field.type==='integer'?' min="0" step="1"':'';
  control='<input id="'+id+'" name="'+esc(field.key)+'" type="'+esc(type)+'" value="'+raw+'"'+constraints+required+'>';
 }
 return '<label class="ops-field" for="'+id+'"><span>'+label+'</span>'+control+help+'</label>';
}
function renderRecords(name){
 const def=model.schemas[name],s=getState(name),allowed=capability(name),rows=s.records;
 const columns=def.columns;
 const body=rows.length?'<div class="ops-table-wrap"><table class="ops-table"><thead><tr>'+
  columns.map(key=>'<th scope="col">'+esc(def.fields.find(f=>f.key===key)?.label||key)+'</th>').join('')+
  '<th scope="col">Actions</th></tr></thead><tbody>'+
  rows.map((record,index)=>'<tr>'+
    columns.map(key=>'<td data-label="'+esc(def.fields.find(f=>f.key===key)?.label||key)+'">'+esc(record[key]??'—')+'</td>').join('')+
    '<td data-label="Actions"><button type="button" data-ops-action="view" data-record-index="'+index+'">View</button>'+
    (allowed.write?' <button type="button" data-ops-action="edit" data-record-index="'+index+'">Edit</button>':'')+'</td></tr>').join('')+
  '</tbody></table></div>':
  '<div class="ops-empty"><strong>No '+esc(def.label.toLowerCase())+' records available</strong><p>'+
   (allowed.read?'No matching authorized records were returned. Adjust filters or create an approved record.':
    'The register will remain empty until the secure business database and access controls are activated.')+'</p></div>';
 return '<div class="ops-toolbar"><label>Search register<input id="ops-query" type="search" value="'+esc(s.query)+'" placeholder="Search authorized records"></label>'+
 '<label>Workflow status<select id="ops-status"><option value="">All statuses</option>'+
  def.statuses.map(t=>'<option value="'+esc(t)+'"'+(s.status===t?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>'+
 '<label>Sort by<select id="ops-sort"><option value="">Default order</option>'+
  columns.map(c=>'<option value="'+esc(c)+'"'+(s.sort===c?' selected':'')+'>'+esc(def.fields.find(f=>f.key===c)?.label||c)+'</option>').join('')+'</select></label>'+
 '<div class="ops-toolbar-actions"><button type="button" id="ops-apply">Apply filters</button><button type="button" id="ops-reset">Reset</button></div></div>'+
 '<section class="panel ops-records"><div class="ops-section-head"><div><h2>'+esc(def.label)+' register</h2><p>'+
 (s.loading?'Loading authorized records…':s.error?esc(s.error):s.loaded?'Showing authorized records':'No synchronized records')+
 '</p></div><button type="button" id="ops-new" class="primary-action">'+(allowed.write?'New record':'Inspect blank form')+'</button></div>'+
 body+'<div class="ops-pagination"><button type="button" id="ops-prev"'+(s.history.length?'':' disabled')+'>Previous</button>'+
 '<span>'+(!allowed.read?'Data unavailable':'Page '+(s.history.length+1))+'</span>'+
 '<button type="button" id="ops-next"'+(s.nextCursor?'':' disabled')+'>Next</button></div>'+
 '</section>';
}
function renderEditor(name){
 const def=model.schemas[name],s=getState(name),existing=s.editing?.record||null;
 const readOnly=!!existing&&(!canWrite(name)||s.editing?.readOnly===true);
 const fields=def.fields.map(f=>fieldInput(f,existing?.[f.key]??'')).join('');
 return '<section class="panel ops-editor"><div class="ops-section-head"><div><h2>'+
  (existing?(readOnly?'View':'Edit'):'Prepare')+' '+esc(def.label.toLowerCase())+' details</h2>'+
  '<p>'+(!readOnly&&canWrite(name)?'Changes require secure server validation and authorization.':
  'Blank form preview. Validate field requirements locally; no data will be saved.')+'</p></div>'+
  '<button id="ops-back" type="button">Back to register</button></div>'+
  '<form id="ops-form" novalidate><div class="ops-fields">'+fields+
  '<label class="ops-field" for="ops-record-status"><span>Workflow status</span><select id="ops-record-status" name="status">'+
  def.statuses.map(x=>'<option value="'+esc(x)+'"'+(existing?.status===x?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label></div>'+
  '<div id="ops-validation" role="status" aria-live="polite"></div>'+
  '<div class="ops-form-actions">'+(readOnly?'<span class="ops-muted">View only — editing is unavailable.</span>':
  '<button type="button" id="ops-validate">Validate details</button>'+
  (canWrite(name)?'<button type="submit" class="primary-action">'+(existing?'Save changes':'Create record')+'</button>':
  '<button type="submit" disabled title="Secure database and role permission required">Save requires backend</button>')+
  '<button type="reset" id="ops-clear">Clear changes</button>')+'</div>'+
  '</form></section>';
}
function renderWorkflow(name){
 const def=model.schemas[name],s=getState(name);
 return '<section class="panel ops-workflow"><h2>'+esc(def.label)+' workflow</h2>'+
 '<p class="ops-muted">Planning checklist only. Selections remain in this tab and are not persisted or associated with any job or customer.</p>'+
 '<ol class="ops-step-list">'+def.steps.map((step,i)=>'<li><label><input type="checkbox" data-step="'+i+'"'+
 (s.workflowChecked.has(i)?' checked':'')+'><span>'+esc(step)+'</span></label></li>').join('')+'</ol>'+
 '<button id="ops-workflow-reset" type="button">Reset checklist</button>'+
 '<p class="ops-muted">Actual approvals, notifications, assignments and audit events require backend workflows and server-side permissions.</p></section>';
}
function render(name,identity){
 if(!model.schemas[name])return false;
 active=name;staff=identity||null;
 const s=getState(name);
 $('subtitle').textContent=model.schemas[name].description;
 $('view').innerHTML='<div class="ops-shell">'+pageBanner(name)+
  '<div class="ops-tabs" role="tablist" aria-label="Workspace views">'+
  [['records','Register'],['form','Form'],['workflow','Workflow']].map(([tab,label])=>
   '<button type="button" role="tab" id="ops-tab-'+tab+'" aria-controls="ops-content" data-ops-tab="'+tab+'" tabindex="'+(s.tab===tab?'0':'-1')+'" aria-selected="'+(s.tab===tab)+'"'+
   (s.tab===tab?' class="active"':'')+'>'+label+'</button>').join('')+'</div>'+
  '<div id="ops-content" role="tabpanel" tabindex="0" aria-labelledby="ops-tab-'+s.tab+'">'+(s.tab='form'?renderEditor(name):s.tab==='workflow'?renderWorkflow(name):renderRecords(name))+'</div></div>';
 bind(name);
 if(isStaff()&&!s.loaded&&!s.loading&&!capPromise)void checkCapabilities().then(()=>{
   if(active!==name)return;
   const t=getState(name);
   if(capability(name).read){void load(name)}else render(name,staff);
 });
 else if(isStaff()&&capability(name).read&&!s.loaded&&!s.loading)void load(name);
 return true;
}
async function load(name){
 const s=getState(name),rights=capability(name);
 if(!isStaff()||!rights.read||s.loading)return;
 const token=++s.requestId;s.loading=true;s.error='';render(name,staff);
 try{
  const params=new URLSearchParams({limit:'25'});
  if(s.query)params.set('q',s.query);
  if(s.status)params.set('status',s.status);
  if(s.sort)params.set('sort',s.sort);
  if(s.cursor)params.set('cursor',s.cursor);
  const payload=await jsonGet(model.schemas[name].apiPath+'?'+params);
  if(!Array.isArray(payload?.items)||payload.items.length>25||payload.items.some(r=>!r||typeof r!=='object'||Array.isArray(r)))
    throw Error('Unexpected API result. Records were not displayed.');
  if(token!==s.requestId)return;
  s.records=payload.items;s.nextCursor=typeof payload.nextCursor==='string'?payload.nextCursor:null;s.loaded=true;
 }catch(error){if(token!==s.requestId)return;s.records=[];s.nextCursor=null;s.loaded=true;s.error=error.message||'Unable to load records.'}
 finally{if(token===s.requestId){s.loading=false;if(active===name)render(name,staff)}}
}
function readForm(name){
 const element=$('ops-form');if(!element)return null;
 const data=Object.fromEntries(new FormData(element).entries());
 return data;
}
function validateForm(name){
 const element=$('ops-form'),box=$('ops-validation');
 if(!element||!box)return null;
 const data=readForm(name),errors=model.validate(name,data);
 if(!element.checkValidity()||errors.length){
  box.className='ops-error';
  box.textContent=errors.length?errors.join('. '):'Please check the highlighted required fields.';
  element.reportValidity();return null;
 }
 box.className='ops-success';
 box.textContent=canWrite(name)?'Fields validated locally. Server validation is still required.':'Fields validated locally. No record was saved or submitted.';
 return data;
}
async function submitForm(name){
 if(!canWrite(name)||!isStaff())return;
 const data=validateForm(name);if(!data)return;
 const s=getState(name);const current=s.editing?.record||null;
 const form=$('ops-form'),button=form?.querySelector('[type="submit"]');
 if(button)button.disabled=true;
 try{
  if(current){
   if(typeof current.id!=='string'||!current.id)throw Error('Record identifier missing');
   await mutate(name,'PUT',current.id,{...data,expectedRevision:current.revision});
  }else await mutate(name,'POST',null,data);
  s.editing=null;s.tab='records';s.loaded=false;s.cursor=null;s.history=[];await load(name);
 }catch(error){const box=$('ops-validation');if(box){box.className='ops-error';box.textContent=error.message||'Unable to save record.'}}
 finally{if(button?.isConnected)button.disabled=false}
}
function bind(name){
 const s=getState(name);
 document.querySelectorAll('[data-ops-tab]').forEach(button=>{
   button.addEventListener('click',()=>{
     s.tab=button.dataset.opsTab;if(s.tab!=='form')s.editing=null;render(name,staff);
   });
   button.addEventListener('keydown',event=>{
     const tabs=['records','form','workflow'],index=tabs.indexOf(button.dataset.opsTab);
     let next=null;
     if(event.key==='ArrowRight')next=tabs[(index+1)%tabs.length];
     if(event.key==='ArrowLeft')next=tabs[(index+tabs.length-1)%tabs.length];
     if(event.key==='Home')next=tabs[0];
     if(event.key==='End')next=tabs[tabs.length-1];
     if(!next)return;
     event.preventDefault();
     s.tab=next;if(next!=='form')s.editing=null;
     render(name,staff);
     document.getElementById('ops-tab-'+next)?.focus();
   });
 });
 if(s.tab==='form'){
  $('ops-back')?.addEventListener('click',()=>{s.tab='records';s.editing=null;render(name,staff)});
  $('ops-validate')?.addEventListener('click',()=>validateForm(name));
  $('ops-form')?.addEventListener('submit',e=>{e.preventDefault();void submitForm(name)});
  $('ops-form')?.addEventListener('reset',()=>{const box=$('ops-validation');if(box)box.textContent='Unsaved form fields cleared.'});
  if(s.editing?.readOnly===true||s.editing&&!canWrite(name))$('ops-form')?.querySelectorAll('input,select,textarea').forEach(el=>{el.disabled=true});
  return;
 }
 if(s.tab==='workflow'){
  document.querySelectorAll('[data-step]').forEach(el=>el.addEventListener('change',()=>{
   const n=Number(el.dataset.step);if(el.checked)s.workflowChecked.add(n);else s.workflowChecked.delete(n);
  }));
  $('ops-workflow-reset')?.addEventListener('click',()=>{s.workflowChecked.clear();render(name,staff)});
  return;
 }
 $('ops-new')?.addEventListener('click',()=>{s.editing=null;s.tab='form';render(name,staff)});
 $('ops-apply')?.addEventListener('click',()=>{
  s.query=$('ops-query').value.trim().slice(0,120);
  s.status=$('ops-status').value;s.sort=$('ops-sort').value;
  s.cursor=null;s.history=[];s.loaded=false;
  if(capability(name).read)void load(name);else render(name,staff);
 });
 $('ops-reset')?.addEventListener('click',()=>{s.query='';s.status='';s.sort='';s.cursor=null;s.history=[];s.loaded=false;
  if(capability(name).read)void load(name);else render(name,staff)});
 $('ops-next')?.addEventListener('click',()=>{
  if(!s.nextCursor||!capability(name).read)return;
  s.history.push(s.cursor);s.cursor=s.nextCursor;s.loaded=false;void load(name);
 });
 $('ops-prev')?.addEventListener('click',()=>{
  if(!s.history.length||!capability(name).read)return;
  s.cursor=s.history.pop();s.loaded=false;void load(name);
 });
 document.querySelectorAll('[data-record-index]').forEach(button=>button.addEventListener('click',()=>{
  const index=Number(button.dataset.recordIndex);
  if(!Number.isInteger(index)||index<0||index>=s.records.length)return;
  const record=s.records[index];
  s.editing={record,readOnly:button.dataset.opsAction!=='edit'};s.tab='form';render(name,staff);
 }));
}
function renderReports(){
 active='Reports';
 const summary='<div class="ops-notice" role="note"><strong>Verified reporting data unavailable</strong><p>No records or artificial KPI values are displayed. Analytics will be calculated from authorized bookings, jobs, finance and performer events after the secure backend is deployed.</p></div>';
 $('subtitle').textContent='Operational and financial reporting based on verified records only.';
 $('view').innerHTML='<div class="ops-shell">'+summary+
 '<section class="panel"><h2>Report filters</h2><form id="ops-report-form"><div class="ops-fields">'+
 '<label class="ops-field">Report type<select name="reportType"><option value="bookings">Booking trends</option><option value="utilisation">Performer utilisation</option><option value="finance">Revenue and receivables</option><option value="operations">Operational completion</option><option value="media">Post-job feedback and media</option></select></label>'+
 '<label class="ops-field">From<input type="date" name="from"></label><label class="ops-field">To<input type="date" name="to"></label></div>'+
 '<div class="ops-form-actions"><button type="submit">Apply reporting period</button>'+
 '<button type="reset">Clear dates</button><button type="button" disabled title="Verified report data and authorized export service required">Export requires backend</button></div>'+
 '<p id="ops-report-feedback" role="status" aria-live="polite"></p></form></section>'+
 '<section class="panel"><h2>Performance overview</h2><div class="ops-kpis">'+
 ['Total bookings','Completed jobs','Open receivables','Post-job actions due'].map(t=>'<div class="ops-kpi"><span>'+t+'</span><strong>—</strong><small>No verified data</small></div>').join('')+
 '</div></section></div>';
 $('ops-report-form')?.addEventListener('submit',e=>{
   e.preventDefault();const f=new FormData(e.currentTarget);
   $('ops-report-feedback').textContent=f.get('from')&&f.get('to')&&f.get('to')<f.get('from')?
      'End date must not precede start date.':'Reporting criteria selected. No verified data service is connected.';
 });
 $('ops-report-form')?.addEventListener('reset',()=>{$('ops-report-feedback').textContent='Reporting filters cleared.'});
 return true;
}
function renderSettings(){
 active='Settings';
 $('subtitle').textContent='Review operations configuration, staff access and launch readiness.';
 const rows=[
 ['Staff identity','14 existing Google Workspace staff accounts; confirm allowed users and assigned roles.'],
 ['Application security','SSO, server-verified permissions, session control and action audit trails.'],
 ['Persistent records','Firestore and authenticated, job-scoped business APIs pending.'],
 ['Sage Accounting Online','Production customer mapping, financial sync and reconciliation pending.'],
 ['Workspace collaboration','Approved Gmail, Calendar and Shared Drive scopes pending.'],
 ['External action links','Time-limited, purpose-scoped performer and customer links pending.']
 ];
 $('view').innerHTML='<div class="ops-shell"><div class="ops-notice" role="note"><strong>Administrative readiness — no live settings service</strong><p>Changes to roles, compliance rules, connectors and retention policies require secure backend administration. This screen never changes permissions in the browser.</p></div>'+
 '<div class="ops-settings-grid">'+rows.map(([title,text])=>'<section class="panel"><h2>'+esc(title)+'</h2><p>'+esc(text)+'</p><span class="pill">Requires administrator setup</span></section>').join('')+'</div>'+
 '<section class="panel"><h2>Next engineering gates</h2><ol class="ops-step-list">'+
 ['Provision Google Cloud project and billing alerts','Activate verified Workspace SSO and authenticated sessions',
 'Deploy role-based business APIs and Firestore collections','Confirm Sage access and perform read-only integration tests',
 'Configure shared media storage and secure guest links','Run operational acceptance and POPIA security review']
 .map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol>'+
 '<div class="ops-form-actions"><button type="button" data-ops-open="Integrations">View Sage readiness</button>'+
 '<button type="button" data-ops-open="Reports">Review reporting</button></div></section></div>';
 document.querySelectorAll('[data-ops-open]').forEach(el=>el.addEventListener('click',()=>root.DizzyNavigation?.show(el.dataset.opsOpen)));
 return true;
}
function renderDashboard(){
 active='Dashboard';
 $('subtitle').textContent='Today’s operations, priorities and outstanding approvals.';
 $('view').innerHTML='<div class="ops-shell"><div class="ops-notice" role="note"><strong>Workspace awaiting secure data services</strong>'+
 '<p>Dashboard values will be populated only from authorized records; no sample bookings, performers, invoices or tasks are generated.</p></div>'+
 '<div class="ops-kpis">'+['Active bookings','Upcoming jobs','Pending assignments','Follow-ups due'].map(label=>
 '<div class="ops-kpi"><span>'+label+'</span><strong>—</strong><small>Not connected</small></div>').join('')+'</div>'+
 '<section class="panel"><h2>Quick access</h2><div class="ops-quicklinks">'+
 [['Bookings','Booking enquiries'],['Jobs','Jobs & assignments'],['Performers','Performers'],['FollowUp','Post-job follow-ups'],['Quotes','Finance'],['Reports','Reports & analytics']]
 .map(([id,title])=>'<button type="button" data-ops-open="'+id+'">'+title+'</button>').join('')+
 '</div></section><section class="panel"><h2>Operational queues</h2><div class="ops-queues">'+
 ['Bookings requiring confirmation','Performer availability responses','Documents requiring approval','Post-event follow-up actions']
 .map(title=>'<div class="ops-queue"><strong>'+title+'</strong><span>Unavailable until authorized data is connected</span></div>').join('')+
 '</div></section></div>';
 document.querySelectorAll('[data-ops-open]').forEach(el=>el.addEventListener('click',()=>root.DizzyNavigation?.show(el.dataset.opsOpen)));
 return true;
}
root.DizzyOperations=Object.freeze({render,renderDashboard,renderReports,renderSettings,checkCapabilities});
})(window);
