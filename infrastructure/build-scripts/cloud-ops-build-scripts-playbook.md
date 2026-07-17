# Cloud Ops Repository Build Scripts Reference

This document describes the actual repository build scripts used for cloud/CI-style builds.

It intentionally excludes local machine orchestration helpers and focuses on per-repo build behavior.

## Source Scripts Reviewed

Normal service examples:
- [enlistments/budget/budget-api/build-scripts/build.sh](enlistments/budget/budget-api/build-scripts/build.sh)
- [enlistments/budget/budget-business-api/build-scripts/build.sh](enlistments/budget/budget-business-api/build-scripts/build.sh)
- [enlistments/budget/budget-config-api/build-scripts/build.sh](enlistments/budget/budget-config-api/build-scripts/build.sh)
- [enlistments/budget/budget-scorecard-svc/build-scripts/build.sh](enlistments/budget/budget-scorecard-svc/build-scripts/build.sh)
- [enlistments/budget/budget-document-svc/build-scripts/build.sh](enlistments/budget/budget-document-svc/build-scripts/build.sh)
- [enlistments/budget/budget-operating-orchestrator-svc/build-scripts/build.sh](enlistments/budget/budget-operating-orchestrator-svc/build-scripts/build.sh)
- [enlistments/budget/budget-dashboard-app/build-scripts/build.sh](enlistments/budget/budget-dashboard-app/build-scripts/build.sh)
- [enlistments/budget/budget-cip-app/build-scripts/build.sh](enlistments/budget/budget-cip-app/build-scripts/build.sh)
- [enlistments/budget/budget-user-management/build-scripts/build.sh](enlistments/budget/budget-user-management/build-scripts/build.sh)

Lambda/exception examples:
- [enlistments/budget/budget-prov-pkg-lambda/build-scripts/build.sh](enlistments/budget/budget-prov-pkg-lambda/build-scripts/build.sh)
- [enlistments/budget/budget-tds-lambda/build-scripts/build.sh](enlistments/budget/budget-tds-lambda/build-scripts/build.sh)
- [enlistments/budget/tin-mockfilescan-lambda/build-scripts/build.sh](enlistments/budget/tin-mockfilescan-lambda/build-scripts/build.sh)

## Canonical Build Script Patterns

### Pattern A: Wrapper Script That Bootstraps Shared Build Engine

Used by:
- Most normal services (APIs, SVCs, orchestrators, and apps)
- [enlistments/budget/budget-prov-pkg-lambda/build-scripts/build.sh](enlistments/budget/budget-prov-pkg-lambda/build-scripts/build.sh)
- [enlistments/budget/budget-tds-lambda/build-scripts/build.sh](enlistments/budget/budget-tds-lambda/build-scripts/build.sh)
- [enlistments/budget/budget-api/build-scripts/build.sh](enlistments/budget/budget-api/build-scripts/build.sh)
- [enlistments/budget/budget-business-api/build-scripts/build.sh](enlistments/budget/budget-business-api/build-scripts/build.sh)
- [enlistments/budget/budget-scorecard-svc/build-scripts/build.sh](enlistments/budget/budget-scorecard-svc/build-scripts/build.sh)

How it works:
1. Defines repo-specific constants:
	- REPO_NAME
	- DOCKERFILE_DIRECTORY
	- default forced ARGS
2. Optionally clones shared script package from `eco-shared-resources` (repo-specific pinned branch).
3. Copies shared script files into local `build-scripts`.
4. Sources `arg-parsing-parameter-replacement.sh` to inject repo identity defaults.
5. Sources `build-internal.sh` to execute the real build pipeline.

Important behavior:
- `--no-clone` skips refreshing shared scripts and uses local copies as-is.
- Normal services mostly pin shared engine branch `v1`.
- Lambda wrappers may point at a different shared engine branch (for example `v4`).
- Most build semantics come from the shared `build-internal.sh`, not the wrapper itself.

## Normal Service Script Defaults (Primary Path)

Most non-lambda services follow the wrapper + shared engine model with repo-specific forced ARGS.

Common normal-service arg profiles seen:

1. API/service with DB image:
- Example: [enlistments/budget/budget-api/build-scripts/build.sh](enlistments/budget/budget-api/build-scripts/build.sh)
- Defaults: `--app --database`

2. Service with DB but no tests by default:
- Example: [enlistments/budget/budget-config-api/build-scripts/build.sh](enlistments/budget/budget-config-api/build-scripts/build.sh)
- Example: [enlistments/budget/budget-scorecard-svc/build-scripts/build.sh](enlistments/budget/budget-scorecard-svc/build-scripts/build.sh)
- Defaults: `--app --no-tests --database`

3. Service without DB/terraform in default path:
- Example: [enlistments/budget/budget-document-svc/build-scripts/build.sh](enlistments/budget/budget-document-svc/build-scripts/build.sh)
- Example: [enlistments/budget/budget-operating-orchestrator-svc/build-scripts/build.sh](enlistments/budget/budget-operating-orchestrator-svc/build-scripts/build.sh)
- Defaults: `--app --no-terraform --no-tests`

4. Web app style service:
- Example: [enlistments/budget/budget-dashboard-app/build-scripts/build.sh](enlistments/budget/budget-dashboard-app/build-scripts/build.sh)
- Example: [enlistments/budget/budget-cip-app/build-scripts/build.sh](enlistments/budget/budget-cip-app/build-scripts/build.sh)
- Example: [enlistments/budget/budget-user-management/build-scripts/build.sh](enlistments/budget/budget-user-management/build-scripts/build.sh)
- Defaults: `--app --no-tests --web-only`

