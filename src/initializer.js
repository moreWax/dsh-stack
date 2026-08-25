import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { ROWS, RemoteExecConfig, appendRows } from './rows.js'

/** Stateful orchestration with injected IO, filesystem, and process probe. */
export class StackInitializer {
  /** @param {{home:string, profile:string, askRaw:(question:string)=>Promise<string>, log:(line?:string)=>void, user:string, fs?:{existsSync:Function,mkdirSync:Function,readFileSync:Function,writeFileSync:Function}, probe?:(command:string,args:string[])=>{error?:Error}}} options */
  constructor(options) {
    this.options = options
    this.fs = options.fs ?? { existsSync, mkdirSync, readFileSync, writeFileSync }
    this.probe = options.probe ?? ((command, args) => spawnSync(command, args, { stdio: 'ignore' }))
    this.profileDir = join(options.home, 'profiles', options.profile)
    this.patchFile = join(this.profileDir, 'cordis.patch.yml')
  }
  /** @param {string} question */
  async confirm(question) { return ['y', 'yes'].includes((await this.options.askRaw(`${question} [y/N] `)).trim().toLowerCase()) }
  /** @param {string} question @param {string} fallback */
  async text(question, fallback) {
    const answer = (await this.options.askRaw(`${question}${fallback ? ` [${fallback}]` : ''}: `)).trim()
    return answer === '' ? fallback : answer
  }
  async selectRows() {
    const rows = []
    if (await this.confirm('Prime Agent memory bridge (memory injection + refine export)?')) rows.push(ROWS.primeMemory())
    if (await this.confirm('OKF knowledge pages as provenance-gated skills?')) rows.push(ROWS.okfKnowledge())
    if (await this.confirm("Remote execution (run the agent's shell + files on your server)?")) {
      const driver = await this.text('  driver (ssh/mosh/sam)', 'ssh')
      if (!['ssh', 'mosh', 'sam'].includes(driver)) this.options.log(`unknown driver "${driver}" — skipping remote execution`)
      else rows.push(new RemoteExecConfig({ driver: /** @type {import('./rows.js').Driver} */ (driver), host: await this.text('  host', ''), user: await this.text('  user', this.options.user), root: await this.text('  remote workdir', '~/remote-work') }).row())
    }
    if (await this.confirm('MCP manager UI (+ button by the composer for MCP servers)?')) rows.push(ROWS.mcpManager())
    if (await this.confirm('Speculative tool calling (pre-runs tool calls during generation)?')) {
      this.options.log(this.probe('uv', ['--version']).error !== undefined
        ? '  uv not found on PATH — install uv first; spec-ptc fails open until then.'
        : '  uv found; spec-ptc installs its locked Python dependencies automatically.')
      rows.push(ROWS.specPtc())
    }
    return rows
  }
  async run() {
    this.options.log(`dsh-stack init — profile "${this.options.profile}" (${this.patchFile})\n`)
    const rows = await this.selectRows()
    if (rows.length === 0) { this.options.log('\nNothing selected — no changes made.'); return { added: [], skipped: [] } }
    this.fs.mkdirSync(this.profileDir, { recursive: true })
    const existing = this.fs.existsSync(this.patchFile) ? this.fs.readFileSync(this.patchFile, 'utf8') : ''
    const result = appendRows(existing, rows)
    this.fs.writeFileSync(this.patchFile, result.contents)
    this.options.log('')
    result.added.forEach(id => this.options.log(`  + ${id}`)); result.skipped.forEach(id => this.options.log(`  = ${id} (already present, skipped)`))
    this.options.log(`\n${result.added.length} row(s) written to ${this.patchFile}`)
    if (result.added.length > 0) this.options.log('Restart dsh (or let HMR pick up the change) and the stack is live.')
    return result
  }
}
