# refpack

`refpack` is a team-first agent skill manager. It helps teams package reusable agent skills, distribute them through controlled registries or SkillHub deployments, install them into local agent environments, and keep installation safety explicit.

The current implementation is a v1 agent skill manager: discover installable skills, detect supported agent targets, preview installs, copy selected files safely, track managed state, report outdated skills, update with local-edit protection, validate hosted artifacts, and keep dependency installation opt-in. It is not a public marketplace or a generic package manager for every kind of AI context.

## What It Does

- Initializes project config with a target skills directory and optional registry.
- Searches and views skills from a static JSON registry.
- Installs one skill, multiple named skills, or all skills from a pack.
- Supports dry runs and install diffs before writing files.
- Preserves existing installed skills unless overwrite is explicit.
- Detects Codex, Claude, and Generic agent targets without writing files.
- Tracks managed installs with source metadata, versions, and file hashes.
- Lists managed and unmanaged target directories distinctly.
- Checks managed skills for outdated registry or SkillHub versions.
- Updates managed skills while blocking local-edit conflicts by default.
- Prints JSON for agent discovery and lifecycle state commands.
- Displays adapter-specific setup instructions without mutating agent config files.
- Keeps npm dependency installation opt-in.
- Hosts team-controlled skill catalogs and versioned artifacts with SkillHub.

## Project Status

Current milestone: agent-aware skill manager v1 is implemented and end-to-end verified.

Completed:

- Local CLI installer for registry, local pack, and supported remote sources.
- Dry-run and diff output before writing skill files.
- Safe install planning with overwrite protection.
- Read-only SkillHub HTTP server backed by a JSON catalog and artifact directory.
- CLI-compatible SkillHub `/registry.json` projection.
- Versioned `.tgz` artifact serving through `/api/packs/:id/:version`.
- SkillHub artifact authoring with `refpack skillhub pack`.
- Catalog and artifact validation with `refpack skillhub validate`.
- SHA-256 integrity and exact byte-size verification for hosted artifacts.
- Safe `.tgz` extraction that rejects path traversal, absolute paths, links, and unsupported entry types.
- Automated coverage for the installer, registry parser, SkillHub catalog, SkillHub server, archive provider, authoring flow, and real CLI smoke paths.
- Manual end-to-end verification for local registry install, real Codex skills directory install/remove, SkillHub pack/validate, SkillHub server startup, and CLI install from SkillHub.
- Agent discovery for Codex, Claude, and Generic custom targets.
- `--agent <id>` target resolution while keeping `--target <dir>` as the explicit override.
- Installed state stored under the managed target.
- State-aware `list`, `remove`, `outdated`, and conflict-safe `update`.
- JSON output for `agents`, `list`, `outdated`, and update preview/result.

Current intended use:

- Local development and validation of agent skill packs.
- Team-internal skill distribution through controlled registries or read-only SkillHub deployments.
- CI workflows that generate artifacts, validate catalogs, and deploy static catalog/artifact files behind the SkillHub server.

Still out of scope for v1:

