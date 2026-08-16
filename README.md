# dsh-skillforge

DSH（DeepSeek Harness）技能与扩展中心 —— 一个插件统一管理技能的完整生命周期，并附带 MCP 服务器管理。

## 功能

- **技能目录**：扫描 `~/.dsh/skills`（用户级）与 `~/.agents/skills`（共享级）两级用户根 + 官方注册表快照补全（内置 / 自定义 / 运行时），按来源与调用策略展示，红/绿点标注检查状态
- **遮蔽式启停 + 重命名兜底（双机制）**：启停同时写遮蔽表（shadow provider，不碰文件）**并**对用户级技能重命名 `SKILL.md` ↔ `SKILL.md.disabled`（文件系统原生机制，对任何预设生效）；共享级只做遮蔽（不重命名，避免影响其他工具）。目录/列表/详情/CRUD 全部识别两种禁用形态
- **规范检查修复（audit）**：状态驱动（内容指纹，只重查变更项）；自动修复目录名/文件名非 kebab、name 缺失/不一致、description 缺失补占位、驼峰布尔键归一（保留原值）、BOM 剥离；幂等；审计日志
- **CRUD**：新建 / 编辑（保留未知 frontmatter 行）/ 重命名（整目录移动 + frontmatter name 同步）/ 删除；全部原子写。共享级（`~/.agents/skills`）只读保护
- **导入（ZIP / .skill / 目录）**：零依赖 ZIP 引擎（store+deflate、CRC32 校验、条目名穿越防护、zip-bomb 预算）；dry-run 预检 + 冲突策略（跳过/覆盖）；冲突检测跨双用户根
- **技能市场**：skills.sh 搜索（安装数排序）+ 一键安装（用户级 / 项目级）；GitHub 仓库管理（添加 / 扫描 / 展开 / 移除 / 逐个安装）；codeload 包装根自动剥离、"仓库根即技能"形态自动识别；GitHub API 定位 + codeload 精确提取（raw.githubusercontent 不可达网络环境下可用）；超时/大小上限/分支回退/重试
- **模型工具**（低优先级注册，可让 agent 自主管理）：`skillforge_search`（搜市场）、`skillforge_install`（按 id 安装）、`skills_list`（列技能与状态）、`skills_toggle`（启停，可逆不删文件）——手工构造 ToolDefinition，零 dsh 运行时依赖
- **更新**：GitHub 来源的技能一键重拉最新（溯源 registry 驱动）
- **导出（.skill）**：目录束整树打包 / 平铺单文件，可直接再导入
- **打开文件夹**：一键在文件管理器中打开技能目录（Windows 下 `explorer /select` 强制新窗口置顶）
- **项目级技能**：注册的工作区下 `.dsh/skills` + `.agents/skills` 自动扫描，面板工作区分栏切换
- **分组**：自定义分组（独立配置），面板分组横栏过滤 + 编辑器，不改技能文件
- **跨级移动/复制**：技能在用户级 ↔ 工作区之间移动或复制（整目录/文件，frontmatter 同步；共享级目标被拒）
- **按对话加载**：为每个会话勾选技能——勾选后该会话只加载勾选技能（agent 层遮蔽），不勾选 = 默认全部
- **MCP 服务器管理**：新建（stdio / streamable-http）、启用/停用 = 真实连接/断开、一键测试连接、删除
- **插件清单（只读）**：官方/第三方分组展示全部已加载插件
- **CLI**（`dsh-skillforge`）：`list / add / enable / disable / delete --yes / check`
- **设置页 UI**：zh/en 双语、网格卡片、toggle 开关、Markdown 渲染、`--dsw-alias-*` 设计令牌（明暗主题自适应）、loopback API 双重围栏

## 安装

```powershell
dsh plugin --profile web add github:DDDMUC/dsh-skillforge
# 或发行版 tarball
dsh plugin --profile web add https://github.com/DDDMUC/dsh-skillforge/releases/download/v0.1.0/dsh-skillforge-0.1.0.tgz
```

重启 `dsh web`，刷新浏览器，设置 →「技能与扩展」。

## 开发

```powershell
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest（63 用例）
pnpm build       # tsdown 双产物 + wrap-client 打包 lib/client.js
```

- `src/index.ts` — host 半入口（settings 命名空间 / shadow provider / 路由 / MCP / 模型工具）
- `src/core/` — catalog / shadow / toggle / audit / crud / groups / move / conversation / frontmatter
- `src/install/` — ZIP 引擎 / .skill 打包 / GitHub 下载 / 市场 / 导入器
- `src/mcp/` — MCP 配置存储 + 真连接管理器
- `src/routes.ts` — loopback HTTP API
- `src/client/` — 设置页面板（locales / api / Section）
- `scripts/wrap-client.mjs` — client bundle 包装为 `__ModuleLoader__` 格式

**架构红线**：host/client 双半**零 `@deepseek-ai/dsh-*` 运行时依赖**——插件目录的 node_modules 会把 dsh 包解析成第二模块实例（cordis/typert/session 状态分裂），曾实测导致插件列表、模型选择、会话全部加载失败。运行时只允许 `node:` 内置 + `schemastery`；dsh 引用一律 `import type`，纯函数内联（见 `src/core/catalog.ts` 顶部说明）。唯一例外：MCP 挂载需动态 `import('@deepseek-ai/dsh-mcp-client')`（纯插件定义，无全局状态）。

## 数据位置

- 启停/对话选择状态：`$DSH_HOME/settings.yaml` 的 `skillforge` 命名空间
- 溯源 / 检查状态 / 分组 / MCP 配置：`~/.dsh/skillforge/`（registry.json / checked.json / groups.json / mcp.json / audit.log）

## License

MIT
