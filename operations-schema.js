/* Phase 02 operational contracts. Definitions, not records. No seeded business data.
 * The browser's module schema is presentation metadata; the future server must repeat every validation.
 */
(function(root){
'use strict';
const field=(key,label,type='text',required=false,options=[],help='')=>Object.freeze({key,label,type,required,options,help});
const module=(slug,label,description,fields,statuses,steps,columns)=>Object.freeze({
  slug,label,description,fields,statuses,steps,columns,
  apiPath:'/api/v1/modules/'+slug
});
const schemas={
Bookings:module('bookings','Bookings','Track enquiries, client event requirements, calendar reservations and approval status.',[
field('clientId','Client reference','text',true),field('eventName','Event / production name','text',true),
field('eventDate','Event date','date',true),field('startTime','Start time','time',true),
field('endTime','End time','time'),field('venue','Venue / location','text',true),
field('eventType','Event type','select',true,['Corporate','Private','Festival','Brand activation','Wedding','Other']),
field('contactName','Event contact'),field('contactEmail','Contact email','email'),
field('estimatedGuests','Expected guests','number'),field('budget','Budget (ZAR)','money'),
field('requestedActs','Requested performers / services','textarea'),field('specialRequirements','Technical or access requirements','textarea'),
field('coordinatorId','Assigned coordinator'),field('notes','Internal booking notes','textarea')
],['Enquiry','Review','Quoted','Pending confirmation','Confirmed','Cancelled','Completed'],
['Capture the enquiry and verify customer contact','Check performers, venue, assets and date conflicts','Prepare and approve a Sage quotation','Confirm the booking and create a job record'],
['eventName','clientId','eventDate','venue','status']),
Jobs:module('jobs','Jobs & Assignments','Coordinate confirmed bookings, performers, production crew, transport and completion evidence.',[
field('bookingId','Confirmed booking reference','text',true),field('jobTitle','Job title','text',true),
field('eventDate','Event date','date',true),field('callTime','Call time','time'),
field('startTime','Event start','time'),field('endTime','Event end','time'),
field('venue','Venue','text',true),field('jobManager','Job manager / coordinator','text',true),
field('performerRefs','Assigned performer references','textarea'),
field('crewInstructions','Briefing / stage requirements','textarea'),
field('logistics','Transport and courier instructions','textarea'),
field('clientSignoff','Client completion sign-off reference'),
field('completionNotes','Completion notes','textarea')
],['Scheduled','Briefing','Confirmed','In progress','Completed','Signed off','Cancelled'],
['Validate booking and confirm event schedule','Offer assignments using scoped guest links','Approve production requirements and logistics','Record completion and obtain client sign-off','Trigger post-job follow-ups and finance review'],
['jobTitle','bookingId','eventDate','jobManager','status']),
Performers:module('performers','Performers','Maintain approved performer profiles, contact preferences, specialties and compliance readiness.',[
field('displayName','Performer / stage name','text',true),
field('legalName','Legal / contracting name','text'),
field('email','Contact email','email',true),field('phone','Phone','tel'),
field('category','Performance category','select',true,['Dance','Music','Circus','Aerial','Fire','Theatre','Character','Other']),
field('skills','Specialties and skills','textarea'),field('baseRate','Base rate (ZAR)','money'),
field('homeCity','Home location'),field('availabilityNotes','Availability constraints','textarea'),
field('contractStatus','Contract review','select',false,['Pending','Current','Expired','Not required']),
field('documentReferences','Approved document references','textarea'),
field('consentStatus','Contact / data consent','select',true,['Pending','Recorded','Withdrawn']),
field('notes','Internal notes','textarea')
],['Pending review','Active','Unavailable','Inactive'],
['Collect minimal personal details with appropriate consent','Check performer category and documentation','Approve approved engagement rates and contract','Request availability via time-limited action link'],
['displayName','category','homeCity','contractStatus','status']),
Clients:module('clients','Clients & CRM','Manage customer relationships, decision-makers, requests and communications.',[
field('name','Customer / company','text',true),field('contactName','Primary contact','text',true),
field('email','Email','email',true),field('phone','Phone','tel'),
field('clientType','Customer type','select',true,['Company','Individual','Agency','Venue','Other']),
field('billingAddress','Billing address','textarea'),field('sageCustomerId','Sage customer reference'),
field('industry','Industry / sector'),field('marketingConsent','Marketing consent','select',false,['Not requested','Granted','Declined','Withdrawn']),
field('accountOwner','Account owner'),field('requirements','Engagement requirements','textarea'),
field('notes','Relationship notes','textarea')
],['Prospect','Active','Dormant','Archived'],
['Capture legitimate enquiry and authorized contact','Check duplicates and contact permissions','Link confirmed bookings and Sage records','Track outreach and follow-up'],
['name','contactName','email','accountOwner','status']),
Partners:module('partners','Agents & Suppliers','Coordinate partner companies, couriers, freelance agents and specialist suppliers.',[
field('name','Supplier / agent name','text',true),field('type','Partner type','select',true,['Agent','Supplier','Courier','Production crew','Fabricator','Venue','Other']),
field('contactName','Contact person'),field('email','Email','email',true),field('phone','Phone','tel'),
field('serviceArea','Service area / region'),field('services','Services supplied','textarea'),
field('paymentTerms','Payment terms','textarea'),field('agreementRef','Agreement reference'),
field('taxRef','Tax / supplier reference'),field('notes','Supplier notes','textarea')
],['Prospective','Approved','On hold','Inactive'],
['Verify legal supplier identity and contact','Approve service categories, terms and agreement','Link supplier to jobs or purchase requests','Review performance and payment status'],
['name','type','serviceArea','agreementRef','status']),
Inventory:module('inventory','Costumes & Inventory','Track costume pieces, consumables, checkout, stock counts and return condition.',[
field('itemName','Item / costume name','text',true),field('sku','Stock / costume reference','text',true),
field('category','Category','select',true,['Costume','Prop','Accessory','Consumable','Equipment','Other']),
field('quantity','Total quantity','integer',true),field('availableQuantity','Available quantity','integer'),
field('storageLocation','Storage location','text',true),field('replacementCost','Replacement value (ZAR)','money'),
field('condition','Condition','select',true,['New','Good','Needs repair','Damaged','Retired']),
field('assignedJob','Reserved / allocated job reference'),
field('size','Size / specification'),field('notes','Handling and return notes','textarea')
],['Available','Reserved','Checked out','Maintenance','Retired'],
['Register inventory with verified count and location','Reserve by job and confirm availability','Issue through authorised checkout','Inspect returned items and update condition'],
['itemName','sku','quantity','storageLocation','status']),
Assets:module('assets','Assets & Couriers','Track equipment, transport movements, dispatch and proof-of-delivery.',[
field('assetName','Asset / delivery name','text',true),field('assetTag','Asset reference','text',true),
field('relatedJob','Job reference'),field('courier','Assigned courier / supplier'),
field('pickupDate','Pickup date','date'),field('deliveryDate','Due delivery date','date'),
field('origin','Pickup location','text',true),field('destination','Delivery location','text',true),
field('contact','Receiving contact'),field('trackingRef','Tracking / dispatch reference'),
field('handoverRef','Proof-of-delivery document reference'),
field('notes','Packaging / handling notes','textarea')
],['Available','Reserved','In transit','Delivered','Return pending','Returned','Issue'],
['Reserve asset for confirmed job','Confirm dispatch instructions and courier','Record delivery handover and evidence','Schedule and verify return'],
['assetName','assetTag','deliveryDate','destination','status']),
Fabrication:module('fabrication','Fabrication','Manage bespoke props, build briefs, supplier estimates, milestones and delivery.',[
field('projectName','Fabrication project','text',true),field('jobReference','Related job reference'),
field('supplierId','Fabricator / supplier reference','text',true),
field('requiredBy','Required delivery date','date',true),field('description','Specification / fabrication brief','textarea',true),
field('materials','Materials / finish','textarea'),field('estimatedCost','Approved budget (ZAR)','money'),
field('estimateRef','Supplier quote reference'),field('milestone','Current milestone'),
field('deliveryLocation','Delivery location'),field('qualityNotes','Quality / safety checks','textarea')
],['Brief','Quoted','Awaiting approval','In production','Quality review','Delivered','Cancelled'],
['Write and approve specification','Collect vendor quote and budget approval','Track milestones and revision requests','Verify final quality and delivery'],
['projectName','supplierId','requiredBy','milestone','status']),
Documents:module('documents','Documents','Manage metadata and permissions for documents and media stored in Google Shared Drive.',[
field('title','Document title','text',true),field('category','Document category','select',true,['Contract','Booking brief','Performer agreement','Finance','Photo','Video','Other']),
field('jobReference','Related job reference'),field('clientReference','Related client reference'),
field('driveFileId','Google Drive file reference','text',true),
field('owner','Document owner'),field('classification','Classification','select',true,['Internal','Confidential','Restricted']),
field('usageRights','Media usage rights','select',false,['Pending','Approved','Denied','Not applicable']),
field('expiryDate','Expiry / review date','date'),
field('notes','Description / rights notes','textarea')
],['Awaiting review','Approved','Restricted','Archived'],
['Upload to an approved Shared Drive through the backend','Apply classification and ownership','Verify permissions and usage rights','Link the Drive file to an authorized job'],
['title','category','jobReference','classification','status']),
FollowUp:module('follow-ups','Post-job follow-up','Coordinate client satisfaction, media retrieval, rights approvals and handover after each event.',[
field('jobReference','Completed job reference','text',true),
field('clientReference','Client reference','text',true),
field('owner','Follow-up owner','text',true),
field('dueDate','Next-action due date','date',true),
field('thankYouStatus','Client thank-you','select',false,['Not sent','Sent']),
field('feedbackStatus','Client feedback','select',false,['Not requested','Requested','Received']),
field('mediaStatus','Event media','select',false,['Not requested','Requested','Received','Approved']),
field('eventManager','Event / job manager contact reference'),
field('professionalMedia','Professional photo/video request notes','textarea'),
field('socialLinks','Public source URLs (review required)','textarea'),
field('rightsStatus','Media rights review','select',false,['Pending','Approved','Rejected']),
field('nextAction','Next action','textarea',true),field('notes','Resolution notes','textarea')
],['Open','Awaiting client','Awaiting media','Rights review','Completed','Closed'],
['Send approved thank-you using Gmail','Request client feedback','Request photos and video from client and production team','Follow up on professional photography and social mentions','Review rights and archive media in Shared Drive'],
['jobReference','clientReference','owner','dueDate','status'])
};
const special=['Reports','Settings'];
function validate(name,data){
const model=schemas[name];if(!model)return ['Unknown module'];
const issues=[];
for(const f of model.fields){
 const value=String(data[f.key]??'').trim();
 if(f.required&&!value)issues.push(f.label+' is required');
 if(!value)continue;
 if(f.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))issues.push(f.label+' requires a valid email');
 if((f.type==='integer'||f.type==='number'||f.type==='money')&&(!Number.isFinite(Number(value))||Number(value)<0||(f.type==='integer'&&!Number.isInteger(Number(value)))))issues.push(f.label+' requires a non-negative number');
 if(f.type==='select'&&!f.options.includes(value))issues.push(f.label+' has an invalid option');
 if(f.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(value))issues.push(f.label+' has an invalid date');
}
if(data.status&&!model.statuses.includes(data.status))issues.push('Invalid record status');
if(name==='Inventory'&&data.availableQuantity!==''&&data.quantity!==''&&Number(data.availableQuantity)>Number(data.quantity))issues.push('Available quantity must not exceed total quantity');
if(name==='Bookings'&&data.startTime&&data.endTime&&data.endTime<data.startTime)issues.push('End time must not precede start time');
if(name==='Assets'&&data.pickupDate&&data.deliveryDate&&data.deliveryDate<data.pickupDate)issues.push('Delivery date must not precede pickup date');
return issues;
}
const exported=Object.freeze({schemas,special,validate,field});
root.DizzyOperationsSchema=exported;
if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof globalThis!=='undefined'?globalThis:this);