- Public marketplace, ratings, install counts, users, organizations, or auth.
- Remote publishing to SkillHub.
- Artifact signatures or publisher identity trust chains.
- Web UI.
- Automatic Codex, Claude, MCP, or runtime config mutation.

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
node dist/cli.js agents
node dist/cli.js add browser-agent --dry-run
node dist/cli.js add browser-agent --yes
node dist/cli.js list --target ./.tmp-installed
node dist/cli.js outdated --target ./.tmp-installed
node dist/cli.js update browser-agent --dry-run --target ./.tmp-installed
node dist/cli.js remove browser-agent --yes --target ./.tmp-installed
```

After publishing or linking the package, the binary name is `refpack`:

```bash
refpack agents
refpack init --agent codex --registry ./examples/registry.json
refpack search browser
refpack add browser-agent --dry-run
refpack add browser-agent --yes
refpack outdated
refpack update browser-agent --dry-run
```

## Commands

```text
refpack init
refpack agents [--json]
refpack add <source-or-id> [skills...]
refpack search [query]
refpack list [--json]
refpack view <id>
refpack outdated [--json]
refpack update [id] [--all] [--dry-run] [--diff] [--json]
refpack remove <id>
refpack info
refpack skillhub pack <packDir> --artifact-version <version>
refpack skillhub validate --catalog <file> --artifact-root <dir>
```

## Agent Targets

Use `refpack agents` to inspect supported local targets without modifying files:

```bash
refpack agents
refpack agents --json
```

Target precedence is:

1. `--target <dir>`
2. `--agent <id>`
3. configured target from `.refpackrc.json`

Supported agent ids are `codex`, `claude`, and `generic`. Codex uses `$CODEX_HOME/skills` or `~/.codex/skills`. Claude uses `$CLAUDE_HOME/skills` or `~/.claude/skills`. Generic has no implicit target and must be paired with `--target` or saved config.

See [docs/agent-targets.md](docs/agent-targets.md).

## Installing From Sources

Install by registry id:

```bash
refpack add browser-agent --yes
```

Install from a local pack:

```bash
refpack add ./examples/basic-skill-pack --target ~/.codex/skills --all
```

Install from a remote source supported by the source resolver:

```bash
refpack add gh:your-org/agent-skills --target ~/.codex/skills --all
```

Preview writes before installing:

```bash
refpack add browser-agent --dry-run
refpack add browser-agent --diff
```

Overwrite an existing installed skill only when intended:

```bash
refpack add browser-agent --overwrite --yes
```

## Installed Lifecycle

Installs write managed state under the target at `.refpack/installed-state.json`. This state records source metadata, registry id, version, agent context, install time, artifact integrity fields, and per-file hashes.

```bash
refpack list --json
refpack outdated --json
refpack update browser-agent --dry-run --diff
refpack update --all --yes
```

`update` compares recorded hashes with current files before writing. Local edits or deleted installed files block updates by default. Pass `--overwrite` only when replacing local changes is intentional.

See [docs/installed-state.md](docs/installed-state.md).

## SkillHub

SkillHub is the read-only server companion for this CLI. It hosts a catalog and versioned `.tgz` skill pack artifacts, then exposes a CLI-compatible registry:

```text
GET /registry.json
GET /api/skills
GET /api/skills/:id
GET /api/packs/:id/:version
```

After a SkillHub deployment is running, configure the CLI against it:

```bash
refpack init --target ~/.codex/skills --registry https://skillhub.example.com/registry.json
refpack search browser
refpack add browser-agent --dry-run
refpack outdated
refpack update browser-agent --dry-run
```

See [docs/skillhub.md](docs/skillhub.md).

Create a versioned artifact from a local skill pack:

```bash
refpack skillhub pack ./examples/basic-skill-pack --id browser-agent --artifact-version 1.0.0 --out ./examples/skillhub/artifacts
```

Paste the printed catalog version metadata into your SkillHub catalog, then validate every referenced artifact before deployment:

```bash
refpack skillhub validate --catalog ./examples/skillhub/catalog.json --artifact-root ./examples/skillhub/artifacts
```

Run the built SkillHub server with:

```bash
SKILLHUB_CATALOG=examples/skillhub/catalog.json \
SKILLHUB_ARTIFACT_ROOT=examples/skillhub/artifacts \
SKILLHUB_PUBLIC_BASE_URL=http://127.0.0.1:3333 \
npm run skillhub
```

## Safety Model

- No target directory is guessed. Pass `--target` or run `refpack init`.
- Agent detection is advisory. Writes require `--agent`, `--target`, saved config, or explicit confirmation.
- Existing skill directories are blocked by default.
- `--dry-run` prints the install plan without writing files.
- Update checks installed file hashes before replacement and blocks local edits by default.
- Installed metadata advances only after successful filesystem writes.
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
src/agents/       agent target adapters and detection
src/flow/         Add/install orchestration
src/install/      Install planning, file copying, dependency install
src/lifecycle/    outdated, update, and conflict checks
src/manifest/     skills.json validation
src/registry/     registry parsing and search
src/skillhub/     SkillHub catalog, server, and authoring helpers
src/source/       local and remote source resolution
src/state/        installed state and file hashes
src/ui/           prompt and terminal output helpers
test/             Vitest coverage
examples/         sample registry and skill pack
docs/             authoring documentation
```

