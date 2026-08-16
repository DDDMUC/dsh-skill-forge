#!/usr/bin/env node
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { createHash } from "node:crypto";
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
/** Resolve the harness home: explicit override, then $DSH_HOME, then ~/.dsh. */
function resolveDshHome() {
	const override = process.env.DSH_HOME?.trim();
	if (override) return override;
	return join(homedir(), ".dsh");
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
//#endregion
//#region src/cli.ts
/**
* dsh-skillforge CLI — manage skills from the terminal.
*
* Commands:
*   list                          list skills (enabled state, source)
*   add <path>                    import a single .md or a SKILL.md bundle into ~/.dsh/skills
*   enable <name>                 enable a skill
*   disable <name>                disable a skill
*   delete <name>                 delete a skill (requires --yes)
*   check                         run the DSH-spec audit (state-driven fix)
*
* Enable/disable/check go through the dsh web HTTP API when the gateway is
* running (hot effect); otherwise they fall back to direct settings.yaml
* edits (effective on next gateway start).
*/
const API_BASE = "http://127.0.0.1:3080/plugins/skillforge/api";
async function isGatewayUp() {
	try {
		return (await fetch(`${API_BASE}/catalog`, { signal: AbortSignal.timeout(1500) })).ok;
	} catch {
		return false;
	}
}
async function api(path, init) {
	const res = await fetch(API_BASE + path, {
		headers: { "content-type": "application/json" },
		...init
	});
	const body = await res.json();
	if (!body.ok) throw new Error(body.error ?? `request failed (${res.status})`);
	return body.data;
}
function fail(message) {
	console.error(`error: ${message}`);
	process.exit(1);
}
/** Direct settings.yaml edit (gateway down): manage the skillforge.disabled section. */
async function toggleViaSettings(name, enabled) {
	const settingsPath = join(resolveDshHome(), "settings.yaml");
	let text = "";
	try {
		text = await readFile(settingsPath, "utf8");
	} catch {}
	const lines = text.split(/\r?\n/);
	const out = [];
	let inSkillforge = false;
	let inDisabled = false;
	let written = false;
	for (const line of lines) {
		if (/^skillforge:/.test(line)) inSkillforge = true;
		else if (inSkillforge && /^\S/.test(line)) inSkillforge = false;
		if (inSkillforge && /^  disabled:/.test(line)) inDisabled = true;
		else if (inDisabled && /^  \S/.test(line)) inDisabled = false;
		if (inDisabled && new RegExp(`^    ${escapeRe(name)}:`).test(line)) {
			if (enabled) continue;
			written = true;
			out.push(line);
			continue;
		}
		out.push(line);
	}
	if (!enabled && !written) {
		const hasSection = text.includes("skillforge:");
		const hasDisabled = text.includes("disabled:");
		const indent = hasSection ? hasDisabled ? "    " : "  " : "";
		out.push(`${hasSection ? "" : "skillforge:"}`, `${hasSection ? hasDisabled ? "" : "  disabled:" : "  disabled:"}`, `${indent}${name}:`, `${indent}  disabledAt: ${Date.now()}`);
	}
	await writeFile(settingsPath, out.join("\n"), "utf8");
}
function escapeRe(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function cmdList() {
	if (await isGatewayUp()) {
		const catalog = await api("/catalog");
		for (const skill of catalog.skills) {
			const state = skill.enabled ? "enabled " : "disabled";
			console.log(`${state.padEnd(9)} ${skill.name.padEnd(28)} [${skill.source}] ${skill.description.slice(0, 60)}`);
		}
		return;
	}
	const dshHome = resolveDshHome();
	const agentsHome = process.env.DSH_AGENTS_HOME || join(homedir(), ".agents");
	for (const entry of await listUserSkillEntries(dshHome, agentsHome)) console.log(`${"enabled ".padEnd(9)} ${entry.name.padEnd(28)} [${entry.source}] ${entry.path}`);
}
async function cmdAdd(path) {
	const dshHome = resolveDshHome();
	const targetRoot = join(dshHome, "skills");
	let skillPath;
	let name;
	let source;
	try {
		if ((await stat(path)).isDirectory()) {
			skillPath = join(path, "SKILL.md");
			const parent = path.replace(/[\\/]+$/, "");
			name = parent.slice(parent.lastIndexOf("\\") + 1, parent.length);
			source = await readFile(skillPath, "utf8");
		} else {
			if (!path.endsWith(".md")) fail("only .md files or SKILL.md bundles are accepted");
			skillPath = path;
			name = path.slice(path.lastIndexOf("\\") + 1, path.length - 3);
			source = await readFile(path, "utf8");
		}
	} catch {
		fail(`cannot read ${path}`);
	}
	if (!isSkillName(name)) fail(`"${name}" is not a valid kebab-case skill name`);
	const parsed = parseFrontmatter(source);
	if (!parsed) fail("file has no YAML frontmatter (must start with ---)");
	if (!parsed.fm.description) fail("frontmatter missing description");
	isAbsolute(targetRoot) && join(targetRoot, name, "SKILL.md");
	await createSkill({
		dshHome,
		agentsHome: process.env.DSH_AGENTS_HOME || join(homedir(), ".agents")
	}, {
		name,
		description: parsed.fm.description ?? "",
		whenToUse: parsed.fm.whenToUse,
		content: parsed.body
	});
	console.log(`added ${name} -> ~/.dsh/skills/${name}/`);
}
async function cmdToggle(name, enabled) {
	if (!isSkillName(name)) fail(`"${name}" is not a valid skill name`);
	if (await isGatewayUp()) {
		await api("/toggle", {
			method: "POST",
			body: JSON.stringify({
				name,
				enabled
			})
		});
		console.log(`${enabled ? "enabled" : "disabled"} ${name} (hot)`);
	} else {
		await toggleViaSettings(name, enabled);
		console.log(`${enabled ? "enabled" : "disabled"} ${name} (settings.yaml, effective on next gateway start)`);
	}
}
async function cmdDelete(name, yes) {
	if (!yes) fail(`deleting "${name}" requires --yes`);
	if (!await isGatewayUp()) fail("gateway is down; deletion requires the running dsh web");
	await api("/delete", {
		method: "POST",
		body: JSON.stringify({ name })
	});
	console.log(`deleted ${name}`);
}
async function cmdCheck() {
	const dshHome = resolveDshHome();
	const result = await auditRoots(dshHome, process.env.DSH_AGENTS_HOME || join(homedir(), ".agents"), join(dshHome, "skillforge"));
	console.log(`checked: ${result.checked.length}  fixed: ${result.fixed.length}  skipped: ${result.skipped.length}`);
	for (const name of result.fixed) console.log(`  fixed: ${name}`);
	for (const entry of result.errors) console.error(`  error: ${entry.name}: ${entry.error}`);
}
const [, , command, ...args] = process.argv;
switch (command) {
	case "list":
		cmdList().catch((error) => fail(error instanceof Error ? error.message : String(error)));
		break;
	case "add":
		if (!args[0]) fail("usage: dsh-skillforge add <path>");
		cmdAdd(args[0]).catch((error) => fail(error instanceof Error ? error.message : String(error)));
		break;
	case "enable":
		if (!args[0]) fail("usage: dsh-skillforge enable <name>");
		cmdToggle(args[0], true).catch((error) => fail(error instanceof Error ? error.message : String(error)));
		break;
	case "disable":
		if (!args[0]) fail("usage: dsh-skillforge disable <name>");
		cmdToggle(args[0], false).catch((error) => fail(error instanceof Error ? error.message : String(error)));
		break;
	case "delete":
		if (!args[0]) fail("usage: dsh-skillforge delete <name> --yes");
		cmdDelete(args[0], args.includes("--yes")).catch((error) => fail(error instanceof Error ? error.message : String(error)));
		break;
	case "check":
		cmdCheck().catch((error) => fail(error instanceof Error ? error.message : String(error)));
		break;
	default:
		console.log([
			"dsh-skillforge — manage DSH skills from the terminal",
			"",
			"usage:",
			"  dsh-skillforge list",
			"  dsh-skillforge add <path>",
			"  dsh-skillforge enable <name>",
			"  dsh-skillforge disable <name>",
			"  dsh-skillforge delete <name> --yes",
			"  dsh-skillforge check"
		].join("\n"));
		process.exit(command ? 1 : 0);
}
//#endregion
export {};
