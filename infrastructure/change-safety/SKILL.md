---
name: change-safety
description: 'Checklist for safe infrastructure-impacting changes. Use when touching environments, regions, deployment flows, Consul config, Terraform workspaces, or cross-service dependencies.'
argument-hint: 'Describe the infra-affecting change'
---

# Infrastructure Change Safety

## When To Use
- Updating deployment or environment configuration.
- Changing service connectivity or runtime settings.
- Modifying Terraform-backed resources.
- Planning rollout and rollback for platform changes.

## Safety Checklist
- Identify affected environments: eccci, eccqa, eccprod.
- Confirm region implications: us-west-2 and us-east-1.
- Verify deployment path and ownership in Argo.
- Validate Consul config sources and key naming.
- Check Terraform workspace/state impact before apply.
- Define rollout, verification, and rollback steps.

## Dependency Awareness
- Review service topology in infrastructure/CODEBASE_MAP.md.
- Review snapshot implications in infrastructure/snapshots/SNAPSHOTS.md when data behavior changes.

## Output Expectation
Return impact analysis, pre-deploy checks, rollout steps, and rollback triggers.
