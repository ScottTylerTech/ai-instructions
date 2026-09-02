---
name: command-safety
description: 'Checklist for safe command and script execution in repositories. Use when proposing terminal commands, editing automation scripts, or designing repeatable local/CI workflows.'
argument-hint: 'Describe the command flow or script to review'
---

# Command Safety

## When To Use
- Running multi-step shell command sequences.
- Creating or modifying repo scripts.
- Translating manual steps into automation.
- Reviewing risky commands before execution.

## Safety Checklist
- Prefer non-destructive commands by default.
- State working directory assumptions before execution.
- Validate prerequisites and required tools first.
- Avoid interactive prompts in automated flows.
- Add clear failure checks after critical steps.
- Keep commands idempotent where possible.

## Script Hygiene
- Use explicit environment variables and sane defaults.
- Quote variable expansions to avoid whitespace issues.
- Emit concise logs that show step boundaries.
- Separate dry-run and apply modes when relevant.

## Output Expectation
Return an execution plan with prerequisites, safe command order, and rollback or recovery steps.
