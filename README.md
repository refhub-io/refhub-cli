# refhub cli

> command-line execution layer for the [refhub.io](https://refhub.io) API.  
> manage vaults, papers, tags, and relations — scriptable, pipeable, agent-ready.

---

## // install

```bash
git clone https://github.com/refhub/refhub-cli
cd refhub-cli
npm install
npm run build
npm link
```

`npm link` makes `refhub` available globally without publishing to npm.

**requires** node ≥ 18.

---

## // auth

```bash
export REFHUB_API_KEY=your_key_here
```

or pass inline:

```bash
refhub --api-key <key> vaults list
```

key resolution order: `--api-key` flag → `REFHUB_API_KEY` env → exit 3.

---

## // usage

```
refhub [--api-key <key>] [--table] <command> [subcommand] [options]
```

| flag | behavior |
|------|----------|
| `--api-key` | override `REFHUB_API_KEY` |
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

not exposed by the cli — these routes require a human session (jwt-only):

- api key management
- google drive integration
- semantic scholar recommendations / references
- global audit log (non-vault-scoped)
