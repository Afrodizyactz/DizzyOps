/* Authenticated staff Activity Centre. No demo records, fake notifications or local task storage. */
(function(root){
'use strict';
let identity=null,capabilities=null,capabilityPromise=null,seq=0;
let state={view:'mine',status:'',cursor:'',history:[],nextCursor:null,items:[],loading:false,message:'',error:''};
const isVerified=()=>root.DIZZYOPS_AUTH_CONFIG?.identityPlatform?.enabled===true&&!!identity?.email&&!!identity?.uid;
const get=id=>document.getElementById(id);
const element=(tag,text,className)=>{
 const el=document.createElement(tag);
 if(text!==null&&text!==undefined)el.textContent=String(text);
 if(className)el.className=className;
 return el;
};
function action(label,handler,cls=''){
 const el=element('button',label,cls);el.type='button';el.addEventListener('click',handler);return el;
}
function statusBox(container,message,kind=''){
 const p=element('p',message,'activity-feedback '+kind);
 p.setAttribute('role','status');container.replaceChildren(p);
}
async function request(url,options={}){
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',
  headers:{Accept:'application/json',...(options.headers||{})},...options});
 let json={};try{json=await response.json()}catch{}
 if(!response.ok){
  const message=response.status===401?'Session expired. Sign in again.':
   response.status===403?'You are not authorized for this task.':
   typeof json.error==='string'?json.error:'Service unavailable ('+response.status+').';
  const err=new Error(message);err.status=response.status;throw err;
 }
 return json;
}
async function ensureCapabilities(){
 if(!isVerified())return null;
 if(capabilityPromise)return capabilityPromise;
 capabilityPromise=request('/api/v1/activity/capabilities').then(data=>{
  capabilities={read:data.read===true,create:data.create===true,
   team:data.team===true,changeStatus:data.changeStatus===true};
  return capabilities;
 }).catch(error=>{
  capabilities={read:false,create:false,team:false,changeStatus:false,error:error.message};
  return capabilities;
 });
 return capabilityPromise;
}
async function mutation(url,method,body){
 if(!isVerified()||!capabilities?.read)throw Error('Activity service is not authorized.');
 const {csrfToken}=await request('/auth/csrf');
 if(typeof csrfToken!=='string'||!csrfToken)throw Error('Missing request verification token');
 return request(url,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},
  body:JSON.stringify(body)});
}
function renderEmpty(holder,message){
 holder.replaceChildren(element('div',message,'activity-empty'));
}
function pageShell(){
 const container=get('view');if(!container)return false;
 container.innerHTML='<div class="activity-centre">'+
 '<section class="activity-intro"><div><p class="activity-kicker">STAFF OPERATIONS</p>'+
 '<h2>My Tasks & Activity</h2><p>Assignments and task updates are drawn only from the verified staff workspace.</p></div>'+
 '<span class="activity-intro-status" id="activity-service-status">Checking service</span></section>'+
 '<section class="panel activity-board"><div class="activity-board-top"><div>'+
 '<h3>Assigned work</h3><p>Task list uses server-authorized records. It is not a calendar or email inbox.</p>'+
 '</div><button id="activity-new" type="button" hidden>Create task</button></div>'+
 '<div class="activity-toolbar"><label>Show<select id="activity-view"><option value="mine">Assigned to me</option>'+
 '<option value="team">Team tasks</option></select></label>'+
 '<label>Status<select id="activity-status"><option value="">All statuses</option>'+
 '<option value="open">Open</option><option value="in_progress">In progress</option>'+
 '<option value="blocked">Blocked</option><option value="done">Done</option></select></label>'+
 '<button type="button" id="activity-refresh">Refresh</button></div>'+
 '<div id="activity-feedback" role="status" aria-live="polite"></div>'+
 '<div id="activity-list" class="activity-list"></div>'+
 '<div class="activity-pagination"><button type="button" id="activity-prev" disabled>Previous</button>'+
 '<span id="activity-page">Page 1</span><button type="button" id="activity-next" disabled>Next</button></div></section>'+
 '<section id="activity-editor" class="panel activity-editor" hidden></section>'+
 '<section class="panel activity-guidance"><h3>Task workflow</h3>'+
 '<p>Team leads can assign tasks to approved staff and link them to existing bookings, jobs, clients or operational records. Assignees update the task status; changes are audited on the server. Automated task creation, notifications and external performer links are separate integrations.</p></section>'+
 '</div>';
 get('activity-view').value=state.view;
 get('activity-status').value=state.status;
 get('activity-view').addEventListener('change',e=>{
  state.view=e.target.value;state.cursor='';state.history=[];void loadTasks();
 });
 get('activity-status').addEventListener('change',e=>{
  state.status=e.target.value;state.cursor='';state.history=[];void loadTasks();
 });
 get('activity-refresh').addEventListener('click',()=>void loadTasks());
 get('activity-prev').addEventListener('click',()=>{
  if(!state.history.length)return;
  state.cursor=state.history.pop()||'';void loadTasks();
 });
 get('activity-next').addEventListener('click',()=>{
  if(!state.nextCursor)return;
  state.history.push(state.cursor);state.cursor=state.nextCursor;void loadTasks();
 });
 get('activity-new').addEventListener('click',()=>void showEditor());
 return true;
}
function renderRows(){
 const host=get('activity-list');if(!host)return;
 const feedback=get('activity-feedback');if(feedback)feedback.textContent=state.error||state.message||'';
 const prev=get('activity-prev'),next=get('activity-next'),page=get('activity-page');
 if(prev)prev.disabled=state.loading||!state.history.length||!capabilities?.read;
 if(next)next.disabled=state.loading||!state.nextCursor||!capabilities?.read;
 if(page)page.textContent='Page '+(state.history.length+1);
 if(state.loading){renderEmpty(host,'Loading authorized tasks…');return}
 if(!capabilities?.read){
  renderEmpty(host,capabilities?.error||'Live tasks are unavailable until the secure data service is activated.');
  return;
 }
 if(!state.items.length){
  renderEmpty(host,state.error?'Tasks could not be loaded. Refresh to retry.':
   'No tasks match this view. No demo or automatically generated tasks have been added.');
  return;
 }
 host.replaceChildren();
 for(const record of state.items){
  const card=element('article',null,'activity-task');
  const heading=element('div',null,'activity-task-heading');
  const title=element('h4',record.title||'Untitled task');
  const priority=element('span',record.priority||'normal','activity-priority');
  heading.append(title,priority);
  const description=element('p',record.description||'No description provided.');
  const meta=element('div',null,'activity-task-meta');
  for(const value of [
   'Status: '+String(record.status||'—').replaceAll('_',' '),
   'Due: '+(record.dueDate||'Not set'),
   'Assignee: '+(record.assigneeEmail||'—')
  ])meta.appendChild(element('span',value));
  const links=element('div',null,'activity-task-actions');
  const related=record.relatedModule,relatedId=record.relatedId;
  if(related&&relatedId&&root.DizzyRoutes?.sections.some(([,key])=>key===related)){
   links.appendChild(action('Open related '+related,()=>{
    if(root.DizzyShell&&root.DizzyNavigation)root.DizzyNavigation.show(related);
   },'activity-related'));
  }
  if(capabilities.changeStatus){
   const label=element('label','Update status','activity-task-label');
   const select=element('select');select.setAttribute('aria-label','Status for '+(record.title||'task'));
   for(const value of ['open','in_progress','blocked','done']){
    const option=element('option',value.replaceAll('_',' '));option.value=value;
    if(record.status===value)option.selected=true;
    select.appendChild(option);
   }
   label.appendChild(select);
   const btn=action('Save status',async()=>{
    if(select.value===record.status)return;
    btn.disabled=true;state.message='';state.error='';
    const status=get('activity-feedback');if(status)status.textContent='Saving task status…';
    try{
     await mutation('/api/v1/activity/tasks/'+encodeURIComponent(record.id)+'/status','PATCH',
       {status:select.value,expectedRevision:record.revision});
     state.message='Task status saved and audited.';
     await loadTasks();
    }catch(e){state.error=e.message;renderRows()}
    finally{btn.disabled=false}
   },'activity-status-save');
   links.append(label,btn);
  }
  card.append(heading,description,meta,links);host.appendChild(card);
 }
}
async function loadTasks(){
 const token=++seq;
 if(!capabilities?.read){renderRows();return}
 state.loading=true;state.error='';renderRows();
 try{
  const params=new URLSearchParams({view:state.view,limit:'20'});
  if(state.status)params.set('status',state.status);
  if(state.cursor)params.set('cursor',state.cursor);
  const response=await request('/api/v1/activity/tasks?'+params);
  if(token!==seq)return;
  if(!Array.isArray(response.items)||response.items.length>20)throw Error('Invalid server task response');
  state.items=response.items;
  state.nextCursor=typeof response.nextCursor==='string'?response.nextCursor:null;
 }catch(e){if(token!==seq)return;state.error=e.message;state.items=[];state.nextCursor=null}
 finally{if(token===seq){state.loading=false;renderRows()}}
}
async function showEditor(){
 const container=get('activity-editor');if(!container||!capabilities?.create)return;
 container.hidden=false;container.innerHTML=
  '<div class="activity-editor-head"><h3>Create assigned task</h3>'+
  '<button type="button" id="activity-close">Close</button></div>'+
  '<p>A linked, existing operational record is required. Task creation uses verified staff accounts only.</p>'+
  '<form id="activity-form" class="activity-form">'+
  '<label>Task title<input name="title" maxlength="160" required autocomplete="off"></label>'+
  '<label>Description<textarea name="description" maxlength="1800" rows="3"></textarea></label>'+
  '<label>Priority<select name="priority"><option value="normal">Normal</option><option value="high">High</option>'+
  '<option value="urgent">Urgent</option></select></label>'+
  '<label>Due date<input type="date" name="dueDate"></label>'+
  '<label>Related module<select name="relatedModule" required id="activity-related-module"></select></label>'+
  '<label>Existing record ID<input name="relatedId" required minlength="8" maxlength="128" autocomplete="off"></label>'+
  '<div id="activity-assign-wrap"></div>'+
  '<button type="submit" class="primary-action">Create task</button>'+
  '<p id="activity-editor-feedback" role="status" aria-live="polite"></p></form>';
 get('activity-close').onclick=()=>{container.hidden=true;container.replaceChildren()};
 const moduleSelect=get('activity-related-module');
 const options=root.DizzyOperationsSchema?.schemas||{};
 for(const [name,def] of Object.entries(options)){
  if(identity.role==='finance'&&!['Bookings','Jobs','Clients'].includes(name))continue;
  if(identity.role==='operations'&&name==='Documents')continue;
  const option=element('option',def.label);option.value=name;moduleSelect.appendChild(option);
 }
 const assigneeWrap=get('activity-assign-wrap');
 if(capabilities.team){
  const label=element('label','Assign to approved staff');
  const select=element('select');select.name='assigneeEmail';select.required=true;
  select.appendChild(element('option','Loading approved staff…'));
  label.appendChild(select);assigneeWrap.appendChild(label);
  try{
   const result=await request('/api/v1/activity/assignees');
   if(!container.isConnected||container.hidden)return;
   select.replaceChildren();
   for(const entry of Array.isArray(result.staff)?result.staff:[]){
    const opt=element('option',entry.email+' · '+entry.role);opt.value=entry.email;
    select.appendChild(opt);
   }
   if(!select.options.length){select.disabled=true;form.querySelector('button[type=submit]').disabled=true;statusBox(get('activity-editor-feedback'),'No approved staff available.','error')}
  }catch(e){select.disabled=true;form.querySelector('button[type=submit]').disabled=true;statusBox(get('activity-editor-feedback'),e.message,'error')}
 }else{
  const label=element('p','Assigned to your verified staff account: '+identity.email,'activity-self');
  assigneeWrap.appendChild(label);
 }
 const form=get('activity-form');
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const body=Object.fromEntries(new FormData(form));
  if(!capabilities.team)body.assigneeEmail=identity.email;
  const btn=form.querySelector('button[type=submit]');btn.disabled=true;
  try{
   await mutation('/api/v1/activity/tasks','POST',body);
   container.hidden=true;container.replaceChildren();
   state.view=capabilities.team?'team':'mine';state.status='';state.cursor='';state.history=[];
   const view=get('activity-view'),status=get('activity-status');
   if(view)view.value=state.view;
   if(status)status.value='';
   state.message='Task created successfully and recorded in the audit trail.';
   await loadTasks();
  }catch(e){statusBox(get('activity-editor-feedback'),e.message,'error')}
  finally{if(btn.isConnected)btn.disabled=false}
 });
}
async function renderTasks(){
 if(!pageShell())return;
 if(!isVerified()){
  get('activity-service-status').textContent='Preview only';
  renderEmpty(get('activity-list'),'The Activity Centre requires verified Google Workspace sign-in and the approved Firestore API. No tasks or sample records are available here.');
  get('activity-view').disabled=true;get('activity-status').disabled=true;
  get('activity-refresh').disabled=true;return;
 }
 get('activity-service-status').textContent='Verifying service…';
 await ensureCapabilities();
 if(!get('activity-list'))return;
 get('activity-service-status').textContent=capabilities?.read?'Authenticated activity':'Service not active';
 get('activity-view').querySelector('option[value=team]').hidden=!capabilities?.team;
 if(!capabilities.team&&state.view==='team')state.view='mine';
 get('activity-view').value=state.view;
 get('activity-view').disabled=!capabilities.read;
 get('activity-status').disabled=!capabilities.read;
 get('activity-refresh').disabled=!capabilities.read;
 const create=get('activity-new');create.hidden=!capabilities.create;
 await loadTasks();
}
async function renderSummary(host){
 if(!host)return;
 const navigate=()=>root.DizzyNavigation?.show('Tasks');
 host.replaceChildren(action('Open Task Centre',navigate,'activity-summary-link'));
 const status=element('p','Live task assignments require secure staff sign-in and the activity API.','activity-summary-status');
 host.appendChild(status);
 if(!isVerified())return;
 const result=await ensureCapabilities();
 if(!host.isConnected)return;
 if(!result?.read){status.textContent=result?.error||'Activity service is not active.';return}
 try{
  const data=await request('/api/v1/activity/tasks?view=mine&limit=5');
  if(!host.isConnected)return;
  const items=Array.isArray(data.items)?data.items:[];
  status.textContent=items.length?'Recent tasks assigned to your account (up to five shown):':
    'No tasks assigned to your account.';
  for(const record of items){
   const link=action((record.title||'Untitled task')+' · '+String(record.status||'open').replaceAll('_',' '),
    navigate,'activity-summary-task');
   host.appendChild(link);
  }
 }catch(e){status.textContent=e.message}
}
root.DizzyActivity=Object.freeze({
 setIdentity(user){
  identity=user&&user.uid&&user.email&&user.role?
   {uid:user.uid,email:String(user.email).toLowerCase(),role:user.role}:null;
  capabilities=null;capabilityPromise=null;state={view:'mine',status:'',cursor:'',history:[],
   nextCursor:null,items:[],loading:false,message:'',error:''};seq++;
 },
 renderTasks,renderSummary
});
})(window);
