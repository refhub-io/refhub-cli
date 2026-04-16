# RefHub CLI — Design Spec

**Date:** 2026-04-16
**Status:** Approved

---

## Overview

A thin TypeScript/Node CLI that acts as the execution layer for the RefHub agent skill. Agents load `refhub-skill/SKILL.md` to understand *what* to do and use the `refhub` CLI to *do* it. Covers the full v2 public API surface.

---

## Architecture

### Project structure

```
refhub-cli/
├── src/
│   ├── index.ts          # entry point, registers command groups
│   ├── client.ts         # RefHubClient class — all HTTP, auth, errors
│   ├── format.ts         # format(data, { table }) → JSON or table to stdout
│   ├── commands/
│   │   ├── vaults.ts     # vaults list/get/create/update/delete/visibility/shares
│   │   ├── items.ts      # items list/get/add/update/delete/upsert/preview/search/stats/changes
│   │   ├── tags.ts       # tags list/create/update/delete/attach/detach
│   │   ├── relations.ts  # relations list/create/update/delete
│   │   ├── import.ts     # import doi/bibtex/url
│   │   ├── export.ts     # export json/bibtex
│   │   └── audit.ts      # audit (vault-scoped)
│   └── types.ts          # API response shapes (from refhub-skill spec)
├── dist/                 # compiled output (tsc)
├── scripts/
│   └── smoke.ts          # live smoke test script
├── package.json          # "bin": { "refhub": "dist/index.js" }
└── tsconfig.json
```

### Dependencies

- `commander` — subcommand parsing, `--help` auto-generation
- `chalk` — terminal color for table output
- `cli-table3` — table rendering for `--table` mode
- `vitest` — unit tests
- `typescript`, `tsx` — build toolchain

### Installation

```bash
cd refhub-cli && npm install && npm run build && npm link
```

`npm link` makes `refhub` available globally without publishing to npm.

---

## Global flags

```
refhub [--api-key=<key>] [--table] [--version] [--help] <command> [subcommand] [options]
```

| Flag | Behaviour |
|------|-----------|
| `--api-key` | Overrides `REFHUB_API_KEY` env var |
| `--table` | Human-readable table output (default: JSON to stdout) |
| `--version` | Prints version from package.json |
| `--help` | Auto-generated on every command and subcommand |

**Key resolution order:** `--api-key` flag → `REFHUB_API_KEY` env var → fatal error (exit 3).

---

## Command surface

### Vaults

```
refhub vaults list
refhub vaults get <vaultId>
refhub vaults create --name <n> [--description] [--color] [--visibility] [--category]
refhub vaults update <vaultId> [--name] [--description] [--color] [--category]
refhub vaults delete <vaultId> --confirm
refhub vaults visibility <vaultId> --visibility <private|protected|public> [--slug]
refhub vaults shares list <vaultId>
refhub vaults shares add <vaultId> --email <e> --role <viewer|editor> [--name]
refhub vaults shares update <vaultId> <shareId> --role <viewer|editor>
refhub vaults shares remove <vaultId> <shareId>
```

### Items

```
refhub items list --vault <id> [--page] [--limit]
refhub items get --vault <id> <itemId>
refhub items add --vault <id> --title <t> [--authors <"Smith J,Doe A">] [--year] [--doi] [--tags <id,id,...>]
refhub items update --vault <id> <itemId> [--title] [--authors <"Smith J,Doe A">] [--year] [--doi] [--tags <id,id,...>]
refhub items delete --vault <id> <itemId> --confirm
refhub items upsert --vault <id> --file <items.json> [--idempotency-key]
refhub items preview --vault <id> --file <items.json>
refhub items search --vault <id> --q <query> [--author] [--year] [--doi] [--tag] [--page] [--limit]
refhub items stats --vault <id>
refhub items changes --vault <id> --since <ISO>
```

### Tags

```
refhub tags list --vault <id>
refhub tags create --vault <id> --name <n> [--color] [--parent]
refhub tags update --vault <id> <tagId> [--name] [--color] [--parent]
refhub tags delete --vault <id> <tagId>
refhub tags attach --vault <id> --item <itemId> --tags <id,id,...>
refhub tags detach --vault <id> --item <itemId> --tags <id,id,...>
```

### Relations

