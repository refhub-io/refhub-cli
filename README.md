# refhub cli

> command-line execution layer for the [refhub.io](https://refhub.io) API.  
> manage vaults, papers, tags, and relations — scriptable, pipeable, agent-ready.

[![npm](https://img.shields.io/npm/v/@refhub/cli?style=flat-square)](https://www.npmjs.com/package/@refhub/cli)

---

## // install

```bash
npm install -g @refhub/cli
```

**requires** node ≥ 18.

### install from source

```bash
git clone https://github.com/refhub/refhub-cli
cd refhub-cli
npm install
npm run build
npm link
```

---

## // auth

The CLI uses two credentials depending on the command:

**API key** — required for all vault/item/tag/relation/import/export/audit commands:
```bash
export REFHUB_API_KEY=your_key_here
# or pass inline:
refhub --api-key <key> vaults list
```
Resolution order: `--api-key` flag → `REFHUB_API_KEY` env → exit 3.

**Session JWT** — required for `enrich` and `pdf upload` (management routes):
```bash
export REFHUB_JWT=your_supabase_session_jwt
# or pass inline:
refhub enrich --vault <id> --jwt <token>
```
Resolution order: `--jwt` flag → `REFHUB_JWT` env → exit 3.

---

## // usage

```
refhub [--api-key <key>] [--table] <command> [subcommand] [options]
```

| flag | behavior |
|------|----------|
| `--api-key` | override `REFHUB_API_KEY` |
| `--jwt` | override `REFHUB_JWT` (used by `enrich` and `pdf upload`) |
| `--table` | human-readable table output (default: json) |
| `--version` | print version |
| `--help` | available on every command and subcommand |

output to stdout is always json by default — pipe-friendly:

```bash
refhub vaults list | jq .data
refhub items search --vault <id> --q "attention" | jq '.data[].title'
```

errors always go to stderr as json, regardless of `--table`.

---

## // commands

### vaults

```bash
refhub vaults list
refhub vaults get <vaultId>
refhub vaults create --name <n> [--description] [--color] [--visibility] [--category]
refhub vaults update <vaultId> [--name] [--description] [--color] [--category]
refhub vaults delete <vaultId> --confirm
refhub vaults visibility <vaultId> --visibility <private|protected|public> [--slug]

# shares
refhub vaults shares list <vaultId>
refhub vaults shares add <vaultId> --email <e> --role <viewer|editor>
refhub vaults shares update <vaultId> <shareId> --role <viewer|editor>
refhub vaults shares remove <vaultId> <shareId>
```

### items

```bash
refhub items list --vault <id> [--page] [--limit]
refhub items get --vault <id> <itemId>
refhub items add --vault <id> --title <t> [--authors "Smith J,Doe A"] [--year] [--doi] [--tags <id,id>]
refhub items update --vault <id> <itemId> [--title] [--authors] [--year] [--doi] [--tags <id,id>]
refhub items delete --vault <id> <itemId> --confirm
refhub items upsert --vault <id> --file <items.json> [--idempotency-key]
refhub items preview --vault <id> --file <items.json>
refhub items search --vault <id> --q <query> [--author] [--year] [--doi] [--tag] [--page] [--limit]
refhub items stats --vault <id>
refhub items changes --vault <id> --since <ISO>
```

`--tags` on update is a **full replacement**, not an append. a warning is printed to stderr.

### tags

```bash
refhub tags list --vault <id>
refhub tags create --vault <id> --name <n> [--color] [--parent]
refhub tags update --vault <id> <tagId> [--name] [--color] [--parent]
refhub tags delete --vault <id> <tagId>
refhub tags attach --vault <id> --item <itemId> --tags <id,id>
refhub tags detach --vault <id> --item <itemId> --tags <id,id>
```

### relations

```bash
refhub relations list --vault <id> [--type]
refhub relations create --vault <id> --pub <pubId> --related <pubId> [--type <cites|extends|builds_on|contradicts|reviews|related>]
refhub relations update --vault <id> <relationId> --type <...>
refhub relations delete --vault <id> <relationId>
```

### import

```bash
refhub import doi --vault <id> --doi <doi> [--tags <id,id>]
refhub import bibtex --vault <id> (--bibtex <string> | --file <path>) [--tags]
refhub import url --vault <id> --url <url> [--tags]
```

### export

```bash
refhub export --vault <id> [--format json|bibtex]
```

### audit

```bash
refhub audit --vault <id> [--since <ISO>] [--until <ISO>] [--limit] [--page]
```

### enrich

Enriches incomplete publication metadata by looking up each item's DOI against Semantic Scholar and patching missing fields (title, authors, year, abstract). Requires a session JWT.

```bash
refhub enrich --vault <id> [--item <itemId>] [--dry-run] [--jwt <token>]
```

- omit `--item` to process all items in the vault that have a DOI and missing fields
- `--dry-run` shows what would be updated without writing anything
- rate-limited to 1 req/s to respect Semantic Scholar's per-key limit

### pdf

Uploads a PDF file to the user's linked Google Drive and links it to a publication. Requires a session JWT and Google Drive connected to the account.

```bash
refhub pdf upload --publication <original_publication_id> --file <path/to/file.pdf> [--jwt <token>]
```

- `--publication` is the `original_publication_id` from the vault item (not the vault item's `id`)
- max file size: 26 MB by default

---

## // exit codes

| code | meaning |
|------|---------|
| `0` | success |
| `1` | API error (4xx/5xx) |
| `2` | bad arguments |
| `3` | auth error (missing or invalid key) |

---

## // error shape

all errors are written to stderr as json:

```json
{
  "error": {
    "code": "missing_scope",
    "message": "key lacks vaults:write scope",
    "request_id": "req_abc123"
  }
}
```

rate-limited responses (429) include `retry_after_seconds`.

---

## // guardrails

- `vaults delete` and `items delete` require `--confirm` — hard deletes, no undo
- `items upsert` without `--idempotency-key` emits a `partial_write_risk` warning before exiting 1 on failure
- `items update --tags` warns that the tags list is a full replacement

---

## // dev

```bash
npm run dev      # run via tsx (no build step)
npm test         # vitest unit tests
npm run smoke    # live end-to-end sequence (requires REFHUB_API_KEY)
npm run build    # tsc → dist/
```

smoke test covers: `list_vaults` → `create_vault` → `tag_crud` → `relation_crud` → `export` → `delete_vault`.

---

## // stack

| layer | tool |
|-------|------|
| runtime | node ≥ 18 |
| language | typescript 5.x |
| cli framework | commander |
| output | chalk • cli-table3 |
| tests | vitest |
| build | tsc + tsx |

---

## // out of scope (v1)

not exposed by the cli:

- api key management (jwt-only, no cli command)
- google drive link/unlink (jwt-only, no cli command)
- semantic scholar recommendations / references / citations / lookup (jwt-only, no cli command)
- global audit log (jwt-only, non-vault-scoped, no cli command)
