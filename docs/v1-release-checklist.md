# V1 Release Checklist

Use this checklist before tagging or publishing a v1 release.

## Product Boundary

- README opens with team-first agent skill management.
- Docs state that v1 is not a public marketplace, auth system, signature trust chain, Web UI, or automatic agent config mutator.
- `skills.json` remains the v1 manifest contract.

## CLI

- `refpack agents` reports Codex, Claude, and Generic targets.
- `refpack init --agent <id>` saves agent and target metadata.
- `refpack add` records installed state after successful writes.
- `refpack list` distinguishes managed, unmanaged, and missing managed entries.
- `refpack outdated` compares managed state with registry or SkillHub latest versions.
- `refpack update` blocks local edits by default.
- `--json` output parses for `agents`, `list`, `outdated`, and update preview/result.

## SkillHub

- `refpack skillhub pack` writes a versioned `.tgz` artifact and catalog snippet.
- `refpack skillhub validate` checks catalog references, size, integrity, safe extraction, and root `skills.json`.
- `/registry.json` can drive install, outdated, and update workflows.

## Verification

```bash
npm run typecheck
npm test
```

Smoke coverage should include:

- CLI init, search, view, add, list, remove.
- Agent discovery JSON.
- Installed state and file hashes.
- Outdated comparison.
- Conflict-safe update.
- SkillHub artifact install.
- Package contents dry run.

## Migration Notes

Existing users can keep raw target configs:

```bash
refpack init --target ~/.codex/skills --registry ./registry.json
```

Agent-aware configs are preferred for team docs:

```bash
refpack init --agent codex --registry ./registry.json
```

`--target <dir>` remains the highest-precedence override for CI and one-off installs.

