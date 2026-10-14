import test from 'node:test';
import assert from 'node:assert/strict';
import { publishRules, rulesApi, exactSource, productionContext, RELEASE } from '../scripts/deploy-firestore-rules.js';

const previous = 'projects/tiny-siege-game/rulesets/previous';
const next = 'projects/tiny-siege-game/rulesets/next';
const source = "rules_version = '2';\nservice cloud.firestore {}\n";
const ruleset = content => ({ source: { files: [{ name: 'firestore.rules', content }] } });
function fixture({ fail, mismatch, concurrent, prior = 'old source' } = {}) {
  let active = previous;
  const calls = [], saved = [];
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (fail === method) throw new Error('simulated API failure');
    if (path === RELEASE && method === 'GET') {
      if (concurrent && calls.filter(call => call.path === RELEASE).length > 1) active = next;
      return { name: RELEASE, rulesetName: active };
    }
    if (path === previous) return ruleset(prior);
    if (path === next) return ruleset(mismatch ? 'different' : source);
    if (method === 'POST') return { name: next };
    if (method === 'PATCH') { active = body.release.rulesetName; return { name: RELEASE, rulesetName: active }; }
    throw new Error('unexpected API call');
  };
  return { calls, saved, args: { source, api, commit: 'tested', blob: 'blob', save: async (name, data) => saved.push({ name, data: structuredClone(data) }) } };
}
test('creates, verifies candidate, publishes and verifies active release; rollback precedes mutation', async () => {
  const f = fixture();
  const result = await publishRules(f.args);
  assert.equal(result.verified, true);
  assert.equal(result.activeRuleset, next);
  assert.equal(f.saved[0].name, 'rollback.json');
  assert.deepEqual(f.calls.map(call => call.method), ['GET', 'GET', 'POST', 'GET', 'GET', 'PATCH', 'GET', 'GET']);
  const patch = f.calls.find(call => call.method === 'PATCH');
  assert.deepEqual(patch.body, { release: { name: RELEASE, rulesetName: next }, updateMask: 'ruleset_name' });
});
test('identical source is verified without creating or publishing another version', async () => {
  const f = fixture({ prior: source });
  assert.equal((await publishRules(f.args)).activeRuleset, previous);
  assert.ok(f.calls.every(call => call.method === 'GET'));
});
test('controlled rules-only bootstrap performs real publication even for identical source', async () => {
  const f = fixture({ prior: source });
  f.args.forcePublish = true;
  assert.equal((await publishRules(f.args)).activeRuleset, next);
  assert.ok(f.calls.some(call => call.method === 'POST'));
  assert.ok(f.calls.some(call => call.method === 'PATCH'));
});
for (const fail of ['GET', 'POST', 'PATCH']) {
  test(`API ${fail} failure rejects release`, async () => {
    const f = fixture({ fail });
    await assert.rejects(publishRules(f.args), /API failure/);
    assert.ok(!f.saved.some(entry => entry.data.verified === true));
  });
}
test('candidate mismatch stops before publication', async () => {
  const f = fixture({ mismatch: true });
  await assert.rejects(publishRules(f.args), /exactly match/);
  assert.ok(!f.calls.some(call => call.method === 'PATCH'));
});
test('concurrent console publication is not overwritten', async () => {
  const f = fixture({ concurrent: true });
  await assert.rejects(publishRules(f.args), /concurrently/);
  assert.ok(!f.calls.some(call => call.method === 'PATCH'));
});
test('rollback recording failure stops before publication', async () => {
  const f = fixture();
  f.args.save = async () => { throw new Error('disk failed'); };
  await assert.rejects(publishRules(f.args), /disk failed/);
  assert.ok(f.calls.every(call => call.method === 'GET'));
});
test('bootstrap schema-1 checkout cannot overwrite published v3.1 rules', async () => {
  const f = fixture({ prior: 'v in [1,2]' });
  await assert.rejects(publishRules(f.args), /schema-2 support/);
  assert.ok(f.calls.every(call => call.method === 'GET'));
});
test('v3.1 checkout cannot undo staged v4 kingdom rules before the game merges', async () => {
  const f = fixture({ prior: 'match /users/{uid}/kingdoms/{id} { }' });
  await assert.rejects(publishRules(f.args), /v4 kingdom support/);
  assert.ok(f.calls.every(call => call.method === 'GET'));
});
test('exact verification rejects whitespace changes and extra source files', () => {
  assert.throws(() => exactSource(ruleset(source + '\n'), source));
  assert.throws(() => exactSource({ source: { files: [...ruleset(source).source.files, { name: 'other', content: '' }] } }, source));
});
test('production context rejects PRs, forks, branches and other workflows', () => {
  const env = { GITHUB_REPOSITORY: 'm87dv9yywz-oss/tiny-siege', GITHUB_REF: 'refs/heads/main',
    GITHUB_EVENT_NAME: 'push', GITHUB_WORKFLOW_REF: 'm87dv9yywz-oss/tiny-siege/.github/workflows/deploy.yml@refs/heads/main' };
  productionContext(env);
  for (const override of [{ GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_EVENT_NAME: 'pull_request_target' },
    { GITHUB_REPOSITORY: 'fork/tiny-siege' }, { GITHUB_REF: 'refs/heads/feature' }, { GITHUB_WORKFLOW_REF: 'other' }]) {
    assert.throws(() => productionContext({ ...env, ...override }));
  }
});
test('API token never enters error output and no redirects are allowed', async () => {
  const api = rulesApi('sensitive-test-token', async (url, options) => {
    assert.equal(options.redirect, 'error');
    assert.equal(url, 'https://firebaserules.googleapis.com/v1/' + RELEASE);
    return { ok: false, status: 403, json: () => ({ token: 'sensitive-test-token' }) };
  });
  await assert.rejects(api(RELEASE), error => error.message === 'Firebase Rules GET failed: HTTP 403');
  await assert.rejects(api('projects/unrelated/releases/cloud.firestore'), /Unexpected/);
  assert.throws(() => rulesApi(''), /Missing/);
});
