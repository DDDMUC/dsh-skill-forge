/**
 * Settings-section panel: skill catalog with enable/disable toggles, search,
 * expandable detail, DSH-spec audit, and CRUD (new / edit / rename / delete).
 * Styled with dsw design tokens.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CatalogResponse, EditResponse, ImportResponse, SkillForgeSkill } from '../protocol.js'
import {
  checkSkills,
  createSkill,
  deleteMcp,
  deleteSkill,
  exportUrl,
  fetchCatalog,
  fetchEdit,
  fetchGroups,
  fetchMcp,
  fetchSkill,
  githubScan,
  importArchive,
  importDir,
  marketInstall,
  marketDescribe,
  marketSearch,
  moveSkill,
  mutateGroups,
  openFolder,
  renameSkill,
  saveMcp,
  testMcp,
  toggleMcp,
  toggleSkill,
  updateMarketSkill,
  updateSkill,
  fetchConversation,
  saveConversation,
  fetchPlugins,
  type MarketItem,
  type McpServerView,
  type PluginRow,
} from './api.js'
import type { SkillDetailResponse } from '../protocol.js'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.js'

/** Tiny Markdown renderer (no external dep). Handles headers, bold, italic, lists, code, links. */
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let inCode = false
  let codeBuf: string[] = []
  let codeLang = ''
  let inList = false
  let listItems: string[] = []

  const flushList = () => {
    if (inList) {
      out.push(
        <ul key={`list-${out.length}`} style={{ margin: '4px 0', paddingLeft: '20px' }}>
          {listItems.map((it, i) => (
            <li key={i} style={{ color: 'var(--dsw-alias-label-secondary)' }}>
              {renderInline(it)}
            </li>
          ))}
        </ul>,
      )
      inList = false
      listItems = []
    }
  }

  const renderInline = (line: string): React.ReactNode => {
    // Code span `x`
    const parts = line.split(/(`[^`]+`)/g)
    return parts.map((p, i) => {
      if (p.startsWith('`') && p.endsWith('`')) {
        return (
          <code key={i} style={{ background: 'var(--dsw-alias-markdown-inline-code)', padding: '1px 4px', borderRadius: '4px', fontSize: '12px' }}>
            {p.slice(1, -1)}
          </code>
        )
      }
      // bold **x** and italic *x*
      const boldParts = p.split(/(\*\*[^*]+\*\*)/g)
      return boldParts.map((bp, j) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={`${i}-${j}`}>{renderInline(bp.slice(2, -2))}</strong>
        }
        const itParts = bp.split(/(\*[^*]+\*)/g)
        return itParts.map((ip, k) => {
          if (ip.startsWith('*') && ip.endsWith('*') && !ip.startsWith('**')) {
            return <em key={`${i}-${j}-${k}`}>{ip.slice(1, -1)}</em>
          }
          // link [text](url)
          const linkMatch = ip.match(/\[([^\]]+)\]\(([^)]+)\)/)
          if (linkMatch) {
            return (
              <a key={`${i}-${j}-${k}`} href={linkMatch[2]} target="_blank" rel="noreferrer" style={{ color: 'var(--dsw-alias-brand-primary)' }}>
                {linkMatch[1]}
              </a>
            )
          }
          return ip
        })
      })
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Fenced code
    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushList()
        out.push(
          <pre key={`code-${i}`} style={{ background: 'var(--dsw-alias-markdown-code-block)', padding: '8px', borderRadius: '6px', overflow: 'auto', fontSize: '12px', color: 'var(--dsw-alias-label-primary)' }}>
            <code>{codeBuf.join('\n')}</code>
          </pre>,
        )
        inCode = false
        codeBuf = []
        codeLang = ''
      } else {
        flushList()
        inCode = true
        codeLang = line.trim().slice(3)
      }
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      continue
    }
    // Header
    const headerMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (headerMatch) {
      flushList()
      const level = headerMatch[1].length
      const Tag = `h${level}` as keyof JSX.IntrinsicElements
      out.push(
        <Tag key={`h-${i}`} style={{ fontWeight: 600, margin: '8px 0 4px', fontSize: `${16 - level}px` }}>
          {renderInline(headerMatch[2])}
        </Tag>,
      )
      continue
    }
    // List
    const listMatch = /^\s*[-*]\s+(.*)$/.exec(line)
    if (listMatch) {
      inList = true
      listItems.push(listMatch[1])
      continue
    }
    // Empty line
    if (line.trim() === '') {
      flushList()
      continue
    }
    // Paragraph
    flushList()
    out.push(
      <p key={`p-${i}`} style={{ margin: '4px 0', color: 'var(--dsw-alias-label-secondary)' }}>
        {renderInline(line)}
      </p>,
    )
  }
  flushList()
  if (inCode && codeBuf.length > 0) {
    out.push(
      <pre key="trailing-code" style={{ background: 'var(--dsw-alias-markdown-code-block)', padding: '8px', borderRadius: '6px', overflow: 'auto', fontSize: '12px' }}>
        <code>{codeBuf.join('\n')}</code>
      </pre>,
    )
  }
  return out.length === 0 ? null : out
}

interface SectionProps {
  close: () => void
  t: TranslateNS<typeof NS>
}

const s = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    height: '100%',
    overflow: 'hidden',
    color: 'var(--dsw-alias-label-primary)',
    fontSize: '13px',
    padding: '0 16px 16px',
  },
  header: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  title: { flex: 1, fontWeight: 600, fontSize: '16px' },
  bigSearch: {
    width: '100%',
    background: 'var(--dsw-alias-bg-base)',
    border: '1px solid var(--dsw-alias-line-secondary)',
    borderRadius: '8px',
    color: 'var(--dsw-alias-label-primary)',
    padding: '8px 12px',
    outline: 'none',
    fontSize: '14px',
  },
  hint: {
    color: 'var(--dsw-alias-label-tertiary)',
    fontSize: '12px',
    margin: 0,
    wordBreak: 'break-all' as const,
  },
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid var(--dsw-alias-line-secondary)', paddingBottom: '8px' },
  tab: {
    border: 'none',
    background: 'transparent',
    color: 'var(--dsw-alias-label-secondary)',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  tabActive: {
    border: 'none',
    background: 'var(--dsw-alias-interactive-bg-hover-solid)',
    color: 'var(--dsw-alias-label-primary)',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  },
  toolbar: { display: 'flex', gap: '6px', flexWrap: 'wrap' as const, justifyContent: 'flex-end' },
  grid: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '12px',
    paddingRight: '4px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    border: '1px solid var(--dsw-alias-line-secondary)',
    borderRadius: '12px',
    padding: '12px',
    background: 'var(--dsw-alias-bg-layer-)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  cardHover: { borderColor: 'var(--dsw-alias-interactive-bg-hover)' },
  cardDisabled: { opacity: 0.55 },
  cardHead: { display: 'flex', alignItems: 'flex-start', gap: '8px' },
  cardIcon: { width: '20px', height: '20px', flexShrink: 0, color: 'var(--dsw-alias-label-tertiary)' },
  name: { fontWeight: 600, overflowWrap: 'anywhere' as const, flex: 1, fontSize: '14px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  badges: { display: 'flex', gap: '4px', flexWrap: 'wrap' as const },
  badge: {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
    border: '1px solid var(--dsw-alias-line-secondary)',
    color: 'var(--dsw-alias-label-tertiary)',
    whiteSpace: 'nowrap' as const,
    background: 'var(--dsw-alias-bg-base)',
  },
  badgeOk: {
    color: 'var(--dsw-alias-state-success-primary)',
    borderColor: 'var(--dsw-alias-state-success-secondary)',
  },
  badgeWarn: {
    color: 'var(--dsw-alias-state-warn-primary)',
    borderColor: 'var(--dsw-alias-state-warn-secondary)',
  },
  badgeSource: {
    color: 'var(--dsw-alias-brand-primary)',
    borderColor: 'var(--dsw-alias-brand-primary)',
    background: 'transparent',
  },
  desc: {
    margin: 0,
    color: 'var(--dsw-alias-label-secondary)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    fontSize: '12px',
  },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--dsw-alias-line-secondary)' },
  toggle: { position: 'relative' as const, display: 'inline-block' as const, width: '36px', height: '20px', flexShrink: 0 },
  toggleInput: { opacity: 0, width: 0, height: 0 },
  toggleSlider: {
    position: 'absolute' as const,
    cursor: 'pointer',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'var(--dsw-alias-label-tertiary)',
    transition: '0.2s',
    borderRadius: '20px',
  },
  toggleSliderOn: { background: 'var(--dsw-alias-state-success-primary)' },
  toggleSliderBefore: {
    position: 'absolute' as const,
    content: '""',
    height: '14px', width: '14px',
    left: '3px', bottom: '3px',
    background: 'white',
    transition: '0.2s',
    borderRadius: '50%',
  },
  toggleSliderBeforeOn: { transform: 'translateX(16px)' },
  btn: {
    border: 'none',
    background: 'transparent',
    color: 'var(--dsw-alias-label-secondary)',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background 0.15s',
  },
  btnPrimary: {
    border: 'none',
    background: 'var(--dsw-alias-brand-primary)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '5px 10px',
    borderRadius: '6px',
  },
  btnDanger: { color: 'var(--dsw-alias-state-error-primary)' },
  btnGhost: { background: 'var(--dsw-alias-bg-base)' },
  detail: {
    borderTop: '1px solid var(--dsw-alias-line-secondary)',
    paddingTop: '8px',
    marginTop: '4px',
    fontSize: '12px',
  },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  label: { fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)' },
  input: {
    background: 'var(--dsw-alias-bg-base)',
    border: '1px solid var(--dsw-alias-line-secondary)',
    borderRadius: '6px',
    color: 'var(--dsw-alias-label-primary)',
    padding: '6px 8px',
    fontSize: '12px',
    outline: 'none',
  },
  textarea: {
    background: 'var(--dsw-alias-bg-base)',
    border: '1px solid var(--dsw-alias-line-secondary)',
    borderRadius: '6px',
    color: 'var(--dsw-alias-label-primary)',
    padding: '6px 8px',
    fontSize: '12px',
    fontFamily: 'monospace',
    minHeight: '120px',
    resize: 'vertical' as const,
    outline: 'none',
  },
  actions: { display: 'flex', gap: '6px', alignItems: 'center' },
  sectionLabel: {
    fontWeight: 600,
    fontSize: '12px',
    color: 'var(--dsw-alias-label-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  status: { color: 'var(--dsw-alias-state-error-primary)' },
  refresh: {
    border: '1px solid var(--dsw-alias-line-secondary)',
    background: 'var(--dsw-alias-bg-base)',
    color: 'var(--dsw-alias-label-primary)',
    borderRadius: '6px',
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  primary: {
    border: 'none',
    background: 'var(--dsw-alias-brand-primary)',
    color: 'white',
    borderRadius: '6px',
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  link: {
    border: 'none',
    background: 'transparent',
    color: 'var(--dsw-alias-label-secondary)',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px 6px',
    borderRadius: '4px',
    textDecoration: 'underline',
  },
  linkDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  marketCard: {
    border: '1px solid var(--dsw-alias-line-secondary)',
    borderRadius: '12px',
    padding: '14px',
    background: 'var(--dsw-alias-bg-layer-)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  marketHead: { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  marketIcon: { width: '36px', height: '36px', borderRadius: '8px', background: 'var(--dsw-alias-bg-base)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', color: 'var(--dsw-alias-brand-primary)' },
  marketMeta: { flex: 1, minWidth: 0 },
  marketName: { fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const },
  marketDesc: { color: 'var(--dsw-alias-label-secondary)', fontSize: '12px', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' },
  marketStats: { display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--dsw-alias-label-tertiary)', marginTop: '4px' },
  marketInstallBtn: { background: 'var(--dsw-alias-brand-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, marginTop: '6px' },
  marketInstalledBtn: { background: 'var(--dsw-alias-state-success-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'default', fontSize: '12px', fontWeight: 600, marginTop: '6px' },
  empty: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '13px', padding: '24px 0', textAlign: 'center' as const },
} as const

type StyleKey = keyof typeof s

function ToggleSwitch({ enabled, onChange, disabled }: { enabled: boolean; onChange: (val: boolean) => void; disabled?: boolean }) {
  return (
    <label style={{ ...s.toggle, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <input type="checkbox" style={s.toggleInput} checked={enabled} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span style={enabled ? { ...s.toggleSlider, ...s.toggleSliderOn } : s.toggleSlider}>
        <span style={enabled ? { ...s.toggleSliderBefore, ...s.toggleSliderBeforeOn } : s.toggleSliderBefore} />
      </span>
    </label>
  )
}

interface SectionProps {
  close: () => void
  t: TranslateNS<typeof NS>
}

/** One catalog row with toggle, detail, edit, rename, delete, move. */
function SkillRow(props: {
  skill: SkillForgeSkill
  busy: string | null
  t: TranslateNS<typeof NS>
  onToggle(name: string, enabled: boolean): void
  onChanged(): void
  onError(message: string): void
  moveTargets: Array<{ id: string; label: string }>
}): React.ReactNode {
  const { skill, busy, t, onToggle, onChanged, onError, moveTargets } = props
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<SkillDetailResponse | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<EditResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [updating, setUpdating] = useState(false)
  const [moving, setMoving] = useState(false)
  const [moveTarget, setMoveTarget] = useState<string>('user-dsh')
  const [moveCopy, setMoveCopy] = useState(false)

  const toggleDetail = useCallback(() => {
    if (!open) {
      void fetchSkill(skill.name)
        .then(setDetail)
        .then(() => setDetailError(null))
        .catch((error: unknown) =>
          setDetailError(error instanceof Error ? error.message : String(error)),
        )
    }
    setOpen(!open)
  }, [open, skill.name])

  const startEdit = useCallback(() => {
    setEditing(true)
    setDetail(null)
    setOpen(false)
    void fetchEdit(skill.name)
      .then((data) => setEditData(data))
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
  }, [skill.name, onError])

  const saveEdit = useCallback(() => {
    if (!editData) return
    setSaving(true)
    void updateSkill({
      name: skill.name,
      description: editData.description,
      whenToUse: editData.whenToUse,
      content: editData.content,
    })
      .then(() => {
        setEditing(false)
        onChanged()
      })
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
      .finally(() => setSaving(false))
  }, [editData, skill.name, onChanged, onError])

  const doRename = useCallback(() => {
    const next = newName.trim()
    if (!next) return
    void renameSkill(skill.name, next)
      .then(() => {
        setRenaming(false)
        setNewName('')
        onChanged()
      })
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
  }, [newName, skill.name, onChanged, onError])

  const doDelete = useCallback(() => {
    void deleteSkill(skill.name)
      .then(() => onChanged())
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
  }, [skill.name, onChanged, onError])

  const doMove = useCallback(() => {
    const [kind, id] = moveTarget.split(':')
    void moveSkill({
      name: skill.name,
      to: kind as 'user-dsh' | 'user-agents' | 'workspace',
      workspaceId: id || undefined,
      copy: moveCopy,
    })
      .then(() => {
        setMoving(false)
        onChanged()
      })
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
  }, [moveTarget, moveCopy, skill.name, onChanged, onError])

  const canEdit = skill.source === 'user-dsh'
  const dotColor = skill.checked === false ? 'var(--dsw-alias-state-warn-primary)' : 'var(--dsw-alias-state-success-primary)'
  const sourceLabel = skill.source === 'user-dsh' ? '用户' : skill.source === 'user-agents' ? 'Agent' : skill.source
  const sourceStyle = skill.source === 'user-agents' ? s.badgeSource : s.badge

  return (
    <div style={{ ...s.card, ...(skill.enabled ? {} : s.cardDisabled) }}>
      <div style={s.cardHead}>
        <span style={{ ...s.cardIcon, color: dotColor, fontSize: '18px' }}>●</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={s.name}>{skill.name}</span>
            {skill.flat !== undefined && <span style={s.badge}>{skill.flat ? 'flat' : 'bundle'}</span>}
          </div>
          <div style={{ ...s.badges, marginTop: '4px' }}>
            <span style={sourceStyle}>{sourceLabel}</span>
            {!skill.modelInvocable && <span style={{ ...s.badge, ...s.badgeWarn }}>模型: 否</span>}
            {!skill.userInvocable && <span style={{ ...s.badge, ...s.badgeWarn }}>用户: 否</span>}
            {skill.provenance && (
              <span style={s.badge} title={skill.provenance.location}>
                {skill.provenance.kind === 'archive' ? '归档' : skill.provenance.kind === 'dir' ? '目录' : '手动'}
              </span>
            )}
          </div>
        </div>
        <ToggleSwitch enabled={skill.enabled} onChange={(v) => onToggle(skill.name, v)} disabled={busy === skill.name} />
      </div>
      <p style={s.desc}>{skill.description || t('noDescription')}</p>
      <div style={s.cardFooter}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button type="button" style={s.btn} onClick={toggleDetail}>
            {open ? '收起' : '详情'}
          </button>
          <button
            type="button"
            style={s.btn}
            onClick={() =>
              openFolder(skill.name).catch((error: unknown) =>
                onError(error instanceof Error ? error.message : String(error)),
              )
            }
          >
            打开文件夹
          </button>
          {canEdit && (
            <>
              <button type="button" style={s.btn} onClick={startEdit}>
                编辑
              </button>
              <button type="button" style={s.btn} onClick={() => setRenaming(true)}>
                重命名
              </button>
              <button type="button" style={s.btn} onClick={() => setMoving(true)}>
                移动
              </button>
              {skill.provenance?.kind === 'github' && (
                <button
                  type="button"
                  style={s.btn}
                  disabled={updating}
                  onClick={() => {
                    setUpdating(true)
                    void updateMarketSkill(skill.name)
                      .then(() => onChanged())
                      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
                      .finally(() => setUpdating(false))
                  }}
                >
                  更新
                </button>
              )}
              <button
                type="button"
                style={{ ...s.btn, ...s.btnDanger }}
                onClick={() => {
                  if (confirm(`确定删除 "${skill.name}"？此操作不可撤销。`)) {
                    doDelete()
                  }
                }}
              >
                删除
              </button>
            </>
          )}
          {!canEdit && <span style={s.hint}>（共享目录只读）</span>}
          <button
            type="button"
            style={s.btn}
            onClick={() => {
              const a = document.createElement('a')
              a.href = exportUrl(skill.name)
              a.download = `${skill.name}.skill`
              a.click()
            }}
          >
            导出
          </button>
        </div>
      </div>

      {open && (
        <div style={s.detail}>
          {detail ? (
            <>
              {detail.whenToUse && (
                <p style={s.hint}>
                  <strong>何时使用：</strong>
                  {detail.whenToUse}
                </p>
              )}
              {detail.path && <p style={s.hint}>路径: {detail.path}</p>}
              {detail.frontmatter && (
                <>
                  <span style={s.sectionLabel}>frontmatter</span>
                  <pre
                    style={{
                      background: 'var(--dsw-alias-bg-base)',
                      border: '1px solid var(--dsw-alias-line-secondary)',
                      borderRadius: '6px',
                      padding: '8px',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '160px',
                    }}
                  >
                    {detail.frontmatter}
                  </pre>
                </>
              )}
              <span style={s.sectionLabel}>内容</span>
              <div
                style={{
                  background: 'var(--dsw-alias-bg-base)',
                  border: '1px solid var(--dsw-alias-line-secondary)',
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '360px',
                  lineHeight: '1.6',
                }}
              >
                {renderMarkdown(detail.content || t('emptyContent'))}
              </div>
            </>
          ) : (
            <span style={s.hint}>加载中…</span>
          )}
          {detailError && <div style={s.status}>{t('error')}{detailError}</div>}
        </div>
      )}

      {renaming && (
        <div style={s.form}>
          <div style={s.field}>
            <span style={s.label}>{t('renameTo')}</span>
            <input
              style={s.input}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void doRename()
              }}
            />
          </div>
          <div style={s.actions}>
            <button type="button" style={s.primary} onClick={doRename}>
              {t('save')}
            </button>
            <button type="button" style={s.btn} onClick={() => setRenaming(false)}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {moving && (
        <div style={s.form}>
          <div style={s.field}>
            <span style={s.label}>{t('moveTo')}</span>
            <select
              style={s.input}
              value={moveTarget}
              onChange={(event) => setMoveTarget(event.target.value)}
            >
              {moveTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </div>
          <div style={s.actions}>
            <button type="button" style={moveCopy ? s.primary : s.btnGhost} onClick={() => setMoveCopy(false)}>
              {t('moveMove')}
            </button>
            <button type="button" style={moveCopy ? s.primary : s.btnGhost} onClick={() => setMoveCopy(true)}>
              {t('moveCopy')}
            </button>
            <button type="button" style={s.primary} onClick={doMove}>
              {t('save')}
            </button>
            <button type="button" style={s.btn} onClick={() => setMoving(false)}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {editing && editData && (
        <div style={s.form}>
          <div style={s.field}>
            <span style={s.label}>{t('nameLabel')}</span>
            <span style={s.hint}>{editData.name}</span>
          </div>
          <div style={s.field}>
            <span style={s.label}>{t('descriptionLabel')}</span>
            <input
              style={s.input}
              value={editData.description}
              onChange={(event) => setEditData({ ...editData, description: event.target.value })}
            />
          </div>
          <div style={s.field}>
            <span style={s.label}>{t('whenToUseLabel')}</span>
            <input
              style={s.input}
              value={editData.whenToUse ?? ''}
              onChange={(event) => setEditData({ ...editData, whenToUse: event.target.value })}
            />
          </div>
          <div style={s.field}>
            <span style={s.label}>{t('contentLabel')}</span>
            <textarea
              style={s.textarea}
              value={editData.content}
              onChange={(event) => setEditData({ ...editData, content: event.target.value })}
            />
          </div>
          <div style={s.actions}>
            <button type="button" style={s.primary} onClick={saveEdit} disabled={saving}>
              {t('save')}
            </button>
            <button type="button" style={s.btn} onClick={() => setEditing(false)}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** New-skill form (inline). */
function NewSkillForm(props: { t: TranslateNS<typeof NS>; onDone(): void; onError(m: string): void }): React.ReactNode {
  const { t, onDone, onError } = props
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [whenToUse, setWhenToUse] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = useCallback(() => {
    setSaving(true)
    void createSkill({ name, description, whenToUse, content })
      .then(() => {
        onDone()
      })
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
      .finally(() => setSaving(false))
  }, [name, description, whenToUse, content, onDone, onError])

  return (
    <div style={s.form}>
      <div style={s.field}>
        <span style={s.label}>{t('nameLabel')}</span>
        <input style={s.input} value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div style={s.field}>
        <span style={s.label}>{t('descriptionLabel')}</span>
        <input
          style={s.input}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div style={s.field}>
        <span style={s.label}>{t('whenToUseLabel')}</span>
        <input
          style={s.input}
          value={whenToUse}
          onChange={(event) => setWhenToUse(event.target.value)}
        />
      </div>
      <div style={s.field}>
        <span style={s.label}>{t('contentLabel')}</span>
        <textarea
          style={s.textarea}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>
      <div style={s.actions}>
        <button type="button" style={s.primary} onClick={submit} disabled={saving}>
          {t('save')}
        </button>
        <button type="button" style={s.link} onClick={onDone}>
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

/** Import panel (archive file + directory path, conflict policy, preview/run). */
function ImportPanel(props: {
  t: TranslateNS<typeof NS>
  onDone(): void
  onError(message: string): void
}): React.ReactNode {
  const { t, onDone, onError } = props
  const [conflict, setConflict] = useState<'skip' | 'overwrite'>('skip')
  const [dirPath, setDirPath] = useState('')
  const [preview, setPreview] = useState<ImportResponse | null>(null)
  const [running, setRunning] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const pendingFile = useRef<Uint8Array | null>(null)

  const readFile = (file: File): Promise<Uint8Array> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
      reader.onerror = () => reject(new Error('cannot read file'))
      reader.readAsArrayBuffer(file)
    })

  const handleFile = useCallback(
    (file: File) => {
      void readFile(file)
        .then(async (bytes) => {
          if (bytes.length > 48 * 1024 * 1024) throw new Error('archive exceeds 48 MiB')
          pendingFile.current = bytes
          setPreview(await importArchive(bytes, conflict, true))
        })
        .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
    },
    [conflict, onError],
  )

  const previewDir = useCallback(() => {
    const path = dirPath.trim()
    if (!path) return
    void importDir(path, conflict, true)
      .then(setPreview)
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
  }, [dirPath, conflict, onError])

  const run = useCallback(() => {
    setRunning(true)
    const finish = () => {
      setRunning(false)
      onDone()
    }
    if (pendingFile.current) {
      void importArchive(pendingFile.current, conflict, false)
        .then((result) => {
          if (result.failed.length) {
            onError(`${t('importFailed')}: ${result.failed.map((item) => `${item.name}: ${item.error}`).join(', ')}`)
          }
          finish()
        })
        .catch((error: unknown) => {
          onError(error instanceof Error ? error.message : String(error))
          setRunning(false)
        })
    } else {
      void importDir(dirPath.trim(), conflict, false)
        .then((result) => {
          if (result.failed.length) {
            onError(`${t('importFailed')}: ${result.failed.map((item) => `${item.name}: ${item.error}`).join(', ')}`)
          }
          finish()
        })
        .catch((error: unknown) => {
          onError(error instanceof Error ? error.message : String(error))
          setRunning(false)
        })
    }
  }, [conflict, dirPath, onDone, onError, t])

  return (
    <div style={s.form}>
      <div style={s.actions}>
        <button type="button" style={s.refresh} onClick={() => fileRef.current?.click()}>
          {t('importArchive')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,.skill"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleFile(file)
            event.target.value = ''
          }}
        />
        <button type="button" style={s.link} onClick={() => fileRef.current?.click()}>
          {t('importClose')}
        </button>
      </div>
      <div style={s.field}>
        <span style={s.label}>{t('importPath')}</span>
        <div style={s.actions}>
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder={t('importPathPlaceholder')}
            value={dirPath}
            onChange={(event) => setDirPath(event.target.value)}
          />
          <button type="button" style={s.refresh} onClick={previewDir}>
            {t('importPreview')}
          </button>
        </div>
      </div>
      <div style={s.field}>
        <span style={s.label}>{t('importConflict')}</span>
        <select
          style={s.input}
          value={conflict}
          onChange={(event) => setConflict(event.target.value as 'skip' | 'overwrite')}
        >
          <option value="skip">{t('importSkip')}</option>
          <option value="overwrite">{t('importOverwrite')}</option>
        </select>
      </div>
      {preview && (
        <div style={s.hint}>
          {preview.pending.length > 0 && (
            <div>{t('importPending')}: {preview.pending.join(', ')}</div>
          )}
          {preview.conflicts.length > 0 && (
            <div style={{ color: 'var(--dsw-alias-state-warn-primary)' }}>
              {t('importConflicts')}: {preview.conflicts.join(', ')}
            </div>
          )}
          {preview.pending.length === 0 && preview.conflicts.length === 0 && (
            <div>{t('importNoSkills')}</div>
          )}
        </div>
      )}
      <div style={s.actions}>
        <button
          type="button"
          style={s.primary}
          onClick={run}
          disabled={running || !pendingFile.current && !dirPath.trim()}
        >
          {t('importRun')}
        </button>
        <button type="button" style={s.link} onClick={onDone}>
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

/** One market result row: name, installs, GitHub link, lazy description. */
function MarketRow(props: {
  item: MarketItem
  busy: string | null
  t: TranslateNS<typeof NS>
  onInstall(id: string): void
  onError(message: string): void
}): React.ReactNode {
  const { item, busy, t, onInstall, onError } = props
  const [description, setDescription] = useState<string | null>(null)
  const [loadingDesc, setLoadingDesc] = useState(false)

  const toggleDesc = useCallback(() => {
    if (description !== null || loadingDesc) return
    setLoadingDesc(true)
    void marketDescribe(item.id)
      .then((result) => setDescription(result.description))
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoadingDesc(false))
  }, [description, loadingDesc, item.id, onError])

  const repoUrl = item.source ? `https://github.com/${item.source}` : undefined

  return (
    <div style={s.card}>
      <div style={s.cardHead}>
        <span style={s.name}>{item.name}</span>
        <span style={s.badge}>{item.installs.toLocaleString()} {t('marketInstalls')}</span>
        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--dsw-alias-brand-primary)', fontSize: '12px' }}
          >
            {item.source}
          </a>
        )}
        
        <button type="button" style={s.refresh} onClick={toggleDesc} disabled={loadingDesc}>
          {description !== null ? (description ? '↑' : t('marketNoResults')) : loadingDesc ? '…' : t('detail')}
        </button>
        <button
          type="button"
          style={s.primary}
          disabled={busy === item.id}
          onClick={() => onInstall(item.id)}
        >
          {t('marketInstall')}
        </button>
      </div>
      {description !== null && description && <p style={s.desc}>{description}</p>}
    </div>
  )
}

