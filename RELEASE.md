# Release runbook

Publishing is **ordered**: the stack's peer dependencies must resolve from
npm, so the leaves go first.

## One-time setup

1. Create an npm granular access token (Automation, publish on `@morewax/*`).
2. Add it as the `NPM_TOKEN` secret on EVERY repo:
   ```bash
   for r in dsh-mcp-client dsh-mcp-manager dsh-remote-exec dsh-prime-agent dsh-spec-ptc dsh-agent-mesh dsh-stack; do
     gh secret set NPM_TOKEN --repo moreWax/$r
   done
   ```
3. Flip repos public when ready:
   ```bash
   for r in dsh-mcp-client dsh-mcp-manager dsh-remote-exec dsh-prime-agent dsh-spec-ptc dsh-agent-mesh dsh-stack; do
     gh repo edit moreWax/$r --visibility public --accept-visibility-change-consequences
   done
   ```

## Publish order (GitHub Release per repo, in this sequence)

| # | Repo | Packages |
|---|------|----------|
| 1 | `dsh-mcp-client` | `@morewax/dsh-mcp-client` |
| 2 | `dsh-remote-exec` | `@morewax/dsh-remote-exec` |
| 3 | `dsh-prime-agent` | `@morewax/dsh-prime-memory`, `dsh-okf-knowledge`, `dsh-prime-agent-init` (testkit is private) |
| 4 | `dsh-mcp-manager` | `@morewax/dsh-mcp-manager` |
| 5 | `dsh-spec-ptc` | `@morewax/dsh-spec-ptc` |
| 6 | `dsh-agent-mesh` | `@morewax/dsh-agent-mesh` |
| 7 | `dsh-stack` | `@morewax/dsh-stack` (LAST — peers must resolve) |

Each release triggers `.github/workflows/publish.yml`: install → typecheck →
test → build → `npm publish --provenance --access public`.

## Post-publish verification

```bash
npm view @morewax/dsh-stack version
npm view @morewax/dsh-mcp-client version
npm view @morewax/dsh-spec-ptc version
# install path smoke, in a scratch profile:
dsh plugin add @morewax/dsh-stack
npx @morewax/dsh-stack init
```

## Versioning

All packages start at 0.1.0, versioned independently per repo. The stack
bumps when its leaf set or init flow changes; leaf version bumps don't
require a stack release (peer ranges are `^`).
