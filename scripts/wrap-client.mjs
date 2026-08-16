/**
 * Post-build wrapper: turns tsdown's CJS client output into the browser
 * module-loader bundle format the dsh web shell expects:
 *
 *   window.__ModuleLoader__.load({ id, factory: (require) => { ...cjs body...; return module.exports; } })
 *
 * Mirrors the dsh-web-ui family's published client.js shape.
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const pkgName = pkg.name

const cjsPath = new URL('../lib/client.cjs', import.meta.url)
const outPath = new URL('../lib/client.js', import.meta.url)

const body = readFileSync(cjsPath, 'utf8')
const indented = body.split('\n').map((line) => '\t\t' + line).join('\n')
const wrapped = [
  'window.__ModuleLoader__.load({',
  '\tid: ' + JSON.stringify(pkgName) + ',',
  '\tfactory: (require) => {',
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  indented,
  '\t\treturn module.exports;',
  '\t}',
  '});',
  '',
].join('\n')

writeFileSync(outPath, wrapped, 'utf8')
rmSync(cjsPath, { force: true })
console.log('[wrap-client] wrote lib/client.js (' + wrapped.length + ' bytes)')
