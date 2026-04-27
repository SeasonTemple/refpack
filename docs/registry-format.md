# Registry Format

V1 registries are static JSON documents that point to skill packs.

```json
{
  "schemaVersion": "1.0",
  "name": "default",
  "skills": [
    {
      "id": "browser-agent",
      "name": "Browser Agent",
      "description": "Automates browser workflows",
      "source": "./examples/basic-skill-pack",
      "manifestPath": "skills.json",
      "version": "1.0.0",
      "artifactType": "tgz",
      "integrity": "sha256-...",
      "sizeBytes": 12345,
      "tags": ["browser", "automation"],
      "adapters": ["codex"]
    }
  ]
}
```

## Fields

- `schemaVersion`: registry schema version. Defaults to `1.0` when omitted.
- `name`: registry name.
- `skills`: registry entries.
- `id`: stable registry id and preferred install id.
- `name`: display name.
- `description`: short description used by search/list/view.
- `source`: local path, `giget` source, or remote source.
- `manifestPath`: optional manifest path inside the resolved source. Defaults to `skills.json`.
- `version`: optional hosted artifact version metadata.
- `artifactType`: optional hosted artifact type. V1 supports `tgz`.
- `integrity`: optional `sha256-<base64-digest>` integrity for hosted artifacts.
- `sizeBytes`: optional exact hosted artifact size in bytes.
- `tags`: optional search tags.
- `adapters`: optional runtime compatibility metadata.

The installer uses the registry entry to resolve a pack, then validates the pack's `skills.json` before writing files.
Hosted SkillHub entries should include `artifactType`, `integrity`, and `sizeBytes` together. These fields are additive; existing local registry entries do not need them.
