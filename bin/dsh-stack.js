#!/usr/bin/env node
/**
 * dsh-stack init: guided y/n checkup that writes the moreWax agent stack
 * into your dsh profile's cordis.patch.yml. Idempotent — rows already
 * present are skipped, never duplicated.
 */
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, env } from 'node:process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  primeMemoryRow, okfKnowledgeRow, remoteExecRow, mcpManagerRow, specPtcRow, appendRows,
} from '../src/rows.js'

const DSH_HOME = env.DSH_HOME ?? join(homedir(), '.dsh')
const profile = process.argv[2] ?? 'default'
const profileDir = join(DSH_HOME, 'profiles', profile)
const patchFile = join(profileDir, 'cordis.patch.yml')

// Piped stdin delivers every line before the first question() attaches its
// listener, silently losing answers — so when stdin is not a TTY we buffer
// all of it up front and answer from the queue. TTYs get real prompts.
/** @type {(q: string) => Promise<string>} */
let askRaw
/** @type {() => void} */
let closeInput
if (stdin.isTTY) {
  const rl = createInterface({ input: stdin, output: stdout })
  askRaw = (q) => rl.question(q)
  closeInput = () => rl.close()
} else {
  const chunks = []
  for await (const chunk of stdin) chunks.push(chunk)
  const queue = Buffer.concat(chunks).toString('utf8').split('\n')
  askRaw = (q) => {
    stdout.write(q)
    return Promise.resolve((queue.shift() ?? '').trim())
  }
  closeInput = () => {}
}

/** @param {string} question */
async function ask(question) {
  const answer = (await askRaw(`${question} [y/N] `)).trim().toLowerCase()
  return answer === 'y' || answer === 'yes'
}

/** @param {string} question @param {string} fallback */
async function askText(question, fallback) {
  const answer = (await askRaw(`${question}${fallback ? ` [${fallback}]` : ''}: `)).trim()
  return answer === '' ? fallback : answer
}

console.log(`dsh-stack init — profile "${profile}" (${patchFile})\n`)

const rows = []
try {
  if (await ask('Prime Agent memory bridge (memory injection + refine export)?')) {
    rows.push(primeMemoryRow())
  }
  if (await ask('OKF knowledge pages as provenance-gated skills?')) {
    rows.push(okfKnowledgeRow())
  }
  if (await ask('Remote execution (run the agent\'s shell + files on your server)?')) {
    const driver = await askText('  driver (ssh/mosh/sam)', 'ssh')
    if (!['ssh', 'mosh', 'sam'].includes(driver)) {
      console.error(`unknown driver "${driver}" — skipping remote execution`)
    } else {
      const host = await askText('  host', '')
      const user = await askText('  user', env.USER ?? '')
      const root = await askText('  remote workdir', '~/remote-work')
      rows.push(remoteExecRow({ driver: /** @type {'ssh' | 'mosh' | 'sam'} */ (driver), host, user, root }))
    }
  }
  if (await ask('MCP manager UI (+ button by the composer for MCP servers)?')) {
    rows.push(mcpManagerRow())
  }
  if (await ask('Speculative tool calling (pre-runs tool calls during generation)?')) {
    const probe = spawnSync('spec-ptc-daemon', ['--help'], { stdio: 'ignore' })
    if (probe.error !== undefined) {
      console.log('  spec-ptc daemon not found on PATH.')
      if (await ask('  Install it now? (pip install spec-ptc)')) {
        const install = spawnSync('pip', ['install', 'spec-ptc'], { stdio: 'inherit' })
        if (install.status !== 0) {
          console.log('  pip install failed — add the row anyway; the plugin fails open until the daemon exists.')
        }
      } else {
        console.log('  skipped install — the plugin fails open until the daemon exists.')
      }
    } else {
      console.log('  spec-ptc daemon found.')
    }
    // Must precede tool providers: Phase 2 wraps future ctx.tools.register calls.
    rows.unshift(specPtcRow())
  }
} finally {
  closeInput()
}

if (rows.length === 0) {
  console.log('\nNothing selected — no changes made.')
  process.exit(0)
}

mkdirSync(profileDir, { recursive: true })
const existing = existsSync(patchFile) ? readFileSync(patchFile, 'utf8') : ''
const { contents, added, skipped } = appendRows(existing, rows)
writeFileSync(patchFile, contents)

console.log('')
for (const id of added) console.log(`  + ${id}`)
for (const id of skipped) console.log(`  = ${id} (already present, skipped)`)
console.log(`\n${added.length} row(s) written to ${patchFile}`)
if (added.length > 0) {
  console.log('Restart dsh (or let HMR pick up the change) and the stack is live.')
}
