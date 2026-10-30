
const sections=window.DizzyRoutes.sections;
const nav=document.getElementById('nav'),view=document.getElementById('view'),title=document.getElementById('title'),subtitle=document.getElementById('subtitle'),sidebar=document.getElementById('sidebar');
function empty(name){return '<div class="empty"><strong>No '+name.toLowerCase()+' yet</strong><p>This workspace is ready for real records once secure authentication, data storage and integrations are configured. No sample records are displayed.</p></div>'}
let verifiedStaff=null;
const accountPages={Profile:1,AccountSettings:1,Login:1,Support:1,Signout:1};
function accountView(name){const heading={Profile:'My profile',AccountSettings:'Account settings',Login:'Log in',Support:'Help & support',Signout:'Sign out'}[name];title.textContent=heading;subtitle.textContent='Account and assistance · AfrodizzyActs DizzyOps';let body='';if(name==='Profile')body='<div class="notice">No user is signed in. Profile details will be available after identity integration.</div><div class="account-grid"><section class="panel"><h2>Personal information</h2><p>Name, email, phone number and avatar will appear here for the authenticated user.</p></section><section class="panel"><h2>Organization & access</h2><p>Assigned role, permissions and organization membership will be shown here.</p></section></div>';if(name==='AccountSettings')body='<div class="notice">Display preferences are stored only in this browser. Account security and notification preferences require a connected identity service.</div><section class="panel"><h2>Display preferences</h2><label class="field">Interface density<select id="density"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><button class="primary-action" id="save-preferences">Save preferences</button><p id="preferences-status" role="status"></p></section><div class="account-grid"><section class="panel"><h2>Security</h2><p>Password, multifactor authentication and active sessions will be managed through the identity provider.</p></section><section class="panel"><h2>Notifications</h2><p>Notification delivery will become available when user accounts are enabled.</p></section></div>';if(name==='Login'){const auth=window.DIZZYOPS_AUTH_CONFIG||{};let ready=false;try{const url=new URL(auth.loginUrl);ready=auth.enabled===true&&url.protocol==='https:'&&url.username===''&&url.password===''&&url.hash===''&&url.search===''&&url.hostname!=='accounts.google.com'}catch{}body='<div class="notice">'+(ready?'Google Workspace sign-in will be managed by the secure DizzyOps service provider.':'SSO configuration is prepared, but the secure service-provider endpoint has not been deployed. GitHub Pages remains an unauthenticated preview.')+'</div><section class="panel"><h2>Sign in with Google Workspace</h2><p>Use your AfrodizzyActs-approved Google Workspace account. Access is granted only after server-side SAML validation and role authorization.</p><button class="primary-action" id="google-sso-signin" '+(ready?'':'disabled title="Awaiting the secure service-provider endpoint"')+'>Continue with Google Workspace</button><p>Single sign-on uses Google as the identity provider. Do not enter a password into this portal.</p></section>'}if(name==='Support')body='<div class="account-grid"><section class="panel"><h2>Getting started</h2><p>Use the left navigation to explore bookings, performers, invoices, inventory and reporting. Records are empty until the database is connected.</p></section><section class="panel"><h2>Contact support</h2><p>Contact your AfrodizzyActs administrator for access, account or application assistance. A dedicated support channel has not yet been configured.</p></section><section class="panel"><h2>Technical details</h2><p>Application: DizzyOps · Deployment: GitHub Pages frontend · Authentication: pending · Data services: pending.</p></section></div>';if(name==='Signout')body='<div class="notice">No authenticated session exists in this preview, so there is nothing to sign out from.</div><section class="panel"><h2>Session management</h2><p>When secure sign-in is enabled, this page will end the server-side session and redirect to the login page.</p><button class="primary-action" id="return-login">Go to login</button></section>';view.innerHTML=body;if(name==='AccountSettings'){const select=document.getElementById('density');select.value=localStorage.getItem('dizzyops-density')||'comfortable';document.getElementById('save-preferences').onclick=()=>{localStorage.setItem('dizzyops-density',select.value);document.getElementById('preferences-status').textContent='Display preference saved in this browser.'}}if(name==='Signout')document.getElementById('return-login').onclick=()=>show('Login');if(name==='Login'){const b=document.getElementById('google-sso-signin');if(!b.disabled)b.onclick=()=>location.assign(window.DIZZYOPS_AUTH_CONFIG.loginUrl)}}
function followUpView(){return `<div class="notice">Google Workspace and Drive are not connected. This screen contains no client or job data. Connect a secure backend before enabling live workflows.</div><div class="metrics"><div class="metric"><label>Jobs awaiting follow-up</label><strong>—</strong></div><div class="metric"><label>Feedback outstanding</label><strong>—</strong></div><div class="metric"><label>Media requests pending</label><strong>—</strong></div><div class="metric"><label>Media collected</label><strong>—</strong></div></div><div class="grid"><section class="panel"><h2>Post-job workflow</h2><p>Each completed job will generate an assigned follow-up record with an audit trail.</p><ol class="workflow-steps"><li>Thank the client using Gmail</li><li>Request and record client feedback</li><li>Request client photographs and videos</li><li>Follow up for professional photography and video</li><li>Search social channels and record source links</li><li>Request media from event or job managers</li><li>Verify usage rights and archive approved media in Drive</li></ol></section><section class="panel"><h2>Google Workspace integration</h2><p>Integration status: Not configured</p><p>Use Google OAuth 2.0 / OpenID Connect for staff sign-in, a server-side API for Gmail and Drive operations, and least-privilege permissions. Never put API secrets in GitHub Pages.</p><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud credentials ↗</a><p><a href="https://developers.google.com/workspace/drive/api/guides/about-sdk" target="_blank" rel="noopener noreferrer">Google Drive API documentation ↗</a></p><p><a href="https://developers.google.com/workspace/gmail/api/guides" target="_blank" rel="noopener noreferrer">Gmail API documentation ↗</a></p></section></div><section class="panel" style="margin-top:18px"><h2>Integration readiness</h2><p>To activate real jobs and follow-ups, an AfrodizzyActs Google Workspace administrator must approve the identity and API configuration. These controls are deliberately unavailable until a secure backend is deployed.</p><ol class="workflow-steps"><li>Confirm Google Cloud project and approved Workspace domain</li><li>Configure OIDC sign-in and server-side sessions</li><li>Provision private data storage and role-based access</li><li>Grant least-privilege Gmail and Drive API access with administrator consent</li><li>Set up a dedicated Shared Drive and job folder policy</li><li>Verify audit logging, retention and POPIA requirements</li></ol><p><a href="https://github.com/AfrodizzyActs/DizzyOps/blob/main/docs/post-job-google-workspace-integration.md" target="_blank" rel="noopener noreferrer">Read integration specification ↗</a></p></section><section class="panel" style="margin-top:18px"><h2>Follow-up register</h2><div class="empty"><strong>No follow-up records</strong><p>Once the secure backend is connected, this register will show job, client, assigned owner, thank-you status, feedback, media status, next action, deadline and linked Drive folder.</p></div></section>`}

