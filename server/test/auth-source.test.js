import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {X509Certificate} from 'node:crypto';
const root = new URL('../../',import.meta.url);
const read = path => readFileSync(new URL(path,root),'utf8');

test('signed Google Workspace cert has the expected SHA-256 fingerprint',()=>{
  const cert = new X509Certificate(read('auth/google-idp-signing-2026.pem'));
  assert.equal(cert.fingerprint256,
    'CB:D8:53:3B:CA:C5:38:10:BF:B4:6C:49:50:48:47:8B:0C:CA:79:43:33:05:D2:27:DE:07:9D:45:F2:64:23:63');
  assert.ok(Date.parse(cert.validFrom) < Date.now());
  assert.ok(Date.parse(cert.validTo) > Date.now());
});

test('current IdP metadata embeds identical public certificate',()=>{
  const pem=read('auth/google-idp-signing-2026.pem');
  const xml=read('auth/google-idp-metadata.xml');
  const base64=pem.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
  assert.ok(xml.includes(base64));
  assert.ok(xml.includes('https://accounts.google.com/o/saml2?idpid=C03icveqq'));
});

test('frontend defaults to disabled until authorized Cloud project exists',()=>{
  const config=read('auth/config.js');
  assert.match(config,/identityPlatform:\s*\{\s*enabled:\s*false/);
  assert.match(config,/apiKey:\s*["']REPLACE_ME/);
});

test('protected routes enforce token/session verification, roles, Origin and CSRF',()=>{
  const server=read('server/index.js');
  for(const term of ['verifyIdToken','verifySessionCookie','STAFF_ROLE_MAP_JSON',
    "app.get('/portal.html',session","requireSameOrigin","requireCsrf",
    "httpOnly:true,secure:true,sameSite:'strict'"]){
    assert.ok(server.includes(term),term);
  }
});
