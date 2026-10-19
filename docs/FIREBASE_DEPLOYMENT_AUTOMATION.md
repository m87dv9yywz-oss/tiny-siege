# Firebase rules deployment: blocked investigation

Status: NOT AUTOMATED. No Firebase deployment identity, IAM grant, OIDC provider, key, token, repository variable, or production workflow change was made by this investigation.

## Absolute operating boundaries

Use only the existing tiny-siege-game project, default Firestore database, Spark plan with billing disabled, and existing GitHub Pages hosting. Never enable billing or Blaze to finish this task. Never substitute a service-account private key or administrator refresh token. Do not modify profiles, Auth providers, other Firebase services or unrelated projects.

## Release candidate verified

PR #5 remains open, unmerged, at 2deb8ee0203b3baf6e37f8694be6bd9afd82799a.
Its firestore.rules blob is c6be375ae8402abcd26a3e023369de231fca7409.
CI https://github.com/m87dv9yywz-oss/tiny-siege/actions/runs/38486732911 completed successfully.
The connector verified successful gameplay, actual Auth/Firestore emulator and multi-browser cloud-save, browser, balance and build steps. Pages deployment was skipped for the PR.
The rules support schema 1 and schema 2 and reject downgrade writes; maximum-bound legacy/new profiles and malformed writes are covered.

Production publication is NOT confirmed. The cloud browser redirected Firebase Console to Google sign-in, which returned 502 Bad Gateway / Connection refused, including after one reload. No authenticated Firebase MCP or Google Cloud tool is exposed in this session. Current production rules, rollback ruleset, database edition, billing and Auth provider state could not be read. Do not treat this document as permission to merge PR #5.

## No-billing prerequisite blocker

Google's official deployment-pipelines federation guide:
https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines

Under Configure Workload Identity Federation, the documented prerequisites say:
"Verify that billing is enabled for your Google Cloud project."
They also require IAM, Resource Manager, Service Account Credentials and Security Token Service APIs.

This is a documented setup prerequisite, not a measured API rejection from tiny-siege-game. Project-specific support without billing is unverified because administrative access is unavailable. IAM being no-cost does not establish that these setup prerequisites can be satisfied on Spark. Under the user's instructions, stop federation configuration here; do not enable billing, create another project or claim permanent automation works.

The Firebase CLI documents Application Default Credentials support:
https://firebase.google.com/docs/cli
Google documents federation-generated ADC configuration for client libraries. No real GitHub runner federation login or authenticated rules deployment/read-back was possible, so end-to-end compatibility is unproven.

## Current release process and troubleshooting

The existing deploy.yml is unchanged. PRs run all existing tests and cannot publish Firebase rules. Main reruns validation, deploys Pages and runs production-smoke.js; it currently does NOT automate Firestore rules publication.

For PR #5, obtain authenticated administration access; recheck latest PR head and green CI; record current production rules/release for rollback; publish only exact tested firestore.rules to tiny-siege-game/default; read back and compare source (only an editor-added final newline may be normalized); verify Spark, data and providers unchanged; post evidence to PR #5. Leave game release to Codex Cloud. Do not log credentials.

Ordinary future rules changes still need authenticated publication. Preserve the live schema during transitions. An incompatible schema needs an explicitly staged migration; never overwrite player data to force compatibility.

## Requirements if no-billing support is authoritatively established later

Resume only with documented support for the existing unbilled project. Use a dedicated tiny-siege-rules-deployer service account with roles/firebaserules.admin only, and roles/iam.workloadIdentityUser on that account for the narrowly trusted federated identity. Confirm effective role permissions against the official IAM role definition before granting.

Trust immutable repository ID 1417141926 and owner ID 326222032, exact repository m87dv9yywz-oss/tiny-siege, refs/heads/main, the intended production workflow path, permitted release events and protected production environment. Deny PRs, forks and other branches/workflows. No production access belongs in PR jobs.

Implement on a separate branch and preserve every current test. Required order: full tests/build → short-lived OIDC authentication → rules-only publication to the explicit project → exact active rules read-back → Pages deployment → existing live-game browser check. Serialize production releases without cancelling a publication midway. Include rollback evidence and fail closed at every stage. Pin dependencies/actions appropriately and mask tokens. If the CLI needs privileges beyond Rules Admin, use official Rules REST create/release/get APIs instead of widening IAM.

Do not activate or merge implementation until a real runner has authenticated, published a known validated compatible ruleset and verified read-back, without changing game hosting or profiles.

## Revocation

No new access exists to revoke from this investigation. If federation is later established, revoke the service account's workloadIdentityUser binding and Rules Admin grant and disable its provider/account; stop the Firebase release job. Do not substitute permanent credentials. Retain rollback ruleset references and require authenticated rules verification before Pages releases.