// Module workspaces are design-only until the secure API is deployed. Inputs remain in memory; no data is persisted.
const moduleSpecs={
Bookings:{desc:'Manage enquiries, dates, venues and booking confirmations.',fields:[['Client or company','text'],['Event date','date'],['Venue / location','text'],['Event description','textarea']],steps:['Receive enquiry','Check availability','Prepare quote','Confirm booking']},
Jobs:{desc:'Coordinate confirmed work, staffing and completion.',fields:[['Job title','text'],['Event date','date'],['Assigned coordinator','text'],['Job brief','textarea']],steps:['Confirm job details','Assign performers','Track logistics','Close out job']},
Performers:{desc:'Manage artist profiles, availability and compliance.',fields:[['Stage / performer name','text'],['Contact email','email'],['Specialty','text'],['Notes','textarea']],steps:['Collect details','Review documentation','Confirm availability','Issue assignment link']},
Clients:{desc:'Maintain customer contacts and engagement history.',fields:[['Client name','text'],['Contact email','email'],['Phone','tel'],['Notes','textarea']],steps:['Capture enquiry','Confirm contact','Link bookings','Review follow-up']},
Partners:{desc:'Coordinate agents, suppliers and event partners.',fields:[['Supplier / agent name','text'],['Email','email'],['Service category','text'],['Notes','textarea']],steps:['Register partner','Review agreement','Link jobs','Review performance']},
Quotes:{desc:'Prepare Sage-compatible quotation details before financial integration.',fields:[['Customer name','text'],['Quote reference','text'],['Issue date','date'],['Description','textarea'],['Amount (ZAR)','number']],steps:['Select customer','Add line items','Review taxes and totals','Submit through Sage']},
Invoices:{desc:'Track invoices, receipts and customer payments through Sage once connected.',fields:[['Customer name','text'],['Invoice reference','text'],['Due date','date'],['Description','textarea'],['Amount (ZAR)','number']],steps:['Select customer','Review invoice','Issue via Sage','Reconcile receipt']},
Expenses:{desc:'Review expenses and performer commissions.',fields:[['Expense description','text'],['Supplier','text'],['Transaction date','date'],['Amount (ZAR)','number'],['Supporting notes','textarea']],steps:['Capture expense','Attach evidence','Approve commission','Post to Sage']},
Payroll:{desc:'Manage performer payment statements and payslip preparation.',fields:[['Payee name','text'],['Period ending','date'],['Reference','text'],['Gross amount (ZAR)','number'],['Notes','textarea']],steps:['Confirm completed jobs','Review deductions','Approve payment','Issue statement']},
Inventory:{desc:'Organize costumes, props and stock movements.',fields:[['Item name','text'],['Category','text'],['Quantity','number'],['Storage location','text'],['Notes','textarea']],steps:['Register item','Allocate to job','Record checkout','Record return']},
Assets:{desc:'Track equipment, deliveries, couriers and returns.',fields:[['Asset / delivery name','text'],['Assigned courier','text'],['Delivery date','date'],['Destination','text'],['Notes','textarea']],steps:['Prepare dispatch','Assign courier','Confirm delivery','Close return']},
Fabrication:{desc:'Coordinate fabrication requests and production tasks.',fields:[['Project name','text'],['Required by','date'],['Assigned supplier','text'],['Specification','textarea']],steps:['Submit brief','Review estimate','Approve production','Confirm delivery']},
Documents:{desc:'Organize documents and media in Google Drive once connected.',fields:[['Document title','text'],['Associated job reference','text'],['Document category','text'],['Description','textarea']],steps:['Classify document','Check permissions','Upload to Shared Drive','Link to job']},
Reports:{desc:'Review operational and financial performance when real data is available.',fields:[],steps:['Select reporting period','Apply filters','Review verified data','Export authorized report']},
Settings:{desc:'Review integration, access and security readiness.',fields:[],steps:['Approve 14 staff accounts','Configure Google Cloud project','Connect Workspace','Connect Sage Accounting']}
};
function moduleView(name,label){
 const spec=moduleSpecs[name];if(!spec)return '<section class="panel">'+empty(label)+'</section>';
 const fields=spec.fields.map(([name,type],i)=>'<label class="module-field"><span>'+name+'</span>'+(type==='textarea'?'<textarea rows="3" name="f'+i+'" placeholder="Enter '+name.toLowerCase()+'"></textarea>':'<input name="f'+i+'" type="'+type+'" '+(type==='number'?'min="0" step="0.01"':'')+' placeholder="Enter '+name.toLowerCase()+'">')+'</label>').join('');
 return '<div class="module-head"><div><p class="module-kicker">OPERATIONS WORKSPACE · PREVIEW</p><p>'+spec.desc+'</p></div><span class="pill">Backend not connected</span></div><div class="module-layout"><section class="panel"><h2>'+label+' register</h2><div class="module-toolbar"><label>Search this workspace<input class="module-filter" aria-label="Search '+label+'" placeholder="Search records" disabled></label><button type="button" class="module-action" disabled title="Requires secure backend">Export</button></div>'+empty(label)+'</section><section class="panel"><h2>'+(spec.fields.length?'Prepare '+label.toLowerCase()+' details':'Implementation checklist')+'</h2><p class="module-muted">'+(spec.fields.length?'Use this form to plan the required fields. No details are saved or transmitted.':'These steps require production administrator configuration.')+'</p>'+(spec.fields.length?'<form class="module-form" id="module-form">'+fields+'<div class="module-actions"><button type="reset" class="module-action">Clear form</button><button type="button" class="module-action module-primary" id="module-review">Review details</button></div><p class="module-feedback" id="module-feedback" role="status" aria-live="polite"></p></form>':'')+'<h3>Workflow</h3><ol class="module-steps">'+spec.steps.map(x=>'<li>'+x+'</li>').join('')+'</ol></section></div>';
}
function wireModule(name){const form=document.getElementById('module-form');if(!form)return;const status=document.getElementById('module-feedback');form.addEventListener('reset',()=>{status.textContent='Form cleared. No records were saved.'});document.getElementById('module-review').onclick=()=>{const values=[...new FormData(form).values()].map(x=>String(x).trim());if(values.every(x=>!x)){status.textContent='Enter details before reviewing.';return}const invalid=[...form.querySelectorAll('input')].find(x=>!x.checkValidity());if(invalid){invalid.reportValidity();return}status.textContent='Details reviewed locally. Nothing was saved or submitted; secure data services are not yet connected.'};}

