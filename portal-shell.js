/* DizzyOps Phase 04 — personal workspace navigation. No customer/performer data. 
   Preferences store route IDs only and never grant API permissions.
*/
(function(root){
'use strict';
const MAX_PINS=8,MAX_RECENTS=7;
const aliases=Object.freeze({
 Dashboard:['overview','home'],Workspaces:['apps','modules','directory'],
 MyWork:['shortcuts','favorites','favourites','recent','my work'],
 Tasks:['activity','inbox','assignments','approvals','to do','tasks'],
 Bookings:['enquiry','calendar','event'],Jobs:['assignments','production'],
 Performers:['talent','artists','cast'],Clients:['crm','customers','contacts'],
 Partners:['agents','vendors','suppliers'],Quotes:['quotation','estimate'],
 Invoices:['receipts','payments','billing'],Expenses:['commissions','costs'],
 Payroll:['payslips','statements'],Inventory:['costumes','props','stock'],
 Assets:['couriers','dispatch','deliveries'],Fabrication:['builds','production'],
 Documents:['drive','contracts','media'],FollowUp:['feedback','photos','video','post-job'],
 Reports:['analytics','metrics'],Integrations:['sage','connections'],Settings:['administration','configuration']
});
const finance=new Set(['Quotes','Invoices','Expenses','Payroll']);
const adminOnly=new Set(['Settings']);
const restrictedDocs=new Set(['Documents']);
const navigable=(routes)=>routes.sections.filter(([,id])=>!['Profile','AccountSettings','Login','Support','Signout'].includes(id));
const storageKey=(scope)=>'dizzyops-shell:v1:'+(String(scope||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100)||'preview');
function validItems(values,allowed,max){
 if(!Array.isArray(values))return [];
 const out=[];
 for(const value of values){
  if(typeof value==='string'&&allowed.has(value)&&!out.includes(value)){out.push(value);if(out.length>=max)break}
 }
 return out;
}
function readPreferences(storage,scope,routes){
 const allowed=new Set(navigable(routes).map(x=>x[1]));
 const groups=new Set(routes.groups.map(x=>x[0]));
 try{
  const data=JSON.parse(storage?.getItem(storageKey(scope))||'{}');
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid data');
  return {pins:validItems(data.pins,allowed,MAX_PINS),
    recent:validItems(data.recent,allowed,MAX_RECENTS),
    collapsed:validItems(data.collapsed,groups,groups.size)};
 }catch{return {pins:[],recent:[],collapsed:[]}}
}
function writePreferences(storage,scope,data){
 try{storage?.setItem(storageKey(scope),JSON.stringify(data));return true}catch{return false}
}
function permitted(name,role,capabilities,authenticated){
 if(!authenticated)return true; // Public preview is non-authoritative, data access remains disabled.
 if(name==='Tasks'&&role==='agent')return false;
 if(adminOnly.has(name)&&role!=='administrator'&&role!=='management')return false;
 if(finance.has(name)&&!['administrator','management','finance'].includes(role))return false;
 if(name==='Integrations'&&!['administrator','management','finance'].includes(role))return false;
 if(restrictedDocs.has(name)&&!['administrator','management'].includes(role))return false;
 if(name==='Reports'&&role==='agent')return false;
 const moduleNames=new Set(['Bookings','Jobs','Performers','Clients','Partners','Inventory','Assets','Fabrication','Documents','FollowUp']);
 if(moduleNames.has(name)){
  // Phase-03 role policy is a ceiling for client navigation, never an override.
  if(role==='agent')return false;
  if(role==='finance'&&!['Bookings','Jobs','Clients'].includes(name))return false;
  if(capabilities&&Object.keys(capabilities).length>0&&Object.hasOwn(capabilities,name))
   return capabilities[name]?.read===true;
  // Mirrors the server role policy for UX only; backend authorizes every request.
 }
 return true;
}
function findRoutes(routes,term,{pins=[],recent=[],allowed=()=>true}={}){
 const search=String(term||'').trim().toLowerCase().normalize('NFKC');
 const entries=navigable(routes).filter(([,id])=>allowed(id));
 const rank=([label,id])=>{
  let score=0;
  if(pins.includes(id))score+=50;
  if(recent.includes(id))score+=12;
  if(search){
   const phrases=[label,id,...(aliases[id]||[])].map(x=>x.toLowerCase());
   if(phrases.some(x=>x===search))score+=100;
   else if(phrases.some(x=>x.startsWith(search)))score+=60;
   else if(phrases.some(x=>x.includes(search)))score+=20;
   else return -1;
  }
  return score;
 };
 return entries.map(item=>({item,score:rank(item)})).filter(x=>x.score>=0)
   .sort((a,b)=>b.score-a.score||a.item[0].localeCompare(b.item[0])).map(x=>x.item);
}
function createModel(routes,{storage=null,scope='preview'}={}){
 let currentScope=scope;
 let prefs=readPreferences(storage,currentScope,routes);
 let active='Dashboard',identity=null,caps=null;
 const allowed=id=>permitted(id,identity?.role,caps,!!identity);
 const save=()=>writePreferences(storage,currentScope,prefs);
 return {
  get pins(){return [...prefs.pins]},
  get recent(){return [...prefs.recent]},
  get collapsed(){return [...prefs.collapsed]},
  get role(){return identity?.role||null},
  get authenticated(){return !!identity},
  get active(){return active},
  allowed,
  setIdentity(user){
   identity=user&&user.uid&&user.role?{uid:String(user.uid),role:String(user.role)}:null;
   caps=null; // Never reuse the previous staff session's capability response.
   currentScope=identity?'staff-'+identity.uid:'preview';
   prefs=readPreferences(storage,currentScope,routes);
  },
  setCapabilities(map){caps=map&&typeof map==='object'&&!Array.isArray(map)?map:null},
  setActive(id){
   if(!allowed(id))return;
   active=id;
   if(navigable(routes).some(x=>x[1]===id)&&!['Dashboard','Workspaces','MyWork'].includes(id)){
    prefs.recent=[id,...prefs.recent.filter(x=>x!==id)].slice(0,MAX_RECENTS);
    save();
   }
  },
  isPinned:id=>prefs.pins.includes(id),
  togglePin(id){
   const ids=new Set(navigable(routes).map(x=>x[1]));
   if(!ids.has(id)||!allowed(id))return false;
   if(prefs.pins.includes(id))prefs.pins=prefs.pins.filter(x=>x!==id);
   else if(prefs.pins.length>=MAX_PINS)return false;
   else prefs.pins=[...prefs.pins,id];
   save();return true;
  },
  toggleGroup(group){
   if(!routes.groups.some(x=>x[0]===group))return false;
   prefs.collapsed=prefs.collapsed.includes(group)?
     prefs.collapsed.filter(x=>x!==group):[...prefs.collapsed,group];
   save();return true;
  },
  search:q=>findRoutes(routes,q,{pins:prefs.pins,recent:prefs.recent,allowed}),
  label:id=>routes.sections.find(([,value])=>value===id)?.[0]||id,
  group:id=>routes.groups.find(([,members])=>members.includes(id))?.[0]||'WORKSPACE'
 };
}
function mount({routes,nav,view,subtitle,navigate,storage=null}){
 const model=createModel(routes,{storage});
 const $=id=>document.getElementById(id);
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const excluded=new Set(['Dashboard','Workspaces','MyWork']);
 const go=name=>{if(model.allowed(name))navigate(name)};
 function node(tag,text,className){
  const el=document.createElement(tag);
  if(text!=null)el.textContent=text;
  if(className)el.className=className;
  return el;
 }
 function navLink(id){
  const button=node('button',model.label(id),'workspace-nav-link');
  button.type='button';button.dataset.page=id;
  button.addEventListener('click',()=>go(id));
  if(model.active===id)button.setAttribute('aria-current','page');
  return button;
 }
 function drawNav(){
  nav.replaceChildren();
  const pinned=model.pins.filter(model.allowed);
  if(pinned.length){
   const label=node('div','PINNED','nav-heading');nav.appendChild(label);
   for(const id of pinned)nav.appendChild(navLink(id));
  }
  const tools=node('div','YOUR WORKSPACE','nav-heading');nav.appendChild(tools);
  for(const id of ['Dashboard','Workspaces','MyWork'])if(model.allowed(id))nav.appendChild(navLink(id));
  for(const [title,ids] of routes.groups){
   const visible=ids.filter(model.allowed);
   if(!visible.length)continue;
   const section=node('section',null,'workspace-nav-group');
   const disclosure=node('button',null,'workspace-nav-disclosure');
   disclosure.type='button';
   const activeWithin=visible.includes(model.active);
   const collapsed=model.collapsed.includes(title)&&!activeWithin;
   disclosure.setAttribute('aria-expanded',String(!collapsed));
   const regionId='nav-group-'+title.toLowerCase().replace(/[^a-z]+/g,'-');
   disclosure.setAttribute('aria-controls',regionId);
   disclosure.append(node('span',title),node('span',collapsed?'＋':'−','workspace-nav-symbol'));
   const body=node('div',null,'workspace-nav-items');body.id=regionId;body.hidden=collapsed;
   visible.forEach(id=>body.appendChild(navLink(id)));
   disclosure.addEventListener('click',()=>{model.toggleGroup(title);drawNav();
    nav.querySelector('[aria-controls="'+regionId+'"]')?.focus();
   });
   section.append(disclosure,body);nav.appendChild(section);
  }
 }
 function refreshChrome(){
  const crumbs=$('workspace-breadcrumb'),pin=$('workspace-pin'),status=$('workspace-status');
  const copy=$('workspace-copy-link');
  if(copy)copy.textContent='Copy link';
  if(crumbs){
   crumbs.replaceChildren();
   const home=node('button','Workspace','workspace-crumb');
   home.type='button';home.onclick=()=>go('Workspaces');crumbs.appendChild(home);
   const group=model.group(model.active);
   crumbs.appendChild(node('span','/','workspace-crumb-divider'));
   crumbs.appendChild(node('span',group.replaceAll('_',' ').toLowerCase(),'workspace-crumb-group'));
   crumbs.appendChild(node('span','/','workspace-crumb-divider'));
   const current=node('span',model.label(model.active),'workspace-crumb-current');
   current.setAttribute('aria-current','page');crumbs.appendChild(current);
  }
  if(pin){
   pin.hidden=excluded.has(model.active)||!model.allowed(model.active)||
    !routes.groups.some(([,items])=>items.includes(model.active));
   pin.textContent=model.isPinned(model.active)?'★ Pinned':'☆ Pin page';
   pin.setAttribute('aria-pressed',String(model.isPinned(model.active)));
  }
  if(status)status.textContent=model.authenticated?'Staff · '+model.role:'Preview · No live data';
 }
 function refresh(){drawNav();refreshChrome()}
 function renderWorkspaces(){
  subtitle.textContent='Discover all AfrodizzyActs operations, finance and administration modules.';
  view.innerHTML='<section class="workspace-directory"><div class="workspace-heading">'+
   '<div><h2>Application directory</h2><p>Open a module or pin it for quick access. This directory contains navigation links, not business records.</p></div>'+
   '<label>Find an application<input type="search" id="workspace-directory-search" placeholder="Bookings, CRM, reporting…"></label></div>'+
   '<div id="workspace-directory-content"></div></section>';
  const input=$('workspace-directory-search');
  function build(){
   const host=$('workspace-directory-content');host.replaceChildren();
   const value=input.value.trim();
   const available=new Set(model.search(value).map(x=>x[1]));
   for(const [group,ids] of routes.groups){
    const found=ids.filter(id=>model.allowed(id)&&available.has(id));
    if(!found.length)continue;
    const section=node('section',null,'workspace-directory-group');
    section.appendChild(node('h3',group.replaceAll('_',' ')));
    const grid=node('div',null,'workspace-card-grid');
    for(const id of found){
     const card=node('article',null,'workspace-app-card');
     const heading=node('div',null,'workspace-card-title');
     heading.appendChild(node('h4',model.label(id)));
     const actions=node('div',null,'workspace-card-actions');
     const open=node('button','Open module','workspace-card-open');open.type='button';
     open.onclick=()=>go(id);
     const pin=node('button',model.isPinned(id)?'★ Unpin':'☆ Pin','workspace-card-pin');pin.type='button';
     pin.setAttribute('aria-pressed',String(model.isPinned(id)));
     pin.setAttribute('aria-label',(model.isPinned(id)?'Unpin ':'Pin ')+model.label(id));
     pin.onclick=()=>{if(model.togglePin(id)){refresh();build();}};
     actions.append(open,pin);
     card.append(heading,node('p','Module workspace · '+group.toLowerCase()),actions);
     grid.appendChild(card);
    }
    section.appendChild(grid);host.appendChild(section);
   }
   if(!host.childElementCount)host.appendChild(node('p','No matching applications are available.','workspace-no-results'));
  }
  input.addEventListener('input',build);build();
 }
 function renderMyWork(){
  subtitle.textContent='Your pinned modules and recently visited pages on this device.';
  view.innerHTML='<section class="workspace-personal"><div class="workspace-personal-header">'+
   '<h2>My workspace</h2><p>Quick links are personal navigation preferences only. No bookings, tasks or client records are stored here.</p></div>'+
   '<section class="panel"><h3>Pinned modules</h3><div id="workspace-my-pins"></div></section>'+
   '<section class="panel"><h3>Recent modules</h3><div id="workspace-my-recent"></div></section>'+
   '<section class="panel"><h3>My assigned tasks</h3><div id="workspace-activity-summary"></div></section></section>';
  function entries(hostId,ids,emptyText){
   const host=$(hostId);host.replaceChildren();
   const allowed=ids.filter(model.allowed);
   if(!allowed.length){host.appendChild(node('p',emptyText,'workspace-no-results'));return}
   const list=node('div',null,'workspace-shortcut-list');
   for(const id of allowed){
    const row=node('div',null,'workspace-shortcut-row');
    const b=node('button',model.label(id));b.type='button';b.onclick=()=>go(id);row.appendChild(b);
    if(hostId==='workspace-my-pins'){
     const remove=node('button','Remove','workspace-remove-shortcut');
     remove.type='button';remove.setAttribute('aria-label','Unpin '+model.label(id));
     remove.onclick=()=>{model.togglePin(id);refresh();renderMyWork()};
     row.appendChild(remove);
    }
    list.appendChild(row);
   }
   host.appendChild(list);
  }
  entries('workspace-my-pins',model.pins,'No pinned modules yet. Open the application directory to pin a module.');
  entries('workspace-my-recent',model.recent,'No recently visited modules on this device.');
  root.DizzyActivity?.renderSummary($('workspace-activity-summary'));
 }
 const pinButton=$('workspace-pin');
 pinButton?.addEventListener('click',()=>{
  if(model.togglePin(model.active)){refresh();if(model.active==='MyWork')renderMyWork()}
 });
 $('workspace-apps')?.addEventListener('click',()=>go('Workspaces'));
 $('workspace-mywork')?.addEventListener('click',()=>go('MyWork'));
 $('workspace-search-trigger')?.addEventListener('click',()=>root.DizzyNavigation?.openSearch());
 $('workspace-copy-link')?.addEventListener('click',async event=>{
  const button=event.currentTarget;
  try{
   await navigator.clipboard.writeText(location.href);
   button.textContent='Link copied';
  }catch{button.textContent='Copy unavailable'}
 });
 return Object.freeze({
  model,
  refresh,
  renderWorkspaces,
  renderMyWork,
  setActive(id){model.setActive(id);refresh()},
  setIdentity(identity){model.setIdentity(identity);refresh()},
  setCapabilities(map){model.setCapabilities(map);refresh()},
  canVisit:id=>model.allowed(id),
  search:q=>model.search(q),
  togglePin:id=>{const ok=model.togglePin(id);if(ok)refresh();return ok}
 });
}
const api=Object.freeze({MAX_PINS,MAX_RECENTS,storageKey,validItems,readPreferences,writePreferences,permitted,findRoutes,createModel,mount});
root.DizzyShell=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
