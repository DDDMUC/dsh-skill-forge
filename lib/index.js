import { dirname, join, relative, sep } from "node:path";
import z from "@deepseek-ai/schemastery";
import { copyFile, cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
//#region src/protocol.ts
/**
* Shared wire types and endpoint table between host half and browser half.
*/
/** API prefix registered on the web server (same-origin, loopback-only). */
const API_BASE = "/plugins/skillforge/api";
//#endregion
//#region src/core/catalog.ts
/**
* Catalog engine. In dsh web profiles the host-layer filesystem provider is
* disabled by design (discovery moves into agent preset layers), so the
* catalog is assembled from two sources:
*
*  1. disk scanning (node fs, primary) — user roots `~/.dsh/skills` and
*     `~/.agents/skills` plus the current session's project roots;
*  2. the official registry snapshot (secondary) — bundled / custom /
*     runtime contributions the registry sees at the global layer.
*
* Enable/disable state is merged from the skillforge disabled map, which is
* also what the shadow provider uses to filter model/user surfaces.
*/
/**
* Runtime policy: this plugin keeps ZERO runtime imports of @deepseek-ai/dsh-*
* packages. Every dsh package imported at runtime resolves from this
* directory's own node_modules copy, and dual module instances (cordis,
* typert protocol, session state) corrupt the host composition — the exact
* failure behind broken Remote RPCs (plugin inventory, model selection,
* conversation lists). Pure helpers are therefore inlined below; dsh imports
* stay type-only.
*/
/** Kebab-case skill-name grammar (mirrors dsh-skill's isSkillName). */
const SKILL_NAME$1 = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Whether a string is a valid kebab-case skill name. */
function isSkillName$1(name) {
	return SKILL_NAME$1.test(name);
}
/** Resolve the harness home: explicit override, then $DSH_HOME, then ~/.dsh. */
function resolveDshHome() {
	const override = process.env.DSH_HOME?.trim();
	if (override) return override;
	return join(homedir(), ".dsh");
}
/** Symbolic display form of a resolved harness home. */
function dshHomeDisplay(resolvedHome) {
	const override = process.env.DSH_HOME?.trim();
	if (override && resolvedHome === override) return "$DSH_HOME";
	return "~/.dsh";
}
/** User-level scan roots (rank 400 / 500 roots). */
function userScanRoots(dshHome, agentsHome) {
	return [{
		path: join(dshHome, "skills"),
		source: "user-dsh"
	}, {
		path: join(agentsHome, "skills"),
		source: "user-agents"
	}];
}
/** Parse a boolean in the lenient way the dsh frontmatter contract allows. */
function toBoolean(value) {
	switch (value.toLowerCase()) {
		case "true":
		case "yes":
		case "on":
		case "1": return true;
		case "false":
		case "no":
		case "off":
		case "0": return false;
		default: return;
	}
}
/** Extract frontmatter keys from a raw skill file, or null when it has none. */
function peekFrontmatter(raw) {
	const lines = (raw.charCodeAt(0) === 65279 ? raw.slice(1) : raw).split(/\r?\n/);
	if (lines.length < 3 || !lines[0].trim().startsWith("---")) return null;
	const out = {};
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "---") break;
		const match = /^([a-z][a-z0-9-]*)\s*:\s*(.*)$/.exec(line.trim());
		if (!match) continue;
		const key = match[1];
		const rawValue = match[2].trim();
		if (!rawValue) continue;
		switch (key) {
			case "name":
			case "description":
			case "whenToUse":
				out[key] = rawValue.replace(/^['"]|['"]$/g, "");
				break;
			case "disable-model-invocation":
				out.disableModelInvocation = toBoolean(rawValue);
				break;
			case "user-invocable":
				out.userInvocable = toBoolean(rawValue);
				break;
		}
	}
	return out;
}
/** Read a file, returning null on any failure. */
async function tryRead(path) {
	try {
		return await readFile(path, "utf8");
	} catch {
		return null;
	}
}
/** Scan an arbitrary set of roots for skills + diagnostics. */
async function scanRoots(roots) {
	const skills = [];
	const diagnostics = [];
	for (const root of roots) {
		let entries;
		try {
			entries = await readdir(root.path, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			const path = join(root.path, entry.name);
			if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".md.disabled"))) {
				const renamed = entry.name.endsWith(".disabled");
				const base = (renamed ? entry.name.slice(0, -9) : entry.name).slice(0, -3);
				if (base === "SKILL") continue;
				if (!isSkillName$1(base)) {
					diagnostics.push({
						path,
						reason: `name "${base}" is not kebab-case`
					});
					continue;
				}
				const raw = await tryRead(path);
				const fm = raw === null ? null : peekFrontmatter(raw);
				if (!fm) {
					diagnostics.push({
						path,
						reason: "missing YAML frontmatter (must start with ---)"
					});
					continue;
				}
				if (!fm.name || !fm.description) {
					const missing = [fm.name ? "" : "name", fm.description ? "" : "description"].filter(Boolean).join(" / ");
					diagnostics.push({
						path,
						reason: `frontmatter missing ${missing}`
					});
					continue;
				}
				skills.push({
					name: fm.name,
					description: fm.description,
					whenToUse: fm.whenToUse,
					source: root.source,
					path,
					flat: true,
					modelInvocable: fm.disableModelInvocation !== true,
					userInvocable: fm.userInvocable !== false,
					renamedDisabled: renamed
				});
				continue;
			}
			if (!entry.isDirectory()) continue;
			const base = entry.name;
			if (!isSkillName$1(base)) {
				diagnostics.push({
					path,
					reason: `name "${base}" is not kebab-case`
				});
				continue;
			}
			const livePath = join(path, "SKILL.md");
			const disabledPath = join(path, "SKILL.md.disabled");
			const liveRaw = await tryRead(livePath);
			const disabledRaw = liveRaw === null ? await tryRead(disabledPath) : null;
			const renamed = disabledRaw !== null;
			const raw = liveRaw ?? disabledRaw;
			if (raw === null) {
				diagnostics.push({
					path,
					reason: "no SKILL.md inside bundle"
				});
				continue;
			}
			const fm = peekFrontmatter(raw);
			if (!fm) {
				diagnostics.push({
					path,
					reason: "missing YAML frontmatter (must start with ---)"
				});
				continue;
			}
			if (!fm.name || !fm.description) {
				const missing = [fm.name ? "" : "name", fm.description ? "" : "description"].filter(Boolean).join(" / ");
				diagnostics.push({
					path,
					reason: `frontmatter missing ${missing}`
				});
				continue;
			}
			skills.push({
				name: fm.name,
				description: fm.description,
				whenToUse: fm.whenToUse,
				source: root.source,
				path: renamed ? disabledPath : livePath,
				flat: false,
				modelInvocable: fm.disableModelInvocation !== true,
				userInvocable: fm.userInvocable !== false,
				renamedDisabled: renamed
			});
		}
	}
	return {
		skills,
		diagnostics
	};
}
/** Scan user-level roots for skills + diagnostics. */
async function scanUserRoots(dshHome, agentsHome) {
	return scanRoots(userScanRoots(dshHome, agentsHome));
}
/** Project roots for one workspace. */
function projectRoots(workspace) {
	return [{
		path: join(workspace.path, ".dsh", "skills"),
		source: "project-dsh"
	}, {
		path: join(workspace.path, ".agents", "skills"),
		source: "project-agents"
	}];
}
/** Merge disk skills with registry summaries into catalog rows. */
function mergeCatalog(disk, summaries, disabled, checked, diskByName) {
	const rows = /* @__PURE__ */ new Map();
	for (const skill of disk) rows.set(skill.name, {
		name: skill.name,
		description: skill.description,
		whenToUse: skill.whenToUse,
		source: skill.source,
		provider: "filesystem",
		modelInvocable: skill.modelInvocable,
		userInvocable: skill.userInvocable,
		enabled: !skill.renamedDisabled && !Object.prototype.hasOwnProperty.call(disabled, skill.name),
		path: skill.path,
		checked: Object.prototype.hasOwnProperty.call(checked, skill.name),
		flat: skill.flat
	});
	for (const skill of summaries) {
		if (rows.has(skill.name)) continue;
		rows.set(skill.name, {
			name: skill.name,
			description: skill.description,
			whenToUse: skill.whenToUse,
			source: skill.source,
			provider: skill.provider,
			modelInvocable: skill.invocation.modelInvocable,
			userInvocable: skill.invocation.userInvocable,
			enabled: !Object.prototype.hasOwnProperty.call(disabled, skill.name),
			path: "path" in skill ? skill.path : void 0,
			checked: Object.prototype.hasOwnProperty.call(checked, skill.name),
			flat: diskByName.get(skill.name)?.flat
		});
	}
	return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}
