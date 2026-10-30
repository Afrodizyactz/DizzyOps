import test from 'node:test';
import assert from 'node:assert/strict';
import {
 TASK_STATUSES,TASK_PRIORITIES,TASK_MODULES,taskId,taskCapabilities,
 parseTaskCreate,checkTaskCreation,parseTaskQuery,parseTaskStatus,
 canReadTask,canUpdateStatus
} from '../activity-contract.js';

const identity=(email,role)=>({email,role,uid:'staff-uid'});
const allowlist=Object.freeze({
 'operations@example.invalid':'operations',
 'manager@example.invalid':'management',
 'finance@example.invalid':'finance',
 'agent@example.invalid':'agent'
});
const valid={
 title:'Event preparation', description:'Confirm briefing details',
 dueDate:'2026-11-30', priority:'normal',assigneeEmail:'operations@example.invalid',
 relatedModule:'Jobs',relatedId:'Record_001'
};
test('no task access without explicit activation or a staff role',()=>{
 assert.deepEqual(taskCapabilities('agent',true),{read:false,create:false,team:false,changeStatus:false});
 assert.deepEqual(taskCapabilities('operations',false),{read:false,create:false,team:false,changeStatus:false});
 assert.equal(taskCapabilities('finance',true).read,true);
 assert.equal(taskCapabilities('finance',true).create,false);
 assert.equal(taskCapabilities('management',true).team,true);
 assert.equal(taskCapabilities('operations',true).team,false);
});
test('task payload accepts only approved, linked module references',()=>{
 assert.equal(parseTaskCreate(valid).errors.length,0);
 assert.ok(TASK_MODULES.includes('FollowUp'));
 assert.deepEqual(TASK_PRIORITIES,['normal','high','urgent']);
 assert.deepEqual(TASK_STATUSES,['open','in_progress','blocked','done']);
 assert.ok(parseTaskCreate({}).errors.length>0);
 assert.ok(parseTaskCreate({...valid,relatedModule:'Quotes'}).errors.length>0);
 assert.ok(parseTaskCreate({...valid,relatedId:'bad'}).errors.length>0);
 assert.ok(parseTaskCreate({...valid,priority:'superuser'}).errors.length>0);
 assert.ok(parseTaskCreate({...valid,dueDate:'2026-02-30'}).errors.length>0);
 assert.ok(parseTaskCreate({...valid,admin:true}).errors.some(x=>x.includes('Unexpected field')));
 assert.ok(parseTaskCreate({...valid,title:'X'.repeat(161)}).errors.length>0);
 assert.equal(taskId('Record_001'),true);
 assert.equal(taskId('../tamper'),false);
});
test('task assignments require staff allowlist and role-compatible record permissions',()=>{
 assert.equal(checkTaskCreation(identity('manager@example.invalid','management'),valid,allowlist),null);
 assert.equal(checkTaskCreation(identity('operations@example.invalid','operations'),valid,allowlist),null);
 assert.ok(checkTaskCreation(identity('operations@example.invalid','operations'),
   {...valid,assigneeEmail:'manager@example.invalid'},allowlist).includes('only to themselves'));
 assert.ok(checkTaskCreation(identity('manager@example.invalid','management'),
   {...valid,assigneeEmail:'external@example.invalid'},allowlist).includes('approved'));
 assert.ok(checkTaskCreation(identity('manager@example.invalid','management'),
   {...valid,assigneeEmail:'agent@example.invalid'},allowlist).includes('approved'));
 assert.ok(checkTaskCreation(identity('manager@example.invalid','management'),
   {...valid,assigneeEmail:'finance@example.invalid',relatedModule:'Documents'},allowlist).includes('not available'));
 assert.ok(checkTaskCreation(identity('finance@example.invalid','finance'),valid,allowlist).includes('not permitted'));
});
test('staff tasks cannot be listed or changed across assignees without management role',()=>{
 const task={assigneeEmail:'operations@example.invalid',status:'open'};
 assert.equal(canReadTask(identity('operations@example.invalid','operations'),task),true);
 assert.equal(canReadTask(identity('finance@example.invalid','finance'),task),false);
 assert.equal(canReadTask(identity('manager@example.invalid','management'),task),true);
 assert.equal(canReadTask(identity('agent@example.invalid','agent'),task),false);
 assert.equal(canUpdateStatus(identity('finance@example.invalid','finance'),task),false);
});
test('task filters, paging and status changes are bounded and revision checked',()=>{
 assert.deepEqual(parseTaskQuery({view:'mine',limit:'20'}),{view:'mine',status:'',limit:20,cursor:''});
 assert.ok(parseTaskQuery({limit:'200'}).error);
 assert.ok(parseTaskQuery({view:'admin'}).error);
 assert.ok(parseTaskQuery({cursor:'../../other'}).error);
 assert.ok(parseTaskQuery({status:'deleted'}).error);
 assert.ok(parseTaskQuery({view:'team',admin:true}).error);
 assert.deepEqual(parseTaskStatus({status:'done',expectedRevision:2}),{status:'done',expectedRevision:2});
 assert.ok(parseTaskStatus({status:'done',expectedRevision:0}).error);
 assert.ok(parseTaskStatus({status:'not_really',expectedRevision:2}).error);
 assert.ok(parseTaskStatus({status:'open',expectedRevision:1,assigneeEmail:'other'}).error);
});
