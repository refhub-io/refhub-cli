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
git clone https://github.com/refhub-io/refhub-cli
cd refhub-cli
npm install
npm run build
npm link
```

---

## // auth

The CLI uses a RefHub API key for normal agent/runtime work:

**API key** — required for all vault/item/tag/relation/import/export/audit commands:
```bash
export REFHUB_API_KEY=your_key_here
# or pass inline:
refhub --api-key <key> vaults list
```
Resolution order: `--api-key` flag → `REFHUB_API_KEY` env → exit 3.

Session JWTs are no longer required for CLI enrichment or item PDF upload. Browser/account setup flows still use RefHub web auth: API key creation/revocation and Google Drive connect/disconnect.

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
refhub items add --vault <id> --title <t> [--authors "Smith J,Doe A"] [--year] [--doi] [--url] [--pdf-url] [--tags <id,id>] [--notes]
refhub items update --vault <id> <itemId> [--title] [--authors] [--year] [--doi] [--url] [--pdf-url] [--tags <id,id>] [--notes] [--section <sectionId> | --unset-section] [--featured | --unfeature] [--featured-note <text>]
refhub items delete --vault <id> <itemId> --confirm
refhub items upsert --vault <id> --file <items.json> [--idempotency-key]
refhub items preview --vault <id> --file <items.json>
refhub items search --vault <id> --q <query> [--author] [--year] [--doi] [--tag] [--page] [--limit]
refhub items stats --vault <id>
refhub items changes --vault <id> --since <ISO>
```

`--tags` on update is a **full replacement**, not an append. a warning is printed to stderr.

`--pdf-url` sets the frontend's `publisher_pdf` field (a link to a publisher-hosted PDF). it is distinct from the frontend's `drive_pdf` field (the Google Drive-hosted copy created by `refhub pdf upload`, see below) — the Drive copy is readable back afterward too, as `drive_pdf_url` on item reads (see the `pdf` command below).

`--section`/`--unset-section`/`--featured`/`--unfeature`/`--featured-note` are vault-local curation fields — grouping and highlighting items for display on public vault pages. **Setting any of them requires vault owner access**, even for an api key with `vaults:write` scope held by a non-owner editor share — the backend runs a second, owner-level access check for these specific fields, separate from the editor-level check for everything else `items update` can change.

### sections

Curated sections group a vault's items for display on public vault pages. Listing needs only viewer access; create/update/delete require **owner** access (`vaults:admin` scope, and the caller must own the vault — an editor share cannot manage sections even with `vaults:admin`).

```bash
refhub sections list --vault <id>
refhub sections create --vault <id> --name <n> [--description] [--position]
refhub sections update --vault <id> <sectionId> [--name] [--description] [--position]
refhub sections delete --vault <id> <sectionId>
```

deleting a section unfiles its items (`section_id` is cleared) rather than deleting them.

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

`refhub relations scan` is client-side orchestration on top of the existing `discover`/manual-relation building blocks — there is no dedicated backend route for it, same as `enrich`. For each vault item with a DOI, it looks up the item's Semantic Scholar paper id, fetches its references and citations, and matches each returned paper against sibling items already in the same vault (DOI match first, falling back to an exact, case-insensitive title match), mirroring the RefHub frontend's own relationship-suggestion matching. Every match becomes a `cites` relation — item → reference for references, matched-paper → item for citations — skipping any pair that already has a relation between them.

```bash
refhub relations scan --vault <id> [--item <itemId>] [--dry-run] [--limit <n>]
```

- omit `--item` to scan every item in the vault that has a DOI
- `--dry-run` reports what would be created without writing anything
- `--limit` caps references/citations fetched per item from Semantic Scholar (1–25, same as `discover references`/`discover citations`)
- rate-limited client-side to roughly 1 item/s (each item makes 3 Semantic Scholar requests); backend cache/rate-limit/stale fallback also applies
- only ever proposes `relation_type: "cites"` — there's no basis in citation-graph data alone for `extends`/`contradicts`/etc., those remain manual via `relations create`/`update`

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


### discover

Semantic Scholar discovery/enrichment through API-key routes (`vaults:read`).

```bash
refhub discover search --query "visual analytics" [--limit 10]
refhub discover lookup (--doi <doi> | --title <title>)
refhub discover recommendations --paper <paperId-or-DOI:id> [--limit]
refhub discover related --paper <paperId-or-DOI:id> [--limit]
refhub discover references --paper <paperId-or-DOI:id> [--limit]
refhub discover citations --paper <paperId-or-DOI:id> [--limit]
refhub discover cited-by --paper <paperId-or-DOI:id> [--limit]
refhub discover add --vault <id> --file <semantic-scholar-results.json> [--idempotency-key]
```

`discover add` expects a JSON array of normalized Semantic Scholar paper objects, such as the `.data` returned by `discover search/recommendations/references/citations`, and upserts them into the target vault. Open-access PDF URLs are mapped to `pdf_url` where present.

### enrich

Enriches incomplete publication metadata by looking up each item's DOI against Semantic Scholar and patching missing fields (title, authors, year, abstract). Requires only the RefHub API key (`vaults:read` for lookup plus `vaults:write` when patching items).

```bash
refhub enrich --vault <id> [--item <itemId>] [--dry-run]
```

- omit `--item` to process all items in the vault that have a DOI and missing fields
- `--dry-run` shows what would be updated without writing anything
- rate-limited client-side to 1 req/s; backend cache/rate-limit/stale fallback also applies

### pdf

Uploads a PDF file to the user's linked Google Drive and links it to a vault item. Requires only the RefHub API key (`vaults:write`) after Google Drive has been connected in the RefHub web account UI.

```bash
refhub pdf upload --vault <vaultId> --item <itemId> --file <path/to/file.pdf>
```

- all PDF uploads use the resumable Drive flow, regardless of file size — there is no raw-body upload route anymore: `POST /api/v1/vaults/:vaultId/items/:itemId/pdf/session`, direct `PUT` of the PDF bytes to the returned Google Drive `upload_url`, then `POST /api/v1/vaults/:vaultId/items/:itemId/pdf/complete`
- max file size: 26 MB by default, matching the backend Google Drive upload limit
- on success the response body carries the resulting Google Drive URL directly: `{ data: { stored: true, provider: "google_drive", fileId, driveUrl, folderId, folderName } }`. Deliberately named differently from `pdf_url` (the publisher-hosted link set via `--pdf-url`, see above) since they are unrelated fields.
- the stored Drive link is also readable afterward as `drive_pdf_url` on `items get`/`items list`/vault reads, and in the refreshed row returned by `items update` — it's the same value the frontend calls `drive_pdf`.

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

### releases

Releases are published from GitHub Actions via npm Trusted Publishing. See [RELEASE.md](./RELEASE.md) for the version bump, tag, and publish procedure.

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
