# SkillHub

SkillHub is the read-only server companion for `modern-ref-pack`. It hosts a skill catalog and versioned skill pack artifacts, then exposes a CLI-compatible registry at `/registry.json`.

## MVP Scope

SkillHub v1 includes:

- A file-backed catalog.
- A read-only HTTP API.
- A CLI-compatible `/registry.json`.
- Versioned `.tgz` artifact downloads.
- SHA-256 integrity metadata.
- Size-bounded artifact serving and downloading.

SkillHub v1 does not include:

- Login, tokens, SSO, users, or organizations.
- Private registries.
- Publishing commands.
- Update or outdated tracking.
- Web UI.
- Artifact signatures or publisher identity.
- Automatic Codex, Claude, MCP, or runtime config mutation.

## API

```text
GET /health
GET /registry.json
GET /api/skills
GET /api/skills/:id
GET /api/packs/:id/:version
```

`/registry.json` is the installer contract. It projects the SkillHub catalog into the existing registry shape consumed by `skills search`, `skills view`, and `skills add`.

## Catalog Format

SkillHub catalogs are JSON files:

```json
{
  "schemaVersion": "1.0",
  "name": "example-skillhub",
  "skills": [
    {
      "id": "browser-agent",
      "name": "Browser Agent",
      "description": "Automates browser workflows",
      "latestVersion": "1.0.0",
      "tags": ["browser", "automation"],
      "adapters": ["codex"],
      "versions": [
        {
          "version": "1.0.0",
          "artifactPath": "browser-agent/1.0.0.tgz",
          "artifactType": "tgz",
          "integrity": "sha256-...",
          "sizeBytes": 12345,
          "reviewStatus": "unreviewed"
        }
      ]
    }
  ]
}
```

Fields:

- `id`: route-safe skill id. Slashes, backslashes, `..`, and URL-encoded traversal are rejected.
- `latestVersion`: version id to project into `/registry.json`.
- `versions`: hosted artifact versions for the skill.
- `artifactPath`: server-local path relative to the configured artifact root.
- `artifactType`: v1 supports only `tgz`.
- `integrity`: `sha256-<base64-digest>` for the exact artifact bytes.
- `sizeBytes`: exact artifact size in bytes.
- `reviewStatus`: optional display metadata. It does not create a trust chain in v1.

Catalog entries do not author public artifact URLs directly. SkillHub combines the configured public base URL with `/api/packs/:id/:version` when projecting `/registry.json`.

## Artifact Rules

SkillHub v1 artifacts are `.tgz` archives with `skills.json` at the archive root:

```text
skills.json
skills/browser-agent/SKILL.md
```

The CLI rejects archives with:

- absolute paths
- parent traversal
- unsafe links
- unsupported special file types
- missing root `skills.json`
- mismatched integrity
- mismatched or oversized byte counts

Integrity verifies bytes, not author identity. Treat hosted skills as third-party code-like content until signatures and publisher trust exist.

## Running SkillHub

After building the project, run the SkillHub server entry with explicit configuration:

```bash
SKILLHUB_CATALOG=examples/skillhub/catalog.json \
SKILLHUB_ARTIFACT_ROOT=examples/skillhub/artifacts \
SKILLHUB_PUBLIC_BASE_URL=http://127.0.0.1:3333 \
node dist/skillhub/server/entry.js
```

Then configure the CLI:

```bash
skills init --target ~/.codex/skills --registry http://127.0.0.1:3333/registry.json
skills search browser
skills add browser-agent --dry-run
```

## Operational Notes

Healthy signals:

- `/health` returns `status: ok`.
- `/registry.json` parses as a CLI registry.
- A CLI dry run against the hosted registry succeeds.

Failure signals:

- catalog load errors
- artifact 404s
- artifact size mismatch
- integrity mismatch
- install failure before manifest parsing

Rollback for v1 is replacing catalog/artifact files or reverting the deployed build. There is no database migration rollback in this milestone.
