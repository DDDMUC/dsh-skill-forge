/**
 * skillforge locale namespace: zh / en dictionaries plus the typed key union
 * merged into the framework LocaleNamespaceMap.
 */
export const NS = 'skillforge'

export type SkillforgeKeys =
  | 'nav'
  | 'title'
  | 'subtitle'
  | 'refresh'
  | 'search'
  | 'noResults'
  | 'enabled'
  | 'disabled'
  | 'enable'
  | 'disable'
  | 'source'
  | 'provider'
  | 'noDescription'
  | 'noSkills'
  | 'loading'
  | 'error'
  | 'toggleFailed'
  | 'detail'
  | 'collapse'
  | 'content'
  | 'frontmatter'
  | 'path'
  | 'diagnostics'
  | 'diagnosticsNone'
  | 'diagnosticsHint'
  | 'missingName'
  | 'missingDescription'
  | 'disabledFile'
  | 'check'
  | 'checking'
  | 'checkedSummary'
  | 'edit'
  | 'save'
  | 'cancel'
  | 'rename'
  | 'renameTo'
  | 'delete'
  | 'confirmDelete'
  | 'deleteHint'
  | 'newSkill'
  | 'nameLabel'
  | 'descriptionLabel'
  | 'whenToUseLabel'
  | 'contentLabel'
  | 'checkedOk'
  | 'checkedDirty'
  | 'actionFailed'
  | 'emptyContent'
  | 'import'
  | 'importClose'
  | 'importArchive'
  | 'importDir'
  | 'importPath'
  | 'importPathPlaceholder'
  | 'importConflict'
  | 'importSkip'
  | 'importOverwrite'
  | 'importPreview'
  | 'importRun'
  | 'importPending'
  | 'importConflicts'
  | 'importImported'
  | 'importSkipped'
  | 'importFailed'
  | 'importNoSkills'
  | 'export'
  | 'provenance'
  | 'provenanceArchive'
  | 'provenanceDir'
  | 'provenanceManual'
  | 'openFolder'
  | 'readOnlyRoot'
  | 'market'
  | 'marketSearch'
  | 'marketPlaceholder'
  | 'marketInstall'
  | 'marketNoResults'
  | 'marketSearching'
  | 'marketInstalls'
  | 'githubImport'
  | 'githubOwner'
  | 'githubRepo'
  | 'githubBranch'
  | 'githubAddRepo'
  | 'githubSearch'
  | 'githubExpand'
  | 'githubRemove'
  | 'githubAutoSearch'
  | 'githubSkills'
  | 'githubNoSkills'
  | 'githubInstall'
  | 'tabInstalled'
  | 'tabSkillHub'
  | 'tabUser'
  | 'tabAll'
  | 'tabBuiltIn'
  | 'filterPlaceholder'
  | 'refreshBtn'
  | 'repoSearch'
  | 'repoExpand'
  | 'repoRemove'
  | 'repoSkillsCount'
  | 'localSkills'
  | 'localEnabled'
  | 'localDisabled'
  | 'sectionHeader'
  | 'badgeUser'
  | 'badgeProject'
  | 'badgeGitHub'
  | 'badgeModelUser'
  | 'installToProject'
  | 'installToUser'
  | 'detail'
  | 'categoryAll'
  | 'sortByRating'
  | 'sortByDownloads'
  | 'sortByNewest'
  | 'pageOf'
  | 'itemsPerPage'
  | 'totalResults'
  | 'installSuccess'
  | 'installed'
  | 'category'
  | 'downloads'
  | 'installs'
  | 'update'
  | 'updateNone'
  | 'allSkills'
  | 'userSkills'
  | 'groups'
  | 'groupNew'
  | 'groupRename'
  | 'groupDelete'
  | 'groupMembers'
  | 'move'
  | 'moveTo'
  | 'moveCopy'
  | 'moveMove'
  | 'workspaceSkills'
  | 'mcp'
  | 'mcpNew'
  | 'mcpName'
  | 'mcpTransport'
  | 'mcpServerName'
  | 'mcpCommand'
  | 'mcpArgs'
  | 'mcpUrl'
  | 'mcpTest'
  | 'mcpTesting'
  | 'mcpRunning'
  | 'mcpStopped'
  | 'mcpTestOk'
  | 'mcpTestFail'
  | 'mcpSave'
  | 'mcpDelete'
  | 'mcpEnabled'
  | 'conversation'
  | 'conversationHint'
  | 'conversationClear'
  | 'conversationSelect'
  | 'conversationNoSessions'
  | 'conversationSaved'
  | 'plugins'
  | 'pluginsOfficial'
  | 'pluginsOther'
  | 'pluginsPhase'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    skillforge: SkillforgeKeys
  }
}

