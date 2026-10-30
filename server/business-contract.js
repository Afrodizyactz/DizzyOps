/**
 * Server side business contract. Reuses the field definitions but validates independently
 * of HTML required attributes. This module is only ever imported by authenticated server code.
 */
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {schemas,validate}=require('../operations-schema.js');
export {schemas};
const MAX_FIELDS=40;
const own=(obj,key)=>Object.hasOwn(obj,key);
export function rejectPayload(input,moduleName,{update=false}={}){
 const definition=schemas[moduleName];
 if(!definition)return {errors:['Unknown module'],data:null};
 if(!input||typeof input!=='object'||Array.isArray(input))return {errors:['Invalid request body'],data:null};
 const allowed=new Set([...definition.fields.map(f=>f.key),'status',...(update?['expectedRevision']:[])]);
 const keys=Object.keys(input);
 if(keys.length>MAX_FIELDS)return {errors:['Too many input fields'],data:null};
 const errors=[];
 for(const key of keys)if(!allowed.has(key))errors.push('Unexpected field: '+key);
 const data={};
 for(const field of definition.fields){
  const raw=own(input,field.key)?input[field.key]:'';
  if(typeof raw!=='string'&&typeof raw!=='number')errors.push(field.label+' must be text or number');
  const v=(typeof raw==='number'||typeof raw==='string'?String(raw):'').trim();
  const limit=field.type==='textarea'?4000:field.type==='email'?254:field.type==='text'?240:120;
  if(v.length>limit)errors.push(field.label+' exceeds '+limit+' characters');
  if(v.includes('\u0000'))errors.push(field.label+' contains invalid characters');
  data[field.key]=v;
 }
 data.status=own(input,'status')?input.status:definition.statuses[0];
 if(typeof data.status!=='string')errors.push('Invalid record status');
 if(typeof data.status==='string'&&data.status.length>50)errors.push('Invalid record status');
 errors.push(...validate(moduleName,data));
 for(const field of definition.fields){
  const v=data[field.key];
  if(v&&field.type==='date'){
   const d=new Date(v+'T00:00:00Z');
   if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)errors.push(field.label+' requires a real calendar date');
  }
  if(v&&field.type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))errors.push(field.label+' requires HH:MM time');
 }
 if(update&&(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1))errors.push('expectedRevision must be a positive integer');
 // Prevent inadvertent arbitrary Firestore metadata writes. Empty optional fields are allowed.
 return {errors:[...new Set(errors)],data:errors.length?null:data,expectedRevision:input.expectedRevision};
}
export function searchLabel(name,record){
 const first=schemas[name].columns.find(key=>key!=='status')||schemas[name].fields[0].key;
 return String(record[first]||'').trim().toLowerCase().normalize('NFKC').slice(0,240);
}
export function parseListQuery(name,input){
 if(!schemas[name])return {error:'Unknown module'};
 const limitStr=String(input.limit??'25');
 if(!/^\d{1,2}$/.test(limitStr))return {error:'Invalid page limit'};
 const limit=Number(limitStr);
 if(limit<1||limit>25)return {error:'Page limit must be between 1 and 25'};
 const q=String(input.q??'').trim().toLowerCase().normalize('NFKC');
 const status=String(input.status??'');
 const sort=String(input.sort??'createdAt');
 const cursor=String(input.cursor??'');
 if(q.length>80||(/[\u0000-\u001f]/.test(q)))return {error:'Search query is invalid'};
 if(status&&!schemas[name].statuses.includes(status))return {error:'Status is not supported'};
 if(!['createdAt','searchLabel',''].includes(sort))return {error:'Sort field is not supported'};
 if(cursor&&!/^[A-Za-z0-9_-]{8,128}$/.test(cursor))return {error:'Invalid page cursor'};
 return {limit,q,status,sort:sort||'createdAt',cursor};
}
