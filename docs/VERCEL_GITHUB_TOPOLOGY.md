# Vercel ↔ GitHub Runtime Topology

This document records the observed deployment topology for the current APΩ / HyperAI stack. It is intentionally descriptive: it does not change runtime behavior, environment variables, aliases, domains, or production routing.

## Canonical projects

| Vercel project | Role | Git source | Notes |
| --- | --- | --- | --- |
| `hyperai-user-control-system` | Public control surface and proxy layer | `Copilot-home/hyperai-user-control-system` | Vite frontend plus backend/API integration. Production API proxy expects a live upstream gateway through runtime configuration. |
| `my-project` | Legacy Git-linked control/runtime surface | `NguyenCuong1989/trust_of_copilot-c8aae4ab` | Historical project name. Keep until references and aliases are fully audited before any rename. |
| `vercel-function-runtime` | Serverless/runtime snapshot | direct/CLI/API deployment lineage | Contains APΩ runtime artifacts, Telegram dispatch/readback, MCP mesh, orchestration workflows and event/system logs. Treat as a preserved runtime/evidence surface. |
| `agentops-hub-plugin` | Operations/observability surface | deployment snapshot | Read-oriented operations console for connector/runtime state. |
| `workspace-ai-control-plane-staging-full-contract` | Staging control-plane contract | deployment snapshot | Staging artifact; preserve while lineage is being normalized. |
| `workspace-ai-control-plane-staging-probe` | Staging/probe surface | deployment snapshot | Probe artifact; preserve while lineage is being normalized. |
| `gpt-execution-canvas` | Execution UI/canvas surface | deployment snapshot | Preserve until usage and caller references are fully mapped. |
| `vite-react` | Git-linked frontend lineage | `Copilot-home/vite-react` | Separate Git-linked Vite lineage. |

## Source-of-truth policy

1. GitHub is the canonical source for committed code.
2. A Vercel deployment may contain a newer or different local/CLI snapshot than GitHub; therefore deployment source trees must be preserved until compared with Git history.
3. Production aliases, environment variables, domains, protection settings and upstream addresses must not be changed merely for cosmetic cleanup.
4. Renames are deferred until all hard-coded project names, aliases, callback URLs, webhooks, Telegram routes and automation references are proven absent or migrated.
5. New structural cleanup should land through a branch/PR first and use Preview deployments before touching Production.

## Current architecture model

```text
GitHub repositories
    |
    +-- Copilot-home/hyperai-user-control-system
    |       |
    |       +--> Vercel: hyperai-user-control-system
    |                 |
    |                 +--> public UI / API proxy
    |                 +--> configured live upstream gateway
    |
    +-- NguyenCuong1989/trust_of_copilot-c8aae4ab
    |       |
    |       +--> Vercel: my-project
    |       +--> local/CLI/API lineage --> vercel-function-runtime
    |                                     |
    |                                     +--> Telegram dispatch/readback
    |                                     +--> MCP mesh
    |                                     +--> APΩ runtime artifacts
    |                                     +--> orchestration workflows
    |
    +-- Copilot-home/vite-react
            |
            +--> Vercel: vite-react
```

## Cleanup classes

### Keep active
- Git-linked projects with current production deployments.
- Runtime projects with recent production deployments or runtime dependencies.
- Any deployment containing source files not yet represented in GitHub.

### Normalize later
- Generic historical names such as `my-project`.
- Duplicate staging/probe names after caller/reference discovery.
- Direct-deploy runtime projects after their exact source snapshot has been committed and reproducibly deployed from Git.

### Never delete during cosmetic cleanup
- Production aliases/domains.
- Environment variables or approval tokens.
- Runtime snapshots that contain uncommitted source.
- Workflow, Telegram, MCP, redirect or gateway surfaces until dependency mapping is complete.

## Preferred release flow

```text
feature/cleanup branch
      -> GitHub PR
      -> Vercel Preview
      -> tests + smoke checks
      -> merge reviewed commit
      -> Git-linked Production deployment
```

Direct production deployment remains valid for runtime recovery or preserved CLI/API lineage, but it should be documented with the source commit/snapshot identity whenever possible.

## Next normalization targets

- Map every Vercel project to exact Git commit or deployment snapshot.
- Compare `vercel-function-runtime` deployment files against GitHub and commit any unique source intentionally worth preserving.
- Audit hard-coded Vercel hostnames and project names before renaming `my-project`.
- Record Telegram webhook/callback and MCP references to deployment aliases.
- Establish one human-readable architecture index while keeping runtime policy permissive and non-blocking.
