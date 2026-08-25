/**
 * @morewax/dsh-stack: the moreWax agent stack, one install.
 *
 * This package carries no runtime logic of its own — its peer dependencies
 * pull the five leaf plugins (@morewax/dsh-prime-memory, dsh-okf-knowledge,
 * dsh-remote-exec, dsh-mcp-client, dsh-mcp-manager) and its cordis.patch.yml
 * ships the default rows. Run `npx @morewax/dsh-stack init` for the guided
 * y/n setup that writes the configured rows (remote host, drivers, ...) into
 * your profile.
 *
 * @module @morewax/dsh-stack
 */

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh-stack'

/**
 * No-op apply: the leaves do all the work. Kept so the package is a
 * well-formed plugin for any loader path that requires an entry point.
 */
export function apply() {}

export { StackInitializer } from './initializer.js'
export { StackRow, RemoteExecConfig, ROWS, appendRows } from './rows.js'
