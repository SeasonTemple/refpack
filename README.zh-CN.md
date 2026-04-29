# refpack

[English](README.md)

`refpack` 是面向团队的 Agent Skill 管理器。它帮助团队打包可复用的 Agent Skill，通过受控 registry 或 SkillHub 分发，安装到本地 Agent 环境，并让安装、更新和依赖执行保持显式可控。

当前版本是 agent-aware skill manager v1：可以发现可安装 skill、检测本地 Agent 目标、预览安装计划、安全复制文件、记录已安装状态、检查过期版本、在更新时保护本地改动、校验托管 artifact，并保持依赖安装默认关闭。

它不是公共 marketplace，也不是通用 AI 上下文包管理器。

## 能做什么

- 初始化项目配置，保存目标 skills 目录和可选 registry。
- 从静态 JSON registry 搜索和查看 skill。
- 从 registry id、本地 pack、远程 source 安装 skill。
- 安装前支持 dry run 和文件级 diff。
- 默认阻止覆盖已有 skill，除非显式传入 `--overwrite`。
- 无写入副作用地检测 Codex、Claude、Generic Agent 目标。
- 记录 managed install 的 source、version、artifact 和文件 hash。
- 区分 managed skill、unmanaged 目录、缺失的 managed 目录。
- 检查 managed skill 是否落后于 registry 或 SkillHub 最新版本。
- 默认阻止 update 覆盖本地改动。
- 为 Agent 和 CI 提供 JSON 输出。
- 只打印适配器配置说明，不自动修改 Codex、Claude、MCP 或运行时配置。
- 默认不安装 npm 依赖，必须显式传入 `--install`。
- 通过 SkillHub 托管团队受控的 skill catalog 和版本化 artifact。

## 项目状态

当前里程碑：agent-aware skill manager v1 已实现并通过端到端验证。

已完成：

- 本地 CLI installer，支持 registry、本地 pack、远程 source。
- 安装 dry run 和 diff。
- 安全安装计划和默认覆盖保护。
- 只读 SkillHub HTTP server，基于 JSON catalog 和 artifact 目录。
- SkillHub `/registry.json` 投影，兼容 CLI registry。
- 版本化 `.tgz` artifact 服务：`/api/packs/:id/:version`。
- SkillHub artifact authoring：`refpack skillhub pack`。
- Catalog 和 artifact 校验：`refpack skillhub validate`。
- 托管 artifact 的 SHA-256 integrity 和 exact byte-size 校验。
- 安全 `.tgz` 解压，拒绝路径穿越、绝对路径、链接和特殊文件类型。
- Codex、Claude、Generic 目标检测。
- `--agent <id>` target resolution，同时保留 `--target <dir>` 作为最高优先级显式覆盖。
- target-local installed state。
- state-aware `list`、`remove`、`outdated`、`update`。
- `agents`、`list`、`outdated`、`update` 的 JSON 输出。
- Vitest 覆盖 installer、registry、SkillHub、archive provider、agent detection、installed state、outdated、update conflict、package smoke 和真实 CLI smoke。

v1 不包含：

- 公共 marketplace、评分、安装统计、用户、组织或 auth。
- 远程 publish 到 SkillHub。
- artifact 签名或 publisher identity trust chain。
- Web UI。
- 自动修改 Codex、Claude、MCP 或运行时配置。

## 环境要求

- Node.js 20 或更新版本
- npm

## 安装和构建

```bash
npm install
npm run build
```

运行测试：

```bash
npm test
```

只做 TypeScript 类型检查：

```bash
npm run typecheck
```

## 快速开始

示例 registry 指向 `examples/basic-skill-pack`。

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

发布或 link 后，二进制名是 `refpack`：

```bash
refpack agents
refpack init --agent codex --registry ./examples/registry.json
refpack search browser
refpack add browser-agent --dry-run
refpack add browser-agent --yes
refpack outdated
refpack update browser-agent --dry-run
```

## 命令

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

## Agent 目标

用 `refpack agents` 查看支持的本地 Agent 目标。该命令只做检测，不写文件。

```bash
refpack agents
refpack agents --json
```

目标解析优先级：

1. `--target <dir>`
2. `--agent <id>`
3. `.refpackrc.json` 中保存的 target

支持的 Agent id：

- `codex`：使用 `$CODEX_HOME/skills`，否则使用 `~/.codex/skills`
- `claude`：使用 `$CLAUDE_HOME/skills`，否则使用 `~/.claude/skills`
- `generic`：没有隐式目标，必须配合 `--target` 或已保存配置使用

更多说明见 [docs/agent-targets.md](docs/agent-targets.md)。

## 安装 Skill

按 registry id 安装：

```bash
refpack add browser-agent --yes
```

从本地 pack 安装：

```bash
refpack add ./examples/basic-skill-pack --target ~/.codex/skills --all
```

从远程 source 安装：

```bash
refpack add gh:your-org/agent-skills --target ~/.codex/skills --all
```

安装前预览：

