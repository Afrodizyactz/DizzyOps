/**
 * Firestore-backed authenticated operational API for staff.
 * Records and audit events are written atomically; all access is role restricted.
 * Does not implement public guest access, Sage posting, payroll, or sample data.
 */
import {Router} from 'express';
import {capabilityMap,permissions,OPERATIONAL_MODULES} from './business-policy.js';
import {schemas,rejectPayload,searchLabel,parseListQuery} from './business-contract.js';

const SLUG_TO_NAME=Object.freeze(Object.fromEntries(OPERATIONAL_MODULES.map(n=>[schemas[n].slug,n])));
const asId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(id);
const now=()=>new Date().toISOString();
const tenant='afrodizzyacts';
function recordSet(db,name){
 return db.collection('organizations').doc(tenant).collection('modules').doc(schemas[name].slug).collection('records');
}
function auditSet(db,name){
 return db.collection('organizations').doc(tenant).collection('modules').doc(schemas[name].slug).collection('audit');
}
function visibleRecord(data){
 if(!data)return null;
 const {searchLabel:unused,createdBy:ignored,updatedBy:other,...publicFields}=data;
 return publicFields;
}
const replyError=(res,status,message)=>res.status(status).json({error:message});
function httpError(error){
 if(error?.httpStatus&&Number.isInteger(error.httpStatus))return error.httpStatus;
 if(error?.code===5||error?.code==='not-found')return 404;
 return 503;
}
function conflict(message){const err=new Error(message);err.httpStatus=409;return err}
export function createBusinessRouter({db,enabled,requireSameOrigin,requireCsrf}){
 const router=Router();
 router.use((req,res,next)=>{res.set('Cache-Control','no-store');next()});
 const available=Boolean(enabled&&db);
 router.get('/capabilities',(req,res)=>{
  res.json({version:1,modules:capabilityMap(req.identity.role,available)});
 });
 router.use('/modules',(req,res,next)=>{
  if(!available)return replyError(res,503,'Business database not activated');
  const name=SLUG_TO_NAME[req.path.split('/')[1]];
  if(!name)return replyError(res,404,'Unknown module');
  req.businessName=name;
  next();
 });
 function guard(action){
  return (req,res,next)=>{
   const name=req.businessName;
   if(!permissions(req.identity.role,name)[action])return replyError(res,403,'Module access denied');
   next();
  };
 }
 router.get('/modules/:slug',guard('read'),async(req,res)=>{
  const name=req.businessName,parsed=parseListQuery(name,req.query);
  if(parsed.error)return replyError(res,400,parsed.error);
  const {limit,q,status,sort,cursor}=parsed;
  const coll=recordSet(db,name);
  try{
   let query=coll;
   if(status)query=query.where('status','==',status);
   if(q){
    query=query.where('searchLabel','>=',q).where('searchLabel','<=',q+'\uf8ff')
      .orderBy('searchLabel','asc');
   }else if(sort==='searchLabel')query=query.orderBy('searchLabel','asc');
   else query=query.orderBy('createdAt','desc');
   if(cursor){
    const anchor=await coll.doc(cursor).get();
    if(!anchor.exists)return replyError(res,400,'Invalid or expired page cursor');
    query=query.startAfter(anchor);
   }
   const result=await query.limit(limit+1).get();
   const docs=result.docs;
   const page=docs.slice(0,limit);
   res.json({items:page.map(doc=>visibleRecord(doc.data())),
     nextCursor:docs.length>limit&&page.length?page[page.length-1].id:null});
  }catch(error){
   // Do not leak Firestore internals or row contents in a response.
   console.error('DizzyOps query failed',error?.code||'unknown');
   replyError(res,503,'Unable to read authorized records');
  }
 });
 router.get('/modules/:slug/:id',guard('read'),async(req,res)=>{
  if(!asId(req.params.id))return replyError(res,400,'Invalid record ID');
  try{
   const snap=await recordSet(db,req.businessName).doc(req.params.id).get();
   if(!snap.exists)return replyError(res,404,'Record not found');
   res.json(visibleRecord(snap.data()));
  }catch(error){console.error('Record lookup failed',error?.code||'unknown');replyError(res,503,'Unable to read record')}
 });
 router.post('/modules/:slug',requireSameOrigin,requireCsrf,guard('write'),async(req,res)=>{
  const name=req.businessName,{data,errors}=rejectPayload(req.body,name);
  if(errors.length)return replyError(res,422,errors.join('; '));
  try{
   const coll=recordSet(db,name),ref=coll.doc(),timestamp=now();
   const record={...data,id:ref.id,revision:1,createdAt:timestamp,updatedAt:timestamp,
     createdBy:req.identity.uid,updatedBy:req.identity.uid,searchLabel:searchLabel(name,data)};
   const audit=auditSet(db,name).doc();
   const batch=db.batch();
   batch.create(ref,record);
   batch.create(audit,{action:'create',recordId:ref.id,revision:1,when:timestamp,
     actorUid:req.identity.uid,actorRole:req.identity.role,fields:Object.keys(data)});
   await batch.commit();
   res.status(201).json(visibleRecord(record));
  }catch(error){
   console.error('Record create failed',error?.code||'unknown');
   replyError(res,503,'Could not save the record');
  }
 });
 router.put('/modules/:slug/:id',requireSameOrigin,requireCsrf,guard('write'),async(req,res)=>{
  if(!asId(req.params.id))return replyError(res,400,'Invalid record ID');
  const name=req.businessName,{data,errors,expectedRevision}=rejectPayload(req.body,name,{update:true});
  if(errors.length)return replyError(res,422,errors.join('; '));
  const ref=recordSet(db,name).doc(req.params.id),audit=auditSet(db,name).doc();
  try{
   const updated=await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists){const error=new Error('Record not found');error.httpStatus=404;throw error}
    const before=snap.data();
    if(before.revision!==expectedRevision)throw conflict('Record was modified by another staff member');
    const next={...data,id:before.id,revision:before.revision+1,
     createdAt:before.createdAt,createdBy:before.createdBy,updatedAt:now(),
     updatedBy:req.identity.uid,searchLabel:searchLabel(name,data)};
    tx.set(ref,next);
    tx.create(audit,{action:'update',recordId:ref.id,revision:next.revision,when:next.updatedAt,
      actorUid:req.identity.uid,actorRole:req.identity.role,fields:Object.keys(data)});
    return next;
   });
   res.json(visibleRecord(updated));
  }catch(error){
   if(error.httpStatus)return replyError(res,httpError(error),error.message);
   console.error('Record update failed',error?.code||'unknown');
   replyError(res,503,'Could not update the record');
  }
 });
 // No hard delete: immutable audit, retention approval and data-subject handling still pending.
 router.delete('/modules/:slug/:id',requireSameOrigin,requireCsrf,(req,res)=>
  replyError(res,405,'Deletion is disabled until an approved retention policy exists'));
 return router;
}
