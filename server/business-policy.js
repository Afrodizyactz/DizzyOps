/**
 * Server-authoritative permissions for the AfrodizzyActs single-organization staff tenant.
 * Every request is authenticated by the Cloud Run session middleware first.
 * No guest or agent access to these internal record APIs until scoped grants are built.
 */
export const OPERATIONAL_MODULES=Object.freeze([
 'Bookings','Jobs','Performers','Clients','Partners','Inventory','Assets','Fabrication','Documents','FollowUp'
]);
const all=OPERATIONAL_MODULES;
const operations=all.filter(name=>name!=='Documents');
const grants=Object.freeze({
 administrator:{read:all,write:all},
 management:{read:all,write:all},
 operations:{read:operations,write:operations},
 finance:{read:['Bookings','Jobs','Clients'],write:[]},
 agent:{read:[],write:[]}
});
export function permissions(role,name){
 const rights=grants[role]||{read:[],write:[]};
 return Object.freeze({read:rights.read.includes(name),write:rights.write.includes(name),delete:false});
}
export function capabilityMap(role,enabled){
 if(!enabled)return {};
 return Object.fromEntries(OPERATIONAL_MODULES.map(name=>[name,permissions(role,name)]));
}
export function requirePermission(role,name,action){
 return action==='write'?permissions(role,name).write:permissions(role,name).read;
}
