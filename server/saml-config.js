import { X509Certificate } from 'node:crypto';

const ISSUER = 'https://accounts.google.com/o/saml2?idpid=C03icveqq';
const SSO_URL = 'https://accounts.google.com/o/saml2/idp?idpid=C03icveqq';
export const PROVIDER_ID = 'saml.afrodizzyacts';

export function validateCertificates(settings, certificatePems, now = Date.now()) {
  if (settings.entity_id !== ISSUER || settings.sso_url !== SSO_URL) {
    throw new Error('IdP must match the approved AfrodizzyActs Workspace tenant');
  }
  const records = settings.signing_certificates;
  if (!Array.isArray(records) || !records.length) throw new Error('No approved signing certificates');
  const seen = new Set();
  return records.map(record => {
    if (!/^\.\/google-idp-signing-[0-9-]+\.pem$/.test(record.file || '')) {
      throw new Error('Invalid signing certificate path');
    }
    const pem = certificatePems[record.file];
    if (typeof pem !== 'string' || pem.includes('PRIVATE KEY') ||
        (pem.match(/-----BEGIN CERTIFICATE-----/g) || []).length !== 1 ||
        (pem.match(/-----END CERTIFICATE-----/g) || []).length !== 1) {
      throw new Error('Expected one public X.509 certificate');
    }
    const cert = new X509Certificate(pem);
    if (cert.fingerprint256 !== record.sha256) throw new Error('Certificate fingerprint mismatch');
    if (seen.has(cert.fingerprint256)) throw new Error('Duplicate signing certificate');
    seen.add(cert.fingerprint256);
    if (Date.parse(cert.validFrom) > now || Date.parse(cert.validTo) <= now) {
      throw new Error('Signing certificate is not currently valid');
    }
    if (Date.parse(record.not_before) !== Date.parse(cert.validFrom) ||
        Date.parse(record.not_after) !== Date.parse(cert.validTo)) {
      throw new Error('Certificate validity metadata does not match X.509');
    }
    if (!cert.verify(cert.publicKey)) throw new Error('Invalid Google self-signed certificate');
    return { pem: cert.toString(), sha256: cert.fingerprint256,
      not_before: new Date(cert.validFrom).toISOString(), not_after: new Date(cert.validTo).toISOString() };
  });
}

export function buildSamlProviderConfig({ projectId, origin, authDomain, settings, certificatePems, now }) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId || '')) {
    throw new Error('An explicit valid Google Cloud project ID is required');
  }
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin ||
      (url.hostname !== 'ops.afrodizzyacts.co.za' && !url.hostname.endsWith('.run.app'))) {
    throw new Error('Use the HTTPS production portal or deployed Cloud Run origin, without a trailing slash');
  }
  const domain = authDomain || projectId + '.firebaseapp.com';
  if (domain !== projectId + '.firebaseapp.com') {
    throw new Error('Use this project’s default Firebase auth domain; custom domains require a separate verified setup');
  }
  const certificates = validateCertificates(settings, certificatePems, now);
  return {
    providerId: PROVIDER_ID,
    displayName: 'AfrodizzyActs Google Workspace',
    enabled: false,
    idpEntityId: settings.entity_id,
    ssoURL: settings.sso_url,
    x509Certificates: certificates.map(cert => cert.pem),
    rpEntityId: origin,
    callbackURL: 'https://' + domain + '/__/auth/handler'
  };
}

export function planSamlChange(existing, desired) {
  if (!existing) return { action: 'create', config: desired };
  for (const key of ['providerId', 'idpEntityId', 'ssoURL', 'rpEntityId', 'callbackURL']) {
    if (existing[key] !== desired[key]) {
      throw new Error('Existing SAML provider differs at ' + key + '; review before changing its trust configuration');
    }
  }
  const expected = new Set(desired.x509Certificates.map(pem => new X509Certificate(pem).fingerprint256));
  const current = new Set((existing.x509Certificates || []).map(pem => new X509Certificate(pem).fingerprint256));
  for (const fingerprint of current) {
    if (!expected.has(fingerprint)) {
      throw new Error('Existing provider trusts an unlisted certificate; review its rollover before removal');
    }
  }
  if (current.size === expected.size && [...expected].every(fp => current.has(fp))) {
    return { action: 'unchanged' };
  }
  // Patch certificates only. Never toggle an existing provider or replace its SP settings.
  return { action: 'update', config: { x509Certificates: desired.x509Certificates } };
}

export async function configureSamlProvider(auth, desired, { checkOnly = false } = {}) {
  let existing;
  try { existing = await auth.getProviderConfig(desired.providerId); }
  catch (error) {
    if (error.code !== 'auth/configuration-not-found') throw error;
  }
  const plan = planSamlChange(existing, desired);
  if (checkOnly && plan.action !== 'unchanged') {
    throw new Error('SAML provider is missing or its approved certificate set is incomplete');
  }
  if (plan.action === 'create') return { action: plan.action, provider: await auth.createProviderConfig(plan.config) };
  if (plan.action === 'update') return { action: plan.action, provider: await auth.updateProviderConfig(desired.providerId, plan.config) };
  return { action: plan.action, provider: existing };
}
