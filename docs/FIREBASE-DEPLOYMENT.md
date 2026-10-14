# Firebase rules deployment

## Current status — 2026-10-14 UTC

**Candidate automation, not active. A staged bootstrap was explicitly approved by the owner; do not enable automatic releases until authenticated runner validation succeeds.**

Resume status: v3.1 has now been independently released on main at `ea71c7a7d1c22fc8c65c16e7e5a5e7453d5ef2c2`. This infrastructure candidate is rebased onto that release and retains its exact rules blob `c6be375ae8402abcd26a3e023369de231fca7409`. The approved gated main-only bootstrap can proceed after fresh PR CI. V4 PR #11 remains separate and unmerged; its rules handoff is commit `2cdeace27ddbe0b7b93cbee9857e1075f0ebfece`, blob `5045957095d072a78943dfecb8ca4225a446334b`, SHA256 `bfeccbdc24efec515a2ad0a4b1614a4976e9a76a6afdecbfdd36cb2ec29fff29`. Complete the v3.1 bootstrap before staging v4 rules. The publisher now also refuses to remove an active v4 kingdom collection, preventing an unrelated v3.1 release from undoing a staged v4 rules publication.

The existing project is `tiny-siege-game` (number `909962953566`), its STANDARD default database is free-tier eligible, and Firebase remains Spark with billing disabled.

PR #5 source commit `2deb8ee0203b3baf6e37f8694be6bd9afd82799a`, rules Git blob `c6be375ae8402abcd26a3e023369de231fca7409`, passed [CI 38486732911](https://github.com/m87dv9yywz-oss/tiny-siege/actions/runs/38486732911). Those rules were published through Firebase Console and independently read back with exact equality (5,608 characters). They support schemas 1 and 2, retain ownership/default deny, and reject downgrades. No game release or player-data mutation was performed. The previous schema-1 rules remain in Console history (2026-10-13 15:05 America/Chicago) and a local rollback snapshot.

Google's [IAM pricing](https://cloud.google.com/iam/pricing) says IAM API use is free, while its [deployment-pipeline federation setup](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines#configure-workload-identity-federation) lists enabled billing as a prerequisite. Actual project API calls succeeded with billing disabled: IAM, Service Account Credentials and STS were enabled, and the pool/provider/service account and narrow bindings were created. Cloud Billing read-back reports `billingEnabled=false` and an empty `billingAccountName`. Configuration works on this existing Spark project; real GitHub OIDC exchange remains unverified. No billing account was linked. Existing authenticated Firebase CLI access was sufficient; Google Cloud Console terms were not accepted by this task.

Pool `tiny-siege-github` and provider `github` are ACTIVE. Service account `tiny-siege-rules-deployer@tiny-siege-game.iam.gserviceaccount.com` (unique ID `104365051091068606026`) is configured. Read-back confirms its sole project role is `roles/firebaserules.admin`; its sole impersonation binding is `roles/iam.workloadIdentityUser` for the exact principal below. User-managed key count is zero. GitHub environment `firebase-rules` is configured for exactly one branch (`main`) and zero tags, with administrator bypass disabled and no secrets/variables. No Google private key or Firebase administrator token belongs in this repository or in Actions secrets.

