#!/usr/bin/env node
// Default: offline plan. --apply creates a DISABLED provider or adds approved certificates.
// This does not enable billing, create cloud resources, assign users, or activate login.
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildSamlProviderConfig, configureSamlProvider } from '../server/saml-config.js';

async function main() {
  const { values } = parseArgs({ options: {
    project: { type: 'string' },
    origin: { type: 'string', default: 'https://ops.afrodizzyacts.co.za' },
    apply: { type: 'boolean', default: false },
    check: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false }
  } });
  if (values.help) {
    console.log('node infra/configure-saml.mjs --project PROJECT_ID [--origin HTTPS_ORIGIN] [--apply | --check]');
    console.log('No mode flag: offline plan only. --apply: stage provider/certificates. --check: read-only cloud verification.');
    return;
  }
  if (values.apply && values.check) throw new Error('Choose either --apply or --check');
  const authDir = new URL('../auth/', import.meta.url);
  const settings = JSON.parse(await readFile(new URL('idp-settings.json', authDir), 'utf8'));
  const certificatePems = {};
  for (const record of settings.signing_certificates || []) {
    if (!/^\.\/google-idp-signing-[0-9-]+\.pem$/.test(record.file || '')) throw new Error('Invalid signing certificate path');
    certificatePems[record.file] = await readFile(new URL(record.file, authDir), 'utf8');
  }
  const desired = buildSamlProviderConfig({ projectId: values.project, origin: values.origin, settings, certificatePems });
  const summary = {
    projectId: values.project, providerId: desired.providerId,
    idpEntityId: desired.idpEntityId, ssoURL: desired.ssoURL,
    serviceProviderEntityId: desired.rpEntityId, callbackURL: desired.callbackURL,
    certificates: settings.signing_certificates,
    workspaceNameId: 'Primary email / EMAIL',
    workspaceStartUrl: desired.rpEntityId + '/',
    applicationLoginActivated: false
  };
  if (!values.apply && !values.check) {
    console.log(JSON.stringify({ mode: 'offline-plan', cloudVerified: false, ...summary,
      note: 'Callback is planned from the project ID, not provisioned or verified. Run --apply only in the confirmed Identity Platform project.' }, null, 2));
    return;
  }
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Cloud verification cannot run against the Auth emulator');
  // Resolve Admin SDK from the application's dependencies; use ADC, never key files in source.
  const require = createRequire(new URL('../server/package.json', import.meta.url));
  const { initializeApp, applicationDefault, deleteApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const app = initializeApp({ credential: applicationDefault(), projectId: values.project }, 'dizzyops-saml-setup');
  try {
    const { action, provider } = await configureSamlProvider(getAuth(app), desired, { checkOnly: values.check });
    console.log(JSON.stringify({ mode: values.check ? 'cloud-check' : 'cloud-apply', cloudVerified: true,
      ...summary, action, providerEnabled: provider.enabled,
      callbackURL: provider.callbackURL, serviceProviderEntityId: provider.rpEntityId,
      note: 'Provider configuration verified. Workspace app assignment, authorized domains, deployed session backend, staff roles and an end-to-end login test are still required.' }, null, 2));
  } finally { await deleteApp(app); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    // Do not dump ADC, request headers, tokens or complete SDK error objects.
    console.error('SAML setup failed: ' + (error.code || error.message));
    process.exitCode = 1;
  });
}