/** Assemble the full catalog response for the settings panel. */
async function buildCatalog(ctx, disabled, stateDir) {
	const dshHome = resolveDshHome();
	const agentsHome = process.env.DSH_AGENTS_HOME || join(homedir(), ".agents");
	const roots = userScanRoots(dshHome, agentsHome).map((root) => root.path);
	const { skills: diskSkills, diagnostics } = await scanUserRoots(dshHome, agentsHome);
	let workspaces = [];
	try {
		const registry = ctx.workspaces;
		if (registry) workspaces = registry.list().map((workspace) => ({
			id: workspace.id,
			title: workspace.title,
			path: workspace.path
		}));
	} catch {}
	const workspaceCatalogs = [];
	for (const workspace of workspaces) {
		const rows = mergeCatalog((await scanRoots(projectRoots(workspace))).skills, [], disabled, {}, /* @__PURE__ */ new Map());
		workspaceCatalogs.push({
			id: workspace.id,
			title: workspace.title,
			path: workspace.path,
			skills: rows
		});
	}
	let summaries = [];
	try {
		summaries = (await ctx.skills.snapshot()).skills;
	} catch {}
	let checked = {};
	if (stateDir) try {
		const raw = await readFile(join(stateDir, "checked.json"), "utf8");
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object") checked = parsed;
	} catch {}
	let registry = {};
	if (stateDir) try {
		const raw = await readFile(join(stateDir, "registry.json"), "utf8");
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object") registry = parsed;
	} catch {}
	const diskByName = new Map(diskSkills.map((skill) => [skill.name, { flat: skill.flat }]));
	const merged = mergeCatalog(diskSkills, summaries, disabled, checked, diskByName);
	for (const skill of merged) if (registry[skill.name]) skill.provenance = registry[skill.name];
	return {
		skills: merged,
		disabled,
		diagnostics,
		workspaces: workspaceCatalogs,
		dshHome: dshHomeDisplay(dshHome),
		roots
	};
}
/** Locate one skill on disk by name across the user roots (live or renamed). */
async function findDiskSkill(dshHome, agentsHome, name) {
	for (const root of userScanRoots(dshHome, agentsHome)) {
		const candidates = [
			{
				path: join(root.path, `${name}.md`),
				flat: true,
				renamedDisabled: false
			},
			{
				path: join(root.path, `${name}.md.disabled`),
				flat: true,
				renamedDisabled: true
			},
			{
				path: join(root.path, name, "SKILL.md"),
				flat: false,
				renamedDisabled: false
			},
			{
				path: join(root.path, name, "SKILL.md.disabled"),
				flat: false,
				renamedDisabled: true
			}
		];
		for (const candidate of candidates) try {
			if ((await stat(candidate.path)).isFile()) return candidate;
		} catch {}
	}
}
/** Split a raw skill file into frontmatter block and body. */
function splitSkillDoc(raw) {
	const text = raw.charCodeAt(0) === 65279 ? raw.slice(1) : raw;
	const lines = text.split(/\r?\n/);
	if (lines.length >= 3 && lines[0].trim().startsWith("---")) {
		for (let i = 1; i < lines.length; i++) if (lines[i].trim() === "---") return {
			frontmatter: lines.slice(1, i).join("\n").trim(),
			content: lines.slice(i + 1).join("\n").trim()
		};
	}
	return {
		frontmatter: "",
		content: text.trim()
	};
}
//#endregion
//#region src/core/frontmatter.ts
/** Parse the frontmatter block of a raw skill file. Returns null when absent. */
function parseFrontmatter(raw) {
	const lines = stripBom(raw).split(/\r?\n/);
	if (lines.length < 3 || !lines[0].trim().startsWith("---")) return null;
	let end = -1;
	for (let i = 1; i < lines.length; i++) if (lines[i].trim() === "---") {
		end = i;
		break;
	}
	if (end < 0) return null;
	const fm = { extra: [] };
	for (let i = 1; i < end; i++) {
		const line = lines[i];
		const match = /^([a-zA-Z][a-zA-Z0-9-]*)\s*:\s*(.*)$/.exec(line.trim());
		if (!match) {
			fm.extra.push(line);
			continue;
		}
		const key = match[1];
		const rawValue = match[2].trim();
		switch (key) {
			case "name":
			case "description":
			case "whenToUse":
				if (rawValue) fm[key] = unquote(rawValue);
				else fm.extra.push(line);
				break;
			case "disable-model-invocation":
				fm.disableModelInvocation = parseBoolean(rawValue);
				break;
			case "user-invocable":
				fm.userInvocable = parseBoolean(rawValue);
				break;
			default: fm.extra.push(line);
		}
	}
	return {
		fm,
		body: lines.slice(end + 1).join("\n").trim()
	};
}
/** Lenient boolean parsing matching the dsh frontmatter contract. */
function parseBoolean(value) {
	switch (value.toLowerCase()) {
		case "true":
		case "yes":
		case "on":
		case "1": return true;
		case "false":
		case "no":
		case "off":
		case "0": return false;
		default: return;
	}
}
/** Serialize a frontmatter block (canonical order, unknown lines preserved). */
function serializeFrontmatter(fm) {
	const lines = [];
	if (fm.name !== void 0) lines.push(`name: ${fm.name}`);
	if (fm.description !== void 0) lines.push(`description: ${fm.description}`);
	if (fm.whenToUse !== void 0) lines.push(`whenToUse: ${fm.whenToUse}`);
	if (fm.disableModelInvocation !== void 0) lines.push(`disable-model-invocation: ${fm.disableModelInvocation}`);
	if (fm.userInvocable !== void 0) lines.push(`user-invocable: ${fm.userInvocable}`);
	lines.push(...fm.extra);
	return lines.join("\n");
}
/** Assemble a complete SKILL.md document from frontmatter + body. */
function buildSkillDoc(fm, body) {
	const frontmatter = serializeFrontmatter(fm);
	const trimmed = body.trim();
	return `---\n${frontmatter}\n---\n${trimmed ? `\n${trimmed}\n` : ""}`;
}
/** Strip a UTF-8 BOM. */
function stripBom(raw) {
	return raw.charCodeAt(0) === 65279 ? raw.slice(1) : raw;
}
/** Remove a single pair of surrounding quotes from a scalar. */
function unquote(value) {
	return value.replace(/^['"]|['"]$/g, "");
}
/** Kebab-case skill-name grammar (mirrors dsh-skill's isSkillName). */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Whether a string is a valid kebab-case skill name. */
function isSkillName(name) {
	return SKILL_NAME.test(name);
}
//#endregion
//#region src/core/audit.ts
/**
* DSH-spec audit: state-driven checks and automatic fixes over user-level
* skill roots. Only files whose content fingerprint changed since the last
* successful audit are re-checked (red dots), so repeated runs stay cheap.
*
* Fixes (all idempotent, logged to audit.log):
*  - directory/file name not kebab-case            -> rename + sync frontmatter name
*  - frontmatter name missing / non-kebab / mismatch-> adopt the directory name
*  - description missing                           -> placeholder text
*  - camelCase invocation keys / non-boolean values -> canonical form
*  - UTF-8 BOM                                     -> stripped
*/
/** sha1 fingerprint of a skill document. */
function fingerprint(raw) {
	return createHash("sha1").update(stripBom(raw)).digest("hex");
}
/** Locate every skill-shaped entry under the user roots. */
async function listUserSkillEntries(dshHome, agentsHome) {
	const entries = [];
	for (const root of userScanRoots(dshHome, agentsHome)) {
		let names;
		try {
			names = await readdir(root.path);
		} catch {
			continue;
		}
		for (const name of names) {
			if (name === ".system" || name.endsWith(".disabled")) continue;
			if (name.endsWith(".md")) entries.push({
				name: name.slice(0, -3),
				path: join(root.path, name),
				flat: true,
				source: root.source
			});
			else entries.push({
				name,
				path: join(root.path, name, "SKILL.md"),
				flat: false,
				source: root.source
			});
		}
	}
	return entries;
}
/** File-backed checked store (~/.dsh/skillforge/checked.json). */
function fileCheckedStore(dir) {
	return {
		async load() {
			try {
				const raw = await readFile(join(dir, "checked.json"), "utf8");
				const parsed = JSON.parse(raw);
				return parsed && typeof parsed === "object" ? parsed : {};
			} catch {
				return {};
			}
		},
		async save(map) {
			await mkdir(dir, { recursive: true });
			await writeFile(join(dir, "checked.json"), JSON.stringify(map, null, 2), "utf8");
		}
	};
}
/** Append one line to the audit log (best-effort). */
async function appendAuditLog(dir, line) {
	try {
		await mkdir(dir, { recursive: true });
		await writeFile(join(dir, "audit.log"), `${(/* @__PURE__ */ new Date()).toISOString()} ${line}\n`, { flag: "a" });
	} catch {}
}
/**
* Fix one skill document in place. Returns the fixed frontmatter/body or null
* when nothing needed fixing.
*/
async function fixSkillFile(entry) {
	const parsed = parseFrontmatter(await readFile(entry.path, "utf8"));
	if (!parsed) return { reason: "no frontmatter" };
	const { fm, body } = parsed;
	const fixes = [];
	const rootDir = entry.flat ? dirname(entry.path) : dirname(dirname(entry.path));
	if (!isSkillName(entry.name)) {
		const candidate = kebabize(entry.name);
		if (!candidate || !isSkillName(candidate)) return { reason: `cannot kebabize "${entry.name}"` };
		const sourceDir = entry.flat ? entry.path : dirname(entry.path);
		const target = entry.flat ? join(rootDir, `${candidate}.md`) : join(rootDir, candidate);
		await rename(sourceDir, target);
		entry.name = candidate;
		entry.path = entry.flat ? target : join(target, "SKILL.md");
		fixes.push(`renamed to ${candidate}`);
	}
	if (fm.name !== entry.name) {
		fm.name = entry.name;
		fixes.push("frontmatter name synced");
	}
	if (!fm.description) {
		fm.description = "No description provided.";
		fixes.push("description placeholder added");
	}
	if (fm.disableModelInvocation === void 0) {
		const legacy = fm.extra.find((line) => /^disableModelInvocation\s*:/.test(line));
		if (legacy) {
			fm.disableModelInvocation = parseBoolean(legacy.slice(legacy.indexOf(":") + 1).trim()) ?? false;
			fixes.push("camelCase disable-model-invocation normalized");
		}
	}
	if (fm.userInvocable === void 0) {
		const legacy = fm.extra.find((line) => /^userInvocable\s*:/.test(line));
		if (legacy) {
			fm.userInvocable = parseBoolean(legacy.slice(legacy.indexOf(":") + 1).trim()) ?? true;
			fixes.push("camelCase user-invocable normalized");
		}
	}
	const cleanedExtra = fm.extra.filter((line) => !/^(disableModelInvocation|userInvocable)\s*:/.test(line));
	if (cleanedExtra.length !== fm.extra.length) {
		fm.extra = cleanedExtra;
		fixes.push("legacy invocation keys removed");
	}
	if (fixes.length === 0) return null;
	const rebuilt = `---\n${serializeFrontmatter(fm)}\n---\n${body ? `\n${body}\n` : ""}`;
	await writeFile(entry.path, rebuilt, "utf8");
	return { reason: fixes.join(", ") };
}
/** Best-effort kebab-case conversion of an arbitrary name. */
function kebabize(name) {
	return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
/**
* Run the state-driven audit: re-check only changed/unchecked entries, fix
* everything fixable, and record fingerprints for clean entries.
*/
async function auditRoots(dshHome, agentsHome, stateDir) {
	const store = fileCheckedStore(stateDir);
	const checked = await store.load();
	const result = {
		checked: [],
		fixed: [],
		skipped: [],
		errors: []
	};
	const next = { ...checked };
	for (const entry of await listUserSkillEntries(dshHome, agentsHome)) {
		let raw;
		try {
			raw = await readFile(entry.path, "utf8");
		} catch (error) {
			if (error.code === "ENOENT") continue;
			result.errors.push({
				name: entry.name,
				error: "cannot read"
			});
			continue;
		}
		const fp = fingerprint(raw);
		if (checked[entry.name] === fp) {
			result.skipped.push(entry.name);
			continue;
		}
		try {
			const fixed = await fixSkillFile(entry);
			if (fixed) {
				result.fixed.push(entry.name);
				await appendAuditLog(stateDir, `fixed ${entry.name}: ${fixed.reason}`);
			}
			const after = await readFile(entry.path, "utf8");
			next[entry.name] = fingerprint(after);
			result.checked.push(entry.name);
		} catch (error) {
			result.errors.push({
				name: entry.name,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
	await store.save(next);
	return result;
}
//#endregion
//#region src/core/crud.ts
/**
* CRUD operations over user-level skill roots: create / update / rename /
* delete. All writes are atomic (temp file + rename); nothing touches files
* outside the two user roots.
*
* WRITE PROTECTION: skills under the shared agents root (~/.agents/skills,
* also consumed by other tools such as opencode) are READ-ONLY here —
* editing, renaming, or deleting them is refused. Only ~/.dsh/skills is
* managed directly.
*/
/** Refuse mutations on skills living under the shared agents root. */
function assertWritableRoot(roots, path, name, action) {
	const agentsPrefix = roots.agentsHome.replace(/[\\/]+$/, "").replace(/\\/g, "/") + "/";
	if (path.replace(/\\/g, "/").startsWith(agentsPrefix)) throw new Error(`cannot ${action} "${name}": the ~/.agents/skills root is read-only (shared with other tools); copy it to ~/.dsh/skills first`);
}
/** Create a new skill as a directory bundle under ~/.dsh/skills. */
async function createSkill(roots, input) {
	const name = input.name.trim();
	if (!isSkillName(name)) throw new Error(`"${name}" is not a valid kebab-case skill name`);
	if (!input.description.trim()) throw new Error("description is required");
	const target = join(roots.dshHome, "skills", name, "SKILL.md");
	if (await findDiskSkill(roots.dshHome, roots.agentsHome, name)) throw new Error(`skill "${name}" already exists`);
	const doc = buildSkillDoc({
		name,
		description: input.description.trim(),
		whenToUse: input.whenToUse?.trim() || void 0,
		extra: []
	}, input.content ?? "");
	await mkdir(dirname(target), { recursive: true });
	await writeFile(target, doc, "utf8");
	return {
		name,
		path: target
	};
}
/** Read a skill's current frontmatter + body for the editor. */
async function readSkillForEdit(roots, name) {
	const located = await findDiskSkill(roots.dshHome, roots.agentsHome, name);
	if (!located) throw new Error(`skill "${name}" not found`);
	const raw = await readFile(located.path, "utf8");
	const parsed = parseFrontmatter(raw);
	return {
		path: located.path,
		flat: located.flat,
		description: parsed?.fm.description ?? "",
		whenToUse: parsed?.fm.whenToUse,
		content: parsed ? parsed.body : raw
	};
}
/** Overwrite a skill's description/whenToUse/body, preserving other fields. */
async function updateSkill(roots, input) {
	const located = await findDiskSkill(roots.dshHome, roots.agentsHome, input.name);
	if (!located) throw new Error(`skill "${input.name}" not found`);
	assertWritableRoot(roots, located.path, input.name, "edit");
	const parsed = parseFrontmatter(await readFile(located.path, "utf8"));
	if (!parsed) throw new Error(`skill "${input.name}" has no valid frontmatter`);
	if (input.description !== void 0) parsed.fm.description = input.description.trim();
	if (input.whenToUse !== void 0) parsed.fm.whenToUse = input.whenToUse.trim() || void 0;
	const body = input.content !== void 0 ? input.content : parsed.body;
	const doc = buildSkillDoc(parsed.fm, body);
	await atomicWrite(located.path, doc);
	return {
		name: input.name,
		path: located.path
	};
}
/** Rename a skill (directory/file) and sync its frontmatter name. */
async function renameSkill(roots, input) {
	const newName = input.newName.trim();
	if (!isSkillName(newName)) throw new Error(`"${newName}" is not a valid kebab-case skill name`);
	if (newName === input.name) return {
		name: input.name,
		path: ""
	};
	const located = await findDiskSkill(roots.dshHome, roots.agentsHome, input.name);
	if (!located) throw new Error(`skill "${input.name}" not found`);
	assertWritableRoot(roots, located.path, input.name, "rename");
	if (await findDiskSkill(roots.dshHome, roots.agentsHome, newName)) throw new Error(`skill "${newName}" already exists`);
	const parsed = parseFrontmatter(await readFile(located.path, "utf8"));
	if (!parsed) throw new Error(`skill "${input.name}" has no valid frontmatter`);
	const rootDir = located.flat ? dirname(located.path) : dirname(dirname(located.path));
	const source = located.flat ? located.path : dirname(located.path);
	const target = located.flat ? join(rootDir, `${newName}.md`) : join(rootDir, newName);
	await rename(source, target);
	const targetFile = located.flat ? target : join(target, "SKILL.md");
	parsed.fm.name = newName;
	await atomicWrite(targetFile, buildSkillDoc(parsed.fm, parsed.body));
	return {
		name: newName,
		path: targetFile
	};
}
/** Delete a skill (directory bundle or flat file). */
async function deleteSkill(roots, name) {
	const located = await findDiskSkill(roots.dshHome, roots.agentsHome, name);
	if (!located) throw new Error(`skill "${name}" not found`);
	assertWritableRoot(roots, located.path, name, "delete");
	if (located.flat) await rm(located.path, { force: true });
	else await rm(dirname(located.path), {
		recursive: true,
		force: true
	});
	return { name };
}
/** Atomic file write (temp file + rename). */
async function atomicWrite(path, content) {
	const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
	await writeFile(tmp, content, "utf8");
	await rename(tmp, path);
}
//#endregion
//#region src/core/shadow.ts
const SHADOW_PROVIDER_NAME = "skillforge";
const SHADOW_RANK = -1e9;
/** Read the current disabled map from a settings scope. */
function readDisabledMap(scope) {
	const map = scope.get()?.disabled;
	return map && typeof map === "object" ? map : {};
}
/** Build the placeholder candidate for one disabled skill. */
function shadowCandidate(name) {
	return {
		name,
		description: `(disabled by dsh-skillforge)`,
		invocation: {
			modelInvocable: false,
			userInvocable: false
		},
		source: "custom",
		provider: SHADOW_PROVIDER_NAME,
		rank: SHADOW_RANK,
		locator: name
	};
}
/** Create the shadow provider against a live shadowed-names resolver. */
function createShadowProvider(shadowed) {
	return {
		name: "skillforge-shadow",
		list: async (_options) => (await shadowed()).map((name) => shadowCandidate(name)),
		get: async (_candidate) => void 0
	};
}
/**
* Register the shadow provider on a context's skills registry. The provider
* lands in the layer of the calling context's scope (global for the host
* context, per-agent for an agent scoped context).
*/
function registerShadowForCtx(ctx, shadowed) {
	let controlRef = null;
	ctx.skills.registerProvider((control) => {
		controlRef = control;
		return createShadowProvider(async () => {
			const value = await shadowed();
			if (Array.isArray(value)) return value;
			return Object.keys(value);
		});
	});
	return {
		get control() {
			return controlRef;
		},
		invalidate() {
			controlRef?.invalidate();
		}
	};
}
//#endregion
//#region src/core/toggle.ts
/**
* Toggle logic: enable/disable a skill by writing the disabled map into the
* skillforge settings namespace (shadow provider) AND, for skills under the
* dsh root, renaming SKILL.md <-> SKILL.md.disabled (rename fallback that
* works for every filesystem-based preset, even ones without a skills
* service). The agents root is shadow-only: renaming would break other tools
* that share ~/.agents/skills.
*
* NOTE: settings `update` merges patches recursively (plain objects merge,
* arrays/other values replace). Disabling therefore patches the full map,
* while enabling removes the entry through a path `unset` mutate — patching
* `{ disabled: {} }` would no-op against an existing map.
*/
/** Rename fallback: SKILL.md <-> SKILL.md.disabled for dsh-root skills. */
async function renameFallback(roots, name, enabled) {
	const located = await findDiskSkill(roots.dshHome, roots.agentsHome, name);
	if (!located) return false;
	if (!located.path.replace(/\\/g, "/").startsWith(roots.dshHome.replace(/\\/g, "/"))) return false;
	if (enabled && located.renamedDisabled) {
		const livePath = located.flat ? join(roots.dshHome, "skills", `${name}.md`) : join(roots.dshHome, "skills", name, "SKILL.md");
		try {
			await rename(located.path, livePath);
			return true;
		} catch {
			return false;
		}
	}
	if (!enabled && !located.renamedDisabled) {
		const disabledFile = located.flat ? join(roots.dshHome, "skills", `${name}.md.disabled`) : join(roots.dshHome, "skills", name, "SKILL.md.disabled");
		try {
			await rename(located.path, disabledFile);
			return true;
		} catch {
			return false;
		}
	}
	return false;
}
/** Merge the disabled map and persist it through the writer. */
async function setEnabled(writer, roots, name, enabled, invalidate) {
	if (enabled) await writer.unsetDisabled(name);
	else {
		const next = { ...readDisabledMap({ get: () => writer.getDisabled() }) };
		next[name] = { disabledAt: Date.now() };
		await writer.writeDisabled(next);
	}
	await renameFallback(roots, name, enabled);
	invalidate();
	return {
		name,
		enabled
	};
}
//#endregion
//#region src/install/skillpkg.ts
/**
* Skill package (.skill) handling: discover skills inside an extracted
* archive (directory bundles or flat .md files) and pack a skill directory
* tree back into a .skill zip.
*/
/**
* Strip a single redundant root directory segment (codeload zipballs wrap
* everything under "<repo>-<branch>/"). Only strips when every file entry
* shares one top-level segment, and the segment is not itself a skill name
* candidate — i.e. the archive clearly is a repository dump, not a skill
* bundle already laid out flat.
*/
function stripSingleRoot(entries) {
	const nonDir = entries.filter((entry) => !entry.name.endsWith("/"));
	if (nonDir.length === 0) return entries;
	const tops = /* @__PURE__ */ new Set();
	for (const entry of nonDir) {
		const top = entry.name.includes("/") ? entry.name.split("/")[0] : null;
		if (top === null) return entries;
		tops.add(top);
	}
	if (tops.size !== 1) return entries;
	const top = [...tops][0];
	if (isSkillName(top) && nonDir.length === 1) return entries;
	const prefix = `${top}/`;
	const stripped = [];
	let strippedFiles = 0;
	for (const entry of entries) {
		if (entry.name.endsWith("/")) continue;
		if (entry.name.startsWith(prefix)) {
			stripped.push({
				name: entry.name.slice(prefix.length),
				data: entry.data
			});
			strippedFiles += 1;
		}
	}
	return strippedFiles === nonDir.length ? stripped : entries;
}
/** Discover skill candidates in extracted archive entries (top-level only). */
function discoverSkillsInArchive(entries) {
	const byTop = /* @__PURE__ */ new Map();
	for (const entry of entries) {
		if (entry.name.endsWith("/")) continue;
		const top = entry.name.includes("/") ? entry.name.split("/")[0] : entry.name.endsWith(".md") ? entry.name.slice(0, -3) : entry.name;
		if (!byTop.has(top)) byTop.set(top, []);
		byTop.get(top).push(entry);
	}
	const skills = [];
	for (const [top, files] of byTop) {
		const flat = files.some((file) => file.name === `${top}.md`);
		const bundleSkill = files.find((file) => file.name === `${top}/SKILL.md`);
		if (flat) {
			const md = files.find((file) => file.name === `${top}.md`);
			const fm = parseFrontmatter(new TextDecoder("utf-8").decode(md.data));
			if (!fm || !isSkillName(top) || !fm.fm.description) continue;
			const filesMap = /* @__PURE__ */ new Map();
			filesMap.set(`${top}.md`, md.data);
			skills.push({
				name: top,
				description: fm.fm.description,
				whenToUse: fm.fm.whenToUse,
				flat: true,
				files: filesMap
			});
			continue;
		}
		if (bundleSkill) {
			const fm = parseFrontmatter(new TextDecoder("utf-8").decode(bundleSkill.data));
			if (!fm || !isSkillName(top) || !fm.fm.description) continue;
			const filesMap = /* @__PURE__ */ new Map();
			for (const file of files) if (file.name.startsWith(`${top}/`)) filesMap.set(file.name, file.data);
			skills.push({
				name: top,
				description: fm.fm.description,
				whenToUse: fm.fm.whenToUse,
				flat: false,
				files: filesMap
			});
		}
	}
	return skills;
}
/** Pack a skill directory into .skill zip bytes (symlinks dereferenced). */
async function packSkill(skillDir, name) {
	const entries = [];
	new TextEncoder();
	const walk = async (dir) => {
		const items = await readdir(dir, { withFileTypes: true });
		for (const item of items) {
			const full = join(dir, item.name);
			const targetName = `${name}/${relative(skillDir, full).split(sep).join("/")}`;
			if (item.isDirectory()) await walk(full);
			else if (item.isFile()) {
				const data = await readFile(full);
				entries.push({
					name: targetName,
					data: new Uint8Array(data)
				});
			} else if (item.isSymbolicLink()) try {
				if ((await stat(full)).isFile()) {
					const data = await readFile(full);
					entries.push({
						name: targetName,
						data: new Uint8Array(data)
					});
				}
			} catch {}
		}
	};
	await walk(skillDir);
	if (!entries.some((entry) => entry.name === `${name}/SKILL.md`)) throw new Error(`"${name}" has no SKILL.md`);
	return { entries };
}
//#endregion
//#region src/install/zip.ts
/**
* Zero-dependency ZIP reader/writer built on node:zlib (inflateRaw / deflateRaw).
* Safe for untrusted archives: entry-name traversal is rejected, decompressed
* size is bounded (zip-bomb budget), and CRC32 is verified on extraction.
*/
/** CRC32 (ISO 3309) table. */
const CRC_TABLE = (() => {
	const table = /* @__PURE__ */ new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
		table[n] = c >>> 0;
	}
	return table;
})();
/** CRC32 of a byte buffer. */
function crc32(data) {
	let crc = 4294967295;
	for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 255] ^ crc >>> 8;
	return (crc ^ 4294967295) >>> 0;
}
const DEFAULT_ZIP_LIMITS = {
	maxTotalBytes: 256 * 1024 * 1024,
	maxRatio: 300
};
/** Thrown when an archive is unsafe or malformed. */
var ZipError = class extends Error {};
/** Normalize an entry name and reject traversal / absolute paths. */
function safeZipName(raw) {
	const name = raw.replace(/\\/g, "/");
	if (!name || name.startsWith("/") || /^[a-zA-Z]:/.test(name)) throw new ZipError(`unsafe zip entry name "${raw}"`);
	const parts = name.split("/");
	for (const part of parts) if (part === ".." || part === ".") throw new ZipError(`unsafe zip entry name "${raw}"`);
	return name;
}
/** Parse a zip archive into its entries (verified + bounded). */
function parseZip(buffer, limits = DEFAULT_ZIP_LIMITS) {
	if (buffer.length < 22) throw new ZipError("not a zip archive (too small)");
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	let eocd = -1;
	const maxScan = Math.min(buffer.length, 65557);
	for (let i = buffer.length - 22; i >= buffer.length - maxScan; i--) if (view.getUint32(i, true) === 101010256) {
		eocd = i;
		break;
	}
	if (eocd < 0) throw new ZipError("not a zip archive (no end record)");
	const count = view.getUint16(eocd + 10, true);
	const cdSize = view.getUint32(eocd + 12, true);
	const cdOffset = view.getUint32(eocd + 16, true);
	if (cdOffset + cdSize > buffer.length) throw new ZipError("corrupt zip (central directory out of bounds)");
	const central = [];
	let pos = cdOffset;
	for (let i = 0; i < count; i++) {
		if (pos + 46 > buffer.length || view.getUint32(pos, true) !== 33639248) throw new ZipError("corrupt zip (bad central directory entry)");
		const method = view.getUint16(pos + 10, true);
		const crc = view.getUint32(pos + 16, true);
		const compressedSize = view.getUint32(pos + 20, true);
		const uncompressedSize = view.getUint32(pos + 24, true);
		const nameLen = view.getUint16(pos + 28, true);
		const extraLen = view.getUint16(pos + 30, true);
		const commentLen = view.getUint16(pos + 32, true);
		const localOffset = view.getUint32(pos + 42, true);
		const nameBytes = buffer.subarray(pos + 46, pos + 46 + nameLen);
		const name = safeZipName(new TextDecoder("utf-8").decode(nameBytes));
		if (method !== 0 && method !== 8) throw new ZipError(`unsupported zip method ${method} for "${name}"`);
		central.push({
			method,
			crc,
			compressedSize,
			uncompressedSize,
			name,
			localOffset
		});
		pos += 46 + nameLen + extraLen + commentLen;
	}
	let total = 0;
	const entries = [];
	for (const entry of central) {
		if (entry.uncompressedSize > limits.maxTotalBytes - total) throw new ZipError(`zip-bomb guard: total size exceeds ${limits.maxTotalBytes} bytes`);
		if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > limits.maxRatio) throw new ZipError(`zip-bomb guard: "${entry.name}" ratio exceeds ${limits.maxRatio}`);
		if (entry.localOffset + 30 > buffer.length || view.getUint32(entry.localOffset, true) !== 67324752) throw new ZipError(`corrupt zip (bad local header for "${entry.name}")`);
		const localNameLen = view.getUint16(entry.localOffset + 26, true);
		const localExtraLen = view.getUint16(entry.localOffset + 28, true);
		const dataStart = entry.localOffset + 30 + localNameLen + localExtraLen;
		const raw = buffer.subarray(dataStart, dataStart + entry.compressedSize);
		let data;
		if (entry.method === 0) data = raw;
		else try {
			data = inflateRawSync(raw);
		} catch {
			throw new ZipError(`failed to inflate "${entry.name}"`);
		}
		if (data.length !== entry.uncompressedSize) throw new ZipError(`size mismatch for "${entry.name}"`);
		if (crc32(data) !== entry.crc) throw new ZipError(`CRC32 mismatch for "${entry.name}"`);
		total += data.length;
		entries.push({
			name: entry.name,
			data
		});
	}
	return entries;
}
/** Write entries into a zip archive (store method; CRC computed). */
function writeZip(entries) {
	const chunks = [];
	const central = [];
	let offset = 0;
	const enc = new TextEncoder();
	for (const entry of entries) {
		const nameBytes = enc.encode(entry.name);
		const crc = crc32(entry.data);
		const local = new Uint8Array(30 + nameBytes.length + entry.data.length);
		const view = new DataView(local.buffer);
		view.setUint32(0, 67324752, true);
		view.setUint16(4, 20, true);
		view.setUint16(6, 0, true);
		view.setUint16(8, 0, true);
		view.setUint16(10, 0, true);
		view.setUint16(12, 0, true);
		view.setUint32(14, crc, true);
		view.setUint32(18, entry.data.length, true);
		view.setUint32(22, entry.data.length, true);
		view.setUint16(26, nameBytes.length, true);
		view.setUint16(28, 0, true);
		local.set(nameBytes, 30);
		local.set(entry.data, 30 + nameBytes.length);
		chunks.push(local);
		const cd = new Uint8Array(46 + nameBytes.length);
		const cdv = new DataView(cd.buffer);
		cdv.setUint32(0, 33639248, true);
		cdv.setUint16(4, 20, true);
		cdv.setUint16(6, 20, true);
		cdv.setUint16(10, 0, true);
		cdv.setUint32(16, crc, true);
		cdv.setUint32(20, entry.data.length, true);
		cdv.setUint32(24, entry.data.length, true);
		cdv.setUint16(28, nameBytes.length, true);
		cdv.setUint32(42, offset, true);
		cd.set(nameBytes, 46);
		central.push(cd);
		offset += local.length;
	}
	const centralBytes = concat(central);
	const eocd = /* @__PURE__ */ new Uint8Array(22);
	const ev = new DataView(eocd.buffer);
	ev.setUint32(0, 101010256, true);
	ev.setUint16(8, entries.length, true);
	ev.setUint16(10, entries.length, true);
	ev.setUint32(12, centralBytes.length, true);
	ev.setUint32(16, offset, true);
	return concat([
		...chunks,
		centralBytes,
		eocd
	]);
}
function concat(parts) {
	let size = 0;
	for (const part of parts) size += part.length;
	const out = new Uint8Array(size);
	let pos = 0;
	for (const part of parts) {
		out.set(part, pos);
		pos += part.length;
	}
	return out;
}
//#endregion
//#region src/install/installer.ts
/**
* Import engine: install skills from an archive (zip/.skill) or an existing
* directory into a user root, with dry-run conflict preview, conflict
* resolution (skip / overwrite), and provenance recording in registry.json.
*/
/** Load the provenance registry (best-effort). */
async function loadRegistry(stateDir) {
	try {
		const raw = await readFile(join(stateDir, "registry.json"), "utf8");
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}
/** Persist the provenance registry. */
async function saveRegistry(stateDir, registry) {
	await mkdir(stateDir, { recursive: true });
	await writeFile(join(stateDir, "registry.json"), JSON.stringify(registry, null, 2), "utf8");
}
/** Discover skills from a source payload. */
async function discoverFromSource(source) {
	if (source.kind === "dir") {
		const root = source.path;
		const skills = [];
		const entries = await readdir(root, { withFileTypes: true });
		for (const entry of entries) {
			const path = join(root, entry.name);
			if (entry.isDirectory()) {
				const skillPath = join(path, "SKILL.md");
				try {
					const parsed = parseFrontmatter(await readFile(skillPath, "utf8"));
					if (!parsed || !isSkillName(entry.name) || !parsed.fm.description) continue;
					const files = /* @__PURE__ */ new Map();
					const enc = new TextEncoder();
					const walk = async (dir) => {
						for (const item of await readdir(dir, { withFileTypes: true })) {
							const full = join(dir, item.name);
							const rel = join(entry.name, full.slice(path.length + 1)).split("\\").join("/");
							if (item.isDirectory()) await walk(full);
							else if (item.isFile()) files.set(rel, enc.encode(await readFile(full, "utf8")));
						}
					};
					await walk(path);
					skills.push({
						name: entry.name,
						description: parsed.fm.description,
						whenToUse: parsed.fm.whenToUse,
						flat: false,
						files
					});
				} catch {}
			} else if (entry.name.endsWith(".md")) {
				const raw = await readFile(path, "utf8");
				const parsed = parseFrontmatter(raw);
				if (!parsed || !isSkillName(entry.name.slice(0, -3)) || !parsed.fm.description) continue;
				const files = /* @__PURE__ */ new Map();
				files.set(`${entry.name}`, new TextEncoder().encode(raw));
				skills.push({
					name: entry.name.slice(0, -3),
					description: parsed.fm.description,
					whenToUse: parsed.fm.whenToUse,
					flat: true,
					files
				});
			}
		}
		return {
			kind: "dir",
			skills
		};
	}
	return {
		kind: "archive",
		skills: discoverSkillsInArchive(parseZip(source.data))
	};
}
/** Plan an import without writing (conflict preview). */
async function planImport(target, source) {
	const { kind, skills } = await discoverFromSource(source);
	const pending = [];
	const conflicts = [];
	for (const skill of skills) if (await skillExists(target, skill.name)) conflicts.push(skill.name);
	else pending.push(skill.name);
	return {
		kind,
		pending,
		conflicts
	};
}
/** Install one already-discovered skill into the dsh root. */
async function installOneSkill(target, skill, provenance) {
	const root = join(target.dshHome, "skills");
	if (skill.flat) {
		await mkdir(root, { recursive: true });
		const md = skill.files.get(`${skill.name}.md`);
		if (!md) throw new Error("missing flat markdown in source");
		await writeFile(join(root, `${skill.name}.md`), md);
	} else {
		const dir = join(root, skill.name);
		await mkdir(dir, { recursive: true });
		for (const [rel, data] of skill.files) {
			const targetFile = join(dir, rel.slice(skill.name.length + 1));
			await mkdir(targetFile.slice(0, Math.max(targetFile.lastIndexOf("\\"), targetFile.lastIndexOf("/"))), { recursive: true });
			await writeFile(targetFile, data);
		}
	}
	const registry = await loadRegistry(target.stateDir);
	registry[skill.name] = provenance;
	await saveRegistry(target.stateDir, registry);
}
/** Execute an import with the given conflict policy. */
async function runImport(target, source, policy, dryRun) {
	const { kind, skills } = await discoverFromSource(source);
	const result = {
		kind,
		pending: [],
		conflicts: [],
		imported: [],
		skipped: [],
		failed: []
	};
	const root = join(target.dshHome, "skills");
	for (const skill of skills) {
		if (await skillExists(target, skill.name)) {
			result.conflicts.push(skill.name);
			if (policy === "skip") {
				result.skipped.push(skill.name);
				continue;
			}
			if (!dryRun) await removeSkill(root, skill.name);
		}
		result.pending.push(skill.name);
		if (dryRun) continue;
		try {
			await installOneSkill(target, skill, {
				kind: source.kind === "archive" ? "archive" : "dir",
				location: source.kind === "archive" ? "archive" : source.path,
				installedAt: Date.now()
			});
			result.imported.push(skill.name);
		} catch (error) {
			result.failed.push({
				name: skill.name,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
	return result;
}
/** Whether a skill already exists in either user root. */
async function skillExists(target, name) {
	for (const root of [join(target.dshHome, "skills"), join(target.agentsHome, "skills")]) {
		try {
			if ((await stat(join(root, name, "SKILL.md"))).isFile()) return true;
		} catch {}
		try {
			if ((await stat(join(root, `${name}.md`))).isFile()) return true;
		} catch {}
	}
	return false;
}
async function removeSkill(root, name) {
	await rm(join(root, name), {
		recursive: true,
		force: true
	});
	await rm(join(root, `${name}.md`), { force: true });
}
//#endregion
//#region src/install/github.ts
/**
* GitHub archive downloader: fetches a repository zipball from codeload with
* size cap, timeout, branch fallback (main -> master) and one retry.
*/
const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;
const TIMEOUT_MS = 3e4;
/** Download a repository zipball. Throws on failure. */
async function downloadGithubArchive(owner, repo) {
	const branches = ["main", "master"];
	let lastError;
	for (const branch of branches) for (let attempt = 0; attempt < 2; attempt++) {
		const url = `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zip/refs/heads/${branch}`;
		try {
			return await fetchBounded(url, MAX_ARCHIVE_BYTES);
		} catch (error) {
			lastError = error;
			if (error instanceof HttpError && error.status === 404 && attempt === 0) break;
		}
	}
	throw new Error(`failed to download github.com/${owner}/${repo}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
/** HTTP error carrying a status code. */
var HttpError = class extends Error {
	status;
	constructor(status, message) {
		super(message);
		this.status = status;
	}
};
/** Fetch a URL with byte cap and timeout. */
async function fetchBounded(url, maxBytes) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			signal: controller.signal,
			redirect: "follow"
		});
		if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status} for ${url}`);
		if (!res.body) throw new Error(`no body for ${url}`);
		const reader = res.body.getReader();
		const chunks = [];
		let total = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.length;
			if (total > maxBytes) throw new Error(`download exceeds ${maxBytes} bytes`);
			chunks.push(value);
		}
		const out = new Uint8Array(total);
		let pos = 0;
		for (const chunk of chunks) {
			out.set(chunk, pos);
			pos += chunk.length;
		}
		return out;
	} finally {
		clearTimeout(timer);
	}
}
/** Fetch a small text/JSON resource (raw.githubusercontent) with timeout. */
async function fetchJson(url, timeoutMs = 15e3) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			signal: controller.signal,
			redirect: "follow"
		});
		if (!res.ok) throw new HttpError(res.status, `HTTP ${res.status} for ${url}`);
		return await res.json();
	} finally {
		clearTimeout(timer);
	}
}
//#endregion
//#region src/install/market.ts
/**
* Skill market sources: skills.sh (vercel-labs ecosystem) search + install
* via GitHub raw/codeload, plus GitHub repository import. All remote sources
* are configurable and fail soft — one market being down never breaks others.
*/
/** Default skills.sh API base. */
const DEFAULT_SKILLS_SH_BASE = "https://skills.sh";
/** Search skills.sh (requires a keyword of >= 2 chars). */
async function searchSkillsSh(keyword, base = DEFAULT_SKILLS_SH_BASE) {
	const q = keyword.trim();
	if (q.length < 2) return [];
	return ((await fetchJson(`${base}/api/search?q=${encodeURIComponent(q)}`)).skills ?? []).map((skill) => ({
		id: skill.id,
		name: skill.skillId,
		installs: skill.installs ?? 0,
		source: skill.source ?? "",
		market: "skills.sh"
	}));
}
/** Split a skills.sh id ("owner/repo/skill-path") into its parts. */
function splitSkillShId(id) {
	const parts = id.split("/");
	if (parts.length < 2) throw new Error(`invalid skills.sh id "${id}"`);
	return {
		owner: parts[0],
		repo: parts[1],
		path: parts.slice(2).join("/")
	};
}
/** Locate the real repo-relative skill directory via the git trees API. */
async function locateSkillDir(owner, repo, path) {
	const paths = await fetchRepoTree(owner, repo);
	if (paths === null) return null;
	const candidates = skillFileCandidates(paths, path);
	if (candidates.length === 0) return null;
	const file = candidates[0];
	if (file === "SKILL.md") return "";
	if (file.endsWith("SKILL.md")) return file.slice(0, -9);
	return file;
}
/**
* Install a skills.sh skill by locating its real path via the GitHub API and
* extracting it from a repository archive (raw.githubusercontent is typically
* unreachable from CN networks; codeload + the API are not).
*/
async function fetchSkillShSkill(id) {
	const { owner, repo, path } = splitSkillShId(id);
	if (!path) return {
		skill: await scanRepoForSkill(owner, repo, ""),
		repoArchive: true
	};
	const realPath = await locateSkillDir(owner, repo, path);
	if (realPath === null) throw new Error(`skill "${path}" not found in ${owner}/${repo}`);
	return {
		skill: await scanRepoForSkill(owner, repo, realPath),
		repoArchive: true
	};
}
/** Download a repo archive and find a skill by path (or the first one). */
async function scanRepoForSkill(owner, repo, path) {
	const stripped = stripSingleRoot(parseZip(await downloadGithubArchive(owner, repo)));
	if (path) {
		const skill = extractSkillAtPath(stripped, path);
		if (skill) return skill;
	}
	const skills = discoverSkillsInArchive(stripped);
	if (skills.length === 0) {
		const rootSkill = discoverRootLevelSkill(stripped, repo);
		if (rootSkill) return rootSkill;
	}
	if (path) {
		const wanted = path.split("/").pop()?.replace(/\.md$/, "");
		const found = skills.find((skill) => skill.name === wanted) ?? skills[0];
		if (!found) throw new Error(`no skill found in ${owner}/${repo}`);
		return found;
	}
	if (skills.length === 0) throw new Error(`no skills found in ${owner}/${repo}`);
	return skills[0];
}
/** Extract a skill at an exact repo-relative path (dir bundle or flat file). */
function extractSkillAtPath(stripped, path) {
	const enc = new TextDecoder("utf-8");
	if (path.endsWith(".md")) {
		const entry = stripped.find((file) => file.name === path);
		if (!entry) return null;
		const name = path.split("/").pop().replace(/\.md$/, "");
		const fm = parseFrontmatter(enc.decode(entry.data));
		const files = /* @__PURE__ */ new Map();
		files.set(`${name}.md`, entry.data);
		return {
			name,
			description: fm?.fm.description ?? "",
			whenToUse: fm?.fm.whenToUse,
			flat: true,
			files
		};
	}
	const prefix = `${path}/`;
	const members = stripped.filter((file) => file.name.startsWith(prefix));
	if (members.length === 0) return null;
	const skillMd = members.find((file) => file.name === `${prefix}SKILL.md`);
	if (!skillMd) return null;
	const fm = parseFrontmatter(enc.decode(skillMd.data));
	const name = path.split("/").pop();
	const files = /* @__PURE__ */ new Map();
	for (const member of members) files.set(`${name}/${member.name.slice(prefix.length)}`, member.data);
	return {
		name,
		description: fm?.fm.description ?? "",
		whenToUse: fm?.fm.whenToUse,
		flat: false,
		files
	};
}
/** Fetch a market skill's one-line description via the GitHub contents API
* (raw.githubusercontent is often unreachable; the API endpoint is not). */
const descriptionCache = /* @__PURE__ */ new Map();
async function githubContent(owner, repo, path) {
	try {
		return await fetchJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, 15e3);
	} catch {
		return null;
	}
}
/** Recursive git tree cache: repo -> file paths. */
const treeCache = /* @__PURE__ */ new Map();
/** Fetch a repo's full recursive file tree (git trees API). */
async function fetchRepoTree(owner, repo) {
	const key = `${owner}/${repo}`;
	if (treeCache.has(key)) return treeCache.get(key) ?? null;
	try {
		const paths = ((await fetchJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/HEAD?recursive=1`, 2e4)).tree ?? []).filter((entry) => entry.type === "blob").map((entry) => entry.path ?? "");
		treeCache.set(key, paths);
		return paths;
	} catch {
		treeCache.set(key, null);
		return null;
	}
}
/** Candidate file paths for a skill in a repo file tree. */
function skillFileCandidates(paths, path) {
	const wanted = path.split("/").pop() ?? path;
	const exact = [`${path}/SKILL.md`, `${path}.md`];
	for (const candidate of exact) if (paths.includes(candidate)) return [candidate];
	const suffixes = paths.filter((file) => file.endsWith(`/${path}/SKILL.md`) || file.endsWith(`/${wanted}/SKILL.md`) || file.endsWith(`/${path}.md`) || file.endsWith(`/${wanted}.md`)).sort((a, b) => a.length - b.length);
	if (suffixes.length > 0) return suffixes;
	if (paths.includes("SKILL.md")) return ["SKILL.md"];
	return [];
}
async function readDescriptionFromApi(owner, repo, path) {
	const paths = await fetchRepoTree(owner, repo);
	if (paths === null) return null;
	for (const file of skillFileCandidates(paths, path)) {
		const entry = await githubContent(owner, repo, file);
		if (entry?.content && entry.encoding === "base64") {
			const fm = parseFrontmatter(Buffer.from(entry.content, "base64").toString("utf-8"));
			if (fm?.fm.description?.trim()) return fm.fm.description.trim();
		}
	}
	return null;
}
async function fetchSkillShDescription(id) {
	if (descriptionCache.has(id)) return descriptionCache.get(id) ?? null;
	const { owner, repo, path } = splitSkillShId(id);
	let description = null;
	if (path) description = await readDescriptionFromApi(owner, repo, path);
	descriptionCache.set(id, description ?? "");
	return description;
}
/**
* Discover skills in a GitHub zipball: strips the codeload wrapper root, runs
* the generic discovery, and falls back to "repo root IS the skill" (a
* top-level SKILL.md) — the common layout for single-skill repositories.
*/
async function scanGithubRepo(owner, repo) {
	const stripped = stripSingleRoot(parseZip(await downloadGithubArchive(owner, repo)));
	const skills = discoverSkillsInArchive(stripped);
	if (skills.length > 0) return skills;
	const rootSkill = discoverRootLevelSkill(stripped, repo);
	return rootSkill ? [rootSkill] : [];
}
/** Detect a repo whose root itself is a skill (top-level SKILL.md). */
function discoverRootLevelSkill(stripped, fallbackName) {
	const skillMd = stripped.find((entry) => entry.name === "SKILL.md");
	if (!skillMd) return null;
	const fm = parseFrontmatter(new TextDecoder("utf-8").decode(skillMd.data));
	if (!fm || !fm.fm.description) return null;
	const candidate = fm.fm.name?.trim() ?? "";
	const name = isSkillName(candidate) ? candidate : fallbackName;
	const files = /* @__PURE__ */ new Map();
	for (const entry of stripped) {
		if (entry.name.endsWith("/")) continue;
		files.set(`${name}/${entry.name}`, entry.data);
	}
	return {
		name,
		description: fm.fm.description,
		whenToUse: fm.fm.whenToUse,
		flat: false,
		files
	};
}
//#endregion
//#region src/core/groups.ts
/**
* Skill groups: user-defined display groupings stored in the plugin's own
* config (~/.dsh/skillforge/groups.json). Groups never touch skill files.
*/
async function loadGroups(stateDir) {
	try {
		const raw = await readFile(join(stateDir, "groups.json"), "utf8");
		const parsed = JSON.parse(raw);
		if (parsed && Array.isArray(parsed.groups)) return parsed;
		return { groups: [] };
	} catch {
		return { groups: [] };
	}
}
async function saveGroups(stateDir, file) {
	await mkdir(stateDir, { recursive: true });
	await writeFile(join(stateDir, "groups.json"), JSON.stringify(file, null, 2), "utf8");
}
/** Apply one group mutation. */
async function mutateGroups(stateDir, op, id, name, members) {
	const file = await loadGroups(stateDir);
	switch (op) {
		case "create": {
			const groupName = name?.trim();
			if (!groupName) throw new Error("group name is required");
			if (file.groups.find((group) => group.name === groupName)) throw new Error(`group "${groupName}" already exists`);
			file.groups.push({
				id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				name: groupName,
				members: []
			});
			break;
		}
		case "rename": {
			const group = file.groups.find((entry) => entry.id === id);
			if (!group) throw new Error("group not found");
			const next = name?.trim();
			if (!next) throw new Error("group name is required");
			group.name = next;
			break;
		}
		case "delete":
			file.groups = file.groups.filter((entry) => entry.id !== id);
			break;
		case "setMembers": {
			const group = file.groups.find((entry) => entry.id === id);
			if (!group) throw new Error("group not found");
			group.members = Array.from(new Set(members ?? []));
			break;
		}
	}
	await saveGroups(stateDir, file);
	return file;
}
//#endregion
//#region src/core/move.ts
/**
* Cross-level move/copy: relocate a skill between user roots and workspace
* project roots. Moves the whole bundle directory (or flat file); copies keep
* the source intact. Provenance is re-recorded at the destination.
*/
/** Locate a skill across user roots AND workspace project roots. */
async function findSkillAnywhere(roots, name) {
	const user = await findDiskSkill(roots.dshHome, roots.agentsHome, name);
	if (user) return user;
	for (const workspace of roots.workspaces()) {
		const located = await findDiskSkill(join(workspace.path, ".dsh"), join(workspace.path, ".agents"), name);
		if (located) return located;
	}
}
/** Move or copy a skill to a target root. */
async function moveSkill(roots, request) {
	const located = await findSkillAnywhere(roots, request.name);
	if (!located) throw new Error(`skill "${request.name}" not found`);
	let targetRoot;
	if (request.to === "user-dsh") targetRoot = join(roots.dshHome, "skills");
	else if (request.to === "user-agents") throw new Error("cannot move into ~/.agents/skills: the agents root is read-only (shared with other tools)");
	else {
		if (!request.workspaceId) throw new Error("workspaceId is required for workspace targets");
		const workspace = roots.workspaces().find((entry) => entry.id === request.workspaceId);
		if (!workspace) throw new Error("workspace not found");
		targetRoot = join(workspace.path, ".dsh", "skills");
	}
	if (samePath(located.flat ? dirname(located.path) : dirname(dirname(located.path)), targetRoot)) return {
		name: request.name,
		path: located.path,
		copied: false
	};
	const copy = request.copy === true;
	if (located.flat) {
		await mkdir(targetRoot, { recursive: true });
		const targetFile = join(targetRoot, `${request.name}.md`);
		if (copy) await copyFile(located.path, targetFile);
		else await rename(located.path, targetFile);
	} else if (copy) await cp(dirname(located.path), join(targetRoot, request.name), { recursive: true });
	else await rename(dirname(located.path), join(targetRoot, request.name));
	const finalPath = located.flat ? join(targetRoot, `${request.name}.md`) : join(targetRoot, request.name, "SKILL.md");
	if (copy) {
		const parsed = parseFrontmatter(await readFile(finalPath, "utf8"));
		if (parsed && parsed.fm.name !== request.name) {
			parsed.fm.name = request.name;
			const doc = buildSkillDoc(parsed.fm, parsed.body);
			const tmp = `${finalPath}.tmp-${Date.now()}`;
			await writeFile(tmp, doc, "utf8");
			await rename(tmp, finalPath);
		}
		const registry = await loadRegistry(roots.stateDir);
		delete registry[request.name];
		await saveRegistry(roots.stateDir, registry);
	}
	return {
		name: request.name,
		path: finalPath,
		copied: copy
	};
}
function samePath(a, b) {
	return a.replace(/[\\/]+$/, "").toLowerCase() === b.replace(/[\\/]+$/, "").toLowerCase();
}
//#endregion
//#region src/core/conversation.ts
/**
* Per-conversation skill loading: a conversation's selection (stored in the
* skillforge settings namespace as `conversation.<sessionId>.skills`) limits
* which skills that agent's catalog carries. Skills outside the selection are
* shadowed for that agent only; conversations without a selection load
* everything (dsh default).
*/
/** Read the conversation config from a settings scope. */
function readConversation(scope) {
	const config = scope.get()?.conversation;
	return config && typeof config === "object" ? config : {};
}
/** Effective shadowed names for one session: global disabled + unselected. */
async function sessionShadowedNames(scope, dshHome, agentsHome, sessionId) {
	const disabled = Object.keys(readDisabledMap(scope));
	const selection = readConversation(scope)[sessionId]?.skills;
	if (!selection || selection.length === 0) return disabled;
	const selected = new Set(selection);
	const { skills } = await scanUserRoots(dshHome, agentsHome);
	const unselected = skills.map((skill) => skill.name).filter((name) => !selected.has(name));
	return [.../* @__PURE__ */ new Set([...disabled, ...unselected])];
}
/** Resolve the agents home (shared with catalog). */
function resolveAgentsHome() {
	return process.env.DSH_AGENTS_HOME || join(homedir(), ".agents");
}
//#endregion
//#region src/mcp/store.ts
/**
* MCP server configuration store (~/.dsh/skillforge/mcp.json).
* Each server entry carries a full dsh-mcp-client Config plus management
* fields (id, enabled, lastError).
*/
async function loadMcpFile(stateDir) {
	try {
		const raw = await readFile(join(stateDir, "mcp.json"), "utf8");
		const parsed = JSON.parse(raw);
		if (parsed && Array.isArray(parsed.servers)) return parsed;
		return { servers: [] };
	} catch {
		return { servers: [] };
	}
}
async function saveMcpFile(stateDir, file) {
	await mkdir(stateDir, { recursive: true });
	await writeFile(join(stateDir, "mcp.json"), JSON.stringify(file, null, 2), "utf8");
}
/** Validate a serverName per the dsh-mcp-client contract. */
function isServerName(value) {
	return /^[A-Za-z0-9_-]{1,32}$/.test(value);
}
//#endregion
//#region src/routes.ts
/**
* Same-origin HTTP API routes for the settings panel, registered on the dsh
* web server. All routes are loopback-only (source address + Host header
* double-check) and speak a unified `{ok, data?} / {ok:false, error}` JSON
* envelope.
*/
/** True when the request arrives from a loopback interface. */
function isLoopback(req) {
	const addr = req.socket.remoteAddress ?? "";
	return addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1" || addr.startsWith("127.") || addr === "localhost";
}
/** True when the Host header names the local machine. */
function isLocalHost(req) {
	const host = (req.headers.host ?? "").toLowerCase();
	return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
}
function send(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"content-length": Buffer.byteLength(payload),
		"cache-control": "no-store"
	});
	res.end(payload);
}
function ok(res, data) {
	send(res, 200, {
		ok: true,
		data
	});
}
function fail(res, status, error) {
	send(res, status, {
		ok: false,
		error
	});
}
function readBody(req, limitBytes = 1e6) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > limitBytes) {
				reject(/* @__PURE__ */ new Error(`request body too large (limit ${limitBytes} bytes)`));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			try {
				resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
			} catch {
				reject(/* @__PURE__ */ new Error("invalid JSON body"));
			}
		});
		req.on("error", reject);
	});
}
/** Best-effort open of a skill's folder in the platform file manager.
* On Windows, `explorer /select,<skill-file>` is used: it forces a NEW
* window that steals focus (explorer has system foreground privilege; a
* plain open from a background process never activates) and lands directly
* in the skill directory with SKILL.md (or the flat .md) selected. */
function openDirectory(skillFile) {
	try {
		if (process.platform === "win32") spawn("explorer", ["/select," + skillFile], {
			detached: true,
			stdio: "ignore"
		}).unref();
		else if (process.platform === "darwin") spawn("open", [dirname(skillFile)], {
			detached: true,
			stdio: "ignore"
		}).unref();
		else spawn("xdg-open", [dirname(skillFile)], {
			detached: true,
			stdio: "ignore"
		}).unref();
	} catch {}
}
/** Remove an installed skill directory (dsh root only). */
async function removeSkillDir(roots, name) {
	const { rm } = await import("node:fs/promises");
	await rm(join(roots.dshHome, "skills", name), {
		recursive: true,
		force: true
	});
	await rm(join(roots.dshHome, "skills", `${name}.md`), { force: true });
}
/** Best-effort workspace projection from the host workspace service. */
function listWorkspaces(ctx) {
	try {
		const registry = ctx.workspaces;
		if (!registry) return [];
		return registry.list().map((workspace) => ({
			id: workspace.id,
			title: workspace.title,
			path: workspace.path
		}));
	} catch {
		return [];
	}
}
/** Build a server record from a save request. */
function buildMcpRecord(body) {
	if (body.transport !== "stdio" && body.transport !== "streamable-http") throw new Error("transport must be stdio | streamable-http");
	if (typeof body.name !== "string" || !body.name.trim()) throw new Error("name is required");
	const serverName = typeof body.serverName === "string" && body.serverName.trim() ? body.serverName.trim() : `sf_${body.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 24)}`;
	if (!isServerName(serverName)) throw new Error("serverName must match [A-Za-z0-9_-]{1,32}");
	const config = { serverName };
	if (body.transport === "stdio") {
		if (typeof body.command !== "string" || !body.command.trim()) throw new Error("command is required for stdio servers");
		config.transport = "stdio";
		config.command = body.command.trim();
		config.args = Array.isArray(body.args) ? body.args.filter((arg) => typeof arg === "string") : [];
		config.env = body.env && typeof body.env === "object" ? body.env : {};
		config.cwd = typeof body.cwd === "string" ? body.cwd : "";
		config.toolCallTimeoutMs = 6e4;
		config.failOnStartupError = false;
	} else {
		if (typeof body.url !== "string" || !body.url.trim()) throw new Error("url is required for streamable-http servers");
		config.transport = "streamable-http";
		config.url = body.url.trim();
		config.headers = body.headers && typeof body.headers === "object" ? body.headers : {};
		config.toolCallTimeoutMs = 6e4;
		config.failOnStartupError = false;
	}
	return {
		id: typeof body.id === "string" && body.id ? body.id : `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		enabled: body.enabled === true,
		name: body.name.trim(),
		config,
		updatedAt: Date.now()
	};
}
/** Connect a server for real and report whether the tools came up. */
async function testMcpServer(mcp, stateDir, id) {
	const server = (await loadMcpFile(stateDir)).servers.find((entry) => entry.id === id);
	if (!server) throw new Error("server not found");
	const wasEnabled = server.enabled;
	await mcp.toggle(id, true);
	await new Promise((resolve) => setTimeout(resolve, 2500));
	const status = mcp.statuses()[id];
	const ok = status?.running === true && !status.lastError;
	if (!ok && !wasEnabled) await mcp.toggle(id, false);
	return {
		ok,
		error: status?.lastError
	};
}
/** Register the skillforge API routes; returns the route disposer. */
function registerRoutes(ctx, writer, shadow, roots, mcp, settingsScope) {
	return ctx.webServer.register({
		kind: "prefix",
		path: API_BASE,
		handler: async (req, res) => {
			if (!isLoopback(req) || !isLocalHost(req)) {
				fail(res, 403, "forbidden");
				return;
			}
			try {
				const url = new URL(req.url ?? "/", "http://localhost");
				const route = url.pathname.slice(23) || "/";
				switch (req.method) {
					case "GET":
						if (route === "/catalog") {
							ok(res, await buildCatalog(ctx, writer.getDisabled(), roots.stateDir));
							return;
						}
						if (route === "/skill") {
							const name = url.searchParams.get("name");
							if (!name) {
								fail(res, 400, "missing ?name=");
								return;
							}
							const disabled = writer.getDisabled();
							const onDisk = await findDiskSkill(roots.dshHome, roots.agentsHome, name);
							if (onDisk) {
								const split = splitSkillDoc(await readFile(onDisk.path, "utf8"));
								const fm = split.frontmatter;
								const descriptionMatch = /^description\s*:\s*(.*)$/m.exec(fm);
								const whenToUseMatch = /^whenToUse\s*:\s*(.*)$/m.exec(fm);
								/^disable-model-invocation\s*:\s*(true|yes|on|1)\s*$/im.test(fm);
								/^user-invocable\s*:\s*(false|no|off|0)\s*$/im.test(fm);
								ok(res, {
									name,
									description: descriptionMatch ? descriptionMatch[1].trim().replace(/^['"]|['"]$/g, "") : "",
									whenToUse: whenToUseMatch ? whenToUseMatch[1].trim().replace(/^['"]|['"]$/g, "") : void 0,
									source: onDisk.path.includes(`${roots.agentsHome}${process.platform === "win32" ? "\\" : "/"}`) ? "user-agents" : "user-dsh",
									provider: "filesystem",
									enabled: !Object.prototype.hasOwnProperty.call(disabled, name),
									path: onDisk.path,
									content: split.content,
									frontmatter: fm
								});
								return;
							}
							const skill = await ctx.skills.get(name);
							if (!skill) {
								fail(res, 404, `skill "${name}" not found`);
								return;
							}
							ok(res, {
								name: skill.name,
								description: skill.description,
								whenToUse: skill.whenToUse,
								source: skill.source,
								provider: skill.provider,
								enabled: !Object.prototype.hasOwnProperty.call(disabled, skill.name),
								path: skill.path,
								content: skill.content,
								frontmatter: ""
							});
							return;
						}
						if (route === "/edit") {
							const name = url.searchParams.get("name");
							if (!name) {
								fail(res, 400, "missing ?name=");
								return;
							}
							try {
								ok(res, await readSkillForEdit(roots, name));
							} catch (error) {
								fail(res, 404, error instanceof Error ? error.message : String(error));
							}
							return;
						}
						if (route === "/export") {
							const name = url.searchParams.get("name");
							if (!name) {
								fail(res, 400, "missing ?name=");
								return;
							}
							const located = await findDiskSkill(roots.dshHome, roots.agentsHome, name);
							if (!located) {
								fail(res, 404, `skill "${name}" not found`);
								return;
							}
							let entries;
							if (located.flat) {
								const data = await readFile(located.path);
								entries = [{
									name: `${name}.md`,
									data: new Uint8Array(data)
								}];
							} else entries = (await packSkill(dirname(located.path), name)).entries;
							const zipBytes = writeZip(entries);
							res.writeHead(200, {
								"content-type": "application/octet-stream",
								"content-disposition": `attachment; filename="${name}.skill"`,
								"content-length": String(zipBytes.length),
								"cache-control": "no-store"
							});
							res.end(Buffer.from(zipBytes));
							return;
						}
						if (route === "/registry") {
							ok(res, await loadRegistry(roots.stateDir));
							return;
						}
						if (route === "/groups") {
							ok(res, await loadGroups(roots.stateDir));
							return;
						}
						if (route === "/plugins") {
							let entries = [];
							try {
								const loader = ctx.loader;
								if (loader) {
									const raw = loader.entries();
									entries = Array.from(raw).filter((entry) => !entry.options.group).map((entry) => ({
										moduleName: entry.options.name ?? "",
										enabled: !entry.disabled,
										fiberPhase: entry.fiber ? entry.fiber.state : null
									})).filter((entry) => entry.moduleName);
								}
							} catch {}
							ok(res, {
								official: entries.filter((entry) => entry.moduleName.startsWith("@deepseek-ai/")),
								other: entries.filter((entry) => !entry.moduleName.startsWith("@deepseek-ai/"))
							});
							return;
						}
						if (route === "/conversation") {
							const config = readConversation(settingsScope);
							let sessions = [];
							try {
								const registry = ctx.sessions;
								if (registry) sessions = registry.list().map((session) => ({
									id: String(session.id),
									cwd: session.header?.cwd ?? ""
								}));
							} catch {}
							ok(res, {
								config,
								sessions
							});
							return;
						}
						if (route === "/mcp") {
							const file = await loadMcpFile(roots.stateDir);
							const statuses = mcp.statuses();
							ok(res, { servers: file.servers.map((server) => {
								const status = statuses[server.id] ?? { running: false };
								return {
									id: server.id,
									name: server.name,
									enabled: server.enabled,
									transport: server.config.transport ?? "stdio",
									serverName: server.config.serverName ?? "",
									command: server.config.command ?? void 0,
									args: server.config.args ?? void 0,
									url: server.config.url ?? void 0,
									running: status.running === true,
									lastError: status.lastError ?? server.lastError
								};
							}) });
							return;
						}
						fail(res, 404, `unknown route ${route}`);
						return;
					case "POST":
						if (route === "/toggle") {
							const body = await readBody(req);
							if (typeof body.name !== "string" || typeof body.enabled !== "boolean") {
								fail(res, 400, "body requires { name: string, enabled: boolean }");
								return;
							}
							ok(res, await setEnabled(writer, {
								dshHome: roots.dshHome,
								agentsHome: roots.agentsHome
							}, body.name, body.enabled, () => shadow.invalidate()));
							return;
						}
						if (route === "/check") {
							ok(res, await auditRoots(roots.dshHome, roots.agentsHome, roots.stateDir));
							return;
						}
						if (route === "/create") {
							const body = await readBody(req);
							if (typeof body.name !== "string" || typeof body.description !== "string") {
								fail(res, 400, "body requires { name: string, description: string }");
								return;
							}
							ok(res, await createSkill(roots, {
								name: body.name,
								description: body.description,
								whenToUse: typeof body.whenToUse === "string" ? body.whenToUse : void 0,
								content: typeof body.content === "string" ? body.content : void 0
							}));
							return;
						}
						if (route === "/update") {
							const body = await readBody(req);
							if (typeof body.name !== "string") {
								fail(res, 400, "body requires { name: string }");
								return;
							}
							ok(res, await updateSkill(roots, {
								name: body.name,
								description: typeof body.description === "string" ? body.description : void 0,
								whenToUse: typeof body.whenToUse === "string" ? body.whenToUse : void 0,
								content: typeof body.content === "string" ? body.content : void 0
							}));
							return;
						}
						if (route === "/rename") {
							const body = await readBody(req);
							if (typeof body.name !== "string" || typeof body.newName !== "string") {
								fail(res, 400, "body requires { name: string, newName: string }");
								return;
							}
							ok(res, await renameSkill(roots, {
								name: body.name,
								newName: body.newName
							}));
							return;
						}
						if (route === "/delete") {
							const body = await readBody(req);
							if (typeof body.name !== "string") {
								fail(res, 400, "body requires { name: string }");
								return;
							}
							try {
								await deleteSkill(roots, body.name);
							} catch (error) {
								fail(res, 400, error instanceof Error ? error.message : String(error));
								return;
							}
							const registry = await loadRegistry(roots.stateDir);
							delete registry[body.name];
							await saveRegistry(roots.stateDir, registry);
							ok(res, { name: body.name });
							return;
						}
						if (route === "/open") {
							const body = await readBody(req);
							if (typeof body.name !== "string") {
								fail(res, 400, "body requires { name: string }");
								return;
							}
							const located = await findDiskSkill(roots.dshHome, roots.agentsHome, body.name);
							if (!located) {
								fail(res, 404, `skill "${body.name}" not found`);
								return;
							}
							openDirectory(located.path);
							ok(res, { opened: located.path });
							return;
						}
						if (route === "/market/search") {
							const body = await readBody(req);
							if (typeof body.keyword !== "string" || body.keyword.trim().length < 2) {
								fail(res, 400, "body requires { keyword: string } (>= 2 chars)");
								return;
							}
							try {
								ok(res, await searchSkillsSh(body.keyword));
							} catch (error) {
								fail(res, 502, `skills.sh unavailable: ${error instanceof Error ? error.message : String(error)}`);
							}
							return;
						}
						if (route === "/market/install") {
							const body = await readBody(req);
							if (typeof body.id !== "string") {
								fail(res, 400, "body requires { id: string }");
								return;
							}
							const conflict = body.conflict === "overwrite" ? "overwrite" : "skip";
							let target = roots;
							if (typeof body.workspaceId === "string" && body.workspaceId) {
								const workspace = listWorkspaces(ctx).find((ws) => ws.id === body.workspaceId);
								if (!workspace) {
									fail(res, 400, "workspace not found");
									return;
								}
								target = {
									...roots,
									dshHome: join(workspace.path, ".dsh"),
									agentsHome: join(workspace.path, ".agents")
								};
							}
							try {
								const { skill } = await fetchSkillShSkill(body.id);
								const exists = await skillExists(target, skill.name);
								if (exists && conflict === "skip") {
									fail(res, 409, `skill "${skill.name}" already exists`);
									return;
								}
								if (exists) await removeSkillDir(target, skill.name);
								await installOneSkill(target, skill, {
									kind: "github",
									location: body.id,
									installedAt: Date.now()
								});
								ok(res, {
									installed: skill.name,
									target: body.workspaceId ? "project" : "user"
								});
							} catch (error) {
								fail(res, 502, error instanceof Error ? error.message : String(error));
							}
							return;
						}
						if (route === "/market/describe") {
							const body = await readBody(req);
							if (typeof body.id !== "string") {
								fail(res, 400, "body requires { id: string }");
								return;
							}
							try {
								const description = await fetchSkillShDescription(body.id);
								ok(res, {
									id: body.id,
									description
								});
							} catch (error) {
								fail(res, 502, error instanceof Error ? error.message : String(error));
							}
							return;
						}
						if (route === "/github/scan") {
							const body = await readBody(req);
							if (typeof body.owner !== "string" || typeof body.repo !== "string") {
								fail(res, 400, "body requires { owner: string, repo: string }");
								return;
							}
							try {
								ok(res, { skills: (await scanGithubRepo(body.owner, body.repo)).map((skill) => ({
									name: skill.name,
									description: skill.description,
									flat: skill.flat
								})) });
							} catch (error) {
								fail(res, 502, error instanceof Error ? error.message : String(error));
							}
							return;
						}
						if (route === "/update") {
							const body = await readBody(req);
							if (typeof body.name !== "string") {
								fail(res, 400, "body requires { name: string }");
								return;
							}
							const record = (await loadRegistry(roots.stateDir))[body.name];
							if (!record || record.kind !== "github") {
								fail(res, 400, `"${body.name}" has no updatable source (github only)`);
								return;
							}
							try {
								const { skill } = await fetchSkillShSkill(record.location);
								await removeSkillDir(roots, skill.name);
								await installOneSkill(roots, skill, {
									...record,
									installedAt: Date.now()
								});
								ok(res, { updated: skill.name });
							} catch (error) {
								fail(res, 502, error instanceof Error ? error.message : String(error));
							}
							return;
						}
						if (route === "/groups") {
							const body = await readBody(req);
							if (body.op !== "create" && body.op !== "rename" && body.op !== "delete" && body.op !== "setMembers") {
								fail(res, 400, "body requires op: create | rename | delete | setMembers");
								return;
							}
							try {
								ok(res, await mutateGroups(roots.stateDir, body.op, typeof body.id === "string" ? body.id : void 0, typeof body.name === "string" ? body.name : void 0, Array.isArray(body.members) ? body.members.filter((member) => typeof member === "string") : void 0));
							} catch (error) {
								fail(res, 400, error instanceof Error ? error.message : String(error));
							}
							return;
						}
						if (route === "/move") {
							const body = await readBody(req);
							if (typeof body.name !== "string") {
								fail(res, 400, "body requires { name: string }");
								return;
							}
							const to = body.to;
							if (to !== "user-dsh" && to !== "user-agents" && to !== "workspace") {
								fail(res, 400, "body requires to: user-dsh | user-agents | workspace");
								return;
							}
							try {
								const workspaces = listWorkspaces(ctx);
								ok(res, await moveSkill({
									dshHome: roots.dshHome,
									agentsHome: roots.agentsHome,
									stateDir: roots.stateDir,
									workspaces: () => workspaces
								}, {
									name: body.name,
									to,
									workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : void 0,
									copy: body.copy === true
								}));
							} catch (error) {
								fail(res, 400, error instanceof Error ? error.message : String(error));
							}
							return;
						}
						if (route === "/conversation") {
							const body = await readBody(req);
							if (typeof body.sessionId !== "string" || !Array.isArray(body.skills)) {
								fail(res, 400, "body requires { sessionId: string, skills: string[] }");
								return;
							}
							const skills = body.skills.filter((skill) => typeof skill === "string");
							if (skills.length === 0) await settingsScope.mutate([{
								op: "unset",
								path: ["conversation", body.sessionId]
							}]);
							else {
								const config = { ...readConversation(settingsScope) };
								config[body.sessionId] = {
									skills,
									updatedAt: Date.now()
								};
								await settingsScope.update({ conversation: config });
							}
							shadow.invalidate();
							ok(res, { config: readConversation(settingsScope) });
							return;
						}
						if (route === "/mcp") {
							const body = await readBody(req);
							try {
								if (body.op === "save") {
									const record = buildMcpRecord(body);
									ok(res, { id: (await mcp.save(record)).id });
									return;
								}
								if (body.op === "delete") {
									if (typeof body.id !== "string") {
										fail(res, 400, "body requires id");
										return;
									}
									await mcp.remove(body.id);
									ok(res, { removed: body.id });
									return;
								}
								if (body.op === "toggle") {
									if (typeof body.id !== "string" || typeof body.enabled !== "boolean") {
										fail(res, 400, "body requires { id, enabled }");
										return;
									}
									await mcp.toggle(body.id, body.enabled);
									ok(res, {
										id: body.id,
										enabled: body.enabled
									});
									return;
								}
								if (body.op === "test") {
									if (typeof body.id !== "string") {
										fail(res, 400, "body requires id");
										return;
									}
									ok(res, await testMcpServer(mcp, roots.stateDir, body.id));
									return;
								}
								fail(res, 400, "body requires op: save | delete | toggle | test");
							} catch (error) {
								fail(res, 400, error instanceof Error ? error.message : String(error));
							}
							return;
						}
						if (route === "/import") {
							const body = await readBody(req, 64 * 1024 * 1024);
							if (body.kind !== "archive" && body.kind !== "dir") {
								fail(res, 400, "body requires kind: \"archive\" | \"dir\"");
								return;
							}
							const conflict = body.conflict === "overwrite" ? "overwrite" : "skip";
							const dryRun = body.dryRun === true;
							if (body.kind === "archive") {
								if (typeof body.data !== "string") {
									fail(res, 400, "kind=archive requires data (base64)");
									return;
								}
								let bytes;
								try {
									bytes = new Uint8Array(Buffer.from(body.data, "base64"));
								} catch {
									fail(res, 400, "invalid base64 data");
									return;
								}
								if (bytes.length > 48 * 1024 * 1024) {
									fail(res, 400, "archive exceeds 48 MiB");
									return;
								}
								const source = {
									kind: "archive",
									data: bytes
								};
								if (dryRun) ok(res, {
									...await planImport(roots, source),
									imported: [],
									skipped: [],
									failed: []
								});
								else ok(res, await runImport(roots, source, conflict, false));
								return;
							}
							if (typeof body.path !== "string") {
								fail(res, 400, "kind=dir requires path");
								return;
							}
							const dirSource = {
								kind: "dir",
								path: body.path
							};
							if (dryRun) ok(res, {
								...await planImport(roots, dirSource),
								imported: [],
								skipped: [],
								failed: []
							});
							else ok(res, await runImport(roots, dirSource, conflict, false));
							return;
						}
						fail(res, 404, `unknown route ${route}`);
						return;
					default: fail(res, 405, "method not allowed");
				}
			} catch (error) {
				fail(res, 500, error instanceof Error ? error.message : String(error));
			}
		}
	});
}
//#endregion
//#region src/mcp/manager.ts
/**
* Manager bound to one plugin context. Mounts enabled servers on start and
* tracks per-server fibers.
*/
var McpManager = class {
	ctx;
	stateDir;
	fibers = /* @__PURE__ */ new Map();
	status = /* @__PURE__ */ new Map();
	clientModule = null;
	constructor(ctx, stateDir) {
		this.ctx = ctx;
		this.stateDir = stateDir;
	}
	/** Load the client plugin module once (dsh-mcp-client is a cordis plugin). */
	async client() {
		if (!this.clientModule) this.clientModule = await import("./lib-DRCEL1Fj.js");
		return this.clientModule;
	}
	/** Load all enabled servers from disk and mount them. */
	async start() {
		const file = await loadMcpFile(this.stateDir);
		for (const server of file.servers) if (server.enabled) await this.mount(server);
	}
	/** Current status map (id -> running/error). */
	statuses() {
		const out = {};
		for (const [id, status] of this.status) out[id] = status;
		return out;
	}
	/** Persist a server record and reconcile the live fiber. */
	async save(record) {
		const file = await loadMcpFile(this.stateDir);
		const index = file.servers.findIndex((server) => server.id === record.id);
		const next = {
			...record,
			updatedAt: Date.now()
		};
		if (index >= 0) file.servers[index] = next;
		else file.servers.push(next);
		await saveMcpFile(this.stateDir, file);
		await this.unmount(record.id);
		this.status.delete(record.id);
		if (next.enabled) await this.mount(next);
		return next;
	}
	/** Enable/disable a server (real connect/disconnect). */
	async toggle(id, enabled) {
		const file = await loadMcpFile(this.stateDir);
		const server = file.servers.find((entry) => entry.id === id);
		if (!server) throw new Error("server not found");
		server.enabled = enabled;
		server.updatedAt = Date.now();
		await saveMcpFile(this.stateDir, file);
		await this.unmount(id);
		this.status.delete(id);
		if (enabled) await this.mount(server);
	}
	/** Delete a server (disconnect first). */
	async remove(id) {
		await this.unmount(id);
		this.status.delete(id);
		const file = await loadMcpFile(this.stateDir);
		file.servers = file.servers.filter((server) => server.id !== id);
		await saveMcpFile(this.stateDir, file);
	}
	/** Connect one server for real; on failure record the error and unmount. */
	async mount(server) {
		try {
			const plugin = await this.client();
			const fiber = this.ctx.plugin(plugin, server.config);
			this.fibers.set(server.id, fiber);
			this.status.set(server.id, { running: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.status.set(server.id, {
				running: false,
				lastError: message
			});
			const file = await loadMcpFile(this.stateDir);
			const record = file.servers.find((entry) => entry.id === server.id);
			if (record) {
				record.lastError = message;
				await saveMcpFile(this.stateDir, file);
			}
		}
	}
	async unmount(id) {
		const fiber = this.fibers.get(id);
		if (fiber) {
			try {
				fiber.dispose();
			} catch {}
			this.fibers.delete(id);
		}
	}
	/** Dispose everything (plugin teardown). */
	async dispose() {
		for (const id of [...this.fibers.keys()]) await this.unmount(id);
	}
};
//#endregion
//#region src/tools.ts
/**
* Model tools: let the agent search/install skills and list/toggle them from
* the conversation. ToolDefinitions are hand-built plain objects (the runtime
* only needs name/description/parameters/output/execute — no defineTool
* import, keeping the zero-dsh-runtime-dependency rule intact).
*/
/** Build a text-rendering tool with hand-rolled argument checks. */
function makeTool(name, description, properties, required, execute) {
	return {
		name,
		description,
		parameters: {
			type: "object",
			properties,
			required
		},
		output: {
			schema: { type: "object" },
			render: (_args, value) => [{
				type: "text",
				text: typeof value === "string" ? value : JSON.stringify(value, null, 2)
			}]
		},
		execute: async (args) => {
			for (const key of required) if (args[key] === void 0) throw new Error(`missing argument "${key}"`);
			return execute(args);
		}
	};
}
/** Scan the user roots and return lightweight skill rows. */
async function scanRows(dshHome, agentsHome, disabled) {
	const rows = [];
	for (const root of [{
		path: join(dshHome, "skills"),
		source: "user-dsh"
	}, {
		path: join(agentsHome, "skills"),
		source: "user-agents"
	}]) {
		let entries;
		try {
			entries = await readdir(root.path, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			const flat = entry.isFile() && entry.name.endsWith(".md");
			const bundle = entry.isDirectory();
			if (!flat && !bundle) continue;
			const base = flat ? entry.name.slice(0, -3) : entry.name;
			if (!isSkillName(base)) continue;
			const skillPath = flat ? join(root.path, entry.name) : join(root.path, base, "SKILL.md");
			let raw = "";
			try {
				raw = await readFile(skillPath, "utf8");
			} catch {
				continue;
			}
			const fm = parseFrontmatter(raw);
			if (!fm || !fm.fm.description) continue;
			rows.push({
				name: base,
				description: fm.fm.description,
				source: root.source,
				enabled: !Object.prototype.hasOwnProperty.call(disabled, base)
			});
		}
	}
	return rows.sort((a, b) => a.name.localeCompare(b.name));
}
/**
* Register the skillforge model tools on ctx.tools (best-effort; never throws).
*/
function registerModelTools(ctx, getDisabled) {
	try {
		if (!ctx.tools) return;
		const dshHome = resolveDshHome();
		const agentsHome = process.env.DSH_AGENTS_HOME || join(homedir(), ".agents");
		const target = {
			dshHome,
			agentsHome,
			stateDir: join(dshHome, "skillforge")
		};
		const writer = {
			getDisabled,
			writeDisabled: (map) => ctx.settings.update("skillforge", { disabled: map }),
			unsetDisabled: (name) => ctx.settings.mutate("skillforge", [{
				op: "unset",
				path: ["disabled", name]
			}])
		};
		const tools = [
			makeTool("skillforge_search", "Search the skills.sh skill market for installable skills. Use ONLY when the user asks to find or install a skill by keyword. Returns skill ids you can pass to skillforge_install.", { keyword: {
				type: "string",
				description: "Search keyword (>= 2 chars, e.g. \"ppt\", \"pdf\", \"excel\")"
			} }, ["keyword"], async (args) => {
				const items = await searchSkillsSh(String(args.keyword));
				if (items.length === 0) return "no skills found";
				return items.slice(0, 10).map((item) => `${item.name} | installs: ${item.installs} | source: ${item.source} | id: ${item.id}`).join("\n");
			}),
			makeTool("skillforge_install", "Install a skill from the skills.sh market into the user skill root. Use AFTER skillforge_search returned an id and the user confirmed.", { id: {
				type: "string",
				description: "Skill id from skillforge_search (e.g. \"owner/repo/skill-name\")"
			} }, ["id"], async (args) => {
				const id = String(args.id);
				const guessed = id.split("/").pop() ?? id;
				if (await skillExists(target, guessed)) return `skill already exists: ${guessed}`;
				const { skill } = await fetchSkillShSkill(id);
				await installOneSkill(target, skill, {
					kind: "github",
					location: id,
					installedAt: Date.now()
				});
				return `installed ${skill.name}`;
			}),
			makeTool("skills_list", "List installed skills with their enabled state. Use when the user asks what skills exist or to see their skills.", {}, [], async () => {
				const rows = await scanRows(dshHome, agentsHome, getDisabled());
				if (rows.length === 0) return "no skills installed";
				return rows.map((row) => `${row.enabled ? "[on] " : "[off]"} ${row.name} (${row.source}) - ${row.description.slice(0, 80)}`).join("\n");
			}),
			makeTool("skills_toggle", "Enable or disable a skill. Disabling hides it from the model catalog, the skill tool and slash gestures; enabling restores it. Never deletes files.", {
				name: {
					type: "string",
					description: "Skill name (kebab-case)"
				},
				enabled: {
					type: "boolean",
					description: "true to enable, false to disable"
				}
			}, ["name", "enabled"], async (args) => {
				const name = String(args.name);
				const enabled = Boolean(args.enabled);
				await setEnabled(writer, {
					dshHome,
					agentsHome
				}, name, enabled, () => {});
				return `${enabled ? "enabled" : "disabled"} ${name}`;
			})
		];
		for (const tool of tools) try {
			ctx.tools.register(tool);
		} catch (error) {
			ctx.logger.warn("[skillforge] tool registration failed:", error);
		}
	} catch (error) {
		ctx.logger.warn("[skillforge] model tools disabled:", error);
	}
}
//#endregion
//#region src/index.ts
const name = "skillforge";
const inject = [
	"skills",
	"settings",
	"webServer",
	"sessions",
	"loader"
];
const Config = z.object({ useShadowProvider: z.boolean().default(true) });
function apply(ctx, config) {
	const ns = "skillforge";
	const scope = ctx.settings.register(ns, z.object({
		disabled: z.dict(z.any()).default({}),
		conversation: z.dict(z.any()).default({})
	}));
	const disabled = () => readDisabledMap(scope);
	const registrations = [];
	const invalidateAll = () => {
		for (const registration of registrations) registration.invalidate();
	};
	try {
		registrations.push(registerShadowForCtx(ctx, disabled));
	} catch (error) {
		ctx.logger.warn("[skillforge] global shadow provider registration failed:", error);
	}
	const dshHome = resolveDshHome();
	const agentsHome = resolveAgentsHome();
	const stateDir = join(dshHome, "skillforge");
	const registeredAgents = /* @__PURE__ */ new WeakMap();
	ctx.on("agent/created", ({ agent }) => {
		try {
			if (registeredAgents.has(agent)) return;
			registeredAgents.set(agent, true);
			const sessionId = agent.session?.id ?? "";
			registrations.push(registerShadowForCtx(agent.ctx, () => sessionShadowedNames(scope, dshHome, agentsHome, sessionId)));
		} catch (error) {
			ctx.logger.warn("[skillforge] agent shadow provider registration skipped:", error);
		}
	});
	const writer = {
		getDisabled: () => readDisabledMap(scope),
		writeDisabled: (map) => ctx.settings.update(ns, { disabled: map }),
		unsetDisabled: (name) => ctx.settings.mutate(ns, [{
			op: "unset",
			path: ["disabled", name]
		}])
	};
	const mcp = new McpManager(ctx, stateDir);
	ctx.effect(() => {
		mcp.start().catch((error) => {
			ctx.logger.warn("[skillforge] MCP startup failed:", error);
		});
		return () => {
			mcp.dispose().catch(() => {});
		};
	});
	registerModelTools(ctx, () => readDisabledMap(scope));
	registerRoutes(ctx, writer, { invalidate: invalidateAll }, {
		dshHome,
		agentsHome,
		stateDir
	}, mcp, {
		get: () => scope.get(),
		update: (patch) => scope.update(patch),
		mutate: (ops) => ctx.settings.mutate(ns, ops)
	});
}
//#endregion
export { Config, apply, inject, name };