Infrastructure [PR #8](https://github.com/m87dv9yywz-oss/tiny-siege/pull/8) remains draft/unmerged. [CI 38493569995](https://github.com/m87dv9yywz-oss/tiny-siege/actions/runs/38493569995) passed all tests/build on implementation commit `adfd0737562a6c1685b6a176437cfd402faa67eb`; the production rules/Pages/live jobs were skipped on the PR. A controlled local-admin REST publication of the same validated v3.1 source also passed POST/PATCH/read-back. Active ruleset: `projects/tiny-siege-game/rulesets/4eef19cf-e686-472a-be3f-caa29d832bf5`; source SHA256: `21a2780479dd44ad9106b018bda39a4ca1c495b0a61a345f419f421cd9fcbb50`; verified at `2026-10-14T01:03:59.943Z`. That REST test does **not** establish GitHub OIDC authentication.

The approved staged bootstrap implementation at `09f7aa655a2bd930e9727ce21b91b56ee3f7c121` passed fresh [CI 38494199686](https://github.com/m87dv9yywz-oss/tiny-siege/actions/runs/38494199686), including all 13 publisher checks and existing gameplay, actual emulator/cloud-save, browser, balance and build checks. Production rules/Pages/live jobs were skipped on the PR. Main branch protection is saved and read-back verified: PR required, current passing `test-build` from the GitHub Actions app required, conversations resolved, no administrator bypass, force pushes or deletions. Required reviewer counts were not added to this single-owner repository. Environment and branch protections are free for this public GitHub repository.

## Candidate release flow

`.github/workflows/deploy.yml` retains all gameplay, Auth/Firestore emulator, cloud-save, browser, balance and build checks for PRs and main. PR test jobs have only `contents: read`; they never enter the production rules job. Main runs those checks again before a separate `firebase-rules` job requests OIDC. Rules publication and exact read-back must succeed before Pages deployment, followed by the existing production browser smoke test. A failed test, authentication, API request, comparison, or rollback-recording operation fails the release and blocks Pages. Main runs share a concurrency group and are not cancelled mid-publication.

The dispatch option `rules_only=true` runs all checks and forces a real ruleset creation/publication/read-back even if source is already identical, without deploying Pages or running the live-game check. It cannot authenticate from a feature branch. Use only the workflow's own validated commit on main, never checkout an arbitrary supplied SHA in a privileged job.

`scripts/deploy-firestore-rules.js` uses the official [Rules management API](https://firebase.google.com/docs/rules/manage-deploy): GET current release and ruleset, record rollback, POST ruleset, GET and compare candidate, PATCH existing `cloud.firestore` release, GET active release and source, compare exactly. Identical source is verified without a redundant publication. Only this project's default Firestore release can be addressed. It never invokes Firebase Hosting, indexes, Storage, Functions, Auth, or Firestore document APIs. Exact equality includes whitespace; no formatting differences are silently accepted.

CLI investigation: pinned `firebase-tools@15.33.0` uses `google-auth-library` ADC in `requireAuth`, so external-account authentication is supported in principle. Its deployment path also invokes API enablement/state checks and database discovery/creation. The REST implementation avoids those unrelated operations and preserves the narrow Rules Admin permission boundary. Neither method has yet passed a real GitHub OIDC authentication test in this setup.

## Required identity and GitHub protections

Only configure these after confirming they work with billing disabled. Required APIs are IAM, Resource Manager, Service Account Credentials, Security Token Service and Firebase Rules. Do not enable unrelated APIs or grant the deployer API-enablement authority.

Configured pool: `tiny-siege-github`; provider: `github`; issuer: `https://token.actions.githubusercontent.com`. Configured service account: `tiny-siege-rules-deployer@tiny-siege-game.iam.gserviceaccount.com`. It has **only** `roles/firebaserules.admin` on `tiny-siege-game`, and its trusted external principal has **only** `roles/iam.workloadIdentityUser` on that service account. No Owner, Editor, Firebase Admin, data/database admin, billing role, Token Creator self-grant or private key was granted or created. Rules Admin governs security rules across Firebase services in this project; this job's code is restricted further to default Firestore.

Map `google.subject=assertion.sub`, `attribute.repository_id=assertion.repository_id`, and `attribute.repository_owner_id=assertion.repository_owner_id`. Require all of the following in the provider attribute condition:

```text
assertion.repository_id == '1417141926' &&
assertion.repository_owner_id == '326222032' &&
assertion.repository == 'm87dv9yywz-oss/tiny-siege' &&
assertion.ref == 'refs/heads/main' &&
assertion.workflow_ref == 'm87dv9yywz-oss/tiny-siege/.github/workflows/deploy.yml@refs/heads/main' &&
assertion.sub == 'repo:m87dv9yywz-oss/tiny-siege:environment:firebase-rules' &&
(assertion.event_name == 'push' || assertion.event_name == 'workflow_dispatch')
```

Grant impersonation to the exact environment subject:
`principal://iam.googleapis.com/projects/909962953566/locations/global/workloadIdentityPools/tiny-siege-github/subject/repo:m87dv9yywz-oss/tiny-siege:environment:firebase-rules`.

Configure GitHub environment `firebase-rules` to permit only branch `main` (no tags), with any applicable approval protection. Protect main and require successful CI/review for workflow, script and rule changes. PRs, forks, other workflows, feature branches and `pull_request_target` must fail the provider condition even if they request an OIDC token. Environment restrictions and provider conditions are independent layers; a workflow `if` alone is insufficient. Review the actual Google/GitHub settings before activation.

## Activation checklist and bootstrap limitation

This infrastructure branch starts from v3.0 main. Rebase it onto the separately released v3.1 main before activation: its old schema-1 rules must never replace the already published schema-2 rules. The publisher includes a specific bootstrap guard; it is not a general schema-compatibility proof. All future compatible updates need emulator regression coverage for currently live and new clients. An incompatible migration requires an explicitly reviewed staged migration before publication, never profile deletion or silent data conversion.

Run the complete CI suite on the infrastructure PR. Then verify a real main-branch GitHub OIDC exchange, service-account impersonation, rules-only publication/read-back and evidence artifact while billing remains disabled. Test that the PR and feature-branch identities are rejected and that failures stop Pages. Do not claim permanent automation complete based on mocked API tests or Console publication.

GitHub dispatch requires the workflow to exist on the default branch, while the Google trust must remain main-only. The current main workflow contains no Firebase authentication job. Therefore an infrastructure-branch-only run cannot supply the allowed identity. The owner explicitly approved a staged bootstrap **after Codex Cloud releases v3.1**, while keeping PR #5 untouched by this infrastructure task:

1. After the separate v3.1 release, rebase this PR onto main and pass its full CI.
2. Leave repository variable `FIREBASE_RULES_AUTOMATION_ENABLED` absent or `false`. Merge the validated bootstrap infrastructure. Pushes then test only; automatic Firebase and Pages publication is gated off.
3. Dispatch `.github/workflows/deploy.yml` on `main` with `rules_only=true`. All tests run before real OIDC authentication and exact rules verification. Inspect runner evidence and confirm billing remains disabled. A failed run never publishes the game.
4. Only after the real OIDC rules deployment/read-back succeeds, set repository variable `FIREBASE_RULES_AUTOMATION_ENABLED=true`. Dispatch on main with `rules_only=false` to verify the complete rules → Pages → live-browser flow. Future compatible main releases then deploy automatically.

Do not temporarily trust feature branches or PRs. No v3.1 merge or game release is authorized in this infrastructure task. Until the separate release occurs and the bootstrap is validated, leave the infrastructure PR draft/unmerged and report automation incomplete.

## Troubleshooting, rollback and revocation

- Test failures: repair the source/tests; never skip the Auth/Firestore emulator or cloud-save suite.
- OIDC/403: verify numeric IDs, issuer/audience, main ref, event, exact workflow path, environment subject, pool/provider state, API availability and the two narrow role bindings. Check whether Google reports a billing prerequisite; stop if it does. Never fix a 403 with Owner/Editor, a permanent key or a Firebase refresh token.
- Source mismatch: Pages is blocked. Inspect the `firebase-rules-evidence` artifact and current release. Do not bypass the comparison. API error logs intentionally include only method/status, never bearer tokens or raw response bodies.
- Rollback: the artifact records the prior release/ruleset before changes. An authorized administrator may repoint `cloud.firestore` to that previous ruleset only after confirming compatibility with currently stored profiles. The pre-v3.1 schema-1 rules cannot safely serve schema-2 profiles after the game release. Retain schema-2 support in a corrective rules release instead.
- Revoke immediately: disable the GitHub OIDC provider or dedicated service account, remove its `roles/iam.workloadIdentityUser` binding and/or remove its project Rules Admin binding. Previously issued access tokens may last up to five minutes. Remove the rules workflow permission/environment afterward; do not remove the existing Firebase service agents or authentication provider.

Codex Cloud needs only its existing repository access. After verified activation, ordinary compatible rules changes follow branch → PR/tests/review → main/tests → OIDC rules publish/read-back → Pages → live smoke. Until that activation is recorded, authenticated rules publication remains a release prerequisite.
