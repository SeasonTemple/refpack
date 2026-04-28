---
date: 2026-04-28
topic: agent-aware-team-skill-manager-v1
---

# Agent-Aware Team Skill Manager v1.0

## Problem Frame

`refpack` has a working installer, registry reader, SkillHub MVP, artifact authoring, archive validation, and safe local install flow. The product direction should now narrow from a broad "AI work context pack" toolchain into a team-first agent skill manager.

Teams need a dependable way to package reusable agent skills, distribute them through controlled registries or SkillHub deployments, install them into the right agent environment, and keep those installations maintainable over time. The current CLI can perform a first install, but it still requires low-level target directory knowledge and does not track installed state, detect outdated skills, or protect local edits during updates.

v1.0 should prove that `refpack` can be used as everyday team infrastructure for agent skills. It should not attempt to become a public marketplace, generic asset package manager, or automated agent configuration mutator.

## Requirements

**Product Positioning**

- R1. Position `refpack` as a team-first agent skill manager focused on packaging, distributing, installing, and maintaining reusable agent skills.
- R2. Keep v1.0 focused on skill assets and do not expand the product surface to generic non-skill AI context packs.
- R3. Preserve the current safety posture: explicit writes, no silent dependency execution, no automatic Codex/Claude/MCP/runtime config mutation.
- R4. Treat SkillHub v1 as a controlled, read-only team distribution service rather than a public marketplace or trust authority.

**Agent-Aware Targeting**

- R5. Detect first-class local agent environments for Codex and Claude when their CLI commands or expected skill directories are present.
- R6. Support a Generic custom target option for teams with internal or unsupported agent environments.
- R7. Let users choose a detected agent target during `refpack init` when no target is provided.
- R8. Support explicit `--agent <id>` target resolution for install and lifecycle commands while preserving `--target <dir>` as the lowest-level override.
- R9. Provide an agent discovery command that reports detected agents, resolved target paths, availability, and writeability without modifying files.
- R10. Make detected targets suggestions, not implicit writes; interactive users must confirm, and non-interactive users must pass `--agent`, `--target`, or existing config.

**Installed Lifecycle**

- R11. Record installed metadata whenever `refpack` installs a skill, including skill id, source identity, registry metadata when available, version, integrity, artifact type, target, adapter/agent context, installed time, and installed file hashes.
- R12. Distinguish `refpack`-managed skills from manually placed directories in `list` output.
- R13. Keep `remove` in sync with installed metadata so stale records do not make the local state misleading.
- R14. Add `outdated` behavior that compares installed skill versions against configured registry or SkillHub latest metadata.
- R15. Add `update` behavior for one skill or all managed skills, reusing the existing safe install plan, dry-run, diff, overwrite, and confirmation model.

**Conflict-Safe Updates**

- R16. Detect local file modifications by comparing current files with the hashes recorded at install time.
- R17. Block updates by default when local modifications would be overwritten, and explain the conflict in user-facing output.
- R18. Allow explicit overwrite for trusted cases, while keeping dry-run and diff available before destructive updates.
- R19. Avoid partial update state: metadata should only move to the new version after the filesystem update succeeds.

**Machine and Team Workflows**

- R20. Add machine-readable output for state-oriented commands needed by agents and CI, especially agent discovery, list, outdated, and update previews.
- R21. Keep CLI command behavior scriptable in non-interactive environments with clear exit codes and no required TTY rendering.
- R22. Document a team workflow from skill authoring to validation, controlled SkillHub hosting, agent detection, installation, outdated checking, and updating.
- R23. Include v1.0 release readiness work: stable docs, command reference, format boundaries, migration notes, and npm package smoke coverage.

## Success Criteria

- A team can deploy or reference a controlled SkillHub/registry, initialize `refpack` for Codex, Claude, or a custom target, install a skill, list managed state, detect outdated skills, preview updates, and update safely.
- A user who has locally edited an installed skill is protected from accidental overwrite during update.
- A CI or agent workflow can inspect agents, installed state, and outdated status through machine-readable output.
- v1.0 docs clearly explain what `refpack` is, what it is not, and how team authors, team users, and SkillHub operators should use it.
- Existing safe install behavior, registry compatibility, SkillHub artifact validation, and CLI smoke flows continue to work.

## Scope Boundaries

- v1.0 does not provide a public marketplace.
- v1.0 does not add login, users, organizations, permissions, or private registry auth.
- v1.0 does not add a database-backed SkillHub.
- v1.0 does not implement a remote publish command; local pack, validate, and controlled deployment workflows are sufficient.
- v1.0 does not implement a cryptographic publisher trust chain or signature verification.
- v1.0 does not automatically mutate Codex, Claude, MCP, or other runtime config files.
- v1.0 does not attempt complex three-way merge for locally modified skills; safe blocking plus explicit overwrite is sufficient.
- v1.0 does not require a Web UI.
- v1.0 does not generalize the v1 manifest beyond `skills.json`.

## Key Decisions

- Product focus: `refpack` becomes a team-first agent skill manager, not a generic package manager.
- First-class agents: v1.0 supports Codex and Claude detection plus Generic custom targets.
- Safety model: agent detection helps users choose a target, but never silently authorizes writes.
- Lifecycle model: installed metadata is required before `outdated` and `update` can be reliable.
- Update model: local modification conflicts block by default; explicit overwrite remains available.
- SkillHub model: SkillHub remains read-only and controlled-by-deployment in v1.0.
- Format model: `skills.json`, registry JSON, and SkillHub catalog remain the core v1 contracts.

## Dependencies / Assumptions

- Codex and Claude skill target conventions can be represented as conservative adapter rules.
- Registry entries and SkillHub projections already provide enough latest-version metadata for initial outdated checks when hosted entries include `version`.
- Existing install planning, archive validation, and diff rendering can be reused for update previews.
- A metadata file under the managed target or project config context is acceptable for v1.0 state tracking, provided the plan selects a clear ownership model.

## Outstanding Questions

### Resolve Before Planning

None.

### Deferred to Planning

- [Affects R11-R15][Technical] Decide where installed metadata should live so `--target`, `--agent`, and project config all behave predictably.
- [Affects R5-R10][Technical] Define conservative Codex and Claude detection rules and how to label partial detections.
- [Affects R20-R21][Technical] Decide the exact `--json` output shape and which commands receive it in v1.0.
- [Affects R16-R19][Technical] Decide whether update conflict detection records every file hash, a manifest hash, or both.

## Next Steps

-> /ce:plan for structured implementation planning.