```
refhub relations list --vault <id> [--type]
refhub relations create --vault <id> --pub <pubId> --related <pubId> [--type <cites|extends|builds_on|contradicts|reviews|related>]
refhub relations update --vault <id> <relationId> --type <cites|extends|builds_on|contradicts|reviews|related>
refhub relations delete --vault <id> <relationId>
```

### Import

```
refhub import doi --vault <id> --doi <doi> [--tags]
refhub import bibtex --vault <id> (--bibtex <string> | --file <path>) [--tags]
refhub import url --vault <id> --url <url> [--tags]
```

### Export

```
refhub export --vault <id> [--format json|bibtex]
```

### Audit

```
refhub audit --vault <id> [--since <ISO>] [--until <ISO>] [--limit] [--page]
```

---

## Data flow

Every command follows the same four-step pipeline:

```
1. Parse args (Commander)
       ↓
2. Resolve key: --api-key flag → REFHUB_API_KEY env → exit 3
       ↓
3. RefHubClient.method(params) → fetch → typed response or RefHubError
       ↓
4. format(response, { table }) → stdout (JSON or table)
                                  stderr (errors, always plain JSON)
```

**`RefHubClient`** is instantiated once at startup with the resolved key and base URL (`https://refhub-api.netlify.app/api/v1`). Responsibilities:
- Attaches `Authorization: Bearer <key>` to every request
- Parses error responses into `{ code, message, request_id }`
- Surfaces `retry_after_seconds` on 429 responses

**Output streams:**
- `stdout` — all success data (JSON by default, table with `--table`)
- `stderr` — all errors, always as JSON regardless of `--table` flag

This lets agents pipe output cleanly without error noise contaminating the data stream:
```bash
refhub vaults list | jq .data
```

---

## Error handling

### Error shape (stderr)

```json
{
  "error": {
    "code": "missing_scope",
    "message": "Key lacks vaults:write scope",
    "request_id": "req_abc123"
  }
}
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | API error (4xx/5xx from RefHub) |
| `2` | Bad arguments (missing required flags, unknown command) |
| `3` | Auth error (missing or invalid key) |

### Guardrails

- `vaults delete` and `items delete` require `--confirm` flag — hard deletes, no undo. Without it, command exits 2 with a message explaining the flag.
- `items update --tags` prints a warning to stderr: tags list is a **full replacement**, not an append.
- Bulk upsert failure without `--idempotency-key` emits a `partial_write_risk` warning to stderr before exiting 1.

---

## Testing

### Unit tests (Vitest)

- `RefHubClient` methods: mock `fetch`, assert correct URL, headers, body shape
- `format()`: assert JSON output matches input, assert table output has expected columns
- Error parsing: assert `RefHubError` thrown with correct `code`/`message`/`request_id`

Run with: `npm test`

### Smoke tests (live API)

- Script at `scripts/smoke.ts`
- Requires real `REFHUB_API_KEY` in environment
- Executes full sequence: list vaults → read vault → create test vault → tag CRUD → relation CRUD → export → delete test vault
- Not part of `npm test`, run explicitly with `npm run smoke`

---

## Skill integration

### Step 1 — Update `refhub-skill/SKILL.md`

Add an "Execution layer" section near the top:

> If the `refhub` CLI is available in the environment, use it instead of direct HTTP calls. The CLI handles auth, error formatting, and output. All workflows below map directly to CLI commands. Agents in environments without the CLI may fall back to direct HTTP as documented.

The existing behavioral spec (workflows, guardrails, error handling) remains intact.

### Step 2 — OpenClaw workspace skill

After global installation, place a thin `SKILL.md` at:

```
/opt/openclaw/.openclaw/workspace/skills/refhub-skill/SKILL.md
```

Contents:
- Points agents to `refhub --help` as the command reference
- States that `REFHUB_API_KEY` must be in the environment
- Lists available command groups: `vaults`, `items`, `tags`, `relations`, `import`, `export`, `audit`
- Defers behavioral rules and guardrails to the upstream `refhub-skill` spec

---

## Out of scope (v1)

These API routes exist but are not exposed by the CLI (JWT-only, requires human session):

- API key management (`/api/v1/keys`)
- Google Drive management
- Semantic Scholar lookups (`/api/v1/recommendations`, `/api/v1/references`, etc.)
- Global audit log (`GET /api/v1/audit` without vault scope)
