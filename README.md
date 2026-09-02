# Budget AI Instructions Plugin

This repository is an Agent Plugins 1.0 package containing model-agnostic coding guidance for GitHub Copilot, Copilot CLI, Claude, and other compatible coding agents. Portable skills live under `skills/`; Copilot-specific always-on rules live under `com.github.copilot/rules/`.

## Repository Layout
- plugin.json: portable Agent Plugins manifest.
- .claude-plugin/marketplace.json: marketplace catalog for Claude-compatible marketplace clients.
- skills/: portable, on-demand coding skills.
- com.github.copilot/rules/: Copilot-specific always-on rules.
- docs/: static GitHub Pages catalog and installation site.
- infrastructure/: architecture reference documentation.
- backend/, frontend/, and tools/: domain indexes and reference guidance.

## Install In VS Code

Install the plugin directly from GitHub with **Chat: Install Plugin From Source**, or configure this repository as a marketplace:

```jsonc
"chat.plugins.marketplaces": [
   "tyler-technologies/budget-ai-instructions"
]
```

Open Extensions, filter by `@agentPlugins`, and install `budget-ai-instructions`. VS Code caches the installed plugin and checks for updates through **Extensions: Check for Extension Updates** or automatic extension updates.

For a local checkout, register it with:

3. **Add or merge** the following, replacing the path with your actual clone location:
```jsonc
"chat.pluginLocations": {
   "/path/to/budget-ai-instructions": true
}
```

Verify by opening any coding workspace and asking the agent which relevant skills are available.



![instructions settings](public/images/image.png)


## Compatibility

The root `.instructions.md` remains as a legacy user-instruction entry point for existing setups. New installations should use the plugin manifest; plugin-installed skills are copied into the agent's local cache and do not require this repository to remain open.

## Release Process

There is no separate release pull request. Include the patch version bump in the same pull request as the skill or documentation change, for example `1.0.2` to `1.0.3` in `plugin.json`. The normal CODEOWNER review covers the complete change.

After that pull request is merged into `main`, the release workflow creates the matching tag and GitHub Release, builds the Pages catalog, and deploys GitHub Pages. A release fails if the version tag already exists for a different commit.


## How To Add A New Skill
Below are a few resources for learning about skills.  Fortunately, skills are used universally, but the syntax might differ slightly depending on the model.  This respository is model-agnostic, (for now) our license for Github Copilot has multiple models.  

>Note: If you are developing a skill for this repository, try to make it as model-agnostic as possible.

**OpenAI** - https://openai.com/academy/skills/?utm_source=chatgpt.com
**Anthropic/ Claude** - https://claude.com/skills

1. Create a focused subfolder under `skills/` and add `SKILL.md`.
3. Include YAML frontmatter with at least:
   - name
   - description
   - argument-hint
4. Keep scope narrow and actionable - single topics
5. Ensure the folder name and frontmatter `name` match and are unique across the plugin.
6. Update the relevant domain README and the Copilot rule's skill index.

Coding agents are particularly good at creating skills for themselves, especially when basing it off of something within our codebase.  The easiest way to create them is to ask an agent to generate one with guidance.  The skills here were all agentically generated.

## Skill Verification Prompts
Use these prompts in Copilot Chat to validate skill routing.

### Backend
- I need a C# unit test for an EF Core manager with PostgreSQL. What is the standard transactional test pattern?
- I am adding a BFF endpoint that writes to two services. How should compensating rollback be implemented?
- How should backend feature flags be evaluated through the BFF in this ecosystem?

### Frontend
- How should frontend feature flags be loaded and consumed in Angular while keeping evaluation through the BFF?
- I am adding an Angular NgRx feature. What are the required actions/effects/reducer/selector conventions?
- Should I use shareReplay on NgRx selector streams, and what cleanup pattern is expected?

### Infrastructure
- What are the required environments, regions, deployment, and config defaults for this platform?
- Which docs should I use to understand snapshot and restore behavior?

### Tools
- What command safety checks should I follow before running build or migration scripts?

## Customizing Agent Personality

The `## Agent Personality` section at the bottom of `.instructions.md` is an optional block for giving
the model a team-specific tone or persona. It is commented out by default.

**When to use it:** Claude models (e.g. `Claude Sonnet`, `Claude Opus`) respond especially well to
explicit persona instructions. If you use Claude as the primary model in VS Code Copilot,
filling this section in can make responses feel more consistent with your team's preferred style.

**How to fill it in:**

1. Open `.instructions.md` and locate the `## Agent Personality` section at the bottom.
2. Replace the placeholder lines with your team's preferences. Example:
   ```
   ## Agent Personality
   - Tone: direct and concise
   - Voice: senior engineer peer — skip preamble, lead with the answer
   - Avoid: excessive caveats, marketing language, and emojis
   ```
3. Save the file and reload the VS Code window (`Ctrl+Shift+P` → *Reload Window*).

> **Note:** These instructions apply to all models that load the file, not just Claude. If a
> setting produces unwanted results with a different model, comment it out or remove it.

## Troubleshooting Skill Activation
- If responses are generic, ensure the .vscode *user* settings were updated, not the local workspace (this file lives in `C:\Users\%user.name%\AppData\Roaming\Code\User\settings.json`)
- Check VS Code user `settings.json` for a `chat.instructionsFilesLocations` entry pointing to this repo.
- Reload the VS Code window after any settings change.
- If a specific skill does not trigger, include domain keywords from that skill description.
- If paths changed, update .instructions.md Skill Index and domain README entries.
