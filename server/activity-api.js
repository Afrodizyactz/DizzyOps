/** Authenticated Firestore task inbox. No polling, generated tasks or sample data. */
import {Router} from 'express';
import {schemas} from './business-contract.js';
import {
 taskCapabilities,parseTaskCreate,checkTaskCreation,canReadTask,canUpdateStatus,
 parseTaskStatus,parseTaskQuery,taskId
} from './activity-contract.js';

const tenant='afrodizzyacts';
const org=db=>db.collection('organizations').doc(tenant);
const tasks=db=>org(db).collection('tasks');
const audit=db=>org(db).collection('taskAudit');
const linkedRecord=(db,name,id)=>org(db).collection('modules').doc(schemas[name].slug).collection('records').doc(id);
const error=(res,status,message)=>res.status(status).json({error:message});
const iso=()=>new Date().toISOString();
const safeTask=data=>{
 if(!data)return null;
 const {createdByUid,updatedByUid,...rest}=data;
 return rest;
};
function requiredRole(req,res,next){
 if(!taskCapabilities(req.identity.role,true).read)return error(res,403,'Task access denied');
 next();
}
export function createActivityRouter({db,enabled,requireSameOrigin,requireCsrf,staffAllowlist}){
 const router=Router();
 const active=Boolean(enabled&&db);
 router.use((req,res,next)=>{res.set('Cache-Control','no-store');next()});
 router.get('/capabilities',(req,res)=>res.json(taskCapabilities(req.identity.role,active)));
 router.use((req,res,next)=>{
  if(!active)return error(res,503,'Activity service is not activated');
  requiredRole(req,res,next);
 });
 router.get('/assignees',(req,res)=>{
  if(!taskCapabilities(req.identity.role,true).team)return error(res,403,'Staff directory access denied');
  // Never include contact numbers or identities outside the explicitly approved allowlist.
  const roles=new Set(['administrator','management','operations','finance']);
  const staff=Object.entries(staffAllowlist).filter(([,role])=>roles.has(role))
   .map(([email,role])=>({email,role})).sort((a,b)=>a.email.localeCompare(b.email));
  res.json({staff});
 });
 router.get('/tasks',async(req,res)=>{
  const parsed=parseTaskQuery(req.query);
  if(parsed.error)return error(res,400,parsed.error);
  if(parsed.view==='team'&&!taskCapabilities(req.identity.role,true).team)
   return error(res,403,'Team task access denied');
  const collection=tasks(db);
  try{
   let query=parsed.view==='mine'?collection.where('assigneeEmail','==',req.identity.email.toLowerCase()):collection;
   if(parsed.status)query=query.where('status','==',parsed.status);
   query=query.orderBy('updatedAt','desc');
   if(parsed.cursor){
    const anchor=await collection.doc(parsed.cursor).get();
    if(!anchor.exists)return error(res,400,'Invalid or expired cursor');
    const value=anchor.data();
    if((parsed.view==='mine'&&value.assigneeEmail!==req.identity.email.toLowerCase())||
        (parsed.status&&value.status!==parsed.status))return error(res,400,'Cursor does not match this view');
    query=query.startAfter(anchor);
   }
   const snapshot=await query.limit(parsed.limit+1).get();
   const page=snapshot.docs.slice(0,parsed.limit);
   res.json({items:page.map(doc=>safeTask(doc.data())),
     nextCursor:snapshot.docs.length>parsed.limit&&page.length?page[page.length-1].id:null});
  }catch(e){
   console.error('Task list failed',e?.code||'unknown');
   error(res,503,'Task records could not be retrieved');
  }
 });
 router.post('/tasks',requireSameOrigin,requireCsrf,async(req,res)=>{
  if(!taskCapabilities(req.identity.role,true).create)return error(res,403,'Task creation denied');
  const {errors,data}=parseTaskCreate(req.body);
  if(errors.length)return error(res,422,errors.join('; '));
  const creator={...req.identity,email:req.identity.email.toLowerCase()};
  const reason=checkTaskCreation(creator,data,staffAllowlist);
  if(reason)return error(res,403,reason);
  const assigneeEmail=data.assigneeEmail||creator.email;
  try{
   const record=await linkedRecord(db,data.relatedModule,data.relatedId).get();
   if(!record.exists)return error(res,404,'Linked operational record not found');
   const ref=tasks(db).doc(),stamp=iso();
   const task={id:ref.id,title:data.title,description:data.description,priority:data.priority,
    dueDate:data.dueDate,relatedModule:data.relatedModule,relatedId:data.relatedId,
    assigneeEmail,status:'open',revision:1,createdAt:stamp,updatedAt:stamp,
    createdByUid:creator.uid,updatedByUid:creator.uid};
   const event=audit(db).doc();
   const batch=db.batch();
   batch.create(ref,task);
   batch.create(event,{taskId:ref.id,action:'create',fromStatus:null,toStatus:'open',
    revision:1,actorUid:creator.uid,at:stamp,relatedModule:task.relatedModule,relatedId:task.relatedId});
   await batch.commit();
   res.status(201).json(safeTask(task));
  }catch(e){
   console.error('Task creation failed',e?.code||'unknown');
   error(res,503,'Task could not be created');
  }
 });
 router.patch('/tasks/:id/status',requireSameOrigin,requireCsrf,async(req,res)=>{
  if(!taskId(req.params.id))return error(res,400,'Invalid task ID');
  const update=parseTaskStatus(req.body);
  if(update.error)return error(res,422,update.error);
  const ref=tasks(db).doc(req.params.id),event=audit(db).doc();
  try{
   const result=await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)throw Object.assign(new Error('Task not found'),{httpStatus:404});
    const previous=snap.data();
    if(!canUpdateStatus(req.identity,previous))throw Object.assign(new Error('Task access denied'),{httpStatus:403});
    if(previous.revision!==update.expectedRevision)
     throw Object.assign(new Error('Task was changed by another staff member'),{httpStatus:409});
    if(previous.status===update.status)return previous;
    const revised={...previous,status:update.status,updatedAt:iso(),revision:previous.revision+1,
      updatedByUid:req.identity.uid};
    tx.set(ref,revised);
    tx.create(event,{taskId:ref.id,action:'status',fromStatus:previous.status,toStatus:update.status,
      revision:revised.revision,actorUid:req.identity.uid,at:revised.updatedAt,
      relatedModule:previous.relatedModule,relatedId:previous.relatedId});
    return revised;
   });
   res.json(safeTask(result));
  }catch(e){
   if(e.httpStatus)return error(res,e.httpStatus,e.message);
   console.error('Task status update failed',e?.code||'unknown');
   error(res,503,'Task status could not be updated');
  }
 });
 // Deliberately no delete or reassignment endpoints without approved retention/assignment controls.
 return router;
}
