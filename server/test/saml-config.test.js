import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildSamlProviderConfig, validateCertificates, planSamlChange, configureSamlProvider } from '../saml-config.js';

const root = new URL('../../', import.meta.url);
const settings = JSON.parse(readFileSync(new URL('auth/idp-settings.json', root), 'utf8'));
const certificatePems = Object.fromEntries(settings.signing_certificates.map(record =>
  [record.file, readFileSync(new URL('auth/' + record.file, root), 'utf8')]));
const now = Date.parse('2026-11-02T01:00:00Z');
const input = () => ({ projectId: 'dizzyops-test', origin: 'https://ops.afrodizzyacts.co.za',
  settings: structuredClone(settings), certificatePems: { ...certificatePems }, now });
const desired = () => buildSamlProviderConfig(input());

test('both independently pinned Google certificates are loaded into the managed trust set', () => {
  const config = desired();
  assert.equal(config.x509Certificates.length, 2);
  assert.equal(config.enabled, false);
  assert.equal(config.providerId, 'saml.afrodizzyacts');
  assert.equal(config.rpEntityId, 'https://ops.afrodizzyacts.co.za');
  assert.equal(config.callbackURL, 'https://dizzyops-test.firebaseapp.com/__/auth/handler');
  assert.equal(settings.signing_certificates[0].sha256, settings.certificate_sha256);
  const xml = readFileSync(new URL('auth/google-idp-metadata.xml', root), 'utf8');
  for (const pem of config.x509Certificates) {
    assert.ok(xml.includes(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')));
  }
  assert.equal((xml.match(/<md:KeyDescriptor /g) || []).length, 2);
});

test('expired or not-yet-valid certificates cannot be staged', () => {
  for (const time of ['2026-10-25T00:00:00Z', '2031-11-02T00:00:00Z']) {
    assert.throws(() => buildSamlProviderConfig({ ...input(), now: Date.parse(time) }), /not currently valid/);
  }
});

test('fingerprint drift, corrupted public keys, private keys and duplicate trust entries fail', () => {
  const altered = input();
  altered.settings.signing_certificates[1].sha256 = settings.signing_certificates[0].sha256;
  assert.throws(() => buildSamlProviderConfig(altered), /fingerprint mismatch/);
  const privateKey = input();
  privateKey.certificatePems[settings.signing_certificates[1].file] += '\n-----BEGIN PRIVATE KEY-----';
  assert.throws(() => buildSamlProviderConfig(privateKey), /public X.509/);
  const duplicate = input();
  duplicate.settings.signing_certificates.push(duplicate.settings.signing_certificates[0]);
  assert.throws(() => buildSamlProviderConfig(duplicate), /Duplicate/);
  const dates = input();
  dates.settings.signing_certificates[1].not_after = '2031-11-03T00:00:00Z';
  assert.throws(() => buildSamlProviderConfig(dates), /validity metadata/);
});

test('another tenant, project domain, static Pages origin and traversal paths are rejected', () => {
  const otherTenant = input();
  otherTenant.settings.entity_id = 'https://accounts.google.com/o/saml2?idpid=OTHER';
  assert.throws(() => buildSamlProviderConfig(otherTenant), /approved AfrodizzyActs/);
  assert.throws(() => buildSamlProviderConfig({ ...input(), projectId: '' }), /project ID/);
  assert.throws(() => buildSamlProviderConfig({ ...input(), authDomain: 'other.firebaseapp.com' }), /default Firebase/);
  assert.throws(() => buildSamlProviderConfig({ ...input(), origin: 'https://afrodizzyacts.github.io' }), /production portal/);
  const traversal = input();
  traversal.settings.signing_certificates[0].file = '../private.pem';
  assert.throws(() => buildSamlProviderConfig(traversal), /certificate path/);
});

test('existing provider certificate rollover patches only the trust set and is idempotent', () => {
  for (const enabled of [true, false]) {
    const current = { ...desired(), enabled };
    current.x509Certificates = [current.x509Certificates[0]];
    const plan = planSamlChange(current, desired());
    assert.equal(plan.action, 'update');
    assert.deepEqual(Object.keys(plan.config), ['x509Certificates']);
    assert.equal(current.enabled, enabled);
    const updated = { ...current, ...plan.config };
    assert.equal(planSamlChange(updated, desired()).action, 'unchanged');
    assert.equal(updated.enabled, enabled);
  }
});

test('trust destination drift or removal of an unlisted existing certificate requires review', () => {
  for (const key of ['idpEntityId', 'ssoURL', 'rpEntityId', 'callbackURL']) {
    assert.throws(() => planSamlChange({ ...desired(), [key]: 'different' }, desired()), /review before changing/);
  }
  const subset = { ...desired(), x509Certificates: [desired().x509Certificates[0]] };
  assert.throws(() => planSamlChange(desired(), subset), /unlisted certificate/);
});

test('new provider is created disabled; check mode performs no mutation', async () => {
  let writes = 0;
  const auth = {
    async getProviderConfig() { throw Object.assign(new Error('missing'), { code: 'auth/configuration-not-found' }); },
    async createProviderConfig(config) { writes++; assert.equal(config.enabled, false); return config; },
    async updateProviderConfig() { writes++; throw new Error('unexpected update'); }
  };
  await assert.rejects(configureSamlProvider(auth, desired(), { checkOnly: true }), /missing or/);
  assert.equal(writes, 0);
  const result = await configureSamlProvider(auth, desired());
  assert.equal(result.action, 'create');
  assert.equal(result.provider.enabled, false);
  assert.equal(writes, 1);
});

test('a cloud permission error never triggers a provider creation attempt', async () => {
  const auth = {
    async getProviderConfig() { throw Object.assign(new Error('permission denied'), { code: 'auth/insufficient-permission' }); },
    async createProviderConfig() { assert.fail('must not create'); }
  };
  await assert.rejects(configureSamlProvider(auth, desired()), /permission denied/);
});

test('read-only verification rejects incomplete trust; apply preserves an active provider', async () => {
  let current = { ...desired(), enabled: true };
  current.x509Certificates = [current.x509Certificates[0]];
  let writes = 0;
  const auth = {
    async getProviderConfig() { return current; },
    async updateProviderConfig(id, update) {
      writes++;
      assert.equal(id, 'saml.afrodizzyacts');
      assert.deepEqual(Object.keys(update), ['x509Certificates']);
      current = { ...current, ...update };
      return current;
    }
  };
  await assert.rejects(configureSamlProvider(auth, desired(), { checkOnly: true }), /incomplete/);
  assert.equal(writes, 0);
  const result = await configureSamlProvider(auth, desired());
  assert.equal(result.provider.enabled, true);
  assert.equal(writes, 1);
  assert.equal((await configureSamlProvider(auth, desired(), { checkOnly: true })).action, 'unchanged');
  assert.equal(writes, 1);
});

test('offline CLI refuses missing project and prints a clearly unverified public plan', () => {
  const command = fileURLToPath(new URL('infra/configure-saml.mjs', root));
  const missing = spawnSync(process.execPath, [command], { encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /project ID/);
  const plan = spawnSync(process.execPath, [command, '--project', 'dizzyops-test'], { encoding: 'utf8' });
  assert.equal(plan.status, 0, plan.stderr);
  const output = JSON.parse(plan.stdout);
  assert.equal(output.mode, 'offline-plan');
  assert.equal(output.cloudVerified, false);
  assert.equal(output.applicationLoginActivated, false);
  assert.equal(output.certificates.length, 2);
  assert.match(output.note, /not provisioned or verified/);
  assert.equal('x509Certificates' in output, false);
});