function dashboardView(){return '<div class="dashboard-actions"><button class="quick-search" data-action="search">Search workspace (Ctrl/⌘ K)</button><button class="primary-action" disabled title="Backend not connected">+ New booking</button></div><div class="metrics">'+['Active bookings','Registered performers','Open invoices','Pending assignments'].map(a=>'<div class="metric"><label>'+a+'</label><strong>—</strong><p>Not connected</p></div>').join('')+'</div><h2>Needs attention</h2><div class="task-cards">'+[['Upcoming bookings','Bookings'],['Job assignments','Jobs'],['Client follow-ups','FollowUp'],['Financial documents','Quotes']].map(([label,key])=>'<article class="task-card"><h2>'+label+'</h2><p>No live records connected.</p><button data-go="' + key + '">Open workspace</button></article>').join('')+'</div><div class="notice">No sample data is shown. Connect authentication and the database to enable live operations.</div>'}let searchReturnFocus=null;
function openSearch(){
  const overlay=document.getElementById('search-overlay');
  if(!overlay.hidden)return;
  searchReturnFocus=document.activeElement;overlay.hidden=false;
  document.body.classList.add('search-open');
  const input=document.getElementById('search-input');input.value='';renderSearch('');input.focus();
}
function closeSearch(restore=true){
  const overlay=document.getElementById('search-overlay');if(overlay.hidden)return;
  overlay.hidden=true;document.body.classList.remove('search-open');
  if(restore&&searchReturnFocus?.isConnected)searchReturnFocus.focus();
  searchReturnFocus=null;
}
function renderSearch(q){
  const box=document.getElementById('search-results');
  box.replaceChildren();
  const matches=shell.search(q).slice(0,14);
  if(!matches.length){box.textContent='No matching modules. Try a different page name.';return}
  matches.forEach(([label,key])=>{
    const button=document.createElement('button');
    button.type='button';button.className='search-result';button.dataset.searchResult=key;
    const text=document.createElement('span');text.textContent=label;
    const meta=document.createElement('small');
    meta.textContent=(shell.model.isPinned(key)?'Pinned · ':'')+shell.model.group(key).toLowerCase();
    button.append(text,meta);
    button.onclick=()=>{closeSearch(false);show(key)};
    box.appendChild(button);
  });
}
function show(requested,{historyMode='push'}={}){
  const requestedName=window.DizzyRoutes.normalize(requested);
  const name=verifiedStaff&&!shell.canVisit(requestedName)?'Workspaces':requestedName;
  const valid=sections.find(([,key])=>key===name);
  // The public preview stays read-only; the protected host waits for server confirmation.
  if(window.DIZZYOPS_AUTH_CONFIG?.identityPlatform?.enabled===true&&!verifiedStaff){
    title.textContent='Verifying staff session';
    subtitle.textContent='Checking Google Workspace authorization before opening private modules.';
    view.innerHTML='<section class="panel" role="status"><h2>Verifying access</h2><p>No private records will be shown until the server confirms your approved staff identity.</p></section>';
    return;
  }
  if(accountPages[name])accountView(name);
  else{
    title.textContent=valid[0];
    if(name==='Workspaces'){shell.renderWorkspaces();shell.setActive(name);closeSidebar();closeAccountMenu();if(!document.getElementById('search-overlay').hidden)closeSearch(false);
      if(historyMode!=='none'&&window.location.hash!==window.DizzyRoutes.hashFor(name))window.history[historyMode==='replace'?'replaceState':'pushState'](null,'',window.DizzyRoutes.hashFor(name));
      return;
    }
    if(name==='MyWork'){shell.renderMyWork();shell.setActive(name);closeSidebar();closeAccountMenu();if(!document.getElementById('search-overlay').hidden)closeSearch(false);
      if(historyMode!=='none'&&window.location.hash!==window.DizzyRoutes.hashFor(name))window.history[historyMode==='replace'?'replaceState':'pushState'](null,'',window.DizzyRoutes.hashFor(name));
      return;
    }
    title.textContent=valid[0];
    subtitle.textContent=name==='Dashboard'?'Your centralized workspace for bookings, performers, finance and operations.':'Manage '+valid[0].toLowerCase()+' in the DizzyOps workspace.';
    if(name==='Tasks'&&window.DizzyActivity){subtitle.textContent='Verified staff tasks, related jobs and audited status updates.';void window.DizzyActivity.renderTasks();}
    else if(name==='Dashboard'&&window.DizzyOperations)window.DizzyOperations.renderDashboard();
    else if(name==='Reports'&&window.DizzyOperations)window.DizzyOperations.renderReports();
    else if(name==='Settings'&&window.DizzyOperations)window.DizzyOperations.renderSettings();
    else if(name==='Integrations'&&window.DizzySage)window.DizzySage.render();
    else if(window.DizzyOperationsSchema?.schemas?.[name]&&window.DizzyOperations)window.DizzyOperations.render(name,verifiedStaff);
    else if(window.DizzyRoutes.isFinance(name)&&window.DizzyRoutes.canRenderFinance(verifiedStaff,window.DIZZYOPS_AUTH_CONFIG?.identityPlatform?.enabled)){
      if(name==='Quotes'&&window.DizzyQuotes)window.DizzyQuotes.render();
      else if(window.DizzyFinance)window.DizzyFinance.render(name);
      else{view.innerHTML=moduleView(name,valid[0]);wireModule(name)}
      window.DizzySage?.attach(name);
    }else{view.innerHTML=moduleView(name,valid[0]);wireModule(name)}
  }
  shell.setActive(name);
  document.querySelectorAll('[data-page]').forEach(button=>{
    const active=button.dataset.page===name;button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  if(!document.getElementById('search-overlay').hidden)closeSearch(false);
  closeSidebar();closeAccountMenu();
  const target=window.DizzyRoutes.hashFor(name);
  if(historyMode!=='none'&&window.location.hash!==target){
    if(historyMode==='replace')window.history.replaceState(null,'',target);
    else window.history.pushState(null,'',target);
  }
}
const shell=window.DizzyShell.mount({
  routes:window.DizzyRoutes,
  nav,view,subtitle,
  navigate:key=>show(key),
  storage:(()=>{try{return window.localStorage}catch{return null}})()
});
const bottomNav=document.getElementById('bottom-nav'),menuButton=document.getElementById('menu'),
  backdrop=document.getElementById('sidebar-backdrop');
let moreButton=null;
[['Home','Dashboard'],['Tasks','Tasks'],['Jobs','Jobs'],['More','More']].forEach(([label,key])=>{
  const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.page=key;
  if(key==='More'){moreButton=button;button.setAttribute('aria-controls','sidebar');button.setAttribute('aria-expanded','false')}
  button.onclick=()=>key==='More'?(sidebar.classList.contains('open')?closeSidebar(true):openSidebar()):show(key);
  bottomNav.appendChild(button);
});
function closeSidebar(restoreFocus=false){
  const wasOpen=sidebar.classList.contains('open');sidebar.classList.remove('open');
  menuButton.setAttribute('aria-expanded','false');moreButton?.setAttribute('aria-expanded','false');
  backdrop.hidden=true;document.body.classList.remove('nav-open');
  if(restoreFocus&&wasOpen)(moreButton||menuButton).focus();
}
function openSidebar(){
  if(!window.matchMedia('(max-width:650px)').matches)return;
  sidebar.classList.add('open');menuButton.setAttribute('aria-expanded','true');
  moreButton?.setAttribute('aria-expanded','true');backdrop.hidden=false;
  document.body.classList.add('nav-open');
  (sidebar.querySelector('[aria-current="page"]')||sidebar.querySelector('button'))?.focus();
}
menuButton.addEventListener('click',()=>sidebar.classList.contains('open')?closeSidebar(true):openSidebar());
backdrop.addEventListener('click',()=>closeSidebar(true));
window.addEventListener('resize',()=>{if(!window.matchMedia('(max-width:650px)').matches)closeSidebar()});
const accountTrigger=document.getElementById('account-trigger'),accountMenu=document.getElementById('account-menu');
function closeAccountMenu(){accountMenu.hidden=true;accountTrigger.setAttribute('aria-expanded','false')}
function toggleAccountMenu(){accountMenu.hidden=!accountMenu.hidden;
  accountTrigger.setAttribute('aria-expanded',String(!accountMenu.hidden));
  if(!accountMenu.hidden)accountMenu.querySelector('[role="menuitem"]')?.focus();
}
accountTrigger.addEventListener('click',toggleAccountMenu);
accountMenu.querySelectorAll('[data-account]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.account)));
document.addEventListener('click',event=>{if(!event.target.closest('.account-wrap'))closeAccountMenu()});
document.getElementById('search-close').onclick=()=>closeSearch();
document.getElementById('search-input').oninput=event=>renderSearch(event.target.value);
document.getElementById('search-input').addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'){
    const first=document.querySelector('#search-results .search-result');
    if(first){event.preventDefault();first.focus()}
  }
  if(event.key==='Enter'){
    const first=document.querySelector('#search-results .search-result');
    if(first){event.preventDefault();first.click()}
  }
});
document.getElementById('search-results').addEventListener('keydown',event=>{
  if(!['ArrowDown','ArrowUp'].includes(event.key))return;
  const results=[...document.querySelectorAll('#search-results .search-result')];
  const index=results.indexOf(document.activeElement);if(index<0)return;
  event.preventDefault();
  const next=event.key==='ArrowDown'?index+1:index-1;
  if(next<0)document.getElementById('search-input').focus();
  else results[Math.min(results.length-1,next)]?.focus();
});
document.getElementById('search-overlay').onclick=event=>{if(event.target.id==='search-overlay')closeSearch()};
function trapTab(event,container){
  const elements=[...container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')]
    .filter(el=>!el.hidden&&el.getClientRects().length>0);
  if(!elements.length){event.preventDefault();container.focus();return}
  const first=elements[0],last=elements[elements.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
}
document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch();return}
  if(event.key==='/'&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&
    !event.target?.closest?.('input,textarea,select,[contenteditable="true"]')&&
    document.getElementById('search-overlay').hidden){event.preventDefault();openSearch();return}
  if(event.key==='Escape'){
    if(!document.getElementById('search-overlay').hidden){event.preventDefault();closeSearch();return}
    if(sidebar.classList.contains('open')){event.preventDefault();closeSidebar(true);return}
    if(!accountMenu.hidden){event.preventDefault();closeAccountMenu();accountTrigger.focus()}
  }
  if(event.key==='Tab'){
    if(!document.getElementById('search-overlay').hidden)trapTab(event,document.querySelector('.search-panel'));
    else if(sidebar.classList.contains('open'))trapTab(event,sidebar);
    else if(!accountMenu.hidden)trapTab(event,accountMenu);
  }
});
function restoreRoute(){show(window.DizzyRoutes.fromHash(window.location.hash),{historyMode:'none'})}
window.addEventListener('popstate',restoreRoute);
window.addEventListener('hashchange',restoreRoute);
show(window.DizzyRoutes.fromHash(window.location.hash),{historyMode:'replace'});
window.DizzyNavigation=Object.freeze({show,openSearch});


