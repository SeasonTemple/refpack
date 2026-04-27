# Skill Pack Format

V1 skill packs use a single `skills.json` file at the pack root.

```json
{
  "schemaVersion": "1.0",
  "name": "agent-skills",
  "skills": [
    {
      "id": "browser-agent",
      "name": "Browser Agent",
      "description": "Automates browser workflows",
      "source": "skills/browser-agent",
      "target": "browser-agent",
      "adapters": ["codex", "claude"],
      "dependencies": {
        "npm": ["playwright"]
      },
      "requiresScripts": false,
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

## Fields

- `schemaVersion`: schema version. Defaults to `1.0` when omitted.
- `name`: pack name.
- `skills`: installable skill entries.
- `id`: stable skill id.
- `name`: display name.
- `description`: short prompt-list description.
- `source`: relative path inside the pack.
- `target`: relative target path inside the configured skills directory. Defaults to `id`.
- `adapters`: optional runtime compatibility metadata.
- `dependencies.npm`: optional npm package names to install when `--install` is passed.
- `requiresScripts`: whether the skill needs lifecycle scripts. Scripts still require `--allow-scripts`.
- `configInstructions`: adapter-specific setup text. V1 displays this text and does not modify config files.

All `source` and `target` paths must be relative and cannot escape their base directory.
