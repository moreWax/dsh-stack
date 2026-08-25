# @morewax/dsh-stack

The moreWax agent stack for DeepSeek Harness — **one install** for memory,
knowledge, remote execution, and MCP management.

## Install

```bash
dsh plugin add @morewax/dsh-stack
npx @morewax/dsh-stack init        # guided y/n setup
```

The package's peer dependencies pull the five leaf plugins automatically
(npm and pnpm both auto-install peers). The `init` walks a y/n checkup and
writes only the rows you choose into `~/.dsh/profiles/<profile>/cordis.patch.yml`
— idempotent, safe to re-run.

## What's in the stack

| Plugin | What it does |
|---|---|
| `@morewax/dsh-prime-memory` | Prime Agent bridge: durable memory injection + refine turn export |
| `@morewax/dsh-okf-knowledge` | OKF/OpenWiki knowledge pages as provenance-gated skills |
| `@morewax/dsh-remote-exec` | Run the agent's shell + files on your server (ssh / mosh / sam) |
| `@morewax/dsh-mcp-client` | MCP bridge on the 2026-07-28 stateless protocol (v2 SDK) |
| `@morewax/dsh-mcp-manager` | A `+` button by the composer for MCP servers, keys in the credential store |

Every leaf also installs and works **independently** — the stack is a
convenience, not a coupling:

```bash
dsh plugin add @morewax/dsh-remote-exec   # just this one, if that's all you want
```

## Init example

```
$ npx @morewax/dsh-stack init
dsh-stack init — profile "default" (~/.dsh/profiles/default/cordis.patch.yml)

Prime Agent memory bridge (memory injection + refine export)? [y/N] y
OKF knowledge pages as provenance-gated skills? [y/N] y
Remote execution (run the agent's shell + files on your server)? [y/N] y
  driver (ssh/mosh/sam) [ssh]: ssh
  host: box-1
  user [xor]: xor
  remote workdir [~/remote-work]: /srv/work
MCP manager UI (+ button by the composer for MCP servers)? [y/N] y

  + prime-memory
  + okf-knowledge
  + remote-exec
  + mcp-manager

4 row(s) written — restart dsh (or let HMR pick up the change) and the stack is live.
```

Secrets are never written into config: anything sensitive rides the managed
credential store / env references, per the dsh credential doctrine.

## Development

```bash
pnpm install     # resolves the (unpublished) leaves from local checkouts via
                 # pnpm-workspace.yaml overrides — adjust paths if your
                 # checkouts live elsewhere
pnpm test        # 9 tests: row renderers, validation, idempotent append
npx tsc -p tsconfig.json --noEmit
```

## License

MIT
