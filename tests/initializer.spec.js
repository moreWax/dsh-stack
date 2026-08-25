// @ts-nocheck
import { describe, expect, it, vi } from 'vitest'
import { StackInitializer } from '../src/initializer.js'

function fixture(answers, initial = '') {
  let contents = initial
  const logs = []; const fs = {
    existsSync: vi.fn(() => contents !== ''), mkdirSync: vi.fn(), readFileSync: vi.fn(() => contents),
    writeFileSync: vi.fn((_path, value) => { contents = value }),
  }
  const init = new StackInitializer({ home: '/tmp/dsh', profile: 'work', askRaw: vi.fn(async () => answers.shift() ?? ''), log: line => logs.push(line ?? ''), user: 'alice', fs, probe: () => ({}) })
  return { init, fs, logs, contents: () => contents }
}

describe('StackInitializer characterization', () => {
  it('preserves prompt order and writes selected models', async () => {
    const x = fixture(['y', 'n', 'y', 'ssh', 'host-1', '', '/srv/work', 'y', 'n', 'n'])
    const result = await x.init.run()
    expect(result.added).toEqual(['prime-memory', 'remote-exec', 'mcp-manager'])
    expect(x.init.options.askRaw.mock.calls.map(call => call[0])).toEqual([
      'Prime Agent memory bridge (memory injection + refine export)? [y/N] ',
      'OKF knowledge pages as provenance-gated skills? [y/N] ',
      "Remote execution (run the agent's shell + files on your server)? [y/N] ",
      '  driver (ssh/mosh) [ssh]: ', '  host: ', '  user [alice]: ',
      '  remote workdir [~/remote-work]: ',
      'MCP manager UI (+ button by the composer for MCP servers)? [y/N] ',
      'SAM agent mesh (tools, inference, durable tasks; no SSH required)? [y/N] ',
      'Speculative tool calling (pre-runs tool calls during generation)? [y/N] ',
    ])
    expect(x.contents()).toContain('user: alice')
  })

  it('makes no filesystem changes when nothing is selected', async () => {
    const x = fixture(['n', 'n', 'n', 'n', 'n', 'n'])
    expect(await x.init.run()).toEqual({ added: [], skipped: [] })
    expect(x.fs.writeFileSync).not.toHaveBeenCalled()
  })

  it('is idempotent across initializer runs', async () => {
    const first = fixture(['y', 'n', 'n', 'y', 'n', 'n']); await first.init.run()
    const second = fixture(['y', 'n', 'n', 'y', 'n'], first.contents())
    const result = await second.init.run()
    expect(result.added).toEqual([]); expect(result.skipped).toEqual(['prime-memory', 'mcp-manager'])
    expect(second.contents()).toBe(first.contents())
  })
})
