# Firebase rules deployment

## Operation and activation

The main deployment workflow automatically publishes and verifies compatible Firestore rules before Pages whenever repository variable `FIREBASE_RULES_AUTOMATION_ENABLED=true`. Its absence/false value gates automatic Firebase/Pages publishing off; a manual main dispatch with `rules_only=true` can validate rules without hosting deployment. Codex Cloud needs only repository access. No recurring Firebase Console login is required once activation has succeeded.

Use the actual repository variable and the latest authenticated runner evidence linked in [PR #8](https://github.com/m87dv9yywz-oss/tiny-siege/pull/8) as the activation record. Do not infer activation from this document being merged. The owner approved the staged bootstrap described below; automatic releases must stay disabled until actual runner publication/read-back succeeds.

## Verified setup — 2026-10-14 UTC

Infrastructure [PR #8](https://github.com/m87dv9yywz-oss/tiny-siege/pull/8) is merged at `58323033b21d90739cfd8a6e157ebaf2719d5769`. A real GitHub runner completed short-lived OIDC authentication, service-account impersonation, ruleset creation, release publication, and exact active-source read-back in [bootstrap run 38552973887](https://github.com/m87dv9yywz-oss/tiny-siege/actions/runs/38552973887). Its successful final attempt followed the full passing test job. Pages was skipped for this rules-only bootstrap. The repository activation variable is now `true`; subsequent main releases run the complete pipeline.

The published rules are the exact v4 source from `2cdeace27ddbe0b7b93cbee9857e1075f0ebfece`, blob `5045957095d072a78943dfecb8ca4225a446334b`, SHA256 `bfeccbdc24efec515a2ad0a4b1614a4976e9a76a6afdecbfdd36cb2ec29fff29`. Active ruleset after bootstrap: `projects/tiny-siege-game/rulesets/cc51e2ae-2c91-48d9-b778-757ab5fb3d1c`. They retain legacy schemas 1/2 and add bounded schema-3 kingdom collections. Both original v4 CI and fresh live-v3.1 infrastructure CI passed against this source. V4 game PR #11 remains separate and unmerged. No player documents or authentication providers were changed.

Project `tiny-siege-game` (number `909962953566`) remains Spark, billing disabled with no linked billing account. IAM, STS, Service Account Credentials, pool/provider, and actual runner authentication worked in this existing project without billing. Google's [IAM pricing](https://cloud.google.com/iam/pricing) documents no-cost IAM use; its general [federation setup prerequisites](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) list billing. The successful runner and billing read-back establish compatibility for this project without overriding that general documentation.

The dedicated deployer has zero user-managed keys and only the narrow roles below. Main protection requires PRs, current passing `test-build` from GitHub Actions and resolved conversations, with no administrator bypass, force pushes, or deletion. Environment `firebase-rules` allows only main, no tags, and has no secrets. v3.1 rules were previously published and verified; their prior ruleset `4eef19cf-e686-472a-be3f-caa29d832bf5` and rollback source remain recorded. Never roll back across incompatible saved schemas.

## Candidate release flow

`.github/workflows/deploy.yml` retains all gameplay, Auth/Firestore emulator, cloud-save, browser, balance and build checks for PRs and main. PR test jobs have only `contents: read`; they never enter the production rules job. Main runs those checks again before a separate `firebase-rules` job requests OIDC. Rules publication and exact read-back must succeed before Pages deployment, followed by the existing production browser smoke test. A failed test, authentication, API request, comparison, or rollback-recording operation fails the release and blocks Pages. Main runs share a concurrency group and are not cancelled mid-publication.

The dispatch option `rules_only=true` runs all checks and forces a real ruleset creation/publication/read-back even if source is already identical, without deploying Pages or running the live-game check. It cannot authenticate from a feature branch. Use only the workflow's own validated commit on main, never checkout an arbitrary supplied SHA in a privileged job.

`scripts/deploy-firestore-rules.js` uses the official [Rules management API](https://firebase.google.com/docs/rules/manage-deploy): GET current release and ruleset, record rollback, POST ruleset, GET and compare candidate, PATCH existing `cloud.firestore` release, GET active release and source, compare exactly. Identical source is verified without a redundant publication. Only this project's default Firestore release can be addressed. It never invokes Firebase Hosting, indexes, Storage, Functions, Auth, or Firestore document APIs. Exact equality includes whitespace; no formatting differences are silently accepted.

CLI investigation: pinned `firebase-tools@15.33.0` uses `google-auth-library` ADC in `requireAuth`, so external-account authentication is supported in principle. Its deployment path also invokes API enablement/state checks and database discovery/creation. The REST implementation avoids those unrelated operations and preserves the narrow Rules Admin permission boundary. The REST path passed actual GitHub OIDC authentication and exact publication/read-back in the bootstrap run above.

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
assertion.sub == 'repo:m87dv9yywz-oss@326222032/tiny-siege@1417141926:environment:firebase-rules' &&
(assertion.event_name == 'push' || assertion.event_name == 'workflow_dispatch')
```

GitHub uses [immutable subjects](https://docs.github.com/en/actions/reference/security/oidc#immutable-subject-claims) for this repository. Both the provider condition and impersonation principal must include the owner/repository numeric IDs shown here. A names-only subject is rejected. After a policy correction, allow for [IAM propagation](https://docs.cloud.google.com/iam/docs/access-change-propagation) before retrying; do not add broader roles.

Grant impersonation to the exact environment subject:
`principal://iam.googleapis.com/projects/909962953566/locations/global/workloadIdentityPools/tiny-siege-github/subject/repo:m87dv9yywz-oss@326222032/tiny-siege@1417141926:environment:firebase-rules`.

Configure GitHub environment `firebase-rules` to permit only branch `main` (no tags), with any applicable approval protection. Protect main and require successful CI/review for workflow, script and rule changes. PRs, forks, other workflows, feature branches and `pull_request_target` must fail the provider condition even if they request an OIDC token. Environment restrictions and provider conditions are independent layers; a workflow `if` alone is insufficient. Review the actual Google/GitHub settings before activation.

## Validation and safe activation

The owner-approved staged bootstrap is complete: merge validated infrastructure with automatic publishing gated, prove a main-only rules deployment/read-back, then enable the activation variable. Future ordinary compatible changes need no bootstrap or Google login.

All future rules updates need emulator regression coverage for currently live and new clients. The publisher's schema guards are not a general compatibility proof. Incompatible changes require an explicitly reviewed staged migration before publication, never profile deletion or silent conversion. Retain schemas 1/2 and active v4 kingdom support.

For controlled diagnosis, dispatch on main with `rules_only=true`; this runs tests and forces publication/read-back without Pages. Never temporarily trust PRs or feature branches. A normal main push or dispatch with `rules_only=false` runs the complete rules → Pages → live verification sequence. Inspect the latest run and evidence artifact before reporting a release successful.

## Troubleshooting, rollback and revocation

- Test failures: repair the source/tests; never skip the Auth/Firestore emulator or cloud-save suite.
- OIDC/403: verify numeric IDs, issuer/audience, main ref, event, exact workflow path, environment subject, pool/provider state, API availability and the two narrow role bindings. Check whether Google reports a billing prerequisite; stop if it does. Never fix a 403 with Owner/Editor, a permanent key or a Firebase refresh token.
- Source mismatch: Pages is blocked. Inspect the `firebase-rules-evidence` artifact and current release. Do not bypass the comparison. API error logs intentionally include only method/status, never bearer tokens or raw response bodies.
- Rollback: the artifact records the prior release/ruleset before changes. An authorized administrator may repoint `cloud.firestore` to that previous ruleset only after confirming compatibility with currently stored profiles. The pre-v3.1 schema-1 rules cannot safely serve schema-2 profiles after the game release. Retain schema-2 support in a corrective rules release instead.
- Revoke immediately: disable the GitHub OIDC provider or dedicated service account, remove its `roles/iam.workloadIdentityUser` binding and/or remove its project Rules Admin binding. Previously issued access tokens may last up to five minutes. Remove the rules workflow permission/environment afterward; do not remove the existing Firebase service agents or authentication provider.

Codex Cloud needs only its existing repository access. After verified activation, ordinary compatible rules changes follow branch → PR/tests/review → main/tests → OIDC rules publish/read-back → Pages → live smoke. Until that activation is recorded, authenticated rules publication remains a release prerequisite.