The smoke test in `test/cli-smoke.test.ts` builds the CLI and runs the same user-facing flow shown in Quick Start.

## Roadmap

### Phase 1: Installer and Read-Only SkillHub MVP

Status: complete.

- CLI config, registry search/view, install, list, and remove.
- Local pack installs and registry id installs.
- SkillHub catalog parsing and registry projection.
- Read-only HTTP server for catalog APIs and versioned artifacts.
- Hosted `.tgz` artifact download, integrity verification, safe extraction, and install.
- Local artifact authoring and catalog validation commands.

### Phase 2: Agent-Aware Targeting

Status: complete.

- Detect Codex and Claude target candidates conservatively.
- Support a Generic custom target for internal or unsupported agent environments.
- Add `refpack agents` to report detected targets, availability, and writeability.
- Add `--agent <id>` target resolution while preserving `--target <dir>` as the explicit override.
- Let `refpack init --agent <id>` save a detected target without silently authorizing writes.

### Phase 3: Installed Lifecycle

Status: complete.

- Track installed skill metadata near the managed target.
- Record source, registry metadata, version, integrity, target, agent context, install time, and file hashes.
- Make `list` distinguish managed skills from unmanaged directories.
- Keep `remove` synchronized with installed metadata.
- Add `outdated` for registry or SkillHub latest-version comparison.

### Phase 4: Conflict-Safe Updates

Status: complete.

- Add `update <id>` and `update --all`.
- Reuse source resolution, manifest validation, install planning, dry-run, and diff previews.
- Detect local edits from install-time file hashes.
- Block update conflicts by default and require explicit overwrite for destructive replacement.
- Advance installed metadata only after filesystem updates succeed.

### Phase 5: Automation and Team Workflows

Status: complete.

- Add `--json` for `agents`, `list`, `outdated`, and update preview/result output.
- Keep JSON output free of banners, colors, spinners, and prose.
- Add team workflow docs for authoring, validating, hosting, installing, checking outdated state, and updating.
- Add migration notes from raw `--target` usage to agent-aware usage.
- Add package smoke coverage for release readiness.

### Phase 6: Authoring Workflow Polish

Status: planned.

- Generate or update catalog entries directly from `refpack skillhub pack`.
- Add a catalog add/update command to reduce manual JSON editing.
- Add stronger example workflows for multi-skill packs and multiple versions.
- Add release notes or changelog generation for skill versions.
- Improve CLI output for pack metadata so it is easier to paste or pipe into automation.

### Phase 7: Deployment and CI

Status: planned.

- Add a Dockerfile or documented container deployment.
- Add GitHub Actions examples for build, test, pack, validate, and deploy.
- Document static artifact hosting patterns for simple internal deployments.
- Add operational checks for validating `/health`, `/registry.json`, and a CLI dry run after deployment.
- Add example rollback steps for catalog/artifact deployments.

### Phase 8: Trust, Private Distribution, and UI

Status: future.

- Add artifact signing separate from SHA-256 byte integrity.
- Define trust policy for publisher keys.
- Support signature verification in the CLI before install planning.
- Add authentication and authorization for private catalogs when controlled deployment is no longer enough.
- Add token-based CLI access to private SkillHub deployments.
- Add catalog browsing UI after lifecycle, authoring, and trust boundaries are stable.

## Current Scope

This repository implements the `refpack` CLI and the first supported pack kind: agent skill packs. SkillHub adds a read-only skill catalog and artifact server plus local artifact authoring helpers.

The v1 product boundary is team-first agent skill management. Current code includes agent target detection, installed state tracking, `outdated`, `update`, JSON state output, and package smoke coverage. It does not include signed registries, private registry auth, Web UI, remote publishing, or automatic agent config mutation.
