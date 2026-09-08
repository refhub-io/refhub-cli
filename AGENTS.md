# RefHub CLI Agent Guide

Agent-facing guide for operating RefHub through the published `refhub` command-line interface. This file is about using the repo/tool as an agent runtime surface. Contribution process lives in `CONTRIBUTING.md`.

## When to use this guide

Use this when a user asks an agent to:

- list, read, search, or export RefHub vault content;
- add, update, import, or delete vault items;
- manage tags, relations, vault metadata, and shares through the CLI;
- curate a vault's sections or an item's featured/section state for its public Codex page (owner-only);
- scan a vault for citation-based relationship suggestions and create `cites` relations from the matches;
- enrich publication metadata or upload PDFs through supported CLI commands;
- verify CLI behavior from source before changing code.

Do not treat frontend-only or Supabase-only capabilities as CLI support. Check `README.md` and `refhub --help` before claiming a command exists.

## Execution layer

Prefer the installed CLI when available:

```sh
refhub --help
refhub vaults list
refhub items search --vault <vaultId> --query <text>
refhub export --vault <vaultId> --format json
```

If working from this repo, build or run the source according to `README.md` before testing behavior. Do not infer behavior from stale `dist/` output when source has changed.

## Authentication

Data routes use a RefHub API key:

```sh
export REFHUB_API_KEY=rhk_<publicId>_<secret>
```

Scopes are enforced by the backend. If the key is missing, invalid, expired, revoked, or lacks a needed scope, stop and ask for a suitable key. Do not retry writes with the same failing credential.

## Guardrails

- Never infer a `vault_id` from a vault name. Resolve it with `refhub vaults list`.
- Never assume a tag exists. List tags before writes that reference tag IDs.
- Never create tags implicitly during item writes. Tag creation is a separate operation.
- Never retry a bulk write after ambiguous failure unless the command supports and used an idempotency key.
- Never proceed with vault or item deletion without explicit user confirmation.
- Treat `tag_ids` replacement semantics as destructive enough to call out before updating.
- `items update --section`/`--unset-section`/`--featured`/`--unfeature`/`--featured-note` and all `sections` writes require vault owner access — an editor-role API key gets `403 insufficient_vault_access` even though it can update other item fields. Don't retry these with the same non-owner key.
- `relations scan` only proposes `cites` relations from citation-graph matches — it is not a substitute for `relations create` when the user means `extends`/`contradicts`/`related`/etc.
- Keep output machine-readable when the user or workflow asks for JSON.

## Error handling

Use CLI exit codes and stderr as the source of truth:

- `0`: success.
- `1`: API or runtime error.
- `2`: invalid arguments.
- `3`: auth error.

Report the failing command, exit code, and actionable cause. Avoid leaking API keys or bearer tokens in logs, screenshots, summaries, or issues.

## If code changes are requested

Switch to `CONTRIBUTING.md` before editing. That file covers branches, commits, verification, changelog entries, version bumps, and release behavior.
