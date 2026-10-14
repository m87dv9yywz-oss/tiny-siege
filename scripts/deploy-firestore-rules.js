import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Fixed production target: no caller-supplied project, database or endpoint.
export const PROJECT = 'tiny-siege-game';
export const RELEASE = `projects/${PROJECT}/releases/cloud.firestore`;
const PREFIX = `projects/${PROJECT}/rulesets/`;
const BASE = 'https://firebaserules.googleapis.com/v1/';
const hash = text => createHash('sha256').update(text, 'utf8').digest('hex');

function rulesetName(name) {
  if (typeof name !== 'string' || !name.startsWith(PREFIX) ||
      !/^[a-zA-Z0-9_-]+$/.test(name.slice(PREFIX.length))) {
    throw new Error('Unexpected ruleset target');
  }
  return name;
}

export function exactSource(ruleset, source) {
  const files = ruleset?.source?.files;
  if (!Array.isArray(files) || files.length !== 1 ||
      files[0].name !== 'firestore.rules' || files[0].content !== source) {
    throw new Error('Rules read-back does not exactly match validated firestore.rules');
  }
}

export function productionContext(env) {
  if (env.GITHUB_REPOSITORY !== 'm87dv9yywz-oss/tiny-siege' ||
      env.GITHUB_REF !== 'refs/heads/main' ||
      !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) ||
      env.GITHUB_WORKFLOW_REF !== 'm87dv9yywz-oss/tiny-siege/.github/workflows/deploy.yml@refs/heads/main') {
    throw new Error('Rules publishing is restricted to the production workflow on main');
  }
}

export function rulesApi(token, fetchImpl = fetch) {
  if (!token) throw new Error('Missing short-lived Google access token');
  return async (path, method = 'GET', body) => {
    if (path !== RELEASE && path !== `projects/${PROJECT}/rulesets` && !path.startsWith(PREFIX)) {
      throw new Error('Unexpected Firebase API target');
    }
    if (path.startsWith(PREFIX)) rulesetName(path);
    const response = await fetchImpl(BASE + path, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    // Never log response bodies, headers or tokens, including on errors.
    if (!response.ok) throw new Error(`Firebase Rules ${method} failed: HTTP ${response.status}`);
    return response.json();
  };
}

export async function publishRules({ source, api, save, commit, blob, forcePublish = false }) {
  const before = await api(RELEASE);
  if (before.name !== RELEASE) throw new Error('Unexpected active release');
  const previous = rulesetName(before.rulesetName);
  const rollback = await api(previous);
  // Save rollback BEFORE any mutation; a disk failure stops publication.
  await save('rollback.json', { release: before, ruleset: rollback });
  const evidence = { project: PROJECT, database: '(default)', commit, blob,
    sourceSha256: hash(source), previousRuleset: previous, verified: false };
  await save('verification.json', evidence);

  // Infrastructure built against schema 1 must never undo the v3.1 publication.
  // This is a bootstrap guard, not a substitute for compatibility emulator tests.
  const priorContent = rollback.source?.files?.map(file => file.content).join('\n') ?? '';
  if (priorContent.includes('v in [1,2]') && !source.includes('v in [1,2]')) {
    throw new Error('Active schema-2 support would be removed; rebase onto v3.1 or stage a reviewed migration');
  }
  // A staged v4 rules publication must survive unrelated infrastructure releases
  // before the game PR merges. Semantic compatibility still requires emulator tests.
  const kingdoms = /match\s+\/users\/\{[^}]+\}\/kingdoms\/\{[^}]+\}/;
  if (kingdoms.test(priorContent) && !kingdoms.test(source)) {
    throw new Error('Active v4 kingdom support would be removed; merge the validated compatible rules or stage a reviewed migration');
  }

  let target = previous;
  let unchanged = false;
  try { exactSource(rollback, source); unchanged = true; }
  catch { /* Source changed: create and verify a new ruleset before publishing. */ }
  if (forcePublish || !unchanged) {
    const candidate = await api(`projects/${PROJECT}/rulesets`, 'POST', {
      source: { files: [{ name: 'firestore.rules', content: source }] },
    });
    target = rulesetName(candidate.name);
    exactSource(await api(target), source);
    const current = await api(RELEASE);
    if (current.rulesetName !== previous) throw new Error('Production release changed concurrently; refusing overwrite');
    await api(RELEASE, 'PATCH', {
      release: { name: RELEASE, rulesetName: target }, updateMask: 'ruleset_name',
    });
  }
  const active = await api(RELEASE);
  if (active.name !== RELEASE || active.rulesetName !== target) {
    throw new Error('Active release does not reference the published ruleset');
  }
  exactSource(await api(rulesetName(active.rulesetName)), source);
  evidence.activeRuleset = target;
  evidence.verified = true;
  evidence.verifiedAt = new Date().toISOString();
  await save('verification.json', evidence);
  return evidence;
}

async function main() {
  productionContext(process.env);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (commit !== process.env.GITHUB_SHA) throw new Error('Checkout does not match tested workflow commit');
  const source = await readFile('firestore.rules', 'utf8');
  const committed = execFileSync('git', ['show', 'HEAD:firestore.rules'], { encoding: 'utf8' });
  if (source !== committed) throw new Error('Working rules differ from tested commit');
  const blob = execFileSync('git', ['rev-parse', 'HEAD:firestore.rules'], { encoding: 'utf8' }).trim();
  const directory = process.env.FIREBASE_RULES_EVIDENCE_DIR;
  if (!directory) throw new Error('Missing rollback evidence directory');
  await mkdir(directory, { recursive: true });
  const result = await publishRules({ source, commit, blob,
    forcePublish: process.env.FIREBASE_RULES_FORCE_PUBLISH === 'true',
    api: rulesApi(process.env.FIREBASE_RULES_ACCESS_TOKEN),
    save: (name, data) => writeFile(resolve(directory, name), JSON.stringify(data, null, 2) + '\n', { mode: 0o600 }),
  });
  console.log(`Verified ${RELEASE}: ${result.activeRuleset}; source SHA256 ${result.sourceSha256}; commit ${commit}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY,
      `Firestore rules verified for ${PROJECT} / (default).\n\nCommit: ${commit}\n\nGit blob: ${blob}\n\nRuleset: ${result.activeRuleset}\n\nExact source SHA256: ${result.sourceSha256}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
