---
name: local-docker-build
description: 'Build a budget service Docker image, push it to scratch, update docker-compose to use the new image, and restart the local stack. Use when the user wants to test local code changes in Docker.'
argument-hint: 'Service repo path and last used version string'
---

# Local Docker Build and Deploy

Use this skill when building a service locally and deploying it into the local docker-compose stack.

## When to Use
- Testing local code changes in the full docker-compose stack
- Building and pushing a new scratch image after code edits
- Updating docker-compose to point to a newly built image
- Restarting the local environment after image changes

## Step 1 — Increment the version

Version format: SemVer 2.0.0. The usual repository format is
`0.0.1-TPB{ticket}.{increment}`.

- Ask the user for the last version if unknown, or check session context.
- Increment only the final integer (e.g. `.7` → `.8`).
- If the user supplies a unique identifier that is not itself SemVer (for example,
  `CG.1`), preserve it as a SemVer prerelease identifier: `0.0.0-CG.1`.
- Use the resulting normalized version for the application image and append `-db`
  for the database migration image.
- If a build fails without pushing, retry with the same version before incrementing.

## Step 2 — Build and push

Run from the service repository's `build-scripts/` directory:

```bash
cd build-scripts && ./build.sh --no-clone --push-app --push-database --push-nuget --version-override <version>
```

- `--no-clone` keeps the repository's checked-out shared build scripts in place.
- `--push-database` is required when the Compose stack has a database migration
  service that consumes the `-db` image.
- Check exit code. A non-zero exit means the build failed and the image was **not** pushed.
- Common failure: Docker image export canceled — retry once before incrementing.

## Step 3 — Update docker-compose

File: `budget-dev-env-compose/docker-compose/docker-compose.yml`

Each service has two image lines — a default local image and a commented-out scratch image:

```yaml
  budget-config-api:
    image: budget-config-api:local
    # To use a scratch image, run the build script for the service or app, then comment out the image above and uncomment the image below, replacing the version accordingly
    # image: tylertech-scratch-docker-local.jfrog.io/budget-config-api:<version>
```

To switch the service to your scratch build:
1. Comment out the `image: {service}:local` line
2. Uncomment the scratch `image:` line and replace `<version>` with the new version

For services with a database migration companion, update both image references:

```yaml
  budget-config-api:
    image: tylertech-scratch-docker-local.jfrog.io/budget-config-api:0.0.0-CG.1

  budget-config-api-dbmigration:
    image: tylertech-scratch-docker-local.jfrog.io/budget-config-api:0.0.0-CG.1-db
```

Result:
```yaml
  budget-config-api:
    # image: budget-config-api:local
    # To use a scratch image, run the build script for the service or app, then comment out the image above and uncomment the image below, replacing the version accordingly
    image: tylertech-scratch-docker-local.jfrog.io/budget-config-api:0.0.0-CG.1
```

If the scratch line is already uncommented (user previously switched it), just update the version string in place.

## Step 4 — Restart the stack

### Take down
```bash
cd budget-dev-env-compose/docker-compose
docker compose -f docker-compose.yml -f docker-compose.arm64-mac.yml --profile everything down
```

Wait for `down` to succeed and verify the service containers are stopped before
starting the stack. Never run `up` against the old stack as a substitute for
tearing it down first.

### Bring back up (default — PC/Linux)
```bash
./startup.sh everything
```

> **macOS arm64 override**: use the following command instead of `startup.sh`:
```bash
docker compose -f docker-compose.yml -f docker-compose.arm64-mac.yml --profile everything up -d
```