// A preview remains public on GitHub Pages. Cloud Run alone protects real sessions.
document.addEventListener('click', event => {
  const search = event.target.closest('[data-action="search"]');
  if(search){openSearch();return;}
  const target=event.target.closest('[data-go]');
  if(target && sections.some(([,key])=>key===target.dataset.go)) show(target.dataset.go);
});

const previewAccountView = accountView;
accountView = function(name) {
  if(verifiedStaff && name==='Profile'){
    title.textContent='My profile';
    subtitle.textContent='Verified AfrodizzyActs Workspace staff account';
    view.innerHTML='<section class="panel"><h2>Account details</h2><div class="field"><strong>Email</strong><span id="staff-email"></span></div><div class="field"><strong>Assigned role</strong><span id="staff-role"></span></div><p>Sign-in and multifactor security are managed by Google Workspace. Access permissions are enforced by DizzyOps on the server.</p></section>';
    document.getElementById('staff-email').textContent=verifiedStaff.email;
    document.getElementById('staff-role').textContent=verifiedStaff.role;
    return;
  }
  if(verifiedStaff && name==='Signout'){
    title.textContent='Sign out';
    subtitle.textContent='End your authenticated DizzyOps session';
    view.innerHTML='<section class="panel"><h2>Sign out of DizzyOps?</h2><p>This ends your portal session and requires you to authenticate again before accessing operational records.</p><button class="primary-action" id="server-signout" type="button">Sign out</button><p role="status" id="server-signout-status"></p></section>';
    document.getElementById('server-signout').addEventListener('click',async()=>{
      const control=document.getElementById('server-signout'),msg=document.getElementById('server-signout-status');
      control.disabled=true;
      msg.textContent='Signing out…';
      try{
        const c=await fetch('/auth/csrf',{cache:'no-store',credentials:'same-origin'});
        if(!c.ok) throw new Error('Unable to initialize sign-out');
        const {csrfToken}=await c.json();
        const out=await fetch('/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrfToken,'Content-Type':'application/json'},body:'{}'});
        if(!out.ok) throw new Error('Sign-out request failed');
        window.location.replace('/');
      }catch{
        msg.textContent='Unable to sign out. Try again or contact your administrator.';
        control.disabled=false;
      }
    });
    return;
  }
  if(verifiedStaff && name==='Login') {window.location.assign('/');return;}
  return previewAccountView(name);
};
if(window.DIZZYOPS_AUTH_CONFIG?.identityPlatform?.enabled === true) {
  fetch('/auth/me',{credentials:'same-origin',cache:'no-store'})
    .then(response=>{if(!response.ok)throw Error('Unauthorized');return response.json();})
    .then(identity=>{
      if(!identity?.email||!identity?.role)throw Error('Invalid identity');
      verifiedStaff={uid:identity.uid,email:identity.email,role:identity.role};
      shell.setIdentity(verifiedStaff);
      window.DizzyActivity?.setIdentity(verifiedStaff);
      fetch('/api/v1/capabilities',{credentials:'same-origin',cache:'no-store'})
        .then(r=>r.ok?r.json():null)
        .then(result=>{if(result?.version===1&&result.modules&&typeof result.modules==='object'){
          shell.setCapabilities(result.modules);
          show(window.DizzyRoutes.fromHash(window.location.hash),{historyMode:'none'});
        }}).catch(()=>{});
      document.querySelector('.account-menu .menu-note').textContent=verifiedStaff.email;
      document.querySelector('.account-trigger .avatar').textContent=verifiedStaff.email.slice(0,2).toUpperCase();
      show(window.DizzyRoutes.fromHash(window.location.hash),{historyMode:'none'});
    })
    .catch(()=>{window.location.replace('/');});
}
