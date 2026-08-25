/**
 * Row renderers for the stack init: pure functions from chosen capabilities
 * to cordis.patch.yml rows. Secrets are never rendered — config carries
 * references (process.env.*) only, per the dsh credential doctrine.
 */

/** @typedef {'ssh' | 'mosh' | 'sam'} Driver */

export function primeMemoryRow() {
  return [
    '- id: prime-memory',
    "  name: '@morewax/dsh-prime-memory'",
    '  config:',
    '    primeHome: ~/.prime/agent',
    '    serveSkills: true',
    '    injectMemory: true',
  ].join('\n')
}

export function okfKnowledgeRow() {
  return [
    '- id: okf-knowledge',
    "  name: '@morewax/dsh-okf-knowledge'",
    '  config:',
    '    verifiedOnly: true',
  ].join('\n')
}

/** @param {{driver: Driver, host: string, user: string, root: string}} cfg */
export function remoteExecRow(cfg) {
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(cfg.user)) {
    throw new Error(`invalid remote user: ${cfg.user}`)
  }
  if (cfg.host.trim() === '' || /\s/.test(cfg.host)) {
    throw new Error(`invalid remote host: ${cfg.host}`)
  }
  if (!cfg.root.startsWith('/') && !cfg.root.startsWith('~')) {
    throw new Error(`remote root must be absolute or ~-relative: ${cfg.root}`)
  }
  return [
    '- id: remote-exec',
    "  name: '@morewax/dsh-remote-exec'",
    '  config:',
    `    driver: ${cfg.driver}`,
    `    host: ${cfg.host}`,
    `    user: ${cfg.user}`,
    `    root: ${cfg.root}`,
  ].join('\n')
}

export function specPtcRow() {
  return [
    '- id: code-runtime',
    '  disabled: true',
    '- insert:',
    '    - id: code-runtime-python-uv',
    "      name: '@morewax/dsh-spec-ptc/python-runtime'",
    '      config:',
    '        uv: uv',
    "        python: '3.12'",
    '    - id: spec-ptc',
    "      name: '@morewax/dsh-spec-ptc'",
    '      config:',
    '        socketPath: /tmp/spec-ptc.sock',
    '        autoStart: true',
    '        feedEnabled: true',
    '        engine: dsh',
    '        uvBin: uv',
    '        translateRunCode: true',
    '        wrapRegistry: true',
    '        speculatableTools: []',
  ].join('\n')
}

export function mcpManagerRow() {
  return [
    '- id: mcp-manager',
    "  name: '@morewax/dsh-mcp-manager'",
  ].join('\n')
}

/** All row ids the stack can write, for idempotency checks. */
export const STACK_ROW_IDS = ['prime-memory', 'okf-knowledge', 'remote-exec', 'mcp-manager', 'spec-ptc']

/**
 * Append rows to a patch file's contents, skipping ids already present.
 * @param {string} existing - current file contents ('' if none)
 * @param {string[]} rows - rendered rows to add
 * @returns {{contents: string, added: string[], skipped: string[]}}
 */
export function appendRows(existing, rows) {
  const added = []
  const skipped = []
  let contents = existing
  for (const row of rows) {
    const id = row.match(/^- id: (.+)$/m)?.[1]
    if (id !== undefined && existing.includes(`- id: ${id}\n`)) {
      skipped.push(id)
      continue
    }
    contents = contents === '' ? row + '\n' : contents.trimEnd() + '\n\n' + row + '\n'
    if (id !== undefined) added.push(id)
  }
  return { contents, added, skipped }
}
