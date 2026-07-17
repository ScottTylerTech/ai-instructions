# CLAUDE.md (optimized)

## 1) Behavior Contract

- Never be sycophantic. Verify claims independently.
- If user is wrong, correct directly and respectfully.
- Always review the entire file before making changes.

## 2) Mandatory Post-Change Workflow

Run after every code change.

1. Find test project (usually <repo>.Test or Tyler.<repo>.Test) and run dotnet test.
2. If failures occur, isolate with dotnet test --filter.
3. Decide root cause:
   - Production code wrong: fix production code first.
   - Test wrong: only then fix test; explicitly tell user why.
   - Never change only tests without evaluating production correctness.
4. If Makefile has test-middleware target, run make test-middleware too.
5. Repeat until all tests pass.

Notes:

- dotnet build and dotnet test do not require permission prompts.
- Never run make build-docker-scratch without explicit user approval.
- Allowed docker targets (without special warning): make build-docker, make build-docker-api, make build-docker-event-handler.
- Never edit or delete package-lock.json directly. Change via npm commands or package.json updates only.

## 3) Domain Snapshot

- TCP model:
  - organization contains one or more workspaces.
  - workspace == portal == tenant (legacy synonyms).
  - each workspace maps to one subdomain / cloud tenant.
- Budget:
  - Product on TCP used for operating and capital budgeting.
  - Tipe libraries are shared foundations currently used by Budget.

## 4) Canonical Terminology (use in new code)

- organization -> legacy: customer
- workspace -> legacy: portal, tenant
- orgKey (string) -> legacy: crmId, customerId
- organization.id (long) -> legacy: customerIntId
- workspaceKey (string) -> legacy: portalId
- workspace.id (long) -> no canonical legacy alias

## 5) Environment + Infra Defaults

- Environments: eccci, eccqa, eccprod
- Regions: us-west-2, us-east-1
- Deployment: Argo
- Config: Consul (git2consul sync)
- Infra state/workspaces: Terraform Cloud

## 6) Required Reference Files

- Codebase dependency and repo map: ~/.claude/CODEBASE_MAP.md
- Snapshot/provisioner/tenant-management context: ~/.claude/SNAPSHOTS.md
- When working with build scripts, reference context ~/.claude/cloud-ops-build-scripts-playbook.md

## 7) Filename-Class Consistency Rule

- For single-class files, filename must match contained class name.
- Multi-class files may be skipped.
