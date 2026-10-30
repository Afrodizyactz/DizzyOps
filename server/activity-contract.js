/** Staff-task authorization and strict input contracts. Server authoritative. */
import {permissions,OPERATIONAL_MODULES} from './business-policy.js';
export const TASK_STATUSES=Object.freeze(['open','in_progress','blocked','done']);
export const TASK_PRIORITIES=Object.freeze(['normal','high','urgent']);
export const TASK_MODULES=Object.freeze([...OPERATIONAL_MODULES]);
const staffRoles=new Set(['administrator','management','operations','finance']);
const managerRoles=new Set(['administrator','management']);
export const taskId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{8,128}$/.test(id);
const validDate=value=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const day=new Date(value+'T00:00:00Z');
 return Number.isFinite(day.getTime())&&day.toISOString().slice(0,10)===value;
};
export function taskCapabilities(role,enabled){
 const canRead=enabled&&staffRoles.has(role);
 return {read:Boolean(canRead),create:Boolean(canRead&&(managerRoles.has(role)||role==='operations')),
   team: Boolean(canRead&&managerRoles.has(role)),changeStatus:Boolean(canRead)};
}
export function parseTaskCreate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return {errors:['Invalid request body']};
 const permittedKeys=new Set(['title','description','priority','dueDate','assigneeEmail','relatedModule','relatedId']);
 const errors=[];
 for(const key of Object.keys(input))if(!permittedKeys.has(key))errors.push('Unexpected field '+key);
 const get=(key,max)=>{
  const raw=input[key]??'';
  if(typeof raw!=='string')errors.push(key+' must be a string');
  const value=typeof raw==='string'?raw.trim():'';
  if(value.length>max||/[\u0000-\u001f]/.test(value))errors.push('Invalid '+key);
  return value;
 };
 const title=get('title',160),description=get('description',1800);
 const dueDate=get('dueDate',10),assigneeEmail=get('assigneeEmail',254).toLowerCase();
 const relatedModule=get('relatedModule',50),relatedId=get('relatedId',128);
 const priority=get('priority',16)||'normal';
 if(!title)errors.push('Title is required');
 if(!TASK_PRIORITIES.includes(priority))errors.push('Invalid priority');
 if(dueDate&&!validDate(dueDate))errors.push('Invalid due date');
 if(assigneeEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(assigneeEmail))errors.push('Invalid assignee');
 if(!TASK_MODULES.includes(relatedModule))errors.push('A linked operational module is required');
 if(!taskId(relatedId))errors.push('A valid linked record ID is required');
 return {errors,data:errors.length?null:{title,description,priority,dueDate,assigneeEmail,relatedModule,relatedId}};
}
export function checkTaskCreation(actor,data,staffAllowlist){
 const role=actor?.role;
 if(!taskCapabilities(role,true).create)return 'Task creation is not permitted';
 const email=(data.assigneeEmail||actor.email||'').toLowerCase();
 const targetRole=staffAllowlist[email];
 if(!targetRole||!staffRoles.has(targetRole))return 'Assignee must be an approved internal staff member';
 if(role==='operations'&&email!==actor.email.toLowerCase())return 'Operations staff may assign tasks only to themselves';
 if(!permissions(role,data.relatedModule).read||!permissions(targetRole,data.relatedModule).read)
  return 'The linked module is not available to the creator and assignee';
 return null;
}
export function canReadTask(actor,record){
 return taskCapabilities(actor?.role,true).read&&
 (managerRoles.has(actor.role)||record?.assigneeEmail===actor.email?.toLowerCase());
}
export function canUpdateStatus(actor,record){
 return canReadTask(actor,record);
}
export function parseTaskStatus(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return {error:'Invalid request body'};
 if(Object.keys(input).some(key=>!['status','expectedRevision'].includes(key)))
  return {error:'Only status and expectedRevision can be updated'};
 if(!TASK_STATUSES.includes(input.status))return {error:'Unsupported status'};
 if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)return {error:'Invalid expected revision'};
 return {status:input.status,expectedRevision:input.expectedRevision};
}
export function parseTaskQuery(input){
 const allowed=new Set(['view','status','limit','cursor']);
 for(const key of Object.keys(input))if(!allowed.has(key))return {error:'Unsupported query parameter'};
 const view=String(input.view??'mine'),status=String(input.status??''),
  rawLimit=String(input.limit??'20'),cursor=String(input.cursor??'');
 if(!['mine','team'].includes(view))return {error:'Invalid view'};
 if(status&&!TASK_STATUSES.includes(status))return {error:'Invalid status filter'};
 if(!/^\d{1,2}$/.test(rawLimit)||Number(rawLimit)<1||Number(rawLimit)>25)return {error:'Invalid page size'};
 if(cursor&&!taskId(cursor))return {error:'Invalid page cursor'};
 return {view,status,limit:Number(rawLimit),cursor};
}