export const zh: Record<SkillforgeKeys, string> = {
  nav: '技能与扩展',
  title: '技能与扩展',
  subtitle: '管理 DSH 技能：浏览目录、启停、查看详情与诊断',
  refresh: '刷新',
  search: '搜索技能…',
  noResults: '没有匹配的技能',
  enabled: '已启用',
  disabled: '已停用',
  enable: '启用',
  disable: '停用',
  source: '来源',
  provider: '提供方',
  noDescription: '（无简介）',
  noSkills: '暂无技能',
  loading: '加载中…',
  error: '加载失败：',
  toggleFailed: '切换失败：',
  detail: '详情',
  collapse: '收起',
  content: '正文',
  frontmatter: 'frontmatter',
  path: '路径',
  diagnostics: '未生效文件（诊断）',
  diagnosticsNone: '所有技能文件均符合规范',
  diagnosticsHint: '这些文件未被 DSH 识别为技能，原因如下：',
  missingName: 'frontmatter 缺少 name 字段',
  missingDescription: 'frontmatter 缺少 description 字段',
  disabledFile: '被重命名停用（SKILL.md.disabled）',
  check: '检查修复',
  checking: '检查中…',
  checkedSummary: '已检查 {checked} · 已修复 {fixed} · 跳过 {skipped}{errors}',
  edit: '编辑',
  save: '保存',
  cancel: '取消',
  rename: '重命名',
  renameTo: '新名称',
  delete: '删除',
  confirmDelete: '确认删除',
  deleteHint: '将删除该技能文件，此操作不可撤销。',
  newSkill: '新建技能',
  nameLabel: '名称',
  descriptionLabel: '简介',
  whenToUseLabel: '何时使用',
  contentLabel: '正文',
  checkedOk: '已检查',
  checkedDirty: '待检查',
  actionFailed: '操作失败：',
  emptyContent: '（正文为空）',
  import: '导入',
  importClose: '关闭',
  importArchive: '选择文件（.zip / .skill）',
  importDir: '从目录导入',
  importPath: '目录路径',
  importPathPlaceholder: '例如 D:\\skills\\my-collection',
  importConflict: '重名处理',
  importSkip: '跳过重名',
  importOverwrite: '覆盖重名',
  importPreview: '预览',
  importRun: '导入',
  importPending: '待导入',
  importConflicts: '重名',
  importImported: '已导入',
  importSkipped: '已跳过',
  importFailed: '失败',
  importNoSkills: '源中没有发现可用技能',
  export: '导出',
  provenance: '来源',
  provenanceArchive: '归档',
  provenanceDir: '目录',
  provenanceManual: '手动',
  openFolder: '打开文件夹',
  readOnlyRoot: '（~/.agents/skills 只读，可先复制到 ~/.dsh/skills 再编辑）',
  market: '技能市场',
  marketSearch: '搜索',
  marketPlaceholder: '搜索技能（skills.sh，如 ppt / pdf / excel）…',
  marketInstall: '安装',
  marketNoResults: '没有找到技能',
  marketSearching: '搜索中…',
  marketInstalls: '次安装',
  githubImport: 'GitHub 技能市场',
  githubOwner: 'owner',
  githubRepo: '仓库名',
  githubBranch: '分支 (可选)',
  githubAddRepo: '添加仓库',
  githubSearch: '搜索技能',
  githubExpand: '展开',
  githubRemove: '移除',
  githubAutoSearch: '自动搜索',
  githubSkills: '搜索 GitHub 仓库中的技能',
  githubNoSkills: '仓库中没有可用技能',
  githubInstall: '安装',
  tabInstalled: '已安装 Skills',
  tabSkillHub: 'SkillHub 商城',
  tabUser: '用户级',
  tabAll: '全部',
  tabBuiltIn: '内置',
  filterPlaceholder: '筛选当前分组：名称 / 简介…',
  refreshBtn: '刷新',
  repoSearch: '搜索技能',
  repoExpand: '展开',
  repoRemove: '移除',
  repoSkillsCount: '个技能',
  localSkills: '本地技能列表',
  localEnabled: '个已启用',
  localDisabled: '个已停用',
  sectionHeader: 'DeepSeek Harness',
  badgeUser: '用户级',
  badgeProject: '项目级',
  badgeGitHub: 'GitHub',
  badgeModelUser: '模型+用户',
  installToProject: '装到项目级（当前工作区）',
  installToUser: '装到用户级',
  categoryAll: '全部分类',
  sortByRating: '按评分',
  sortByDownloads: '按下载',
  sortByNewest: '按最新',
  pageOf: '第 %d / %d 页',
  itemsPerPage: '%d条/页',
  totalResults: '共 %d 个结果',
  installSuccess: '✓',
  installed: '已安装',
  category: '分类',
  downloads: '下载',
  installs: '安装',
  update: '更新',
  updateNone: '（无更新来源）',
  allSkills: '全部',
  userSkills: '用户级',
  groups: '分组',
  groupNew: '新建分组',
  groupRename: '重命名',
  groupDelete: '删除分组',
  groupMembers: '成员',
  move: '移动',
  moveTo: '移动到',
  moveCopy: '复制',
  moveMove: '移动',
  workspaceSkills: '工作区',
  mcp: 'MCP 服务器',
  mcpNew: '新建服务器',
  mcpName: '名称',
  mcpTransport: '传输',
  mcpServerName: 'serverName',
  mcpCommand: '命令',
  mcpArgs: '参数（空格分隔）',
  mcpUrl: 'URL',
  mcpTest: '测试连接',
  mcpTesting: '测试中…',
  mcpRunning: '运行中',
  mcpStopped: '已停止',
  mcpTestOk: '连接成功',
  mcpTestFail: '连接失败：',
  mcpSave: '保存',
  mcpDelete: '删除',
  mcpEnabled: '启用',
  conversation: '按对话加载',
  conversationHint: '勾选后，该会话只加载勾选的技能（未勾选对该会话不可见）；不勾选任何技能 = 恢复默认全部加载。',
  conversationClear: '清除（恢复全部）',
  conversationSelect: '选择技能',
  conversationNoSessions: '暂无会话（新开会话后出现）',
  conversationSaved: '已保存',
  plugins: '插件清单',
  pluginsOfficial: '官方插件',
  pluginsOther: '第三方插件',
  pluginsPhase: '阶段',
}

