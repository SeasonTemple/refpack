# modern-ref-pack

`modern-ref-pack` is a TypeScript CLI for installing agent skills from local packs, remote sources, or static registries. It follows the same broad pattern as modern developer-tool installers: discover installable units, show an install plan, copy selected files safely, and keep dependency installation explicit.

## What It Does

- Initializes project config with a target skills directory and optional registry.
- Searches and views skills from a static JSON registry.
- Installs one skill, multiple named skills, or all skills from a pack.
- Supports dry runs and install diffs before writing files.
- Preserves existing installed skills unless overwrite is explicit.
- Displays adapter-specific setup instructions without mutating agent config files.
- Keeps npm dependency installation opt-in.

## Requirements

- Node.js 20 or newer
- npm

## Setup

Install dependencies and build the CLI:

```bash
npm install
npm run build
```

Run tests:

```bash
npm test
```

Run TypeScript type checking without writing `dist`:

```bash
npm run typecheck
```

## Quick Start

The example registry points at `examples/basic-skill-pack`.

```bash
node dist/cli.js init --target ./.tmp-installed --registry ./examples/registry.json
node dist/cli.js search browser
node dist/cli.js view browser-agent
node dist/cli.js add browser-agent --dry-run
node dist/cli.js add browser-agent --yes
node dist/cli.js list --target ./.tmp-installed
node dist/cli.js remove browser-agent --yes --target ./.tmp-installed
```

After publishing or linking the package, the binary name is `skills`:

```bash
skills init --target ~/.codex/skills --registry ./examples/registry.json
skills search browser
skills add browser-agent --dry-run
skills add browser-agent --yes
```

## Commands

```text
skills init
skills add <source-or-id> [skills...]
skills search [query]
skills list
skills view <id>
skills remove <id>
skills info
```

## Installing From Sources

Install by registry id:

```bash
skills add browser-agent --yes
```

Install from a local pack:

```bash
skills add ./examples/basic-skill-pack --target ~/.codex/skills --all
```

Install from a remote source supported by the source resolver:

```bash
skills add gh:your-org/agent-skills --target ~/.codex/skills --all
```

Preview writes before installing:

```bash
skills add browser-agent --dry-run
skills add browser-agent --diff
```

Overwrite an existing installed skill only when intended:

```bash
skills add browser-agent --overwrite --yes
```

## Safety Model

- No target directory is guessed. Pass `--target` or run `skills init`.
- Existing skill directories are blocked by default.
- `--dry-run` prints the install plan without writing files.
- Skill `source` and `target` paths must be relative and cannot escape their base directories.
- Dependency installation only runs with `--install`.
- Package-manager lifecycle scripts stay disabled unless `--allow-scripts` is passed.
- Adapter config instructions are printed as text. The CLI does not rewrite Codex, Claude, MCP, or runtime config files.

## Skill Pack Format

Every pack contains a `skills.json` file:

```json
{
  "schemaVersion": "1.0",
  "name": "basic-skill-pack",
  "skills": [
    {
      "id": "browser-agent",
      "name": "Browser Agent",
      "description": "Automates browser workflows",
      "source": "skills/browser-agent",
      "target": "browser-agent",
      "adapters": ["codex"],
      "configInstructions": [
        {
          "adapter": "codex",
          "instructions": "Restart Codex to load this skill."
        }
      ]
    }
  ]
}
```

See [docs/skill-pack-format.md](docs/skill-pack-format.md) for all supported fields.

## Registry Format

Registries are static JSON documents:

```json
{
  "schemaVersion": "1.0",
  "name": "example",
  "skills": [
    {
      "id": "browser-agent",
      "name": "Browser Agent",
      "description": "Automates browser workflows",
      "source": "./examples/basic-skill-pack",
      "manifestPath": "skills.json",
      "tags": ["browser", "automation"],
      "adapters": ["codex"]
    }
  ]
}
```

See [docs/registry-format.md](docs/registry-format.md) for details.

## Development Notes

Project layout:

```text
src/commands/     CLI command handlers
src/flow/         Add/install orchestration
src/install/      Install planning, file copying, dependency install
src/manifest/     skills.json validation
src/registry/     registry parsing and search
src/source/       local and remote source resolution
src/ui/           prompt and terminal output helpers
test/             Vitest coverage
examples/         sample registry and skill pack
docs/             authoring documentation
```

The smoke test in `test/cli-smoke.test.ts` builds the CLI and runs the same user-facing flow shown in Quick Start.

## Current Scope

This repository implements the local CLI and installer engine. It does not yet cover npm publishing, signed registries, private registry auth, automatic update tracking, or automatic agent config mutation.
