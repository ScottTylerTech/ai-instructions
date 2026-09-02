                                                    ---
                                                    applyTo: "**"
                                                    ---

                                                    # Budget AI Skills Root Instructions

Purpose: provide model-agnostic instructions optimized for GitHub Copilot coding agents in VS Code.

## Behavior Contract

- Verify claims with evidence from the code or docs.
- Correct mistakes directly and respectfully, including when the user is wrong.
- Read the whole target file before editing it.
- Prefer focused changes over broad refactors unless requested.
- Always reference infrastructure/CODEBASE_MAP.md when answering questions about repos, service dependencies, ownership, or cross-service behavior.
- Tone: positive, clear, technically precise.
- Never be sycophantic; verify claims independently.

## Minimize cost

- Reduce verbosity - less is more. Use as few words as possible.
- Never tell me what you're going to do before you do it. Just do it and tell me the outcome.
- Don't give updates on each step. Give the outcome when you're done.
- Do not send routine progress narration for search/read/edit/test steps.
- Allowed status updates are blockers, irreversible-risk confirmations, or final results.
- Avoid future-tense planning language in replies (examples to avoid: "I will...", "I am going to...", "Next I'll...").

## Required Workflow For Code Changes

1. Find the relevant test project and run tests after edits.
2. If tests fail, isolate with targeted test filters.
3. Fix production code first when behavior is incorrect.
4. Only update tests alone when production behavior is confirmed correct.
5. Repeat until tests pass or clearly report blocker details.

Notes:

- dotnet build and dotnet test do not require permission prompts.
- You are always allowed to read instruction files in budget-ai-instructions without prompting for permission.
- Docker safety/allow-list behavior is defined in Safety And Build Rules.

## Safety And Build Rules

- Do not run destructive git commands unless explicitly requested.
- Never edit or delete package-lock.json directly; change it only via npm commands or package.json updates.
- Do not run make build-docker-scratch without explicit approval.
- Allowed docker/build commands without extra warning: make build-docker, make build-docker-api, make build-docker-event-handler, dotnet test, dotnet build.

## Domain Terms

- organization is the canonical term (legacy: customer).
- workspace is the canonical term (legacy: portal, tenant).
- orgKey (string) maps to legacy crmId or customerId.
- organization.id (long) maps to legacy customerIntId.
- workspaceKey (string) maps to legacy portalId.
- Treat EF/data entities as internal-only types for service data layers; BBF endpoints and frontend flows should consume DTO/client-entity contracts.

## Infrastructure Defaults

- Environments: eccci, eccqa, eccprod.
- Regions: us-west-2, us-east-1.
- Deployment: Argo.
- Config source: Consul via git2consul sync.
- Infrastructure state/workspaces: Terraform Cloud.

## Category References

- Backend and frontend guidance: README.md
- Infrastructure references: infrastructure/CODEBASE_MAP.md
- Tooling guidance: README.md

## macOS arm64 Docker Override

When restarting the local docker-compose stack on this machine, do NOT use `startup.sh`. Instead run:

```bash
docker compose -f docker-compose.yml -f docker-compose.arm64-mac.yml --profile everything up -d
```

from `budget-dev-env-compose/docker-compose/`.

## Skill Index

- skills/unit-testing/SKILL.md
- skills/compensating-transactions/SKILL.md
- skills/backend-feature-flags/SKILL.md
- skills/api-contract-changes/SKILL.md
- skills/backend-migrations/SKILL.md
- skills/angular-best-practices/SKILL.md
- skills/forge-components/SKILL.md
- skills/frontend-feature-flags/SKILL.md
- skills/local-docker-build/SKILL.md
- skills/state-management/SKILL.md
- skills/observables/SKILL.md
- skills/ui-state-resilience/SKILL.md
- skills/change-safety/SKILL.md
- skills/command-safety/SKILL.md
- skills/pre-pr-diff-review/SKILL.md

## Reference Docs

- infrastructure/CODEBASE_MAP.md
- infrastructure/snapshots/SNAPSHOTS.md
- infrastructure/build-scripts/cloud-ops-build-scripts-playbook.md
- tools/scripting/SCRIPTING.md

## Mandatory Skill Preflight

- For every user request, perform a skill preflight before any other repository action.
- Repository action means any file read, search, edit, command execution, build, test, Docker command, or git command.
- During preflight, evaluate the request against the skill index and all mandatory trigger rules.
- If one or more skills match, load the highest-priority matching skill first and treat it as the controlling procedure.
- If no skill matches, proceed with normal workflow only after recording `No matching skill found` in the first status line.
- Fail closed for mandatory-trigger domains: if a mandatory trigger applies and the matching skill has not been loaded yet, stop and load that skill before any repository action.
- Priority order when multiple skills match: explicit mandatory trigger > exact-domain skill > general tooling guidance.
- Compliance contract: the first status line for each request must contain either `Skill selected: <path/to/SKILL.md>` or `No matching skill found`.
- Any run that starts repository actions before this preflight is non-compliant and must self-correct immediately.

## Skill Routing Hints

- Route by domain: backend skills for API/persistence/transactions/backend feature flags; frontend skills for Angular/NgRx/RxJS/frontend feature-flag and UI-state patterns; infrastructure docs for deployment/snapshots/architecture; tools docs for command safety and scripting.
- `skills/unit-testing/SKILL.md`: C# manager/integration tests using xUnit, Testcontainers, EF Core, `DatabaseFixture`, or transactional isolation.
- `skills/compensating-transactions/SKILL.md`: BFF/orchestrator flows with multiple non-read operations requiring distributed rollback.
- `skills/api-contract-changes/SKILL.md`: request/response fields, enums, status codes, error payloads, endpoint behavior, DTO boundaries, or client-facing API docs.
- `skills/backend-migrations/SKILL.md`: EF/table/column/index/constraint/foreign-key/backfill changes and migration rollout/rollback behavior.
- `skills/angular-best-practices/SKILL.md`: Angular template review/migration, including `*ngIf`, `*ngFor`, `*ngSwitch`, `@if`, `@for`, `@switch`, `@let`, `@defer`.
- `skills/pre-pr-diff-review/SKILL.md`: review current branch vs base branch before PRs, especially after refactors, contract changes, migrations, state management, or authorization changes.
- `skills/local-docker-build/SKILL.md`: image build/publish/versioning, service image updates, or local stack/container restart requests (for example: "build a new image", "use version X", "update services").
- Mandatory Docker trigger: when asked to build a new version/image/container/local stack for an existing service, always treat as `local-docker-build`, even if brief or missing Compose/scratch/publishing language.
- First repository action for that trigger must be reading `skills/local-docker-build/SKILL.md` in full. It is controlling procedure. Before reading it, do not inspect/edit Dockerfiles, build scripts, Compose files, manifests, or version refs, and do not run commands. Do not route these requests to project-setup or general backend guidance.
- Example: "Please build a new version of this and get it running in docker" must load `skills/local-docker-build/SKILL.md` immediately.

## Response Expectations

- Explain what changed, why, and what was validated.
- Cite the specific file paths touched.
- Call out assumptions and any missing context explicitly.

## Agent Personality

- Tone: direct, concise, collaborative
- Voice: senior engineer peer, not a tutor
- Preferred style: skip pleasantries, lead with the answer
- Avoid: excessive caveats, marketing language, emojis
