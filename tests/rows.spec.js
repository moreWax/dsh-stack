import { describe, expect, it } from 'vitest'
import {
  primeMemoryRow, okfKnowledgeRow, remoteExecRow, mcpManagerRow, specPtcRow, appendRows,
} from '../src/rows.js'

describe('row renderers', () => {
  it('renders the prime-memory row', () => {
    const row = primeMemoryRow()
    expect(row).toContain('- id: prime-memory')
    expect(row).toContain("name: '@morewax/dsh-prime-memory'")
  })

  it('renders the okf-knowledge row with the provenance gate on', () => {
    const row = okfKnowledgeRow()
    expect(row).toContain('- id: okf-knowledge')
    expect(row).toContain('verifiedOnly: true')
  })

  it('renders the mcp-manager row zero-config', () => {
    const row = mcpManagerRow()
    expect(row).toContain('- id: mcp-manager')
    expect(row).not.toContain('config:')
  })

  it('renders a remote-exec row for each driver', () => {
    for (const driver of /** @type {const} */ (['ssh', 'mosh', 'sam'])) {
      const row = remoteExecRow({ driver, host: 'box-1', user: 'xor', root: '~/work' })
      expect(row).toContain(`driver: ${driver}`)
      expect(row).toContain('host: box-1')
      expect(row).toContain('user: xor')
      expect(row).toContain('root: ~/work')
    }
  })

  it('rejects invalid remote parameters', () => {
    expect(() => remoteExecRow({ driver: 'ssh', host: 'bad host', user: 'xor', root: '/x' }))
      .toThrow('invalid remote host')
    expect(() => remoteExecRow({ driver: 'ssh', host: 'h', user: 'bad;user', root: '/x' }))
      .toThrow('invalid remote user')
    expect(() => remoteExecRow({ driver: 'ssh', host: 'h', user: 'u', root: 'relative/path' }))
      .toThrow('remote root must be absolute')
  })

  it('renders the spec-ptc row fail-open with autoStart on', () => {
    const row = specPtcRow()
    expect(row).toContain('- id: code-runtime')
    expect(row).toContain('disabled: true')
    expect(row).toContain('- id: spec-ptc')
    expect(row).toContain("name: '@morewax/dsh-spec-ptc'")
    expect(row).toContain('autoStart: true')
  })

  it('never renders secrets into rows', () => {
    const rows = [primeMemoryRow(), okfKnowledgeRow(), mcpManagerRow(), specPtcRow(),
      remoteExecRow({ driver: 'sam', host: 'mesh-peer', user: 'xor', root: '/srv' })]
    for (const row of rows) {
      expect(row).not.toMatch(/password|token|secret|key:/i)
    }
  })
})

describe('appendRows', () => {
  it('appends to an empty file', () => {
    const { contents, added } = appendRows('', [mcpManagerRow()])
    expect(added).toEqual(['mcp-manager'])
    expect(contents).toContain('- id: mcp-manager')
  })

  it('is idempotent: existing ids are skipped, never duplicated', () => {
    const first = appendRows('', [mcpManagerRow(), primeMemoryRow()])
    const second = appendRows(first.contents, [mcpManagerRow(), okfKnowledgeRow()])
    expect(second.added).toEqual(['okf-knowledge'])
    expect(second.skipped).toEqual(['mcp-manager'])
    expect(second.contents.match(/- id: mcp-manager/g)?.length).toBe(1)
  })

  it('separates appended rows with a blank line', () => {
    const { contents } = appendRows('', [mcpManagerRow(), primeMemoryRow()])
    expect(contents).toContain("\n\n- id: prime-memory")
  })
})
