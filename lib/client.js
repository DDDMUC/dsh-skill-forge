window.__ModuleLoader__.load({
	id: "dsh-skillforge",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/**
		* skillforge locale namespace: zh / en dictionaries plus the typed key union
		* merged into the framework LocaleNamespaceMap.
		*/
		const NS = "skillforge";
		const zh = {
			nav: "技能与扩展",
			title: "技能与扩展",
			subtitle: "管理 DSH 技能：浏览目录、启停、查看详情与诊断",
			refresh: "刷新",
			search: "搜索技能…",
			noResults: "没有匹配的技能",
			enabled: "已启用",
			disabled: "已停用",
			enable: "启用",
			disable: "停用",
			source: "来源",
			provider: "提供方",
			noDescription: "（无简介）",
			noSkills: "暂无技能",
			loading: "加载中…",
			error: "加载失败：",
			toggleFailed: "切换失败：",
			detail: "详情",
			collapse: "收起",
			content: "正文",
			frontmatter: "frontmatter",
			path: "路径",
			diagnostics: "未生效文件（诊断）",
			diagnosticsNone: "所有技能文件均符合规范",
			diagnosticsHint: "这些文件未被 DSH 识别为技能，原因如下：",
			missingName: "frontmatter 缺少 name 字段",
			missingDescription: "frontmatter 缺少 description 字段",
			disabledFile: "被重命名停用（SKILL.md.disabled）",
			check: "检查修复",
			checking: "检查中…",
			checkedSummary: "已检查 {checked} · 已修复 {fixed} · 跳过 {skipped}{errors}",
			edit: "编辑",
			save: "保存",
			cancel: "取消",
			rename: "重命名",
			renameTo: "新名称",
			delete: "删除",
			confirmDelete: "确认删除",
			deleteHint: "将删除该技能文件，此操作不可撤销。",
			newSkill: "新建技能",
			nameLabel: "名称",
			descriptionLabel: "简介",
			whenToUseLabel: "何时使用",
			contentLabel: "正文",
			checkedOk: "已检查",
			checkedDirty: "待检查",
			actionFailed: "操作失败：",
			emptyContent: "（正文为空）",
			import: "导入",
			importClose: "关闭",
			importArchive: "选择文件（.zip / .skill）",
			importDir: "从目录导入",
			importPath: "目录路径",
			importPathPlaceholder: "例如 D:\\skills\\my-collection",
			importConflict: "重名处理",
			importSkip: "跳过重名",
			importOverwrite: "覆盖重名",
			importPreview: "预览",
			importRun: "导入",
			importPending: "待导入",
			importConflicts: "重名",
			importImported: "已导入",
			importSkipped: "已跳过",
			importFailed: "失败",
			importNoSkills: "源中没有发现可用技能",
			export: "导出",
			provenance: "来源",
			provenanceArchive: "归档",
			provenanceDir: "目录",
			provenanceManual: "手动",
			openFolder: "打开文件夹",
			readOnlyRoot: "（~/.agents/skills 只读，可先复制到 ~/.dsh/skills 再编辑）",
			market: "技能市场",
			marketSearch: "搜索",
			marketPlaceholder: "搜索技能（skills.sh，如 ppt / pdf / excel）…",
			marketInstall: "安装",
			marketNoResults: "没有找到技能",
			marketSearching: "搜索中…",
			marketInstalls: "次安装",
			githubImport: "GitHub 技能市场",
			githubOwner: "owner",
			githubRepo: "仓库名",
			githubBranch: "分支 (可选)",
			githubAddRepo: "添加仓库",
			githubSearch: "搜索技能",
			githubExpand: "展开",
			githubRemove: "移除",
			githubAutoSearch: "自动搜索",
			githubSkills: "搜索 GitHub 仓库中的技能",
			githubNoSkills: "仓库中没有可用技能",
			githubInstall: "安装",
			tabInstalled: "已安装 Skills",
			tabSkillHub: "SkillHub 商城",
			tabUser: "用户级",
			tabAll: "全部",
			tabBuiltIn: "内置",
			filterPlaceholder: "筛选当前分组：名称 / 简介…",
			refreshBtn: "刷新",
			repoSearch: "搜索技能",
			repoExpand: "展开",
			repoRemove: "移除",
			repoSkillsCount: "个技能",
			localSkills: "本地技能列表",
			localEnabled: "个已启用",
			localDisabled: "个已停用",
			sectionHeader: "DeepSeek Harness",
			badgeUser: "用户级",
			badgeProject: "项目级",
			badgeGitHub: "GitHub",
			badgeModelUser: "模型+用户",
			installToProject: "装到项目级（当前工作区）",
			installToUser: "装到用户级",
			categoryAll: "全部分类",
			sortByRating: "按评分",
			sortByDownloads: "按下载",
			sortByNewest: "按最新",
			pageOf: "第 %d / %d 页",
			itemsPerPage: "%d条/页",
			totalResults: "共 %d 个结果",
			installSuccess: "✓",
			installed: "已安装",
			category: "分类",
			downloads: "下载",
			installs: "安装",
			update: "更新",
			updateNone: "（无更新来源）",
			allSkills: "全部",
			userSkills: "用户级",
			groups: "分组",
			groupNew: "新建分组",
			groupRename: "重命名",
			groupDelete: "删除分组",
			groupMembers: "成员",
			move: "移动",
			moveTo: "移动到",
			moveCopy: "复制",
			moveMove: "移动",
			workspaceSkills: "工作区",
			mcp: "MCP 服务器",
			mcpNew: "新建服务器",
			mcpName: "名称",
			mcpTransport: "传输",
			mcpServerName: "serverName",
			mcpCommand: "命令",
			mcpArgs: "参数（空格分隔）",
			mcpUrl: "URL",
			mcpTest: "测试连接",
			mcpTesting: "测试中…",
			mcpRunning: "运行中",
			mcpStopped: "已停止",
			mcpTestOk: "连接成功",
			mcpTestFail: "连接失败：",
			mcpSave: "保存",
			mcpDelete: "删除",
			mcpEnabled: "启用",
			conversation: "按对话加载",
			conversationHint: "勾选后，该会话只加载勾选的技能（未勾选对该会话不可见）；不勾选任何技能 = 恢复默认全部加载。",
			conversationClear: "清除（恢复全部）",
			conversationSelect: "选择技能",
			conversationNoSessions: "暂无会话（新开会话后出现）",
			conversationSaved: "已保存",
			plugins: "插件清单",
			pluginsOfficial: "官方插件",
			pluginsOther: "第三方插件",
			pluginsPhase: "阶段"
		};
		const en = {
			nav: "Skills & Extensions",
			title: "Skills & Extensions",
			subtitle: "Manage DSH skills: browse the catalog, toggle, inspect and diagnose",
			refresh: "Refresh",
			search: "Search skills…",
			noResults: "No matching skills",
			enabled: "Enabled",
			disabled: "Disabled",
			enable: "Enable",
			disable: "Disable",
			source: "Source",
			provider: "Provider",
			noDescription: "(no description)",
			noSkills: "No skills yet",
			loading: "Loading…",
			error: "Load failed: ",
			toggleFailed: "Toggle failed: ",
			detail: "Detail",
			collapse: "Collapse",
			content: "Content",
			frontmatter: "frontmatter",
			path: "Path",
			diagnostics: "Unregistered files (diagnostics)",
			diagnosticsNone: "All skill files conform to the spec",
			diagnosticsHint: "These files are not recognized as skills by DSH:",
			missingName: "frontmatter missing name field",
			missingDescription: "frontmatter missing description field",
			disabledFile: "disabled by rename (SKILL.md.disabled)",
			check: "Check & fix",
			checking: "Checking…",
			checkedSummary: "checked {checked} · fixed {fixed} · skipped {skipped}{errors}",
			edit: "Edit",
			save: "Save",
			cancel: "Cancel",
			rename: "Rename",
			renameTo: "New name",
			delete: "Delete",
			confirmDelete: "Confirm delete",
			deleteHint: "This removes the skill files. This action cannot be undone.",
			newSkill: "New skill",
			nameLabel: "Name",
			descriptionLabel: "Description",
			whenToUseLabel: "When to use",
			contentLabel: "Content",
			checkedOk: "checked",
			checkedDirty: "needs check",
			actionFailed: "Action failed: ",
			emptyContent: "(empty content)",
			import: "Import",
			importClose: "Close",
			importArchive: "Choose file (.zip / .skill)",
			importDir: "Import from directory",
			importPath: "Directory path",
			importPathPlaceholder: "e.g. D:\\skills\\my-collection",
			importConflict: "Conflict handling",
			importSkip: "Skip duplicates",
			importOverwrite: "Overwrite duplicates",
			importPreview: "Preview",
			importRun: "Import",
			importPending: "to import",
			importConflicts: "conflicts",
			importImported: "imported",
			importSkipped: "skipped",
			importFailed: "failed",
			importNoSkills: "No usable skills found in the source",
			export: "Export",
			provenance: "Source",
			provenanceArchive: "archive",
			provenanceDir: "directory",
			provenanceManual: "manual",
			openFolder: "Open folder",
			readOnlyRoot: "(~/.agents/skills is read-only; copy to ~/.dsh/skills first to edit)",
			market: "Skill market",
			marketSearch: "Search",
			marketPlaceholder: "Search skills (skills.sh, e.g. ppt / pdf / excel)…",
			marketInstall: "Install",
			marketNoResults: "No skills found",
			marketSearching: "Searching…",
			marketInstalls: "installs",
			githubImport: "GitHub Skill Market",
			githubOwner: "owner",
			githubRepo: "Repo name",
			githubBranch: "Branch (optional)",
			githubAddRepo: "Add repo",
			githubSearch: "Search skills",
			githubExpand: "Expand",
			githubRemove: "Remove",
			githubAutoSearch: "Auto-search",
			githubSkills: "Search skills in GitHub repos",
			githubNoSkills: "No usable skills in this repo",
			githubInstall: "Install",
			tabInstalled: "Installed Skills",
			tabSkillHub: "SkillHub Store",
			tabUser: "User",
			tabAll: "All",
			tabBuiltIn: "Built-in",
			filterPlaceholder: "Filter group: name / description…",
			refreshBtn: "Refresh",
			repoSearch: "Search skills",
			repoExpand: "Expand",
			repoRemove: "Remove",
			repoSkillsCount: "skills",
			localSkills: "Local skill list",
			localEnabled: "enabled",
			localDisabled: "disabled",
			sectionHeader: "DeepSeek Harness",
			badgeUser: "User",
			badgeProject: "Project",
			badgeGitHub: "GitHub",
			badgeModelUser: "Model+User",
			installToProject: "Install to project (current workspace)",
			installToUser: "Install to user",
			categoryAll: "All categories",
			sortByRating: "By rating",
			sortByDownloads: "By downloads",
			sortByNewest: "By newest",
			pageOf: "Page %d / %d",
			itemsPerPage: "%d per page",
			totalResults: "%d results",
			installSuccess: "✓",
			installed: "Installed",
			category: "Category",
			downloads: "downloads",
			installs: "installs",
			update: "Update",
			updateNone: "(no update source)",
			allSkills: "All",
			userSkills: "User",
			groups: "Groups",
			groupNew: "New group",
			groupRename: "Rename",
			groupDelete: "Delete group",
			groupMembers: "Members",
			move: "Move",
			moveTo: "Move to",
			moveCopy: "Copy",
			moveMove: "Move",
			workspaceSkills: "Workspaces",
			mcp: "MCP servers",
			mcpNew: "New server",
			mcpName: "Name",
			mcpTransport: "Transport",
			mcpServerName: "serverName",
			mcpCommand: "Command",
			mcpArgs: "Args (space separated)",
			mcpUrl: "URL",
			mcpTest: "Test connection",
			mcpTesting: "Testing…",
			mcpRunning: "Running",
			mcpStopped: "Stopped",
			mcpTestOk: "Connected",
			mcpTestFail: "Connection failed: ",
			mcpSave: "Save",
			mcpDelete: "Delete",
			mcpEnabled: "Enabled",
			conversation: "Per-conversation loading",
			conversationHint: "Checked skills are the only ones loaded into that conversation (others are hidden for it). Clear the selection to restore the default (load all).",
			conversationClear: "Clear (load all)",
			conversationSelect: "Select skills",
			conversationNoSessions: "No sessions yet (they appear after you open one)",
			conversationSaved: "Saved",
			plugins: "Plugin inventory",
			pluginsOfficial: "Official plugins",
			pluginsOther: "Third-party plugins",
			pluginsPhase: "phase"
		};
		//#endregion
		//#region src/protocol.ts
		/**
		* Shared wire types and endpoint table between host half and browser half.
		*/
		/** API prefix registered on the web server (same-origin, loopback-only). */
		const API_BASE = "/plugins/skillforge/api";
		//#endregion
		//#region src/client/api.ts
		async function call(path, init) {
			const res = await fetch(API_BASE + path, {
				headers: { "content-type": "application/json" },
				...init
			});
			let envelope;
			try {
				envelope = await res.json();
			} catch {
				throw new Error(`unexpected response (${res.status})`);
			}
			if (!envelope.ok) throw new Error(envelope.error);
			return envelope.data;
		}
		function fetchCatalog() {
			return call("/catalog");
		}
		function fetchSkill(name) {
			return call("/skill?name=" + encodeURIComponent(name));
		}
		function toggleSkill(name, enabled) {
			return call("/toggle", {
				method: "POST",
				body: JSON.stringify({
					name,
					enabled
				})
			});
		}
		function checkSkills() {
			return call("/check", {
				method: "POST",
				body: "{}"
			});
		}
		function fetchEdit(name) {
			return call("/edit?name=" + encodeURIComponent(name));
		}
		function createSkill(input) {
			return call("/create", {
				method: "POST",
				body: JSON.stringify(input)
			});
		}
		function updateSkill(input) {
			return call("/update", {
				method: "POST",
				body: JSON.stringify(input)
			});
		}
		function renameSkill(name, newName) {
			return call("/rename", {
				method: "POST",
				body: JSON.stringify({
					name,
					newName
				})
			});
		}
		function deleteSkill(name) {
			return call("/delete", {
				method: "POST",
				body: JSON.stringify({ name })
			});
		}
		/** Archive import (base64 payload; 48 MiB server cap). */
		async function importArchive(bytes, conflict, dryRun) {
			let base64;
			try {
				base64 = btoa(String.fromCharCode(...bytes));
			} catch {
				const chunks = [];
				const chunk = 32768;
				for (let i = 0; i < bytes.length; i += chunk) chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunk)));
				base64 = btoa(chunks.join(""));
			}
			return call("/import", {
				method: "POST",
				body: JSON.stringify({
					kind: "archive",
					data: base64,
					conflict,
					dryRun
				})
			});
		}
		/** Directory import. */
		function importDir(path, conflict, dryRun) {
			return call("/import", {
				method: "POST",
				body: JSON.stringify({
					kind: "dir",
					path,
					conflict,
					dryRun
				})
			});
		}
		/** Download URL for a .skill export. */
		function exportUrl(name) {
			return `${API_BASE}/export?name=${encodeURIComponent(name)}`;
		}
		/** Ask the host to open a skill's folder in the file manager. */
		function openFolder(name) {
			return call("/open", {
				method: "POST",
				body: JSON.stringify({ name })
			});
		}
		/** Search the skill market. */
		function marketSearch(keyword) {
			return call("/market/search", {
				method: "POST",
				body: JSON.stringify({ keyword })
			});
		}
		/** Install a market skill (optionally to a workspace project root). */
		function marketInstall(id, workspaceId) {
			return call("/market/install", {
				method: "POST",
				body: JSON.stringify({
					id,
					workspaceId
				})
			});
		}
		/** Fetch a market skill's description (raw SKILL.md, host-cached). */
		function marketDescribe(id) {
			return call("/market/describe", {
				method: "POST",
				body: JSON.stringify({ id })
			});
		}
		/** Scan a GitHub repo for skills. */
		function githubScan(owner, repo) {
			return call("/github/scan", {
				method: "POST",
				body: JSON.stringify({
					owner,
					repo
				})
			});
		}
		/** Update a github-sourced skill. */
		function updateMarketSkill(name) {
			return call("/update", {
				method: "POST",
				body: JSON.stringify({ name })
			});
		}
		/** Fetch groups. */
		function fetchGroups() {
			return call("/groups");
		}
		/** Mutate groups. */
		function mutateGroups(input) {
			return call("/groups", {
				method: "POST",
				body: JSON.stringify(input)
			});
		}
		/** Move/copy a skill to another root. */
		function moveSkill(input) {
			return call("/move", {
				method: "POST",
				body: JSON.stringify(input)
			});
		}
		/** Fetch MCP servers. */
		function fetchMcp() {
			return call("/mcp");
		}
		/** Save an MCP server. */
		function saveMcp(input) {
			return call("/mcp", {
				method: "POST",
				body: JSON.stringify({
					op: "save",
					...input
				})
			});
		}
		/** Toggle an MCP server. */
		function toggleMcp(id, enabled) {
			return call("/mcp", {
				method: "POST",
				body: JSON.stringify({
					op: "toggle",
					id,
					enabled
				})
			});
		}
		/** Delete an MCP server. */
		function deleteMcp(id) {
			return call("/mcp", {
				method: "POST",
				body: JSON.stringify({
					op: "delete",
					id
				})
			});
		}
		/** Test an MCP server connection. */
		function testMcp(id) {
			return call("/mcp", {
				method: "POST",
				body: JSON.stringify({
					op: "test",
					id
				})
			});
		}
		/** Conversation loading: config + host session list. */
		function fetchConversation() {
			return call("/conversation");
		}
		/** Save a session's skill selection (empty clears it -> load all). */
		function saveConversation(sessionId, skills) {
			return call("/conversation", {
				method: "POST",
				body: JSON.stringify({
					sessionId,
					skills
				})
			});
		}
		/** Fetch the plugin inventory (official / third-party groups). */
		function fetchPlugins() {
			return call("/plugins");
		}
		//#endregion
		//#region src/client/Section.tsx
		/**
		* Settings-section panel: skill catalog with enable/disable toggles, search,
		* expandable detail, DSH-spec audit, and CRUD (new / edit / rename / delete).
		* Styled with dsw design tokens.
		*/
		/** Tiny Markdown renderer (no external dep). Handles headers, bold, italic, lists, code, links. */
		function renderMarkdown(text) {
			if (!text) return null;
			const lines = text.split("\n");
			const out = [];
			let inCode = false;
			let codeBuf = [];
			let inList = false;
			let listItems = [];
			const flushList = () => {
				if (inList) {
					out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						style: {
							margin: "4px 0",
							paddingLeft: "20px"
						},
						children: listItems.map((it, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
							style: { color: "var(--dsw-alias-label-secondary)" },
							children: renderInline(it)
						}, i))
					}, `list-${out.length}`));
					inList = false;
					listItems = [];
				}
			};
			const renderInline = (line) => {
				return line.split(/(`[^`]+`)/g).map((p, i) => {
					if (p.startsWith("`") && p.endsWith("`")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
						style: {
							background: "var(--dsw-alias-markdown-inline-code)",
							padding: "1px 4px",
							borderRadius: "4px",
							fontSize: "12px"
						},
						children: p.slice(1, -1)
					}, i);
					return p.split(/(\*\*[^*]+\*\*)/g).map((bp, j) => {
						if (bp.startsWith("**") && bp.endsWith("**")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: renderInline(bp.slice(2, -2)) }, `${i}-${j}`);
						return bp.split(/(\*[^*]+\*)/g).map((ip, k) => {
							if (ip.startsWith("*") && ip.endsWith("*") && !ip.startsWith("**")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", { children: ip.slice(1, -1) }, `${i}-${j}-${k}`);
							const linkMatch = ip.match(/\[([^\]]+)\]\(([^)]+)\)/);
							if (linkMatch) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: linkMatch[2],
								target: "_blank",
								rel: "noreferrer",
								style: { color: "var(--dsw-alias-brand-primary)" },
								children: linkMatch[1]
							}, `${i}-${j}-${k}`);
							return ip;
						});
					});
				});
			};
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (line.trim().startsWith("```")) {
					if (inCode) {
						flushList();
						out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							style: {
								background: "var(--dsw-alias-markdown-code-block)",
								padding: "8px",
								borderRadius: "6px",
								overflow: "auto",
								fontSize: "12px",
								color: "var(--dsw-alias-label-primary)"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: codeBuf.join("\n") })
						}, `code-${i}`));
						inCode = false;
						codeBuf = [];
					} else {
						flushList();
						inCode = true;
						line.trim().slice(3);
					}
					continue;
				}
				if (inCode) {
					codeBuf.push(line);
					continue;
				}
				const headerMatch = /^(#{1,6})\s+(.*)$/.exec(line);
				if (headerMatch) {
					flushList();
					const level = headerMatch[1].length;
					const Tag = `h${level}`;
					out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tag, {
						style: {
							fontWeight: 600,
							margin: "8px 0 4px",
							fontSize: `${16 - level}px`
						},
						children: renderInline(headerMatch[2])
					}, `h-${i}`));
					continue;
				}
				const listMatch = /^\s*[-*]\s+(.*)$/.exec(line);
				if (listMatch) {
					inList = true;
					listItems.push(listMatch[1]);
					continue;
				}
				if (line.trim() === "") {
					flushList();
					continue;
				}
				flushList();
				out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						margin: "4px 0",
						color: "var(--dsw-alias-label-secondary)"
					},
					children: renderInline(line)
				}, `p-${i}`));
			}
			flushList();
			if (inCode && codeBuf.length > 0) out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
				style: {
					background: "var(--dsw-alias-markdown-code-block)",
					padding: "8px",
					borderRadius: "6px",
					overflow: "auto",
					fontSize: "12px"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: codeBuf.join("\n") })
			}, "trailing-code"));
			return out.length === 0 ? null : out;
		}
		const s = {
			root: {
				display: "flex",
				flexDirection: "column",
				gap: "16px",
				height: "100%",
				overflow: "hidden",
				color: "var(--dsw-alias-label-primary)",
				fontSize: "13px",
				padding: "0 16px 16px"
			},
			header: {
				display: "flex",
				flexDirection: "column",
				gap: "8px"
			},
			titleRow: {
				display: "flex",
				alignItems: "center",
				gap: "8px"
			},
			title: {
				flex: 1,
				fontWeight: 600,
				fontSize: "16px"
			},
			bigSearch: {
				width: "100%",
				background: "var(--dsw-alias-bg-base)",
				border: "1px solid var(--dsw-alias-line-secondary)",
				borderRadius: "8px",
				color: "var(--dsw-alias-label-primary)",
				padding: "8px 12px",
				outline: "none",
				fontSize: "14px"
			},
			hint: {
				color: "var(--dsw-alias-label-tertiary)",
				fontSize: "12px",
				margin: 0,
				wordBreak: "break-all"
			},
			tabs: {
				display: "flex",
				gap: "4px",
				borderBottom: "1px solid var(--dsw-alias-line-secondary)",
				paddingBottom: "8px"
			},
			tab: {
				border: "none",
				background: "transparent",
				color: "var(--dsw-alias-label-secondary)",
				padding: "6px 12px",
				borderRadius: "6px",
				cursor: "pointer",
				fontSize: "13px",
				fontWeight: 500
			},
			tabActive: {
				border: "none",
				background: "var(--dsw-alias-interactive-bg-hover-solid)",
				color: "var(--dsw-alias-label-primary)",
				padding: "6px 12px",
				borderRadius: "6px",
				cursor: "pointer",
				fontSize: "13px",
				fontWeight: 600
			},
			toolbar: {
				display: "flex",
				gap: "6px",
				flexWrap: "wrap",
				justifyContent: "flex-end"
			},
			grid: {
				flex: 1,
				overflowY: "auto",
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
				gap: "12px",
				paddingRight: "4px"
			},
			card: {
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				border: "1px solid var(--dsw-alias-line-secondary)",
				borderRadius: "12px",
				padding: "12px",
				background: "var(--dsw-alias-bg-layer-)",
				transition: "border-color 0.15s, box-shadow 0.15s"
			},
			cardHover: { borderColor: "var(--dsw-alias-interactive-bg-hover)" },
			cardDisabled: { opacity: .55 },
			cardHead: {
				display: "flex",
				alignItems: "flex-start",
				gap: "8px"
			},
			cardIcon: {
				width: "20px",
				height: "20px",
				flexShrink: 0,
				color: "var(--dsw-alias-label-tertiary)"
			},
			name: {
				fontWeight: 600,
				overflowWrap: "anywhere",
				flex: 1,
				fontSize: "14px"
			},
			dot: {
				width: "8px",
				height: "8px",
				borderRadius: "50%",
				flexShrink: 0
			},
			badges: {
				display: "flex",
				gap: "4px",
				flexWrap: "wrap"
			},
			badge: {
				fontSize: "10px",
				padding: "2px 6px",
				borderRadius: "10px",
				border: "1px solid var(--dsw-alias-line-secondary)",
				color: "var(--dsw-alias-label-tertiary)",
				whiteSpace: "nowrap",
				background: "var(--dsw-alias-bg-base)"
			},
			badgeOk: {
				color: "var(--dsw-alias-state-success-primary)",
				borderColor: "var(--dsw-alias-state-success-secondary)"
			},
			badgeWarn: {
				color: "var(--dsw-alias-state-warn-primary)",
				borderColor: "var(--dsw-alias-state-warn-secondary)"
			},
			badgeSource: {
				color: "var(--dsw-alias-brand-primary)",
				borderColor: "var(--dsw-alias-brand-primary)",
				background: "transparent"
			},
			desc: {
				margin: 0,
				color: "var(--dsw-alias-label-secondary)",
				display: "-webkit-box",
				WebkitLineClamp: 2,
				WebkitBoxOrient: "vertical",
				overflow: "hidden",
				fontSize: "12px"
			},
			cardFooter: {
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				marginTop: "4px",
				paddingTop: "6px",
				borderTop: "1px solid var(--dsw-alias-line-secondary)"
			},
			toggle: {
				position: "relative",
				display: "inline-block",
				width: "36px",
				height: "20px",
				flexShrink: 0
			},
			toggleInput: {
				opacity: 0,
				width: 0,
				height: 0
			},
			toggleSlider: {
				position: "absolute",
				cursor: "pointer",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: "var(--dsw-alias-label-tertiary)",
				transition: "0.2s",
				borderRadius: "20px"
			},
			toggleSliderOn: { background: "var(--dsw-alias-state-success-primary)" },
			toggleSliderBefore: {
				position: "absolute",
				content: "\"\"",
				height: "14px",
				width: "14px",
				left: "3px",
				bottom: "3px",
				background: "white",
				transition: "0.2s",
				borderRadius: "50%"
			},
			toggleSliderBeforeOn: { transform: "translateX(16px)" },
			btn: {
				border: "none",
				background: "transparent",
				color: "var(--dsw-alias-label-secondary)",
				cursor: "pointer",
				fontSize: "12px",
				padding: "4px 8px",
				borderRadius: "6px",
				transition: "background 0.15s"
			},
			btnPrimary: {
				border: "none",
				background: "var(--dsw-alias-brand-primary)",
				color: "white",
				cursor: "pointer",
				fontSize: "12px",
				padding: "5px 10px",
				borderRadius: "6px"
			},
			btnDanger: { color: "var(--dsw-alias-state-error-primary)" },
			btnGhost: { background: "var(--dsw-alias-bg-base)" },
			detail: {
				borderTop: "1px solid var(--dsw-alias-line-secondary)",
				paddingTop: "8px",
				marginTop: "4px",
				fontSize: "12px"
			},
			form: {
				display: "flex",
				flexDirection: "column",
				gap: "8px"
			},
			field: {
				display: "flex",
				flexDirection: "column",
				gap: "4px"
			},
			label: {
				fontSize: "11px",
				color: "var(--dsw-alias-label-tertiary)"
			},
			input: {
				background: "var(--dsw-alias-bg-base)",
				border: "1px solid var(--dsw-alias-line-secondary)",
				borderRadius: "6px",
				color: "var(--dsw-alias-label-primary)",
				padding: "6px 8px",
				fontSize: "12px",
				outline: "none"
			},
			textarea: {
				background: "var(--dsw-alias-bg-base)",
				border: "1px solid var(--dsw-alias-line-secondary)",
				borderRadius: "6px",
				color: "var(--dsw-alias-label-primary)",
				padding: "6px 8px",
				fontSize: "12px",
				fontFamily: "monospace",
				minHeight: "120px",
				resize: "vertical",
				outline: "none"
			},
			actions: {
				display: "flex",
				gap: "6px",
				alignItems: "center"
			},
			sectionLabel: {
				fontWeight: 600,
				fontSize: "12px",
				color: "var(--dsw-alias-label-tertiary)",
				textTransform: "uppercase",
				letterSpacing: "0.04em"
			},
			status: { color: "var(--dsw-alias-state-error-primary)" },
			refresh: {
				border: "1px solid var(--dsw-alias-line-secondary)",
				background: "var(--dsw-alias-bg-base)",
				color: "var(--dsw-alias-label-primary)",
				borderRadius: "6px",
				padding: "5px 10px",
				cursor: "pointer",
				fontSize: "12px"
			},
			primary: {
				border: "none",
				background: "var(--dsw-alias-brand-primary)",
				color: "white",
				borderRadius: "6px",
				padding: "5px 10px",
				cursor: "pointer",
				fontSize: "12px"
			},
			link: {
				border: "none",
				background: "transparent",
				color: "var(--dsw-alias-label-secondary)",
				cursor: "pointer",
				fontSize: "12px",
				padding: "4px 6px",
				borderRadius: "4px",
				textDecoration: "underline"
			},
			linkDisabled: {
				opacity: .4,
				cursor: "not-allowed"
			},
			marketCard: {
				border: "1px solid var(--dsw-alias-line-secondary)",
				borderRadius: "12px",
				padding: "14px",
				background: "var(--dsw-alias-bg-layer-)",
				display: "flex",
				flexDirection: "column",
				gap: "6px"
			},
			marketHead: {
				display: "flex",
				alignItems: "flex-start",
				gap: "10px"
			},
			marketIcon: {
				width: "36px",
				height: "36px",
				borderRadius: "8px",
				background: "var(--dsw-alias-bg-base)",
				flexShrink: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontWeight: 700,
				fontSize: "16px",
				color: "var(--dsw-alias-brand-primary)"
			},
			marketMeta: {
				flex: 1,
				minWidth: 0
			},
			marketName: {
				fontWeight: 600,
				fontSize: "14px",
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			},
			marketDesc: {
				color: "var(--dsw-alias-label-secondary)",
				fontSize: "12px",
				marginTop: "4px",
				display: "-webkit-box",
				WebkitLineClamp: 3,
				WebkitBoxOrient: "vertical",
				overflow: "hidden"
			},
			marketStats: {
				display: "flex",
				gap: "8px",
				fontSize: "11px",
				color: "var(--dsw-alias-label-tertiary)",
				marginTop: "4px"
			},
			marketInstallBtn: {
				background: "var(--dsw-alias-brand-primary)",
				color: "white",
				border: "none",
				borderRadius: "6px",
				padding: "6px 12px",
				cursor: "pointer",
				fontSize: "12px",
				fontWeight: 600,
				marginTop: "6px"
			},
			marketInstalledBtn: {
				background: "var(--dsw-alias-state-success-primary)",
				color: "white",
				border: "none",
				borderRadius: "6px",
				padding: "6px 12px",
				cursor: "default",
				fontSize: "12px",
				fontWeight: 600,
				marginTop: "6px"
			},
			empty: {
				color: "var(--dsw-alias-label-tertiary)",
				fontSize: "13px",
				padding: "24px 0",
				textAlign: "center"
			}
		};
		function ToggleSwitch({ enabled, onChange, disabled }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				style: {
					...s.toggle,
					cursor: disabled ? "not-allowed" : "pointer",
					opacity: disabled ? .5 : 1
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					style: s.toggleInput,
					checked: enabled,
					onChange: (e) => onChange(e.target.checked),
					disabled
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: enabled ? {
						...s.toggleSlider,
						...s.toggleSliderOn
					} : s.toggleSlider,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: enabled ? {
						...s.toggleSliderBefore,
						...s.toggleSliderBeforeOn
					} : s.toggleSliderBefore })
				})]
			});
		}
		/** One catalog row with toggle, detail, edit, rename, delete, move. */
		function SkillRow(props) {
			const { skill, busy, t, onToggle, onChanged, onError, moveTargets } = props;
			const [open, setOpen] = (0, react.useState)(false);
			const [detail, setDetail] = (0, react.useState)(null);
			const [detailError, setDetailError] = (0, react.useState)(null);
			const [editing, setEditing] = (0, react.useState)(false);
			const [editData, setEditData] = (0, react.useState)(null);
			const [saving, setSaving] = (0, react.useState)(false);
			const [renaming, setRenaming] = (0, react.useState)(false);
			const [newName, setNewName] = (0, react.useState)("");
			const [updating, setUpdating] = (0, react.useState)(false);
			const [moving, setMoving] = (0, react.useState)(false);
			const [moveTarget, setMoveTarget] = (0, react.useState)("user-dsh");
			const [moveCopy, setMoveCopy] = (0, react.useState)(false);
			const toggleDetail = (0, react.useCallback)(() => {
				if (!open) fetchSkill(skill.name).then(setDetail).then(() => setDetailError(null)).catch((error) => setDetailError(error instanceof Error ? error.message : String(error)));
				setOpen(!open);
			}, [open, skill.name]);
			const startEdit = (0, react.useCallback)(() => {
				setEditing(true);
				setDetail(null);
				setOpen(false);
				fetchEdit(skill.name).then((data) => setEditData(data)).catch((error) => onError(error instanceof Error ? error.message : String(error)));
			}, [skill.name, onError]);
			const saveEdit = (0, react.useCallback)(() => {
				if (!editData) return;
				setSaving(true);
				updateSkill({
					name: skill.name,
					description: editData.description,
					whenToUse: editData.whenToUse,
					content: editData.content
				}).then(() => {
					setEditing(false);
					onChanged();
				}).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setSaving(false));
			}, [
				editData,
				skill.name,
				onChanged,
				onError
			]);
			const doRename = (0, react.useCallback)(() => {
				const next = newName.trim();
				if (!next) return;
				renameSkill(skill.name, next).then(() => {
					setRenaming(false);
					setNewName("");
					onChanged();
				}).catch((error) => onError(error instanceof Error ? error.message : String(error)));
			}, [
				newName,
				skill.name,
				onChanged,
				onError
			]);
			const doDelete = (0, react.useCallback)(() => {
				deleteSkill(skill.name).then(() => onChanged()).catch((error) => onError(error instanceof Error ? error.message : String(error)));
			}, [
				skill.name,
				onChanged,
				onError
			]);
			const doMove = (0, react.useCallback)(() => {
				const [kind, id] = moveTarget.split(":");
				moveSkill({
					name: skill.name,
					to: kind,
					workspaceId: id || void 0,
					copy: moveCopy
				}).then(() => {
					setMoving(false);
					onChanged();
				}).catch((error) => onError(error instanceof Error ? error.message : String(error)));
			}, [
				moveTarget,
				moveCopy,
				skill.name,
				onChanged,
				onError
			]);
			const canEdit = skill.source === "user-dsh";
			const dotColor = skill.checked === false ? "var(--dsw-alias-state-warn-primary)" : "var(--dsw-alias-state-success-primary)";
			const sourceLabel = skill.source === "user-dsh" ? "用户" : skill.source === "user-agents" ? "Agent" : skill.source;
			const sourceStyle = skill.source === "user-agents" ? s.badgeSource : s.badge;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...s.card,
					...skill.enabled ? {} : s.cardDisabled
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.cardHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									...s.cardIcon,
									color: dotColor,
									fontSize: "18px"
								},
								children: "●"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									flex: 1,
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										alignItems: "center",
										gap: "6px"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: s.name,
										children: skill.name
									}), skill.flat !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: s.badge,
										children: skill.flat ? "flat" : "bundle"
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										...s.badges,
										marginTop: "4px"
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: sourceStyle,
											children: sourceLabel
										}),
										!skill.modelInvocable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												...s.badge,
												...s.badgeWarn
											},
											children: "模型: 否"
										}),
										!skill.userInvocable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												...s.badge,
												...s.badgeWarn
											},
											children: "用户: 否"
										}),
										skill.provenance && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: s.badge,
											title: skill.provenance.location,
											children: skill.provenance.kind === "archive" ? "归档" : skill.provenance.kind === "dir" ? "目录" : "手动"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleSwitch, {
								enabled: skill.enabled,
								onChange: (v) => onToggle(skill.name, v),
								disabled: busy === skill.name
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: s.desc,
						children: skill.description || t("noDescription")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s.cardFooter,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "4px",
								flexWrap: "wrap"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.btn,
									onClick: toggleDetail,
									children: open ? "收起" : "详情"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.btn,
									onClick: () => openFolder(skill.name).catch((error) => onError(error instanceof Error ? error.message : String(error))),
									children: "打开文件夹"
								}),
								canEdit && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: s.btn,
										onClick: startEdit,
										children: "编辑"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: s.btn,
										onClick: () => setRenaming(true),
										children: "重命名"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: s.btn,
										onClick: () => setMoving(true),
										children: "移动"
									}),
									skill.provenance?.kind === "github" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: s.btn,
										disabled: updating,
										onClick: () => {
											setUpdating(true);
											updateMarketSkill(skill.name).then(() => onChanged()).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setUpdating(false));
										},
										children: "更新"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: {
											...s.btn,
											...s.btnDanger
										},
										onClick: () => {
											if (confirm(`确定删除 "${skill.name}"？此操作不可撤销。`)) doDelete();
										},
										children: "删除"
									})
								] }),
								!canEdit && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.hint,
									children: "（共享目录只读）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.btn,
									onClick: () => {
										const a = document.createElement("a");
										a.href = exportUrl(skill.name);
										a.download = `${skill.name}.skill`;
										a.click();
									},
									children: "导出"
								})
							]
						})
					}),
					open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.detail,
						children: [detail ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							detail.whenToUse && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								style: s.hint,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "何时使用：" }), detail.whenToUse]
							}),
							detail.path && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								style: s.hint,
								children: ["路径: ", detail.path]
							}),
							detail.frontmatter && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s.sectionLabel,
								children: "frontmatter"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								style: {
									background: "var(--dsw-alias-bg-base)",
									border: "1px solid var(--dsw-alias-line-secondary)",
									borderRadius: "6px",
									padding: "8px",
									fontSize: "12px",
									overflow: "auto",
									maxHeight: "160px"
								},
								children: detail.frontmatter
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s.sectionLabel,
								children: "内容"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									background: "var(--dsw-alias-bg-base)",
									border: "1px solid var(--dsw-alias-line-secondary)",
									borderRadius: "6px",
									padding: "10px",
									fontSize: "12px",
									overflow: "auto",
									maxHeight: "360px",
									lineHeight: "1.6"
								},
								children: renderMarkdown(detail.content || t("emptyContent"))
							})
						] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: s.hint,
							children: "加载中…"
						}), detailError && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s.status,
							children: [t("error"), detailError]
						})]
					}),
					renaming && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.form,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s.label,
								children: t("renameTo")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: s.input,
								value: newName,
								onChange: (event) => setNewName(event.target.value),
								onKeyDown: (event) => {
									if (event.key === "Enter") doRename();
								}
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s.actions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: s.primary,
								onClick: doRename,
								children: t("save")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: s.btn,
								onClick: () => setRenaming(false),
								children: t("cancel")
							})]
						})]
					}),
					moving && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.form,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s.label,
								children: t("moveTo")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								style: s.input,
								value: moveTarget,
								onChange: (event) => setMoveTarget(event.target.value),
								children: moveTargets.map((target) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: target.id,
									children: target.label
								}, target.id))
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s.actions,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: moveCopy ? s.primary : s.btnGhost,
									onClick: () => setMoveCopy(false),
									children: t("moveMove")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: moveCopy ? s.primary : s.btnGhost,
									onClick: () => setMoveCopy(true),
									children: t("moveCopy")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.primary,
									onClick: doMove,
									children: t("save")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.btn,
									onClick: () => setMoving(false),
									children: t("cancel")
								})
							]
						})]
					}),
					editing && editData && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.form,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.label,
									children: t("nameLabel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.hint,
									children: editData.name
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.label,
									children: t("descriptionLabel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: s.input,
									value: editData.description,
									onChange: (event) => setEditData({
										...editData,
										description: event.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.label,
									children: t("whenToUseLabel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: s.input,
									value: editData.whenToUse ?? "",
									onChange: (event) => setEditData({
										...editData,
										whenToUse: event.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.label,
									children: t("contentLabel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									style: s.textarea,
									value: editData.content,
									onChange: (event) => setEditData({
										...editData,
										content: event.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.actions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.primary,
									onClick: saveEdit,
									disabled: saving,
									children: t("save")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.btn,
									onClick: () => setEditing(false),
									children: t("cancel")
								})]
							})
						]
					})
				]
			});
		}
		/** New-skill form (inline). */
		function NewSkillForm(props) {
			const { t, onDone, onError } = props;
			const [name, setName] = (0, react.useState)("");
			const [description, setDescription] = (0, react.useState)("");
			const [whenToUse, setWhenToUse] = (0, react.useState)("");
			const [content, setContent] = (0, react.useState)("");
			const [saving, setSaving] = (0, react.useState)(false);
			const submit = (0, react.useCallback)(() => {
				setSaving(true);
				createSkill({
					name,
					description,
					whenToUse,
					content
				}).then(() => {
					onDone();
				}).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setSaving(false));
			}, [
				name,
				description,
				whenToUse,
				content,
				onDone,
				onError
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: s.form,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: s.label,
							children: t("nameLabel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							style: s.input,
							value: name,
							onChange: (event) => setName(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: s.label,
							children: t("descriptionLabel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							style: s.input,
							value: description,
							onChange: (event) => setDescription(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: s.label,
							children: t("whenToUseLabel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							style: s.input,
							value: whenToUse,
							onChange: (event) => setWhenToUse(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: s.label,
							children: t("contentLabel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							style: s.textarea,
							value: content,
							onChange: (event) => setContent(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: s.primary,
							onClick: submit,
							disabled: saving,
							children: t("save")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: s.link,
							onClick: onDone,
							children: t("cancel")
						})]
					})
				]
			});
		}
		/** Import panel (archive file + directory path, conflict policy, preview/run). */
		function ImportPanel(props) {
			const { t, onDone, onError } = props;
			const [conflict, setConflict] = (0, react.useState)("skip");
			const [dirPath, setDirPath] = (0, react.useState)("");
			const [preview, setPreview] = (0, react.useState)(null);
			const [running, setRunning] = (0, react.useState)(false);
			const fileRef = (0, react.useRef)(null);
			const pendingFile = (0, react.useRef)(null);
			const readFile = (file) => new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(new Uint8Array(reader.result));
				reader.onerror = () => reject(/* @__PURE__ */ new Error("cannot read file"));
				reader.readAsArrayBuffer(file);
			});
			const handleFile = (0, react.useCallback)((file) => {
				readFile(file).then(async (bytes) => {
					if (bytes.length > 48 * 1024 * 1024) throw new Error("archive exceeds 48 MiB");
					pendingFile.current = bytes;
					setPreview(await importArchive(bytes, conflict, true));
				}).catch((error) => onError(error instanceof Error ? error.message : String(error)));
			}, [conflict, onError]);
			const previewDir = (0, react.useCallback)(() => {
				const path = dirPath.trim();
				if (!path) return;
				importDir(path, conflict, true).then(setPreview).catch((error) => onError(error instanceof Error ? error.message : String(error)));
			}, [
				dirPath,
				conflict,
				onError
			]);
			const run = (0, react.useCallback)(() => {
				setRunning(true);
				const finish = () => {
					setRunning(false);
					onDone();
				};
				if (pendingFile.current) importArchive(pendingFile.current, conflict, false).then((result) => {
					if (result.failed.length) onError(`${t("importFailed")}: ${result.failed.map((item) => `${item.name}: ${item.error}`).join(", ")}`);
					finish();
				}).catch((error) => {
					onError(error instanceof Error ? error.message : String(error));
					setRunning(false);
				});
				else importDir(dirPath.trim(), conflict, false).then((result) => {
					if (result.failed.length) onError(`${t("importFailed")}: ${result.failed.map((item) => `${item.name}: ${item.error}`).join(", ")}`);
					finish();
				}).catch((error) => {
					onError(error instanceof Error ? error.message : String(error));
					setRunning(false);
				});
			}, [
				conflict,
				dirPath,
				onDone,
				onError,
				t
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: s.form,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.actions,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: s.refresh,
								onClick: () => fileRef.current?.click(),
								children: t("importArchive")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: fileRef,
								type: "file",
								accept: ".zip,.skill",
								style: { display: "none" },
								onChange: (event) => {
									const file = event.target.files?.[0];
									if (file) handleFile(file);
									event.target.value = "";
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: s.link,
								onClick: () => fileRef.current?.click(),
								children: t("importClose")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: s.label,
							children: t("importPath")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s.actions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: {
									...s.input,
									flex: 1
								},
								placeholder: t("importPathPlaceholder"),
								value: dirPath,
								onChange: (event) => setDirPath(event.target.value)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: s.refresh,
								onClick: previewDir,
								children: t("importPreview")
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: s.label,
							children: t("importConflict")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							style: s.input,
							value: conflict,
							onChange: (event) => setConflict(event.target.value),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "skip",
								children: t("importSkip")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "overwrite",
								children: t("importOverwrite")
							})]
						})]
					}),
					preview && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.hint,
						children: [
							preview.pending.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
								t("importPending"),
								": ",
								preview.pending.join(", ")
							] }),
							preview.conflicts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { color: "var(--dsw-alias-state-warn-primary)" },
								children: [
									t("importConflicts"),
									": ",
									preview.conflicts.join(", ")
								]
							}),
							preview.pending.length === 0 && preview.conflicts.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: t("importNoSkills") })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: s.primary,
							onClick: run,
							disabled: running || !pendingFile.current && !dirPath.trim(),
							children: t("importRun")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: s.link,
							onClick: onDone,
							children: t("cancel")
						})]
					})
				]
			});
		}
		/** Market panel: skills.sh search + GitHub repo import. */
		function MarketPanel(props) {
			const { t, onDone, onError, catalog } = props;
			const [activeTab, setActiveTab] = (0, react.useState)("skillhub");
			const [keyword, setKeyword] = (0, react.useState)("");
			const [items, setItems] = (0, react.useState)(null);
			const [itemDescriptions, setItemDescriptions] = (0, react.useState)({});
			const [searching, setSearching] = (0, react.useState)(false);
			const [owner, setOwner] = (0, react.useState)("");
			const [repo, setRepo] = (0, react.useState)("");
			const [branch, setBranch] = (0, react.useState)("");
			const [repos, setRepos] = (0, react.useState)([]);
			const [repoIdCounter, setRepoIdCounter] = (0, react.useState)(0);
			const [expandedRepos, setExpandedRepos] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [repoSkills, setRepoSkills] = (0, react.useState)({});
			const [scanning, setScanning] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(null);
			const [installedFilter, setInstalledFilter] = (0, react.useState)("");
			const [installedScope, setInstalledScope] = (0, react.useState)("user");
			const [installedPage, setInstalledPage] = (0, react.useState)(1);
			const [installedPageSize, setInstalledPageSize] = (0, react.useState)(20);
			const [sortBy, setSortBy] = (0, react.useState)("rating");
			const [categoryFilter, setCategoryFilter] = (0, react.useState)("all");
			const [hubPage, setHubPage] = (0, react.useState)(1);
			const [hubPageSize, setHubPageSize] = (0, react.useState)(20);
			const doSearch = (0, react.useCallback)(() => {
				if (keyword.trim().length < 2) return;
				setSearching(true);
				setItemDescriptions({});
				marketSearch(keyword).then(async (results) => {
					setItems(results);
					const descriptions = {};
					for (let i = 0; i < results.length; i += 5) {
						const batch = results.slice(i, i + 5);
						await Promise.all(batch.map(async (item) => {
							try {
								const res = await marketDescribe(item.id);
								if (res.description) descriptions[item.id] = res.description;
							} catch {}
						}));
					}
					setItemDescriptions(descriptions);
				}).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setSearching(false));
			}, [keyword, onError]);
			const doInstall = (0, react.useCallback)((id, workspaceId) => {
				setBusy(`install:${id}`);
				marketInstall(id, workspaceId).then((result) => onError(`${result.installed} ${t("installSuccess")}`)).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setBusy(null));
			}, [onError, t]);
			const addRepo = (0, react.useCallback)(() => {
				if (!owner.trim() || !repo.trim()) return;
				setRepoIdCounter((c) => {
					const id = `repo-${c + 1}`;
					setRepos((prev) => [...prev, {
						id,
						owner: owner.trim(),
						repo: repo.trim(),
						branch: branch.trim() || "main"
					}]);
					return c + 1;
				});
				setOwner("");
				setRepo("");
				setBranch("");
			}, [
				owner,
				repo,
				branch
			]);
			const removeRepo = (0, react.useCallback)((id) => {
				setRepos((prev) => prev.filter((r) => r.id !== id));
				setExpandedRepos((prev) => {
					const next = new Set(prev);
					next.delete(id);
					return next;
				});
				setRepoSkills((prev) => {
					const next = { ...prev };
					delete next[id];
					return next;
				});
			}, []);
			const toggleExpand = (0, react.useCallback)((id) => {
				setExpandedRepos((prev) => {
					const next = new Set(prev);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					return next;
				});
			}, []);
			const scanRepo = (0, react.useCallback)((id, o, r, _b) => {
				setScanning(id);
				setRepoSkills((prev) => ({
					...prev,
					[id]: []
				}));
				githubScan(o, r).then((result) => {
					setRepoSkills((prev) => ({
						...prev,
						[id]: result.skills
					}));
					if (result.skills.length > 0) setExpandedRepos((prev) => new Set(prev).add(id));
				}).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setScanning(null));
			}, [onError]);
			const installFromRepo = (0, react.useCallback)((repoId, skillName, o, r) => {
				setBusy(`${repoId}:${skillName}`);
				marketInstall(`${o}/${r}/${skillName}`).then(() => onError(`${skillName} ${t("installSuccess")}`)).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setBusy(null));
			}, [onError, t]);
			const getCategory = (item) => {
				const parts = item.source.split("/");
				if (parts.length >= 2) {
					if (parts[0] === "anthropics" && parts[1] === "skills") return "official";
					return parts[1];
				}
				return "other";
			};
			const getCategoryLabel = (cat) => {
				return {
					official: "官方",
					skills: "技能库",
					"claude-office-skills": "办公",
					anthropics: "官方"
				}[cat] || cat;
			};
			const formatInstalls = (n) => {
				if (n >= 1e4) return `${(n / 1e4).toFixed(1)}万`;
				if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
				return String(n);
			};
			const workspaces = catalog?.workspaces ?? [];
			const userSkills = (catalog?.skills ?? []).filter((skill) => !installedFilter || skill.name.includes(installedFilter.toLowerCase()) || skill.description.toLowerCase().includes(installedFilter.toLowerCase()));
			const scopeSkills = installedScope === "user" ? userSkills : (workspaces.find((ws) => ws.id === installedScope)?.skills ?? []).filter((skill) => !installedFilter || skill.name.includes(installedFilter.toLowerCase()));
			const installedTotalPages = Math.max(1, Math.ceil(scopeSkills.length / installedPageSize));
			const installedPageSkills = scopeSkills.slice((installedPage - 1) * installedPageSize, installedPage * installedPageSize);
			const sortedItems = (items ?? []).slice();
			if (sortBy === "downloads") sortedItems.sort((a, b) => b.installs - a.installs);
			else if (sortBy === "newest") sortedItems.sort((a, b) => b.source.localeCompare(a.source));
			else sortedItems.sort((a, b) => b.installs - a.installs);
			const categorySet = Array.from(new Set(sortedItems.map((item) => getCategory(item))));
			const filteredItems = categoryFilter === "all" ? sortedItems : sortedItems.filter((item) => getCategory(item) === categoryFilter);
			const hubTotalPages = Math.max(1, Math.ceil(filteredItems.length / hubPageSize));
			const hubPageItems = filteredItems.slice((hubPage - 1) * hubPageSize, hubPage * hubPageSize);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: s.form,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.tabs,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: activeTab === "installed" ? s.tabActive : s.tab,
							onClick: () => setActiveTab("installed"),
							children: t("tabInstalled")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: activeTab === "skillhub" ? s.tabActive : s.tab,
							onClick: () => setActiveTab("skillhub"),
							children: t("tabSkillHub")
						})]
					}),
					activeTab === "skillhub" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s.card,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s.sectionLabel,
								children: t("githubImport")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "6px",
									marginTop: "6px"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: {
											...s.input,
											flex: 1
										},
										placeholder: t("githubOwner"),
										value: owner,
										onChange: (event) => setOwner(event.target.value)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: {
											...s.input,
											flex: 1
										},
										placeholder: t("githubRepo"),
										value: repo,
										onChange: (event) => setRepo(event.target.value)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: {
											...s.input,
											width: "100px"
										},
										placeholder: t("githubBranch"),
										value: branch,
										onChange: (event) => setBranch(event.target.value)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: s.primary,
										onClick: addRepo,
										children: t("githubAddRepo")
									})
								]
							})]
						}),
						repos.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: s.card,
							children: repos.map((r) => {
								const isExpanded = expandedRepos.has(r.id);
								const skills = repoSkills[r.id];
								const isScanning = scanning === r.id;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										padding: "8px 0",
										borderBottom: "1px solid var(--dsw-alias-line-secondary)"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											gap: "6px",
											alignItems: "center"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													flex: 1,
													fontWeight: 600
												},
												children: [
													r.owner,
													"/",
													r.repo,
													" (",
													r.branch,
													")"
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: s.btn,
												onClick: () => scanRepo(r.id, r.owner, r.repo, r.branch),
												disabled: isScanning,
												children: isScanning ? "…" : t("repoSearch")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												style: s.btn,
												onClick: () => toggleExpand(r.id),
												children: [
													t("repoExpand"),
													" (",
													skills?.length ?? "?",
													")"
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: {
													...s.btn,
													...s.btnDanger
												},
												onClick: () => removeRepo(r.id),
												children: t("repoRemove")
											})
										]
									}), isExpanded && skills && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											marginTop: "6px",
											paddingLeft: "12px"
										},
										children: [skills.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: s.hint,
											children: t("githubNoSkills")
										}), skills.map((skill) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: "6px",
												alignItems: "center",
												padding: "4px 0"
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: { flex: 1 },
												children: skill.name
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: s.btnPrimary,
												disabled: busy === `${r.id}:${skill.name}`,
												onClick: () => installFromRepo(r.id, skill.name, r.owner, r.repo),
												children: t("githubInstall")
											})]
										}, skill.name))]
									})]
								}, r.id);
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "6px",
								marginTop: "4px"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: {
									...s.input,
									flex: 1
								},
								placeholder: t("marketPlaceholder"),
								value: keyword,
								onChange: (event) => setKeyword(event.target.value),
								onKeyDown: (event) => {
									if (event.key === "Enter") doSearch();
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: s.primary,
								onClick: doSearch,
								disabled: searching,
								children: searching ? t("marketSearching") : t("marketSearch")
							})]
						}),
						items && items.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: s.empty,
							children: t("marketNoResults")
						}),
						items && items.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "6px",
									flexWrap: "wrap",
									alignItems: "center"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										style: s.input,
										value: categoryFilter,
										onChange: (e) => {
											setCategoryFilter(e.target.value);
											setHubPage(1);
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "all",
											children: t("categoryAll")
										}), categorySet.map((cat) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: cat,
											children: getCategoryLabel(cat)
										}, cat))]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
										style: s.input,
										value: sortBy,
										onChange: (e) => {
											setSortBy(e.target.value);
											setHubPage(1);
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "rating",
												children: t("sortByRating")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "downloads",
												children: t("sortByDownloads")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "newest",
												children: t("sortByNewest")
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: s.hint,
										children: t("totalResults", { d: filteredItems.length })
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: s.grid,
								children: hubPageItems.map((item) => {
									const cat = getCategory(item);
									const catLabel = getCategoryLabel(cat);
									const desc = itemDescriptions[item.id] || item.name;
									const isBusy = busy === `install:${item.id}`;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: s.marketCard,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: s.marketHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													style: s.marketIcon,
													children: item.name.charAt(0).toUpperCase()
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: s.marketMeta,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														style: {
															display: "flex",
															gap: "6px",
															alignItems: "center"
														},
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															style: s.marketName,
															children: item.name
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															style: s.badge,
															children: catLabel
														})]
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														style: s.marketStats,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
																t("downloads"),
																" ",
																formatInstalls(item.installs)
															] }),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "·" }),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
																t("installs"),
																" ",
																formatInstalls(item.installs)
															] })
														]
													})]
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: s.marketDesc,
												children: desc
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: s.actions,
												children: [
													workspaces.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														style: s.marketInstallBtn,
														disabled: isBusy,
														onClick: () => doInstall(item.id, workspaces[0].id),
														children: t("installToProject")
													}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														style: s.marketInstallBtn,
														disabled: isBusy,
														onClick: () => doInstall(item.id),
														children: t("installToUser")
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														style: s.btn,
														disabled: isBusy,
														onClick: () => doInstall(item.id),
														children: t("installToUser")
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
														href: `https://github.com/${item.source}`,
														target: "_blank",
														rel: "noreferrer",
														style: {
															color: "var(--dsw-alias-brand-primary)",
															fontSize: "12px",
															textDecoration: "none"
														},
														children: t("detail")
													})
												]
											})
										]
									}, item.id);
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "6px",
									alignItems: "center",
									justifyContent: "flex-end"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: s.hint,
										children: t("pageOf", {
											d: hubPage,
											d2: hubTotalPages
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: s.btn,
										disabled: hubPage <= 1,
										onClick: () => setHubPage(hubPage - 1),
										children: "←"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: s.btn,
										disabled: hubPage >= hubTotalPages,
										onClick: () => setHubPage(hubPage + 1),
										children: "→"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
										style: s.input,
										value: hubPageSize,
										onChange: (e) => {
											setHubPageSize(Number(e.target.value));
											setHubPage(1);
										},
										children: [
											10,
											20,
											30,
											50
										].map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: n,
											children: t("itemsPerPage", { d: n })
										}, n))
									})
								]
							})
						] })
					] }),
					activeTab === "installed" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "6px",
								flexWrap: "wrap",
								alignItems: "center"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									style: installedScope === "user" ? s.tabActive : s.tab,
									onClick: () => {
										setInstalledScope("user");
										setInstalledPage(1);
									},
									children: [
										t("tabUser"),
										" (",
										userSkills.length,
										")"
									]
								}),
								workspaces.map((ws) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									style: installedScope === ws.id ? s.tabActive : s.tab,
									onClick: () => {
										setInstalledScope(ws.id);
										setInstalledPage(1);
									},
									children: [
										ws.title,
										" (",
										(catalog?.workspaces.find((w) => w.id === ws.id)?.skills ?? []).length,
										")"
									]
								}, ws.id)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: {
										...s.input,
										flex: 1,
										minWidth: "120px"
									},
									placeholder: t("filterPlaceholder"),
									value: installedFilter,
									onChange: (e) => {
										setInstalledFilter(e.target.value);
										setInstalledPage(1);
									}
								})
							]
						}),
						installedPageSkills.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: s.empty,
							children: t("noSkills")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: s.grid,
							children: installedPageSkills.map((skill) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									...s.card,
									...skill.enabled ? {} : s.cardDisabled
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: s.cardHead,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													...s.cardIcon,
													color: skill.enabled ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-state-warn-primary)",
													fontSize: "18px"
												},
												children: "●"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: {
													flex: 1,
													minWidth: 0
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													style: {
														display: "flex",
														alignItems: "center",
														gap: "6px"
													},
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															style: s.name,
															children: skill.name
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															style: installedScope === "user" ? {
																...s.badge,
																...s.badgeSource
															} : s.badge,
															children: installedScope === "user" ? t("badgeUser") : t("badgeProject")
														}),
														skill.provenance?.kind === "github" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															style: s.badge,
															children: t("badgeGitHub")
														})
													]
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleSwitch, {
												enabled: skill.enabled,
												onChange: () => {},
												disabled: true
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: s.desc,
										children: skill.description || t("noDescription")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: s.cardFooter,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												...s.badge,
												...skill.enabled ? s.badgeOk : s.badgeWarn
											},
											children: skill.enabled ? `${t("enabled")} ${t("installSuccess")}` : t("disabled")
										})
									})
								]
							}, skill.name))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "6px",
								alignItems: "center",
								justifyContent: "flex-end"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.hint,
									children: t("pageOf", {
										d: installedPage,
										d2: installedTotalPages
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.btn,
									disabled: installedPage <= 1,
									onClick: () => setInstalledPage(installedPage - 1),
									children: "←"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.btn,
									disabled: installedPage >= installedTotalPages,
									onClick: () => setInstalledPage(installedPage + 1),
									children: "→"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									style: s.input,
									value: installedPageSize,
									onChange: (e) => {
										setInstalledPageSize(Number(e.target.value));
										setInstalledPage(1);
									},
									children: [
										10,
										20,
										30,
										50
									].map((n) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: n,
										children: t("itemsPerPage", { d: n })
									}, n))
								})
							]
						})
					] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s.actions,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: s.link,
							onClick: onDone,
							children: t("cancel")
						})
					})
				]
			});
		}
		/** MCP panel: server list with real connect/disconnect, test, CRUD. */
		function McpPanel(props) {
			const { t, onError } = props;
			const [servers, setServers] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(null);
			const [creating, setCreating] = (0, react.useState)(false);
			const [form, setForm] = (0, react.useState)({
				name: "",
				transport: "stdio",
				serverName: "",
				command: "",
				args: "",
				url: ""
			});
			const load = (0, react.useCallback)(() => {
				fetchMcp().then((data) => setServers(data.servers)).catch((error) => onError(error instanceof Error ? error.message : String(error)));
			}, [onError]);
			(0, react.useEffect)(load, [load]);
			const submit = (0, react.useCallback)(() => {
				if (!form.name.trim()) return;
				setBusy("save");
				saveMcp({
					name: form.name,
					transport: form.transport,
					serverName: form.serverName || void 0,
					command: form.command || void 0,
					args: form.args ? form.args.split(/\s+/).filter(Boolean) : void 0,
					url: form.url || void 0,
					enabled: true
				}).then(() => {
					setCreating(false);
					setForm({
						name: "",
						transport: "stdio",
						serverName: "",
						command: "",
						args: "",
						url: ""
					});
					load();
				}).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setBusy(null));
			}, [
				form,
				load,
				onError
			]);
			const doToggle = (0, react.useCallback)((server) => {
				setBusy(server.id);
				toggleMcp(server.id, !server.enabled).then(load).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setBusy(null));
			}, [load, onError]);
			const doTest = (0, react.useCallback)((server) => {
				setBusy(`test:${server.id}`);
				testMcp(server.id).then((result) => onError(result.ok ? `${server.name}: ${t("mcpTestOk")}` : `${server.name}: ${t("mcpTestFail")}${result.error ?? ""}`)).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setBusy(null));
			}, [onError, t]);
			const doDelete = (0, react.useCallback)((server) => {
				setBusy(`del:${server.id}`);
				deleteMcp(server.id).then(load).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setBusy(null));
			}, [load, onError]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: s.form,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								flex: 1,
								fontWeight: 600
							},
							children: t("mcp")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: s.primary,
							onClick: () => setCreating(!creating),
							children: t("mcpNew")
						})]
					}),
					creating && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.form,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.label,
									children: t("mcpName")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: s.input,
									value: form.name,
									onChange: (event) => setForm({
										...form,
										name: event.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.label,
									children: t("mcpTransport")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									style: s.input,
									value: form.transport,
									onChange: (event) => setForm({
										...form,
										transport: event.target.value
									}),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "stdio",
										children: "stdio"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "streamable-http",
										children: "streamable-http"
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: s.label,
									children: [
										t("mcpServerName"),
										"（",
										t("mcpNew"),
										"留空自动生成）"
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: s.input,
									value: form.serverName,
									onChange: (event) => setForm({
										...form,
										serverName: event.target.value
									})
								})]
							}),
							form.transport === "stdio" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.label,
									children: t("mcpCommand")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: s.input,
									value: form.command,
									onChange: (event) => setForm({
										...form,
										command: event.target.value
									})
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.label,
									children: t("mcpArgs")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: s.input,
									value: form.args,
									onChange: (event) => setForm({
										...form,
										args: event.target.value
									})
								})]
							})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.label,
									children: t("mcpUrl")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: s.input,
									value: form.url,
									onChange: (event) => setForm({
										...form,
										url: event.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.actions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.primary,
									onClick: submit,
									disabled: busy === "save",
									children: t("mcpSave")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.link,
									onClick: () => setCreating(false),
									children: t("cancel")
								})]
							})
						]
					}),
					servers === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: s.hint,
						children: t("loading")
					}),
					servers?.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: s.hint,
						children: t("noSkills")
					}),
					servers?.map((server) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.card,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.cardHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: s.name,
										children: server.name
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: server.running ? {
											...s.badge,
											...s.badgeOk
										} : s.badge,
										children: server.running ? t("mcpRunning") : t("mcpStopped")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: s.badge,
										children: server.transport
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: s.badge,
										children: server.serverName
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: server.enabled ? s.btnGhost : s.primary,
										disabled: busy === server.id,
										onClick: () => doToggle(server),
										children: server.enabled ? t("disable") : t("enable")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: s.hint,
								children: server.transport === "stdio" ? `${server.command ?? ""} ${(server.args ?? []).join(" ")}` : server.url
							}),
							server.lastError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: s.status,
								children: server.lastError
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.actions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.refresh,
									disabled: busy === `test:${server.id}`,
									onClick: () => doTest(server),
									children: busy === `test:${server.id}` ? t("mcpTesting") : t("mcpTest")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.link,
									onClick: () => doDelete(server),
									children: t("mcpDelete")
								})]
							})
						]
					}, server.id))
				]
			});
		}
		/** Per-conversation skill loading panel. */
		function ConversationPanel(props) {
			const { t, allSkills, onError } = props;
			const [state, setState] = (0, react.useState)(null);
			const [active, setActive] = (0, react.useState)(null);
			const [selection, setSelection] = (0, react.useState)([]);
			const [saving, setSaving] = (0, react.useState)(false);
			const load = (0, react.useCallback)(() => {
				fetchConversation().then((data) => {
					setState(data);
					if (active && data.config[active]) setSelection(data.config[active].skills ?? []);
				}).catch((error) => onError(error instanceof Error ? error.message : String(error)));
			}, [active, onError]);
			(0, react.useEffect)(load, [load]);
			const openSession = (0, react.useCallback)((id) => {
				setActive(id);
				setSelection(state?.config[id]?.skills ?? []);
			}, [state]);
			const save = (0, react.useCallback)(() => {
				if (!active) return;
				setSaving(true);
				saveConversation(active, selection).then(() => onError(t("conversationSaved") + " ✓")).catch((error) => onError(error instanceof Error ? error.message : String(error))).finally(() => setSaving(false));
			}, [
				active,
				selection,
				onError,
				t
			]);
			const clear = (0, react.useCallback)(() => {
				if (!active) return;
				setSelection([]);
				saveConversation(active, []).then(() => onError(t("conversationClear") + " ✓")).catch((error) => onError(error instanceof Error ? error.message : String(error)));
			}, [
				active,
				onError,
				t
			]);
			const shortId = (id) => id.length > 24 ? `…${id.slice(-20)}` : id;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: s.form,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: s.hint,
						children: t("conversationHint")
					}),
					state && state.sessions.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: s.hint,
						children: t("conversationNoSessions")
					}),
					state?.sessions.map((session) => {
						const has = state.config[session.id]?.skills?.length ?? 0;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: "6px",
								alignItems: "center"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: active === session.id ? s.primary : s.refresh,
									onClick: () => openSession(session.id),
									children: shortId(session.id)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.badge,
									children: session.cwd || "-"
								}),
								has > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: s.badgeOk,
									children: [has, " ✓"]
								})
							]
						}, session.id);
					}),
					active && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: "2px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s.sectionLabel,
								children: t("conversationSelect")
							}),
							allSkills.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									display: "flex",
									gap: "6px",
									alignItems: "center"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: selection.includes(name),
									onChange: (event) => {
										setSelection(event.target.checked ? [...selection, name] : selection.filter((entry) => entry !== name));
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: name })]
							}, name)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.actions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.primary,
									onClick: save,
									disabled: saving,
									children: t("save")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: s.link,
									onClick: clear,
									children: t("conversationClear")
								})]
							})
						]
					})
				]
			});
		}
		/** Plugin inventory panel (read-only). */
		function PluginPanel(props) {
			const { t, onError } = props;
			const [data, setData] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				fetchPlugins().then(setData).catch((error) => onError(error instanceof Error ? error.message : String(error)));
			}, [onError]);
			const rows = (entries) => entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: s.card,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: s.cardHead,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								flex: 1,
								overflowWrap: "anywhere"
							},
							children: entry.moduleName
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: entry.enabled ? {
								...s.badge,
								...s.badgeOk
							} : s.badge,
							children: entry.enabled ? "on" : "off"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: s.badge,
							children: [
								t("pluginsPhase"),
								": ",
								entry.fiberPhase ?? "-"
							]
						})
					]
				})
			}, entry.moduleName));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: s.form,
				children: [data === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: s.hint,
					children: t("loading")
				}), data && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: s.sectionLabel,
						children: [
							t("pluginsOfficial"),
							" (",
							data.official.length,
							")"
						]
					}),
					rows(data.official),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: s.sectionLabel,
						children: [
							t("pluginsOther"),
							" (",
							data.other.length,
							")"
						]
					}),
					rows(data.other)
				] })]
			});
		}
		/** Settings page for skillforge (settings.section entry). */
		function SkillforgeSection(props) {
			const { t } = props;
			const [catalog, setCatalog] = (0, react.useState)(null);
			const [groups, setGroups] = (0, react.useState)([]);
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(null);
			const [checking, setChecking] = (0, react.useState)(false);
			const [checkResult, setCheckResult] = (0, react.useState)(null);
			const [creating, setCreating] = (0, react.useState)(false);
			const [importing, setImporting] = (0, react.useState)(false);
			const [marketOpen, setMarketOpen] = (0, react.useState)(false);
			const [mcpOpen, setMcpOpen] = (0, react.useState)(false);
			const [convOpen, setConvOpen] = (0, react.useState)(false);
			const [pluginsOpen, setPluginsOpen] = (0, react.useState)(false);
			const [scopeFilter, setScopeFilter] = (0, react.useState)("all");
			const [groupFilter, setGroupFilter] = (0, react.useState)(null);
			const [groupManage, setGroupManage] = (0, react.useState)(false);
			const [groupNameInput, setGroupNameInput] = (0, react.useState)("");
			const load = (0, react.useCallback)(() => {
				setLoading(true);
				setError(null);
				fetchCatalog().then((data) => {
					setCatalog(data);
					setLoading(false);
				}).catch((err) => {
					setError(err instanceof Error ? err.message : String(err));
					setLoading(false);
				});
				fetchGroups().then((data) => setGroups(data.groups)).catch(() => {});
			}, []);
			(0, react.useEffect)(load, [load]);
			const handleToggle = (0, react.useCallback)((name, enabled) => {
				if (busy) return;
				setBusy(name);
				toggleSkill(name, enabled).then(() => load()).catch((err) => {
					const message = err instanceof Error ? err.message : String(err);
					setError(t("toggleFailed") + message);
				}).finally(() => setBusy(null));
			}, [
				busy,
				load,
				t
			]);
			const handleCheck = (0, react.useCallback)(() => {
				setChecking(true);
				setCheckResult(null);
				checkSkills().then((result) => {
					const errors = result.errors.length ? ` · errors ${result.errors.map((entry) => `${entry.name}: ${entry.error}`).join(", ")}` : "";
					setCheckResult(t("checkedSummary", {
						checked: result.checked.length,
						fixed: result.fixed.length,
						skipped: result.skipped.length,
						errors
					}));
					load();
				}).catch((err) => {
					setError(err instanceof Error ? err.message : String(err));
				}).finally(() => setChecking(false));
			}, [load, t]);
			const q = query.trim().toLowerCase();
			const workspaces = catalog?.workspaces ?? [];
			const userSkills = (catalog?.skills ?? []).filter((skill) => !q || skill.name.includes(q) || skill.description.toLowerCase().includes(q));
			const workspaceSkills = (id) => (workspaces.find((workspace) => workspace.id === id)?.skills ?? []).filter((skill) => !q || skill.name.includes(q) || skill.description.toLowerCase().includes(q));
			const activeGroup = groups.find((group) => group.id === groupFilter) ?? null;
			const inActiveGroup = (name) => activeGroup ? activeGroup.members.includes(name) : true;
			const filteredScopes = [];
			if (scopeFilter === "all" || scopeFilter === "user") filteredScopes.push({
				id: "user",
				label: t("userSkills"),
				skills: userSkills.filter((s) => inActiveGroup(s.name))
			});
			if (scopeFilter === "all") for (const workspace of workspaces) filteredScopes.push({
				id: workspace.id,
				label: `${workspace.title} · ${workspace.path}`,
				skills: workspaceSkills(workspace.id).filter((s) => inActiveGroup(s.name))
			});
			else if (scopeFilter !== "user") {
				const workspace = workspaces.find((entry) => entry.id === scopeFilter);
				if (workspace) filteredScopes.push({
					id: workspace.id,
					label: `${workspace.title} · ${workspace.path}`,
					skills: workspaceSkills(workspace.id).filter((s) => inActiveGroup(s.name))
				});
			}
			const totalShown = filteredScopes.reduce((sum, scope) => sum + scope.skills.length, 0);
			const moveTargets = [{
				id: "user-dsh",
				label: `${t("userSkills")} (~/.dsh/skills)`
			}, ...workspaces.map((workspace) => ({
				id: `workspace:${workspace.id}`,
				label: `${workspace.title}`
			}))];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: s.root,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.header,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.titleRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: s.title,
									children: t("title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: s.toolbar,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: s.refresh,
											onClick: handleCheck,
											disabled: checking,
											children: checking ? t("checking") : t("check")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: s.refresh,
											onClick: () => setMarketOpen(true),
											children: t("market")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: s.refresh,
											onClick: () => setMcpOpen(true),
											children: t("mcp")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: s.refresh,
											onClick: () => setConvOpen(true),
											children: t("conversation")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: s.refresh,
											onClick: () => setPluginsOpen(true),
											children: t("plugins")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: s.refresh,
											onClick: () => setImporting(true),
											children: t("import")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: s.refresh,
											onClick: () => setCreating(true),
											children: t("newSkill")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: s.refresh,
											onClick: load,
											disabled: loading,
											children: "↻"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: s.bigSearch,
								placeholder: t("search"),
								value: query,
								onChange: (event) => setQuery(event.target.value)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.tabs,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										style: scopeFilter === "all" ? s.tabActive : s.tab,
										onClick: () => setScopeFilter("all"),
										children: [
											t("allSkills"),
											" (",
											userSkills.length + workspaces.reduce((sum, w) => sum + workspaceSkills(w.id).length, 0),
											")"
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										style: scopeFilter === "user" ? s.tabActive : s.tab,
										onClick: () => setScopeFilter("user"),
										children: [
											t("userSkills"),
											" (",
											userSkills.length,
											")"
										]
									}),
									workspaces.map((workspace) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										style: scopeFilter === workspace.id ? s.tabActive : s.tab,
										onClick: () => setScopeFilter(workspace.id),
										children: [
											workspace.title,
											" (",
											workspaceSkills(workspace.id).length,
											")"
										]
									}, workspace.id)),
									groups.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: groupFilter === null ? s.tabActive : s.tab,
											onClick: () => setGroupFilter(null),
											children: "全部组"
										}),
										groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: groupFilter === group.id ? s.tabActive : s.tab,
											onClick: () => setGroupFilter(group.id),
											children: group.name
										}, group.id)),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											style: s.tab,
											onClick: () => setGroupManage(!groupManage),
											children: ["⚙ ", t("groups")]
										})
									] })
								]
							})
						]
					}),
					groupManage && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...s.card,
							padding: "10px 12px"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: s.field,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: s.actions,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: {
											...s.input,
											flex: 1
										},
										placeholder: t("groupNew"),
										value: groupNameInput,
										onChange: (event) => setGroupNameInput(event.target.value)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: s.primary,
										onClick: () => {
											const name = groupNameInput.trim();
											if (!name) return;
											mutateGroups({
												op: "create",
												name
											}).then((data) => {
												setGroups(data.groups);
												setGroupNameInput("");
											}).catch((error) => setError(t("actionFailed") + (error instanceof Error ? error.message : String(error))));
										},
										children: t("groupNew")
									})]
								})
							}),
							groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: "6px",
									alignItems: "center",
									padding: "4px 0"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: { flex: 1 },
										children: group.name
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: s.badge,
										children: group.members.length
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: s.btn,
										onClick: () => setGroupFilter(group.id),
										children: "查看"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: {
											...s.btn,
											...s.btnDanger
										},
										onClick: () => mutateGroups({
											op: "delete",
											id: group.id
										}).then((data) => setGroups(data.groups)).catch((error) => setError(t("actionFailed") + (error instanceof Error ? error.message : String(error)))),
										children: "删除"
									})
								]
							}, group.id)),
							activeGroup && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: "4px",
									marginTop: "8px",
									paddingTop: "8px",
									borderTop: "1px solid var(--dsw-alias-line-secondary)"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: s.sectionLabel,
									children: [activeGroup.name, " — 选择技能"]
								}), userSkills.map((skill) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										display: "flex",
										gap: "6px",
										alignItems: "center"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: activeGroup.members.includes(skill.name),
										onChange: (event) => {
											const members = event.target.checked ? [...activeGroup.members, skill.name] : activeGroup.members.filter((name) => name !== skill.name);
											mutateGroups({
												op: "setMembers",
												id: activeGroup.id,
												members
											}).then((data) => setGroups(data.groups)).catch((error) => setError(t("actionFailed") + (error instanceof Error ? error.message : String(error))));
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: skill.name })]
								}, skill.name))]
							})
						]
					}),
					checkResult && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							...s.hint,
							background: "var(--dsw-alias-bg-base)",
							padding: "6px 10px",
							borderRadius: "6px"
						},
						children: checkResult
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.status,
						children: [t("error"), error]
					}),
					loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s.empty,
						children: t("loading")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						creating && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NewSkillForm, {
							t,
							onDone: () => {
								setCreating(false);
								load();
							},
							onError: (message) => setError(t("actionFailed") + message)
						}),
						importing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImportPanel, {
							t,
							onDone: () => {
								setImporting(false);
								load();
							},
							onError: (message) => setError(t("actionFailed") + message)
						}),
						marketOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarketPanel, {
							t,
							catalog,
							onDone: () => {
								setMarketOpen(false);
								load();
							},
							onError: (message) => setError(t("actionFailed") + message)
						}),
						mcpOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpPanel, {
							t,
							onError: (message) => setError(t("actionFailed") + message)
						}),
						convOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConversationPanel, {
							t,
							allSkills: userSkills.map((skill) => skill.name),
							onError: (message) => setError(t("actionFailed") + message)
						}),
						pluginsOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginPanel, {
							t,
							onError: (message) => setError(t("actionFailed") + message)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s.grid,
							children: [
								totalShown === 0 && !q && !creating && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: s.empty,
									children: t("noSkills")
								}),
								totalShown === 0 && q && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: s.empty,
									children: t("noResults")
								}),
								filteredScopes.map((scope) => scope.skills.map((skill) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillRow, {
									skill,
									busy,
									t,
									onToggle: handleToggle,
									onChanged: load,
									onError: (message) => setError(t("actionFailed") + message),
									moveTargets
								}, scope.id + ":" + skill.name)))
							]
						}),
						catalog && catalog.diagnostics.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...s.card,
								padding: "10px 12px",
								marginTop: "8px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: s.sectionLabel,
									children: [
										t("diagnostics"),
										" (",
										catalog.diagnostics.length,
										")"
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										...s.hint,
										marginTop: "4px"
									},
									children: t("diagnosticsHint")
								}),
								catalog.diagnostics.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										padding: "4px 0",
										borderBottom: "1px dashed var(--dsw-alias-line-secondary)"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: {
											...s.hint,
											fontFamily: "monospace",
											fontSize: "11px"
										},
										children: item.path
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: {
											...s.hint,
											color: "var(--dsw-alias-state-warn-primary)"
										},
										children: item.reason
									})]
								}, item.path))
							]
						}),
						catalog && catalog.diagnostics.length === 0 && catalog.skills.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								...s.sectionLabel,
								color: "var(--dsw-alias-state-success-primary)"
							},
							children: ["✓ ", t("diagnosticsNone")]
						})
					] })
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		const inject = ["slots", "locale"];
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "skillforge",
				order: 20,
				label: () => t("nav"),
				locale: NS
			}, SkillforgeSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		
		return module.exports;
	}
});
