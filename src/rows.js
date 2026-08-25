/**
 * Declarative stack row models and compatibility render helpers.
 * Secrets are intentionally absent: stack config contains only non-sensitive
 * settings and credential-store/environment references.
 */

/** @typedef {'ssh' | 'mosh' | 'sam'} Driver */

/** Render a small YAML subset from nested objects/arrays. */
/** @param {unknown} value @returns {string} */
function scalar(value) {
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value) && value.length === 0) return '[]'
  const text = String(value)
  return /^[A-Za-z0-9_./~@-]+$/.test(text) && !text.startsWith('@') ? text : `'${text.replaceAll("'", "''")}'`
}

/** @param {unknown} value @param {number} indent @returns {string} */
function yaml(value, indent = 0) {
  const pad = ' '.repeat(indent)
  if (Array.isArray(value)) return value.map(item => {
    if (item !== null && typeof item === 'object') {
      const lines = yaml(item, indent + 2).split('\n')
      return `${pad}- ${(lines[0] ?? '').trimStart()}\n${lines.slice(1).join('\n')}`.trimEnd()
    }
    return `${pad}- ${scalar(item)}`
  }).join('\n')
  return Object.entries(/** @type {Record<string, unknown>} */ (value)).map(([key, item]) => {
    if ((Array.isArray(item) && item.length > 0) || (item !== null && typeof item === 'object' && !Array.isArray(item))) {
      return `${pad}${key}:\n${yaml(item, indent + 2)}`
    }
    return `${pad}${key}: ${scalar(item)}`
  }).join('\n')
}

export class StackRow {
  /** @param {string[]} ids @param {Record<string, unknown> | Array<unknown>} document */
  constructor(ids, document) { this.ids = Object.freeze([...ids]); this.document = document }
  render() { return yaml(this.document) }
}

/** @param {string} id @param {string} name @param {Record<string, unknown>=} config */
const plugin = (id, name, config) => new StackRow([id], [{ id, name, ...(config === undefined ? {} : { config }) }])

export const ROWS = Object.freeze({
  primeMemory: () => plugin('prime-memory', '@morewax/dsh-prime-memory', { primeHome: '~/.prime/agent', serveSkills: true, injectMemory: true }),
  okfKnowledge: () => plugin('okf-knowledge', '@morewax/dsh-okf-knowledge', { verifiedOnly: true }),
  mcpManager: () => plugin('mcp-manager', '@morewax/dsh-mcp-manager'),
  agentMesh: () => plugin('agent-mesh', '@morewax/dsh-agent-mesh', { socketPath: '~/.config/sam-mesh/sam.sock', tcpUrl: 'http://127.0.0.1:8080', preferSocket: true }),
  specPtc: () => new StackRow(['code-runtime', 'code-runtime-python-uv', 'spec-ptc'], [
    { id: 'code-runtime', disabled: true },
    { insert: [
      { id: 'code-runtime-python-uv', name: '@morewax/dsh-spec-ptc/python-runtime', config: { uv: 'uv', python: '3.12' } },
      { id: 'spec-ptc', name: '@morewax/dsh-spec-ptc', config: { socketPath: '/tmp/spec-ptc.sock', autoStart: true, feedEnabled: true, engine: 'dsh', uvBin: 'uv', translateRunCode: true, wrapRegistry: true, speculatableTools: [] } },
    ] },
  ]),
})

export class RemoteExecConfig {
  /** @param {{driver: Driver, host: string, user: string, root: string}} value */
  constructor(value) {
    /** @type {Driver} */ this.driver = value.driver
    /** @type {string} */ this.host = value.host
    /** @type {string} */ this.user = value.user
    /** @type {string} */ this.root = value.root
    if (!['ssh', 'mosh', 'sam'].includes(value.driver)) throw new Error(`invalid remote driver: ${value.driver}`)
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(value.user)) throw new Error(`invalid remote user: ${value.user}`)
    if (value.host.trim() === '' || /\s/.test(value.host)) throw new Error(`invalid remote host: ${value.host}`)
    if (!value.root.startsWith('/') && !value.root.startsWith('~')) throw new Error(`remote root must be absolute or ~-relative: ${value.root}`)
  }
  row() { return plugin('remote-exec', '@morewax/dsh-remote-exec', { driver: this.driver, host: this.host, user: this.user, root: this.root }) }
}

export const primeMemoryRow = () => ROWS.primeMemory().render()
export const okfKnowledgeRow = () => ROWS.okfKnowledge().render()
export const mcpManagerRow = () => ROWS.mcpManager().render()
export const agentMeshRow = () => ROWS.agentMesh().render()
export const specPtcRow = () => ROWS.specPtc().render()
/** @param {{driver: Driver, host: string, user: string, root: string}} cfg */
export const remoteExecRow = cfg => new RemoteExecConfig(cfg).row().render()

export const STACK_ROW_IDS = Object.freeze(['prime-memory', 'okf-knowledge', 'remote-exec', 'mcp-manager', 'agent-mesh', 'code-runtime', 'code-runtime-python-uv', 'spec-ptc'])

/** @param {string} text */
const idsIn = text => [...text.matchAll(/^\s*- id: ([^\s#]+).*$/gm)].map(match => match[1]).filter(id => id !== undefined)
/**
 * Append rendered rows, skipping a whole row block if any of its ids exists.
 * Accepts StackRow models or strings for backwards compatibility.
 * @param {string} existing @param {(StackRow|string)[]} rows
 */
export function appendRows(existing, rows) {
  const present = new Set(idsIn(existing)); const added = []; const skipped = []; let contents = existing
  for (const candidate of rows) {
    const row = typeof candidate === 'string' ? new StackRow(idsIn(candidate), {}) : candidate
    const duplicate = row.ids.find(id => present.has(id))
    if (duplicate !== undefined) { skipped.push(duplicate); continue }
    const rendered = typeof candidate === 'string' ? candidate : candidate.render()
    contents = contents === '' ? `${rendered}\n` : `${contents.trimEnd()}\n\n${rendered}\n`
    if (row.ids[0] !== undefined) added.push(row.ids[0]); row.ids.forEach(id => present.add(id))
  }
  return { contents, added, skipped }
}