```bash
refpack add browser-agent --dry-run
refpack add browser-agent --diff
```

仅在明确需要时覆盖已有 skill：

```bash
refpack add browser-agent --overwrite --yes
```

## 已安装生命周期

安装成功后，managed state 写在目标目录下：

```text
<target>/.refpack/installed-state.json
```

State 记录 source metadata、registry id、version、Agent context、install time、artifact integrity 字段和每个文件的 hash。

```bash
refpack list --json
refpack outdated --json
refpack update browser-agent --dry-run --diff
refpack update --all --yes
```

`update` 写入前会比较记录的 hash 和当前文件。若文件被本地修改或删除，默认阻止更新。只有确认要替换本地改动时才传 `--overwrite`。

更多说明见 [docs/installed-state.md](docs/installed-state.md)。

## SkillHub

SkillHub 是 `refpack` 的只读服务端组件。它托管 skill catalog 和版本化 `.tgz` skill pack artifact，并暴露 CLI 兼容 registry：

```text
GET /registry.json
GET /api/skills
GET /api/skills/:id
GET /api/packs/:id/:version
```

SkillHub 部署后，配置 CLI：

```bash
refpack init --target ~/.codex/skills --registry https://skillhub.example.com/registry.json
refpack search browser
refpack add browser-agent --dry-run
refpack outdated
refpack update browser-agent --dry-run
```

更多说明见 [docs/skillhub.md](docs/skillhub.md)。

从本地 skill pack 创建版本化 artifact：

```bash
refpack skillhub pack ./examples/basic-skill-pack --id browser-agent --artifact-version 1.0.0 --out ./examples/skillhub/artifacts
```

将命令输出的 catalog version metadata 写入 SkillHub catalog，然后在部署前校验所有 artifact：

```bash
refpack skillhub validate --catalog ./examples/skillhub/catalog.json --artifact-root ./examples/skillhub/artifacts
```

运行内置 SkillHub server：

```bash
SKILLHUB_CATALOG=examples/skillhub/catalog.json \
SKILLHUB_ARTIFACT_ROOT=examples/skillhub/artifacts \
SKILLHUB_PUBLIC_BASE_URL=http://127.0.0.1:3333 \
npm run skillhub
```

## 安全模型

- 不猜测写入目标。写入必须来自 `--target`、`--agent`、已保存配置或显式确认。
- Agent detection 只是建议，不自动授权写入。
- 默认阻止已有 skill 目录被覆盖。
- `--dry-run` 只打印计划，不写文件。
- Update 写入前检查已安装文件 hash，默认阻止覆盖本地改动。
- Installed metadata 只在文件系统写入成功后推进。
- Skill `source` 和 `target` 必须是相对路径，不能逃逸 base 目录。
- 依赖安装只在传入 `--install` 时执行。
- package manager lifecycle scripts 默认禁用，必须传入 `--allow-scripts`。
- Adapter config instructions 只打印文本。CLI 不改 Codex、Claude、MCP 或运行时配置。

## Skill Pack Format

每个 pack 包含一个根目录 `skills.json`：

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

字段说明见 [docs/skill-pack-format.md](docs/skill-pack-format.md)。

## Registry Format

Registry 是静态 JSON 文档：

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

详情见 [docs/registry-format.md](docs/registry-format.md)。

## 开发说明

项目结构：

```text
src/commands/     CLI command handlers
src/agents/       Agent target adapters and detection
src/flow/         Add/install orchestration
src/install/      Install planning, file copying, dependency install
src/lifecycle/    Outdated, update, and conflict checks
src/manifest/     skills.json validation
src/registry/     Registry parsing and search
src/skillhub/     SkillHub catalog, server, and authoring helpers
src/source/       Local and remote source resolution
src/state/        Installed state and file hashes
src/ui/           Prompt and terminal output helpers
test/             Vitest coverage
examples/         Sample registry and skill pack
docs/             Authoring and lifecycle documentation
```

`test/cli-smoke.test.ts` 会构建 CLI，并运行快速开始中的真实用户流程。

## Roadmap

已完成：

- Phase 1：Installer 和只读 SkillHub MVP
- Phase 2：Agent-aware targeting
- Phase 3：Installed lifecycle
- Phase 4：Conflict-safe updates
- Phase 5：Automation 和 team workflows

计划中：

- Phase 6：Authoring workflow polish
- Phase 7：Deployment 和 CI

未来方向：

- Artifact signing 和 publisher trust policy
- Private catalog auth
- Token-based CLI access
- Catalog browsing UI

## 当前范围

本仓库实现 `refpack` CLI，以及首个支持的 pack 类型：Agent skill packs。SkillHub 提供只读 skill catalog、artifact server 和本地 artifact authoring helpers。

v1 产品边界是团队优先的 Agent Skill 管理。当前代码包含 Agent target detection、installed state tracking、`outdated`、`update`、JSON state output 和 package smoke coverage。暂不包含 signed registries、private registry auth、Web UI、remote publishing 或自动 Agent config mutation。
