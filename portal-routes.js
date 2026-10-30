/* Shared navigation registry; UI mapping is not an authorization boundary. */
(function(root){'use strict';
const sections=Object.freeze([
['Overview','Dashboard'],['All applications','Workspaces'],['My workspace','MyWork'],['My Tasks & Activity','Tasks'],['Bookings','Bookings'],['Jobs & Assignments','Jobs'],
['Performers','Performers'],['Clients & CRM','Clients'],['Agents & Suppliers','Partners'],
['Quotes','Quotes'],['Invoices & Receipts','Invoices'],['Expenses & Commissions','Expenses'],
['Payslips & Statements','Payroll'],['Costumes & Inventory','Inventory'],
['Assets & Couriers','Assets'],['Fabrication','Fabrication'],['Documents','Documents'],
['Post-job follow-up','FollowUp'],['Reports & Analytics','Reports'],
['Integrations','Integrations'],['Settings','Settings'],['My profile','Profile'],
['Account settings','AccountSettings'],['Log in','Login'],['Help & support','Support'],['Sign out','Signout']
]);
const groups=Object.freeze([
['WORKSPACE',['Dashboard','Tasks','Bookings','Jobs','FollowUp']],
['PEOPLE',['Performers','Clients','Partners']],
['FINANCE',['Quotes','Invoices','Expenses','Payroll']],
['RESOURCES',['Inventory','Assets','Fabrication','Documents']],
['INSIGHTS',['Reports']],['ADMIN',['Integrations','Settings']]
]);
const compact=x=>String(x||'').trim().replace(/^#/,'').replace(/[\s_-]/g,'').toLowerCase();
function normalize(input){const key=compact(input);if(key==='overview')return 'Dashboard';
const match=sections.find(([label,id])=>compact(id)===key||compact(label)===key);
return match?match[1]:'Dashboard'}
function fromHash(hash){try{return normalize(decodeURIComponent(String(hash||'').replace(/^#/,'')))}catch{return 'Dashboard'}}
function hashFor(name){return '#'+normalize(name).toLowerCase()}
function isFinance(name){return ['Quotes','Invoices','Expenses','Payroll'].includes(name)}
function canRenderFinance(staff,providerEnabled){return providerEnabled===true&&!!staff&&
typeof staff.email==='string'&&!!staff.email.trim()&&typeof staff.role==='string'&&!!staff.role.trim()}
const routes=Object.freeze({sections,groups,normalize,fromHash,hashFor,isFinance,canRenderFinance});
root.DizzyRoutes=routes;if(typeof module!=='undefined'&&module.exports)module.exports=routes;
})(typeof globalThis!=='undefined'?globalThis:this);