What this means operationally:
- For normal services, the wrapper is primarily a policy shim that decides which shared-engine targets are on/off by default.
- Cloud behavior is therefore mostly encoded in shared build scripts plus the repo's ARGS defaults.

## Lambda Script Defaults (Exception Path)

Lambdas are exceptions mainly in two ways:

1. Wrapper defaults are tuned for lambda packaging (`--web-only --no-tests` in several repos).
2. Some lambda repos use newer shared engine branch versions than normal services.

The repo-level control surface is still the same build.sh wrapper pattern.

### Pattern B: Argbash Monolithic Build Script

Used by:
- [enlistments/budget/tin-mockfilescan-lambda/build-scripts/build.sh](enlistments/budget/tin-mockfilescan-lambda/build-scripts/build.sh)

How it works:
1. Parses rich CLI arguments (Argbash-generated).
2. Resolves environment-variable fallbacks for Docker and NuGet auth.
3. Computes version from git metadata unless overridden.
4. Runs target-based docker builds.
5. Optionally runs tests, pushes artifacts, and performs cleanup.

Important behavior:
- Contains explicit TeamCity and GitHub Actions integration output.
- Supports partial push combinations with validation/warnings.
- Handles registry login/logout directly.

## Shared Capability Model Across Repos

Regardless of pattern, these capabilities are consistent:

1. Docker target-based build execution.
2. Versioning from git context or explicit override.
3. Build metadata labels on produced images.
4. Optional push and test execution paths.
5. CI-oriented status signaling.

## Typical Docker Targets

Targets commonly referenced by repo scripts:

- `final` or app runtime image
- `pack` (NuGet package build)
- `test` (test execution image)
- `database` (db execution/validation image)
- `terraform` (infra helper image)

Which targets are built depends on script flags and repo defaults.

## Credentials and Environment Contract

Common variables consumed by these repo build scripts:

Docker auth and registries:
- `DOCKER_PULL_REGISTRY`
- `DOCKER_PULL_USERNAME`
- `DOCKER_PULL_PASSWORD`
- `DOCKER_PUSH_REGISTRY`
- `DOCKER_PUSH_USERNAME`
- `DOCKER_PUSH_PASSWORD`
- `ARTIFACTORY_PULL_REGISTRY`
- `ARTIFACTORY_PUSH_REGISTRY`
- `ARTIFACTORY_USERNAME`
- `ARTIFACTORY_PASSWORD`

NuGet:
- `NUGET_REGISTRY`
- `NUGET_USERNAME`
- `NUGET_PASSWORD`
- `NUGET_API_KEY`

Build scripts also support fallback chains, so Artifactory credentials may be reused for multiple auth contexts.

## Versioning and Tagging Behavior

Common behavior observed:

1. Determine short and long git commit SHA.
2. Determine branch/detached-head context.
3. Derive semver from git tags unless overridden.
4. Build using commit-tag images and optionally semver tags.

For explicit local tagging workflows, direct Docker build with `--build-arg VERSION=<semver>` and tag output is compatible with these Dockerfiles.

## CI Integration Semantics

TeamCity integration includes:
- build number output
- build problem markers on failure

GitHub Actions integration includes:
- exported version metadata env vars
- error channel output on failures

This allows repo scripts to be used as first-class CI entrypoints.

## Known Build-Failure Class: NuGet Audit + Warnings as Errors

Observed behavior in cloud-style build path:

1. `dotnet restore` can fail with `NU190x` vulnerability advisories.
2. Failure occurs when project config treats warnings as errors.

Observed project example:
- [enlistments/budget/budget-prov-pkg-lambda/Tyler.Budget.ClientProvisioning.PackageCreation/Tyler.Budget.ClientProvisioning.PackageCreation.csproj](enlistments/budget/budget-prov-pkg-lambda/Tyler.Budget.ClientProvisioning.PackageCreation/Tyler.Budget.ClientProvisioning.PackageCreation.csproj)

Interpretation:
- This is repository policy/dependency state, not Docker daemon instability.

## Cloud Ops Interaction Guidance

Use this approach when working with repo cloud build scripts:

1. Start at repo `build-scripts/build.sh` and identify whether it is wrapper or monolithic.
2. If wrapper-based, inspect forced `ARGS` first. This is the fastest way to understand default cloud build behavior for that repo.
3. Confirm shared engine branch pinned by wrapper clone command (`v1`, `v4`, etc.).
4. Determine whether to refresh shared scripts or run `--no-clone`.
5. Confirm required credential env vars before running.
6. Choose explicit target/test/push flags rather than relying on defaults.
7. On restore/build failures, check package policy (`TreatWarningsAsErrors`, `CodeAnalysisTreatWarningsAsErrors`) and dependency advisories first.

## Quick Reference: What to Read First in a Repo

When onboarding a new repo, inspect in this order:

1. `build-scripts/build.sh`
2. Any arg parsing helper files under `build-scripts`
3. Repo Dockerfile stages under the configured `DOCKERFILE_DIRECTORY`
4. Primary `*.csproj` warning/error policy fields
5. Any repo-specific deploy/test scripts invoked by final image entrypoint

## Suggested Next Step

Add a per-repo matrix section over time with:

1. Repo name
2. Build pattern (wrapper or monolithic)
3. Required env vars
4. Default forced args
5. Built Docker targets
6. Push/test default behavior
7. Known failure signatures