/** Market panel: skills.sh search + GitHub repo import. */
function MarketPanel(props: {
  t: TranslateNS<typeof NS>
  onDone(): void
  onError(message: string): void
  catalog: CatalogResponse | null
}): React.ReactNode {
  const { t, onDone, onError, catalog } = props
  const [activeTab, setActiveTab] = useState<'installed' | 'skillhub'>('skillhub')
  const [keyword, setKeyword] = useState('')
  const [items, setItems] = useState<MarketItem[] | null>(null)
  const [itemDescriptions, setItemDescriptions] = useState<Record<string, string>>({})
  const [searching, setSearching] = useState(false)
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('')
  const [repos, setRepos] = useState<Array<{ id: string; owner: string; repo: string; branch: string }>>([])
  const [repoIdCounter, setRepoIdCounter] = useState(0)
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set())
  const [repoSkills, setRepoSkills] = useState<Record<string, Array<{ name: string; description: string; flat: boolean }>>>({})
  const [scanning, setScanning] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // Installed tab state
  const [installedFilter, setInstalledFilter] = useState('')
  const [installedScope, setInstalledScope] = useState<'user' | string>('user')
  const [installedPage, setInstalledPage] = useState(1)
  const [installedPageSize, setInstalledPageSize] = useState(20)
  // SkillHub tab state
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'newest'>('rating')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [hubPage, setHubPage] = useState(1)
  const [hubPageSize, setHubPageSize] = useState(20)

  const doSearch = useCallback(() => {
    if (keyword.trim().length < 2) return
    setSearching(true)
    setItemDescriptions({})
    void marketSearch(keyword)
      .then(async (results) => {
        setItems(results)
        const descriptions: Record<string, string> = {}
        for (let i = 0; i < results.length; i += 5) {
          const batch = results.slice(i, i + 5)
          await Promise.all(
            batch.map(async (item) => {
              try {
                const res = await marketDescribe(item.id)
                if (res.description) descriptions[item.id] = res.description
              } catch {
                /* skip */
              }
            }),
          )
        }
        setItemDescriptions(descriptions)
      })
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
      .finally(() => setSearching(false))
  }, [keyword, onError])

  const doInstall = useCallback(
    (id: string, workspaceId?: string) => {
      setBusy(`install:${id}`)
      void marketInstall(id, workspaceId)
        .then((result) => onError(`${result.installed} ${t('installSuccess')}`))
        .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
        .finally(() => setBusy(null))
    },
    [onError, t],
  )

  const addRepo = useCallback(() => {
    if (!owner.trim() || !repo.trim()) return
    setRepoIdCounter((c) => {
      const id = `repo-${c + 1}`
      setRepos((prev) => [...prev, { id, owner: owner.trim(), repo: repo.trim(), branch: branch.trim() || 'main' }])
      return c + 1
    })
    setOwner('')
    setRepo('')
    setBranch('')
  }, [owner, repo, branch])

  const removeRepo = useCallback((id: string) => {
    setRepos((prev) => prev.filter((r) => r.id !== id))
    setExpandedRepos((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setRepoSkills((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const scanRepo = useCallback(
    (id: string, o: string, r: string, _b: string) => {
      setScanning(id)
      setRepoSkills((prev) => ({ ...prev, [id]: [] }))
      void githubScan(o, r)
        .then((result) => {
          setRepoSkills((prev) => ({ ...prev, [id]: result.skills }))
          if (result.skills.length > 0) {
            setExpandedRepos((prev) => new Set(prev).add(id))
          }
        })
        .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
        .finally(() => setScanning(null))
    },
    [onError],
  )

  const installFromRepo = useCallback(
    (repoId: string, skillName: string, o: string, r: string) => {
      setBusy(`${repoId}:${skillName}`)
      void marketInstall(`${o}/${r}/${skillName}`)
        .then(() => onError(`${skillName} ${t('installSuccess')}`))
        .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
        .finally(() => setBusy(null))
    },
    [onError, t],
  )

  const getCategory = (item: MarketItem): string => {
    const parts = item.source.split('/')
    if (parts.length >= 2) {
      if (parts[0] === 'anthropics' && parts[1] === 'skills') return 'official'
      return parts[1]
    }
    return 'other'
  }

  const getCategoryLabel = (cat: string): string => {
    const labels: Record<string, string> = {
      official: '官方',
      skills: '技能库',
      'claude-office-skills': '办公',
      anthropics: '官方',
    }
    return labels[cat] || cat
  }

  const formatInstalls = (n: number): string => {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return String(n)
  }

  // Installed skills from catalog, filtered by scope
  const workspaces = catalog?.workspaces ?? []
  const userSkills = (catalog?.skills ?? []).filter(
    (skill) => !installedFilter || skill.name.includes(installedFilter.toLowerCase()) || skill.description.toLowerCase().includes(installedFilter.toLowerCase()),
  )
  const scopeSkills =
    installedScope === 'user'
      ? userSkills
      : (workspaces.find((ws) => ws.id === installedScope)?.skills ?? []).filter(
          (skill) => !installedFilter || skill.name.includes(installedFilter.toLowerCase()),
        )
  const installedTotalPages = Math.max(1, Math.ceil(scopeSkills.length / installedPageSize))
  const installedPageSkills = scopeSkills.slice((installedPage - 1) * installedPageSize, installedPage * installedPageSize)

  // SkillHub items sorted/filtered
  const sortedItems = (items ?? []).slice()
  if (sortBy === 'downloads') sortedItems.sort((a, b) => b.installs - a.installs)
  else if (sortBy === 'newest') sortedItems.sort((a, b) => b.source.localeCompare(a.source))
  else sortedItems.sort((a, b) => b.installs - a.installs)
  const categorySet = Array.from(new Set(sortedItems.map((item) => getCategory(item))))
  const filteredItems = categoryFilter === 'all' ? sortedItems : sortedItems.filter((item) => getCategory(item) === categoryFilter)
  const hubTotalPages = Math.max(1, Math.ceil(filteredItems.length / hubPageSize))
  const hubPageItems = filteredItems.slice((hubPage - 1) * hubPageSize, hubPage * hubPageSize)

  return (
    <div style={s.form}>
      <div style={s.tabs}>
        <button type="button" style={activeTab === 'installed' ? s.tabActive : s.tab} onClick={() => setActiveTab('installed')}>
          {t('tabInstalled')}
        </button>
        <button type="button" style={activeTab === 'skillhub' ? s.tabActive : s.tab} onClick={() => setActiveTab('skillhub')}>
          {t('tabSkillHub')}
        </button>
      </div>

      {activeTab === 'skillhub' && (
        <>
          <div style={s.card}>
            <span style={s.sectionLabel}>{t('githubImport')}</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <input style={{ ...s.input, flex: 1 }} placeholder={t('githubOwner')} value={owner} onChange={(event) => setOwner(event.target.value)} />
              <input style={{ ...s.input, flex: 1 }} placeholder={t('githubRepo')} value={repo} onChange={(event) => setRepo(event.target.value)} />
              <input style={{ ...s.input, width: '100px' }} placeholder={t('githubBranch')} value={branch} onChange={(event) => setBranch(event.target.value)} />
              <button type="button" style={s.primary} onClick={addRepo}>
                {t('githubAddRepo')}
              </button>
            </div>
          </div>

          {repos.length > 0 && (
            <div style={s.card}>
              {repos.map((r) => {
                const isExpanded = expandedRepos.has(r.id)
                const skills = repoSkills[r.id]
                const isScanning = scanning === r.id
                return (
                  <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-line-secondary)' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ flex: 1, fontWeight: 600 }}>
                        {r.owner}/{r.repo} ({r.branch})
                      </span>
                      <button type="button" style={s.btn} onClick={() => scanRepo(r.id, r.owner, r.repo, r.branch)} disabled={isScanning}>
                        {isScanning ? '…' : t('repoSearch')}
                      </button>
                      <button type="button" style={s.btn} onClick={() => toggleExpand(r.id)}>
                        {t('repoExpand')} ({skills?.length ?? '?'})
                      </button>
                      <button type="button" style={{ ...s.btn, ...s.btnDanger }} onClick={() => removeRepo(r.id)}>
                        {t('repoRemove')}
                      </button>
                    </div>
                    {isExpanded && skills && (
                      <div style={{ marginTop: '6px', paddingLeft: '12px' }}>
                        {skills.length === 0 && <span style={s.hint}>{t('githubNoSkills')}</span>}
                        {skills.map((skill) => (
                          <div key={skill.name} style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '4px 0' }}>
                            <span style={{ flex: 1 }}>{skill.name}</span>
                            <button
                              type="button"
                              style={s.btnPrimary}
                              disabled={busy === `${r.id}:${skill.name}`}
                              onClick={() => installFromRepo(r.id, skill.name, r.owner, r.repo)}
                            >
                              {t('githubInstall')}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder={t('marketPlaceholder')}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') doSearch()
              }}
            />
            <button type="button" style={s.primary} onClick={doSearch} disabled={searching}>
              {searching ? t('marketSearching') : t('marketSearch')}
            </button>
          </div>

          {items && items.length === 0 && <div style={s.empty}>{t('marketNoResults')}</div>}
          {items && items.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <select style={s.input} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setHubPage(1) }}>
                  <option value="all">{t('categoryAll')}</option>
                  {categorySet.map((cat) => (
                    <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                  ))}
                </select>
                <select style={s.input} value={sortBy} onChange={(e) => { setSortBy(e.target.value as 'rating' | 'downloads' | 'newest'); setHubPage(1) }}>
                  <option value="rating">{t('sortByRating')}</option>
                  <option value="downloads">{t('sortByDownloads')}</option>
                  <option value="newest">{t('sortByNewest')}</option>
                </select>
                <span style={s.hint}>{t('totalResults', { d: filteredItems.length })}</span>
              </div>
              <div style={s.grid}>
                {hubPageItems.map((item) => {
                  const cat = getCategory(item)
                  const catLabel = getCategoryLabel(cat)
                  const desc = itemDescriptions[item.id] || item.name
                  const isBusy = busy === `install:${item.id}`
                  return (
                    <div key={item.id} style={s.marketCard}>
                      <div style={s.marketHead}>
                        <div style={s.marketIcon}>{item.name.charAt(0).toUpperCase()}</div>
                        <div style={s.marketMeta}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={s.marketName}>{item.name}</span>
                            <span style={s.badge}>{catLabel}</span>
                          </div>
                          <div style={s.marketStats}>
                            <span>{t('downloads')} {formatInstalls(item.installs)}</span>
                            <span>·</span>
                            <span>{t('installs')} {formatInstalls(item.installs)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={s.marketDesc}>{desc}</div>
                      <div style={s.actions}>
                        {workspaces.length > 0 ? (
                          <button type="button" style={s.marketInstallBtn} disabled={isBusy} onClick={() => doInstall(item.id, workspaces[0].id)}>
                            {t('installToProject')}
                          </button>
                        ) : (
                          <button type="button" style={s.marketInstallBtn} disabled={isBusy} onClick={() => doInstall(item.id)}>
                            {t('installToUser')}
                          </button>
                        )}
                        <button type="button" style={s.btn} disabled={isBusy} onClick={() => doInstall(item.id)}>
                          {t('installToUser')}
                        </button>
                        <a href={`https://github.com/${item.source}`} target="_blank" rel="noreferrer" style={{ color: 'var(--dsw-alias-brand-primary)', fontSize: '12px', textDecoration: 'none' }}>
                          {t('detail')}
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                <span style={s.hint}>{t('pageOf', { d: hubPage, d2: hubTotalPages })}</span>
                <button type="button" style={s.btn} disabled={hubPage <= 1} onClick={() => setHubPage(hubPage - 1)}>←</button>
                <button type="button" style={s.btn} disabled={hubPage >= hubTotalPages} onClick={() => setHubPage(hubPage + 1)}>→</button>
                <select style={s.input} value={hubPageSize} onChange={(e) => { setHubPageSize(Number(e.target.value)); setHubPage(1) }}>
                  {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{t('itemsPerPage', { d: n })}</option>)}
                </select>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'installed' && (
        <>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" style={installedScope === 'user' ? s.tabActive : s.tab} onClick={() => { setInstalledScope('user'); setInstalledPage(1) }}>
              {t('tabUser')} ({userSkills.length})
            </button>
            {workspaces.map((ws) => (
              <button key={ws.id} type="button" style={installedScope === ws.id ? s.tabActive : s.tab} onClick={() => { setInstalledScope(ws.id); setInstalledPage(1) }}>
                {ws.title} ({(catalog?.workspaces.find((w) => w.id === ws.id)?.skills ?? []).length})
              </button>
            ))}
            <input style={{ ...s.input, flex: 1, minWidth: '120px' }} placeholder={t('filterPlaceholder')} value={installedFilter} onChange={(e) => { setInstalledFilter(e.target.value); setInstalledPage(1) }} />
          </div>
          {installedPageSkills.length === 0 && <div style={s.empty}>{t('noSkills')}</div>}
          <div style={s.grid}>
            {installedPageSkills.map((skill) => (
              <div key={skill.name} style={{ ...s.card, ...(skill.enabled ? {} : s.cardDisabled) }}>
                <div style={s.cardHead}>
                  <span style={{ ...s.cardIcon, color: skill.enabled ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-warn-primary)', fontSize: '18px' }}>●</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={s.name}>{skill.name}</span>
                      <span style={installedScope === 'user' ? { ...s.badge, ...s.badgeSource } : s.badge}>
                        {installedScope === 'user' ? t('badgeUser') : t('badgeProject')}
                      </span>
                      {skill.provenance?.kind === 'github' && <span style={s.badge}>{t('badgeGitHub')}</span>}
                    </div>
                  </div>
                  <ToggleSwitch enabled={skill.enabled} onChange={() => { /* toggling handled in main panel; read-only here */ }} disabled />
                </div>
                <p style={s.desc}>{skill.description || t('noDescription')}</p>
                <div style={s.cardFooter}>
                  <span style={{ ...s.badge, ...(skill.enabled ? s.badgeOk : s.badgeWarn) }}>
                    {skill.enabled ? `${t('enabled')} ${t('installSuccess')}` : t('disabled')}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
            <span style={s.hint}>{t('pageOf', { d: installedPage, d2: installedTotalPages })}</span>
            <button type="button" style={s.btn} disabled={installedPage <= 1} onClick={() => setInstalledPage(installedPage - 1)}>←</button>
            <button type="button" style={s.btn} disabled={installedPage >= installedTotalPages} onClick={() => setInstalledPage(installedPage + 1)}>→</button>
            <select style={s.input} value={installedPageSize} onChange={(e) => { setInstalledPageSize(Number(e.target.value)); setInstalledPage(1) }}>
              {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{t('itemsPerPage', { d: n })}</option>)}
            </select>
          </div>
        </>
      )}

      <div style={s.actions}>
        <button type="button" style={s.link} onClick={onDone}>
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

/** MCP panel: server list with real connect/disconnect, test, CRUD. */
function McpPanel(props: {
  t: TranslateNS<typeof NS>
  onError(message: string): void
}): React.ReactNode {
  const { t, onError } = props
  const [servers, setServers] = useState<McpServerView[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    transport: 'stdio' as 'stdio' | 'streamable-http',
    serverName: '',
    command: '',
    args: '',
    url: '',
  })

  const load = useCallback(() => {
    void fetchMcp()
      .then((data) => setServers(data.servers))
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
  }, [onError])

  useEffect(load, [load])

  const submit = useCallback(() => {
    if (!form.name.trim()) return
    setBusy('save')
    void saveMcp({
      name: form.name,
      transport: form.transport,
      serverName: form.serverName || undefined,
      command: form.command || undefined,
      args: form.args ? form.args.split(/\s+/).filter(Boolean) : undefined,
      url: form.url || undefined,
      enabled: true,
    })
      .then(() => {
        setCreating(false)
        setForm({ name: '', transport: 'stdio', serverName: '', command: '', args: '', url: '' })
        load()
      })
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(null))
  }, [form, load, onError])

  const doToggle = useCallback(
    (server: McpServerView) => {
      setBusy(server.id)
      void toggleMcp(server.id, !server.enabled)
        .then(load)
        .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
        .finally(() => setBusy(null))
    },
    [load, onError],
  )

  const doTest = useCallback(
    (server: McpServerView) => {
      setBusy(`test:${server.id}`)
      void testMcp(server.id)
        .then((result) =>
          onError(result.ok ? `${server.name}: ${t('mcpTestOk')}` : `${server.name}: ${t('mcpTestFail')}${result.error ?? ''}`),
        )
        .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
        .finally(() => setBusy(null))
    },
    [onError, t],
  )

  const doDelete = useCallback(
    (server: McpServerView) => {
      setBusy(`del:${server.id}`)
      void deleteMcp(server.id)
        .then(load)
        .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
        .finally(() => setBusy(null))
    },
    [load, onError],
  )

  return (
    <div style={s.form}>
      <div style={s.actions}>
        <span style={{ flex: 1, fontWeight: 600 }}>{t('mcp')}</span>
        <button type="button" style={s.primary} onClick={() => setCreating(!creating)}>
          {t('mcpNew')}
        </button>
      </div>
      {creating && (
        <div style={s.form}>
          <div style={s.field}>
            <span style={s.label}>{t('mcpName')}</span>
            <input style={s.input} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div style={s.field}>
            <span style={s.label}>{t('mcpTransport')}</span>
            <select
              style={s.input}
              value={form.transport}
              onChange={(event) => setForm({ ...form, transport: event.target.value as 'stdio' | 'streamable-http' })}
            >
              <option value="stdio">stdio</option>
              <option value="streamable-http">streamable-http</option>
            </select>
          </div>
          <div style={s.field}>
            <span style={s.label}>{t('mcpServerName')}（{t('mcpNew')}留空自动生成）</span>
            <input style={s.input} value={form.serverName} onChange={(event) => setForm({ ...form, serverName: event.target.value })} />
          </div>
          {form.transport === 'stdio' ? (
            <>
              <div style={s.field}>
                <span style={s.label}>{t('mcpCommand')}</span>
                <input style={s.input} value={form.command} onChange={(event) => setForm({ ...form, command: event.target.value })} />
              </div>
              <div style={s.field}>
                <span style={s.label}>{t('mcpArgs')}</span>
                <input style={s.input} value={form.args} onChange={(event) => setForm({ ...form, args: event.target.value })} />
              </div>
            </>
          ) : (
            <div style={s.field}>
              <span style={s.label}>{t('mcpUrl')}</span>
              <input style={s.input} value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
            </div>
          )}
          <div style={s.actions}>
            <button type="button" style={s.primary} onClick={submit} disabled={busy === 'save'}>
              {t('mcpSave')}
            </button>
            <button type="button" style={s.link} onClick={() => setCreating(false)}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
      {servers === null && <span style={s.hint}>{t('loading')}</span>}
      {servers?.length === 0 && <span style={s.hint}>{t('noSkills')}</span>}
      {servers?.map((server) => (
        <div key={server.id} style={s.card}>
          <div style={s.cardHead}>
            <span style={s.name}>{server.name}</span>
            <span style={server.running ? { ...s.badge, ...s.badgeOk } : s.badge}>
              {server.running ? t('mcpRunning') : t('mcpStopped')}
            </span>
            <span style={s.badge}>{server.transport}</span>
            <span style={s.badge}>{server.serverName}</span>
            
            <button
              type="button"
              style={server.enabled ? s.btnGhost : s.primary}
              disabled={busy === server.id}
              onClick={() => doToggle(server)}
            >
              {server.enabled ? t('disable') : t('enable')}
            </button>
          </div>
          <p style={s.hint}>
            {server.transport === 'stdio' ? `${server.command ?? ''} ${(server.args ?? []).join(' ')}` : server.url}
          </p>
          {server.lastError && <p style={s.status}>{server.lastError}</p>}
          <div style={s.actions}>
            <button
              type="button"
              style={s.refresh}
              disabled={busy === `test:${server.id}`}
              onClick={() => doTest(server)}
            >
              {busy === `test:${server.id}` ? t('mcpTesting') : t('mcpTest')}
            </button>
            <button type="button" style={s.link} onClick={() => doDelete(server)}>
              {t('mcpDelete')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Per-conversation skill loading panel. */
function ConversationPanel(props: {
  t: TranslateNS<typeof NS>
  allSkills: string[]
  onError(message: string): void
}): React.ReactNode {
  const { t, allSkills, onError } = props
  const [state, setState] = useState<{
    config: Record<string, { skills?: string[] }>
    sessions: Array<{ id: string; cwd: string }>
  } | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [selection, setSelection] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    void fetchConversation()
      .then((data) => {
        setState(data)
        if (active && data.config[active]) setSelection(data.config[active].skills ?? [])
      })
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
  }, [active, onError])

  useEffect(load, [load])

  const openSession = useCallback(
    (id: string) => {
      setActive(id)
      setSelection(state?.config[id]?.skills ?? [])
    },
    [state],
  )

  const save = useCallback(() => {
    if (!active) return
    setSaving(true)
    void saveConversation(active, selection)
      .then(() => onError(t('conversationSaved') + ' ✓'))
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
      .finally(() => setSaving(false))
  }, [active, selection, onError, t])

  const clear = useCallback(() => {
    if (!active) return
    setSelection([])
    void saveConversation(active, [])
      .then(() => onError(t('conversationClear') + ' ✓'))
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
  }, [active, onError, t])

  const shortId = (id: string) => (id.length > 24 ? `…${id.slice(-20)}` : id)

  return (
    <div style={s.form}>
      <span style={s.hint}>{t('conversationHint')}</span>
      {state && state.sessions.length === 0 && <span style={s.hint}>{t('conversationNoSessions')}</span>}
      {state?.sessions.map((session) => {
        const has = state.config[session.id]?.skills?.length ?? 0
        return (
          <div key={session.id} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              style={active === session.id ? s.primary : s.refresh}
              onClick={() => openSession(session.id)}
            >
              {shortId(session.id)}
            </button>
            <span style={s.badge}>{session.cwd || '-'}</span>
            {has > 0 && <span style={s.badgeOk as React.CSSProperties}>{has} ✓</span>}
          </div>
        )
      })}
      {active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={s.sectionLabel}>{t('conversationSelect')}</span>
          {allSkills.map((name) => (
            <label key={name} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={selection.includes(name)}
                onChange={(event) => {
                  setSelection(
                    event.target.checked
                      ? [...selection, name]
                      : selection.filter((entry) => entry !== name),
                  )
                }}
              />
              <span>{name}</span>
            </label>
          ))}
          <div style={s.actions}>
            <button type="button" style={s.primary} onClick={save} disabled={saving}>
              {t('save')}
            </button>
            <button type="button" style={s.link} onClick={clear}>
              {t('conversationClear')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Plugin inventory panel (read-only). */
function PluginPanel(props: { t: TranslateNS<typeof NS>; onError(message: string): void }): React.ReactNode {
  const { t, onError } = props
  const [data, setData] = useState<{ official: PluginRow[]; other: PluginRow[] } | null>(null)

  useEffect(() => {
    void fetchPlugins()
      .then(setData)
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)))
  }, [onError])

  const rows = (entries: PluginRow[]) =>
    entries.map((entry) => (
      <div key={entry.moduleName} style={s.card}>
        <div style={s.cardHead}>
          <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{entry.moduleName}</span>
          <span style={entry.enabled ? { ...s.badge, ...s.badgeOk } : s.badge}>
            {entry.enabled ? 'on' : 'off'}
          </span>
          <span style={s.badge}>
            {t('pluginsPhase')}: {entry.fiberPhase ?? '-'}
          </span>
        </div>
      </div>
    ))

  return (
    <div style={s.form}>
      {data === null && <span style={s.hint}>{t('loading')}</span>}
      {data && (
        <>
          <span style={s.sectionLabel}>{t('pluginsOfficial')} ({data.official.length})</span>
          {rows(data.official)}
          <span style={s.sectionLabel}>{t('pluginsOther')} ({data.other.length})</span>
          {rows(data.other)}
        </>
      )}
    </div>
  )
}

/** Settings page for skillforge (settings.section entry). */
export function SkillforgeSection(props: SectionProps): React.ReactNode {
  const { t } = props
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null)
  const [groups, setGroups] = useState<Array<{ id: string; name: string; members: string[] }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [marketOpen, setMarketOpen] = useState(false)
  const [mcpOpen, setMcpOpen] = useState(false)
  const [convOpen, setConvOpen] = useState(false)
  const [pluginsOpen, setPluginsOpen] = useState(false)
  const [scopeFilter, setScopeFilter] = useState<'all' | 'user' | string>('all')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [groupManage, setGroupManage] = useState(false)
  const [groupNameInput, setGroupNameInput] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    void fetchCatalog()
      .then((data) => {
        setCatalog(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
    void fetchGroups()
      .then((data) => setGroups(data.groups))
      .catch(() => {
        /* groups are optional */
      })
  }, [])

  useEffect(load, [load])

  const handleToggle = useCallback(
    (name: string, enabled: boolean) => {
      if (busy) return
      setBusy(name)
      void toggleSkill(name, enabled)
        .then(() => load())
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          setError(t('toggleFailed') + message)
        })
        .finally(() => setBusy(null))
    },
    [busy, load, t],
  )

  const handleCheck = useCallback(() => {
    setChecking(true)
    setCheckResult(null)
    void checkSkills()
      .then((result) => {
        const errors = result.errors.length
          ? ` · errors ${result.errors.map((entry) => `${entry.name}: ${entry.error}`).join(', ')}`
          : ''
        setCheckResult(t('checkedSummary', { checked: result.checked.length, fixed: result.fixed.length, skipped: result.skipped.length, errors }))
        load()
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => setChecking(false))
  }, [load, t])

  const q = query.trim().toLowerCase()
  const workspaces = catalog?.workspaces ?? []
  const userSkills = (catalog?.skills ?? []).filter(
    (skill) => !q || skill.name.includes(q) || skill.description.toLowerCase().includes(q),
  )
  const workspaceSkills = (id: string) =>
    (workspaces.find((workspace) => workspace.id === id)?.skills ?? []).filter(
      (skill) => !q || skill.name.includes(q) || skill.description.toLowerCase().includes(q),
    )
  const activeGroup = groups.find((group) => group.id === groupFilter) ?? null
  const inActiveGroup = (name: string) => (activeGroup ? activeGroup.members.includes(name) : true)

  const filteredScopes: Array<{ id: string; label: string; skills: SkillForgeSkill[] }> = []
  if (scopeFilter === 'all' || scopeFilter === 'user') {
    filteredScopes.push({ id: 'user', label: t('userSkills'), skills: userSkills.filter((s) => inActiveGroup(s.name)) })
  }
  if (scopeFilter === 'all') {
    for (const workspace of workspaces) {
      filteredScopes.push({
        id: workspace.id,
        label: `${workspace.title} · ${workspace.path}`,
        skills: workspaceSkills(workspace.id).filter((s) => inActiveGroup(s.name)),
      })
    }
  } else if (scopeFilter !== 'user') {
    const workspace = workspaces.find((entry) => entry.id === scopeFilter)
    if (workspace) {
      filteredScopes.push({
        id: workspace.id,
        label: `${workspace.title} · ${workspace.path}`,
        skills: workspaceSkills(workspace.id).filter((s) => inActiveGroup(s.name)),
      })
    }
  }
  const totalShown = filteredScopes.reduce((sum, scope) => sum + scope.skills.length, 0)

  const moveTargets = [
    { id: 'user-dsh', label: `${t('userSkills')} (~/.dsh/skills)` },
    ...workspaces.map((workspace) => ({
      id: `workspace:${workspace.id}`,
      label: `${workspace.title}`,
    })),
  ]

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={s.titleRow}>
          <span style={s.title}>{t('title')}</span>
          <div style={s.toolbar}>
            <button type="button" style={s.refresh} onClick={handleCheck} disabled={checking}>
              {checking ? t('checking') : t('check')}
            </button>
            <button type="button" style={s.refresh} onClick={() => setMarketOpen(true)}>
              {t('market')}
            </button>
            <button type="button" style={s.refresh} onClick={() => setMcpOpen(true)}>
              {t('mcp')}
            </button>
            <button type="button" style={s.refresh} onClick={() => setConvOpen(true)}>
              {t('conversation')}
            </button>
            <button type="button" style={s.refresh} onClick={() => setPluginsOpen(true)}>
              {t('plugins')}
            </button>
            <button type="button" style={s.refresh} onClick={() => setImporting(true)}>
              {t('import')}
            </button>
            <button type="button" style={s.refresh} onClick={() => setCreating(true)}>
              {t('newSkill')}
            </button>
            <button type="button" style={s.refresh} onClick={load} disabled={loading}>
              ↻
            </button>
          </div>
        </div>
        <input
          style={s.bigSearch}
          placeholder={t('search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div style={s.tabs}>
          <button
            type="button"
            style={scopeFilter === 'all' ? s.tabActive : s.tab}
            onClick={() => setScopeFilter('all')}
          >
            {t('allSkills')} ({userSkills.length + workspaces.reduce((sum, w) => sum + workspaceSkills(w.id).length, 0)})
          </button>
          <button
            type="button"
            style={scopeFilter === 'user' ? s.tabActive : s.tab}
            onClick={() => setScopeFilter('user')}
          >
            {t('userSkills')} ({userSkills.length})
          </button>
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              style={scopeFilter === workspace.id ? s.tabActive : s.tab}
              onClick={() => setScopeFilter(workspace.id)}
            >
              {workspace.title} ({workspaceSkills(workspace.id).length})
            </button>
          ))}
          {groups.length > 0 && (
            <>
              <button
                type="button"
                style={groupFilter === null ? s.tabActive : s.tab}
                onClick={() => setGroupFilter(null)}
              >
                全部组
              </button>
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  style={groupFilter === group.id ? s.tabActive : s.tab}
                  onClick={() => setGroupFilter(group.id)}
                >
                  {group.name}
                </button>
              ))}
              <button type="button" style={s.tab} onClick={() => setGroupManage(!groupManage)}>
                ⚙ {t('groups')}
              </button>
            </>
          )}
        </div>
      </div>

      {groupManage && (
        <div style={{ ...s.card, padding: '10px 12px' }}>
          <div style={s.field}>
            <div style={s.actions}>
              <input
                style={{ ...s.input, flex: 1 }}
                placeholder={t('groupNew')}
                value={groupNameInput}
                onChange={(event) => setGroupNameInput(event.target.value)}
              />
              <button
                type="button"
                style={s.primary}
                onClick={() => {
                  const name = groupNameInput.trim()
                  if (!name) return
                  void mutateGroups({ op: 'create', name })
                    .then((data) => {
                      setGroups(data.groups)
                      setGroupNameInput('')
                    })
                    .catch((error: unknown) =>
                      setError(t('actionFailed') + (error instanceof Error ? error.message : String(error))),
                    )
                }}
              >
                {t('groupNew')}
              </button>
            </div>
          </div>
          {groups.map((group) => (
            <div key={group.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '4px 0' }}>
              <span style={{ flex: 1 }}>{group.name}</span>
              <span style={s.badge}>{group.members.length}</span>
              <button type="button" style={s.btn} onClick={() => setGroupFilter(group.id)}>
                查看
              </button>
              <button
                type="button"
                style={{ ...s.btn, ...s.btnDanger }}
                onClick={() =>
                  mutateGroups({ op: 'delete', id: group.id })
                    .then((data) => setGroups(data.groups))
                    .catch((error: unknown) =>
                      setError(t('actionFailed') + (error instanceof Error ? error.message : String(error))),
                    )
                }
              >
                删除
              </button>
            </div>
          ))}
          {activeGroup && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--dsw-alias-line-secondary)' }}>
              <span style={s.sectionLabel}>{activeGroup.name} — 选择技能</span>
              {userSkills.map((skill) => (
                <label key={skill.name} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={activeGroup.members.includes(skill.name)}
                    onChange={(event) => {
                      const members = event.target.checked
                        ? [...activeGroup.members, skill.name]
                        : activeGroup.members.filter((name) => name !== skill.name)
                      void mutateGroups({ op: 'setMembers', id: activeGroup.id, members })
                        .then((data) => setGroups(data.groups))
                        .catch((error: unknown) =>
                          setError(t('actionFailed') + (error instanceof Error ? error.message : String(error))),
                        )
                    }}
                  />
                  <span>{skill.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {checkResult && <p style={{ ...s.hint, background: 'var(--dsw-alias-bg-base)', padding: '6px 10px', borderRadius: '6px' }}>{checkResult}</p>}
      {error && <div style={s.status}>{t('error')}{error}</div>}

      {loading ? (
        <div style={s.empty}>{t('loading')}</div>
      ) : (
        <>
          {creating && (
            <NewSkillForm
              t={t}
              onDone={() => {
                setCreating(false)
                load()
              }}
              onError={(message) => setError(t('actionFailed') + message)}
            />
          )}
          {importing && (
            <ImportPanel
              t={t}
              onDone={() => {
                setImporting(false)
                load()
              }}
              onError={(message) => setError(t('actionFailed') + message)}
            />
          )}
          {marketOpen && (
            <MarketPanel
              t={t}
              catalog={catalog}
              onDone={() => {
                setMarketOpen(false)
                load()
              }}
              onError={(message) => setError(t('actionFailed') + message)}
            />
          )}
          {mcpOpen && (
            <McpPanel t={t} onError={(message) => setError(t('actionFailed') + message)} />
          )}
          {convOpen && (
            <ConversationPanel
              t={t}
              allSkills={userSkills.map((skill) => skill.name)}
              onError={(message) => setError(t('actionFailed') + message)}
            />
          )}
          {pluginsOpen && (
            <PluginPanel t={t} onError={(message) => setError(t('actionFailed') + message)} />
          )}

          <div style={s.grid}>
            {totalShown === 0 && !q && !creating && <div style={s.empty}>{t('noSkills')}</div>}
            {totalShown === 0 && q && <div style={s.empty}>{t('noResults')}</div>}
            {filteredScopes.map((scope) =>
              scope.skills.map((skill) => (
                <SkillRow
                  key={scope.id + ':' + skill.name}
                  skill={skill}
                  busy={busy}
                  t={t}
                  onToggle={handleToggle}
                  onChanged={load}
                  onError={(message) => setError(t('actionFailed') + message)}
                  moveTargets={moveTargets}
                />
              )),
            )}
          </div>

          {catalog && catalog.diagnostics.length > 0 && (
            <div style={{ ...s.card, padding: '10px 12px', marginTop: '8px' }}>
              <span style={s.sectionLabel}>{t('diagnostics')} ({catalog.diagnostics.length})</span>
              <p style={{ ...s.hint, marginTop: '4px' }}>{t('diagnosticsHint')}</p>
              {catalog.diagnostics.map((item) => (
                <div key={item.path} style={{ padding: '4px 0', borderBottom: '1px dashed var(--dsw-alias-line-secondary)' }}>
                  <p style={{ ...s.hint, fontFamily: 'monospace', fontSize: '11px' }}>{item.path}</p>
                  <p style={{ ...s.hint, color: 'var(--dsw-alias-state-warn-primary)' }}>{item.reason}</p>
                </div>
              ))}
            </div>
          )}
          {catalog && catalog.diagnostics.length === 0 && catalog.skills.length > 0 && (
            <span style={{ ...s.sectionLabel, color: 'var(--dsw-alias-state-success-primary)' }}>
              ✓ {t('diagnosticsNone')}
            </span>
          )}
        </>
      )}
    </div>
  )
}