export const en: Record<SkillforgeKeys, string> = {
  nav: 'Skills & Extensions',
  title: 'Skills & Extensions',
  subtitle: 'Manage DSH skills: browse the catalog, toggle, inspect and diagnose',
  refresh: 'Refresh',
  search: 'Search skills…',
  noResults: 'No matching skills',
  enabled: 'Enabled',
  disabled: 'Disabled',
  enable: 'Enable',
  disable: 'Disable',
  source: 'Source',
  provider: 'Provider',
  noDescription: '(no description)',
  noSkills: 'No skills yet',
  loading: 'Loading…',
  error: 'Load failed: ',
  toggleFailed: 'Toggle failed: ',
  detail: 'Detail',
  collapse: 'Collapse',
  content: 'Content',
  frontmatter: 'frontmatter',
  path: 'Path',
  diagnostics: 'Unregistered files (diagnostics)',
  diagnosticsNone: 'All skill files conform to the spec',
  diagnosticsHint: 'These files are not recognized as skills by DSH:',
  missingName: 'frontmatter missing name field',
  missingDescription: 'frontmatter missing description field',
  disabledFile: 'disabled by rename (SKILL.md.disabled)',
  check: 'Check & fix',
  checking: 'Checking…',
  checkedSummary: 'checked {checked} · fixed {fixed} · skipped {skipped}{errors}',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  rename: 'Rename',
  renameTo: 'New name',
  delete: 'Delete',
  confirmDelete: 'Confirm delete',
  deleteHint: 'This removes the skill files. This action cannot be undone.',
  newSkill: 'New skill',
  nameLabel: 'Name',
  descriptionLabel: 'Description',
  whenToUseLabel: 'When to use',
  contentLabel: 'Content',
  checkedOk: 'checked',
  checkedDirty: 'needs check',
  actionFailed: 'Action failed: ',
  emptyContent: '(empty content)',
  import: 'Import',
  importClose: 'Close',
  importArchive: 'Choose file (.zip / .skill)',
  importDir: 'Import from directory',
  importPath: 'Directory path',
  importPathPlaceholder: 'e.g. D:\\skills\\my-collection',
  importConflict: 'Conflict handling',
  importSkip: 'Skip duplicates',
  importOverwrite: 'Overwrite duplicates',
  importPreview: 'Preview',
  importRun: 'Import',
  importPending: 'to import',
  importConflicts: 'conflicts',
  importImported: 'imported',
  importSkipped: 'skipped',
  importFailed: 'failed',
  importNoSkills: 'No usable skills found in the source',
  export: 'Export',
  provenance: 'Source',
  provenanceArchive: 'archive',
  provenanceDir: 'directory',
  provenanceManual: 'manual',
  openFolder: 'Open folder',
  readOnlyRoot: '(~/.agents/skills is read-only; copy to ~/.dsh/skills first to edit)',
  market: 'Skill market',
  marketSearch: 'Search',
  marketPlaceholder: 'Search skills (skills.sh, e.g. ppt / pdf / excel)…',
  marketInstall: 'Install',
  marketNoResults: 'No skills found',
  marketSearching: 'Searching…',
  marketInstalls: 'installs',
  githubImport: 'GitHub Skill Market',
  githubOwner: 'owner',
  githubRepo: 'Repo name',
  githubBranch: 'Branch (optional)',
  githubAddRepo: 'Add repo',
  githubSearch: 'Search skills',
  githubExpand: 'Expand',
  githubRemove: 'Remove',
  githubAutoSearch: 'Auto-search',
  githubSkills: 'Search skills in GitHub repos',
  githubNoSkills: 'No usable skills in this repo',
  githubInstall: 'Install',
  tabInstalled: 'Installed Skills',
  tabSkillHub: 'SkillHub Store',
  tabUser: 'User',
  tabAll: 'All',
  tabBuiltIn: 'Built-in',
  filterPlaceholder: 'Filter group: name / description…',
  refreshBtn: 'Refresh',
  repoSearch: 'Search skills',
  repoExpand: 'Expand',
  repoRemove: 'Remove',
  repoSkillsCount: 'skills',
  localSkills: 'Local skill list',
  localEnabled: 'enabled',
  localDisabled: 'disabled',
  sectionHeader: 'DeepSeek Harness',
  badgeUser: 'User',
  badgeProject: 'Project',
  badgeGitHub: 'GitHub',
  badgeModelUser: 'Model+User',
  installToProject: 'Install to project (current workspace)',
  installToUser: 'Install to user',
  categoryAll: 'All categories',
  sortByRating: 'By rating',
  sortByDownloads: 'By downloads',
  sortByNewest: 'By newest',
  pageOf: 'Page %d / %d',
  itemsPerPage: '%d per page',
  totalResults: '%d results',
  installSuccess: '✓',
  installed: 'Installed',
  category: 'Category',
  downloads: 'downloads',
  installs: 'installs',
  update: 'Update',
  updateNone: '(no update source)',
  allSkills: 'All',
  userSkills: 'User',
  groups: 'Groups',
  groupNew: 'New group',
  groupRename: 'Rename',
  groupDelete: 'Delete group',
  groupMembers: 'Members',
  move: 'Move',
  moveTo: 'Move to',
  moveCopy: 'Copy',
  moveMove: 'Move',
  workspaceSkills: 'Workspaces',
  mcp: 'MCP servers',
  mcpNew: 'New server',
  mcpName: 'Name',
  mcpTransport: 'Transport',
  mcpServerName: 'serverName',
  mcpCommand: 'Command',
  mcpArgs: 'Args (space separated)',
  mcpUrl: 'URL',
  mcpTest: 'Test connection',
  mcpTesting: 'Testing…',
  mcpRunning: 'Running',
  mcpStopped: 'Stopped',
  mcpTestOk: 'Connected',
  mcpTestFail: 'Connection failed: ',
  mcpSave: 'Save',
  mcpDelete: 'Delete',
  mcpEnabled: 'Enabled',
  conversation: 'Per-conversation loading',
  conversationHint: 'Checked skills are the only ones loaded into that conversation (others are hidden for it). Clear the selection to restore the default (load all).',
  conversationClear: 'Clear (load all)',
  conversationSelect: 'Select skills',
  conversationNoSessions: 'No sessions yet (they appear after you open one)',
  conversationSaved: 'Saved',
  plugins: 'Plugin inventory',
  pluginsOfficial: 'Official plugins',
  pluginsOther: 'Third-party plugins',
  pluginsPhase: 'phase',
}
