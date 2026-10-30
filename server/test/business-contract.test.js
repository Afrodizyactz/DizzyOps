import test from 'node:test';
import assert from 'node:assert/strict';
import {OPERATIONAL_MODULES,capabilityMap,permissions} from '../business-policy.js';
import {schemas,rejectPayload,searchLabel,parseListQuery} from '../business-contract.js';

test('ten modules use explicit role controls and no anonymous access',()=>{
 assert.equal(OPERATIONAL_MODULES.length,10);
 assert.equal(Object.keys(capabilityMap('administrator',false)).length,0);
 assert.equal(Object.keys(capabilityMap('agent',true)).length,10);
 assert.deepEqual(permissions('agent','Bookings'),{read:false,write:false,delete:false});
 assert.deepEqual(permissions('anonymous','Bookings'),{read:false,write:false,delete:false});
 assert.equal(permissions('finance','Clients').read,true);
 assert.equal(permissions('finance','Clients').write,false);
 assert.equal(permissions('operations','Documents').read,false);
 assert.equal(permissions('management','Documents').write,true);
 for(const name of OPERATIONAL_MODULES)assert.equal(permissions('administrator',name).delete,false);
});
test('all records reject payload injection, unexpected fields and missing required values',()=>{
 for(const name of OPERATIONAL_MODULES){
  assert.ok(rejectPayload({},name).errors.length>0,name);
  assert.ok(rejectPayload({id:'forged-id'},name).errors.some(x=>x.includes('Unexpected field')),name);
  assert.ok(rejectPayload({revision:99,createdBy:'forged'},name).errors.some(x=>x.includes('Unexpected field')),name);
 }
 assert.ok(rejectPayload(null,'Bookings').errors.length>0);
 assert.ok(rejectPayload({},'Missing').errors.length>0);
});
test('server validation requires sane finance amounts, dates, workflow state and revision',()=>{
 assert.ok(rejectPayload({budget:'-20'},'Bookings').errors.some(x=>x.includes('non-negative')));
 assert.ok(rejectPayload({status:'Definitely authorized'},'Bookings').errors.some(x=>x.includes('Invalid record status')));
 assert.ok(rejectPayload({eventDate:'2026-02-30'},'Bookings').errors.some(x=>x.includes('real calendar date')));
 assert.ok(rejectPayload({estimatedGuests:'not-a-number'},'Bookings').errors.some(x=>x.includes('non-negative')));
 assert.ok(rejectPayload({eventDate:'2026-12-05',startTime:'99:00'},'Bookings').errors.some(x=>x.includes('HH:MM')));
 assert.ok(rejectPayload({quantity:'7',availableQuantity:'9'},'Inventory').errors.some(x=>x.includes('Available quantity')));
 assert.ok(rejectPayload({},'Bookings',{update:true}).errors.some(x=>x.includes('expectedRevision')));
});
test('parse list query is bounded and sort and filter keys must be supported',()=>{
 assert.equal(parseListQuery('Bookings',{limit:'25'}).limit,25);
 assert.equal(parseListQuery('Bookings',{sort:'eventDate'}).error,'Sort field is not supported');
 assert.ok(parseListQuery('Bookings',{limit:'26'}).error);
 assert.ok(parseListQuery('Bookings',{limit:'0'}).error);
 assert.ok(parseListQuery('Bookings',{status:'Admin Approved'}).error);
 assert.ok(parseListQuery('Bookings',{cursor:'not a cursor'}).error);
 assert.equal(parseListQuery('Bookings',{q:'  Show  '}).q,'show');
 assert.equal(parseListQuery('Missing',{}).error,'Unknown module');
});
test('search labels derive from legitimate schema fields only',()=>{
 assert.equal(searchLabel('Clients',{name:'  ACME  '}),'acme');
 assert.equal(searchLabel('Bookings',{}),'');
 assert.equal(schemas.Clients.slug,'clients');
});
