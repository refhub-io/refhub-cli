# Changelog

All notable changes to `@refhub/cli` are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this
project uses [Semantic Versioning](https://semver.org/). History prior to
1.5.0 was not tracked in this file.

## [1.6.0] - 2026-09-08

### Added
- `refhub sections list/create/update/delete` — manage curated vault sections. List needs viewer access; create/update/delete require vault owner access.
- `--section <sectionId>`/`--unset-section`/`--featured`/`--unfeature`/`--featured-note <text>` on `items update`. These are vault-local curation fields; the backend requires vault owner access to set any of them, distinct from the editor-level access needed for the rest of `items update`.
- `refhub relations scan --vault <id> [--item <itemId>] [--dry-run] [--limit <n>]` — scans each item's Semantic Scholar references/citations, matches them against sibling vault items by DOI or exact title, and creates `cites` relations for new matches. Pure client-side orchestration on the existing `discover`/relations building blocks, mirroring `enrich`'s pattern — no new backend route.
- `Section` type, and `section_id`/`section_position`/`featured`/`featured_note` fields on `Item`.
- `refhub vaults archive <vaultId> --confirm` — permanently archives a vault via the new `POST /vaults/:vaultId/archive` backend route. There is no unarchive command; this cannot be undone.
- `archived_at` on the `Vault` type, and surfaced in `vaults list`/`vaults get` output.

## [1.5.0] - 2026-07-08

### Added
- `--url` and `--pdf-url` flags on `items add`/`items update`, matching the
  full publication field set the API already accepts.
- `bin/refhub.js` as a dedicated CLI entry point.
- `drive_pdf_url` on the exported `Item` type, matching what `items
  get`/`items list`/`items update` now return.

### Changed
- `refhub pdf upload` always uses the resumable Drive upload flow now,
  regardless of file size — the raw-bytes upload path (and its ~6 MiB
  practical ceiling) is gone, matching the backend's resumable-only pivot.
- Renamed the PDF upload result's `pdfUrl` field to `driveUrl` internally,
  to stop colliding in name with the unrelated `pdf_url` publication field.
- `--url` on `items update` now clears the field on an empty string
  (`!== undefined` check), matching `--notes`/`--pdf-url` behavior instead
  of a truthy check.
- Build script simplified to plain `tsc` — the post-build shebang/chmod
  hack that manually patched `dist/index.js` is gone. The shebang now
  lives in `bin/refhub.js`, which dynamically imports the compiled
  `dist/index.js`. Verified via a real `npm uninstall -g` /
  `npm install -g .` cycle that the global install resolves correctly.

### Fixed
- `dist/` is rebuilt to match the resumable-only source (it had drifted
  out of sync with `src/` after earlier fixes landed).
- README no longer claims there's "no route to read a stored Drive PDF
  URL back" — `drive_pdf_url` is now exposed on `items get`/`items
  list`/the refreshed row from `items update`.
