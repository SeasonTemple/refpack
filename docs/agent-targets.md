# Agent Targets

`refpack` detects agent skill targets conservatively. Detection reports candidates and writeability; it does not authorize writes or modify agent configuration.

## Supported Agents

| Agent | Id | Target rule |
|---|---|---|
| Codex | `codex` | `$CODEX_HOME/skills`, otherwise `~/.codex/skills` |
| Claude | `claude` | `$CLAUDE_HOME/skills`, otherwise `~/.claude/skills` |
| Generic | `generic` | no implicit target; use `--target` or saved config |

## Discovery

```bash
refpack agents
refpack agents --json
```

Discovery statuses:

- `available`: target exists and appears writable.
- `creatable`: parent exists and appears writable, so the skills directory can be created during install.
- `partial`: some evidence exists, but no writable target can be resolved.
- `not-found`: no command or target evidence was found.
- `not-writable`: target exists but is not writable.

## Target Precedence

Commands that write or inspect installed state resolve targets in this order:

1. `--target <dir>`
2. `--agent <id>`
3. `.refpackrc.json` target

`--target` is the deterministic low-level override for CI and advanced users. `--agent` selects a known adapter target without requiring users to remember local directory conventions. Existing configs with only `target` remain valid.

## Init

```bash
refpack init --agent codex --registry ./examples/registry.json
refpack init --agent claude --registry https://skillhub.example.com/registry.json
refpack init --agent generic --target ./team-agent-skills
```

`init --agent` saves both the selected agent id and resolved target path. Generic requires an explicit target because there is no safe generic convention.

## Safety

Agent detection never mutates Codex, Claude, MCP, or runtime config files. Adapter-specific instructions from skills are printed as text after install.

