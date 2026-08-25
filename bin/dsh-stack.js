#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, env } from 'node:process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { StackInitializer } from '../src/initializer.js'

/** @type {(question:string)=>Promise<string>} */ let askRaw
/** @type {()=>void} */ let closeInput
if (stdin.isTTY) {
  const rl = createInterface({ input: stdin, output: stdout })
  askRaw = question => rl.question(question); closeInput = () => rl.close()
} else {
  const chunks = []; for await (const chunk of stdin) chunks.push(chunk)
  const queue = Buffer.concat(chunks).toString('utf8').split('\n')
  askRaw = question => { stdout.write(question); return Promise.resolve((queue.shift() ?? '').trim()) }
  closeInput = () => {}
}
try {
  await new StackInitializer({ home: env.DSH_HOME ?? join(homedir(), '.dsh'), profile: process.argv[2] ?? 'default', askRaw, log: line => console.log(line ?? ''), user: env.USER ?? '' }).run()
} finally { closeInput() }
