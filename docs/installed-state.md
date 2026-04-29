# Installed State

Managed installs are recorded near the target skills directory:

```text
<target>/.refpack/installed-state.json
```

The `.refpack` directory is metadata, not a skill. `refpack list` ignores it when scanning unmanaged directories.

## Shape

```json
{
  "schemaVersion": "1.0",
  "installed": [
    {
      "id": "browser-agent",
      "target": "browser-agent",
      "source": "https://skillhub.example.com/api/packs/browser-agent/1.0.0",
      "registryId": "browser-agent",
      "version": "1.0.0",
      "manifestPath": "skills.json",
      "agent": "codex",
      "installedAt": "2026-04-29T00:00:00.000Z",
      "artifact": {
        "type": "tgz",
        "integrity": "sha256-...",
        "sizeBytes": 12345
      },
      "files": [
        {
          "path": "browser-agent/SKILL.md",
          "sha256": "hex-digest",
          "sizeBytes": 123
        }
      ]
    }
  ]
}
```

Paths are target-relative and must not escape the target directory. Malformed state produces a recovery-oriented error so users can repair or remove the metadata file.

## Managed vs Unmanaged

`refpack list` prefers installed state when present:

```bash
refpack list
refpack list --json
```

Directories in the target that are not present in installed state are shown as unmanaged. State entries whose target directory is missing are shown as managed but missing, so stale metadata is visible.

## Remove

`refpack remove <id>` deletes the managed target directory first. State is updated only after the filesystem removal succeeds.

## Outdated

`refpack outdated` reads installed state, looks up each managed skill in the configured registry, and compares versions by equality.

Statuses:

- `current`: installed version equals latest registry version.
- `outdated`: installed version differs from latest registry version.
- `unknown-version`: installed or latest version is missing.
- `missing-source`: the registry entry no longer exists.

## Update

`refpack update <id>` and `refpack update --all` fetch latest registry metadata, validate the source, and stage replacement content before modifying the target.

Before writes, the command compares each recorded file hash with the current target file. Modified or deleted files are conflicts and block the update by default:

```bash
refpack update browser-agent --dry-run --diff
refpack update browser-agent --yes
refpack update browser-agent --overwrite --yes
```

Installed state advances only after filesystem replacement succeeds.

