/**
 * DizzyOps Cloud Run authentication boundary.
 * Identity Platform performs SAML validation; Firebase Admin verifies ID/session tokens.
 * No production business records are hosted or persisted by this service.
 */
import express from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const origin = process.env.PUBLIC_ORIGIN;
const samlProviderId = process.env.SAML_PROVIDER_ID || 'saml.afrodizzyacts';
if (!projectId || !origin || !/^https:\/\/[^/]+$/.test(origin)) {
  throw new Error('GOOGLE_CLOUD_PROJECT and PUBLIC_ORIGIN (HTTPS origin) are required');
}
if (!/^saml\.[a-zA-Z0-9_.-]+$/.test(samlProviderId)) throw new Error('Invalid SAML provider ID');
let staff;
try {
  staff = JSON.parse(process.env.STAFF_ROLE_MAP_JSON || '{}');
  if (!staff || Array.isArray(staff) || typeof staff !== 'object') throw Error();
} catch {
  throw new Error('STAFF_ROLE_MAP_JSON must be a JSON object mapping approved emails to roles');
}
const roles = new Set(['administrator', 'management', 'operations', 'finance', 'agent']);
const allowedRoles = Object.fromEntries(Object.entries(staff).map(([email, role]) => {
  const id = email.trim().toLowerCase();
  if (!id.includes('@') || !roles.has(role)) throw new Error('Invalid authorized staff mapping');
  return [id, role];
}));
initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({limit:'8kb',type:'application/json'}));
app.use((req,res,next) => {
  res.set({
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'X-Frame-Options':'DENY',
    'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com",
      "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
      "form-action 'self' https://accounts.google.com",
      "base-uri 'none'",
      "object-src 'none'",
      "frame-ancestors 'none'"
    ].join('; ')
  });
  next();
});
const sessionName='__Host-dizzyops-session';
const csrfName='__Host-dizzyops-csrf';
const cookieBase={httpOnly:true,secure:true,sameSite:'strict',path:'/'};
const noCache=(res)=>res.set('Cache-Control','no-store');
const file=(res,name)=>{noCache(res);return res.sendFile(path.join(root,name))};
const cookies=req=>Object.fromEntries((req.get('cookie')||'').split(';').map(s=>s.trim().split('=')).filter(x=>x.length===2));
const constantMatch=(a,b)=>{
  const aa=Buffer.from(typeof a==='string'?a:'');
  const bb=Buffer.from(typeof b==='string'?b:'');
  return aa.length>=32&&aa.length===bb.length&&timingSafeEqual(aa,bb);
};
const requireSameOrigin=(req,res,next)=>{
  if(req.get('origin')!==origin){return res.status(403).json({error:'Invalid request origin'});}
  next();
};
const requireCsrf=(req,res,next)=>{
  const t=cookies(req)[csrfName];
  if(!constantMatch(t,req.get('x-csrf-token'))){return res.status(403).json({error:'Invalid CSRF token'});}
  next();
};
const assignedRole=claims=>{
  const email=typeof claims.email==='string'?claims.email.trim().toLowerCase():'';
  return allowedRoles[email]||null;
};
async function session(req,res,next){
  try{
    const jwt=cookies(req)[sessionName];
    if(!jwt){return res.status(401).json({error:'Authentication required'});}
    const claims=await auth.verifySessionCookie(jwt,true);
    const role=assignedRole(claims);
    if(!role||claims.firebase?.sign_in_provider!==samlProviderId) {
      return res.status(403).json({error:'Not authorized'});
    }
    req.identity={uid:claims.uid,email:claims.email,role,claims};
    next();
  }catch{
    res.clearCookie(sessionName,cookieBase);
    res.status(401).json({error:'Session expired or invalid'});
  }
}

app.get('/healthz',(req,res)=>res.json({status:'ok'}));
app.get(['/', '/index.html'],(req,res)=>file(res,'index.html'));
app.use('/assets',express.static(path.join(root,'assets'),{fallthrough:false,maxAge:'1h'}));
for(const part of ['config.js','login.js','identity-platform.js']){
  app.get('/auth/'+part,(req,res)=>file(res,'auth/'+part));
}
app.get('/auth/csrf',(req,res)=>{
  noCache(res);
  const token=randomBytes(32).toString('hex');
  res.cookie(csrfName,token,{...cookieBase,maxAge:300000});
  res.json({csrfToken:token});
});
app.post('/auth/session',requireSameOrigin,requireCsrf,async(req,res)=>{
  noCache(res);
  try{
    const idToken=req.body?.idToken;
    if(typeof idToken!=='string'||idToken.length>6500) return res.status(400).json({error:'Invalid sign-in request'});
    const claims=await auth.verifyIdToken(idToken,true);
    const role=assignedRole(claims);
    if(!role||claims.firebase?.sign_in_provider!==samlProviderId) {
      return res.status(403).json({error:'Account not approved for DizzyOps'});
    }
    const seconds=Math.floor(Date.now()/1000);
    if(typeof claims.auth_time!=='number'|| seconds-claims.auth_time>300||claims.auth_time>seconds+60) {
      return res.status(401).json({error:'Recent sign-in required'});
    }
    const maxAge=8*60*60*1000;
    const jwt=await auth.createSessionCookie(idToken,{expiresIn:maxAge});
    res.cookie(sessionName,jwt,{...cookieBase,maxAge});
    res.json({ok:true});
  }catch {
    res.status(401).json({error:'Sign-in could not be verified'});
  }
});
app.get('/auth/me',session,(req,res)=>{
  noCache(res);
  const {uid,email,role}=req.identity;
  res.json({uid,email,role});
});
app.post('/auth/logout',requireSameOrigin,requireCsrf,session,async(req,res)=>{
  noCache(res);
  try{await auth.revokeRefreshTokens(req.identity.uid);}
  catch{return res.status(503).json({error:'Unable to revoke session; retry'});}
  res.clearCookie(sessionName,cookieBase);
  res.clearCookie(csrfName,cookieBase);
  res.json({ok:true});
});
app.get('/portal.html',session,(req,res)=>file(res,'portal.html'));
// Resource code is never an authorization boundary, but serve it only after auth on Cloud Run.
for(const part of ['portal-app.js','quotes.js','finance.js']){
  app.get('/'+part,session,(req,res)=>file(res,part));
}
app.use('/api',(req,res)=>res.status(404).json({error:'API not implemented'}));
app.use((req,res)=>res.status(404).send('Not found'));
const port=Number(process.env.PORT||8080);
app.listen(port,'0.0.0.0',()=>console.log('DizzyOps auth server listening on '+port));
