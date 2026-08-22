# Contributing to RefHub CLI

This is the process guide for code and documentation changes in `refhub-cli`. `AGENTS.md` is for agent operation of the CLI; this file is for changing the repo.

## Brand, style, and identity

Before changing user-facing output, docs, examples, command names, flags, prompts, errors, or release notes, check `refhub-style-guide/refhub-identity.md` and match the existing voice. Keep CLI output stable, scriptable, and concise; branded wording must not break automation.

Core rules:

- Prefer concise, practical wording over marketing copy.
- Preserve lowercase, `//` comment-style headings, snake_case labels, and monospace conventions where the repo surface already uses them.
- Keep examples concrete and operational: vaults, papers, tags, relations, PDFs, exports, agents, and API keys.
- Do not introduce a one-off visual, copy, naming, or interaction style for a single feature.

## Existing conventions

Before adding or changing a command, read `README.md` for flag naming, output format, auth conventions, and command groups. Match an existing command in `src/` before introducing a new pattern.

Use:

- `REFHUB_API_KEY` env var and `--api-key` flag consistently.
- Existing table/JSON output conventions.
- Existing command grouping and error shapes.
- Existing test style under `tests/`.

## Scope and branch discipline

Do the work that was asked for. Keep refactors, dependency churn, formatting sweeps, and unrelated cleanup out of focused changes unless they are required to complete the task.

## Pull requests

Never commit directly to `main`.

Use a fresh branch from current `origin/main`:

- `fix/...` for bug fixes.
- `feature/...` for new commands or flags.
- `docs/...` for documentation-only changes.
- `chore/...` for maintenance.

Push the branch and open a PR. Merging a version bump to `main` triggers the npm publish workflow after CI passes, so release-affecting changes must be reviewed before merge.

## Verification

Run the narrow checks needed for the changed surface, and prefer the full suite before opening a PR:

```sh
npm test
npm run build
```

For anything touching the published entry point or package files, verify a real local install cycle:

```sh
npm uninstall -g @refhub/cli
npm install -g .
refhub --help
```

## Changelog and semver

Keep `CHANGELOG.md` current in the same PR as the change it documents. The file uses Keep a Changelog and Semantic Versioning.

Bump both `package.json` and `package-lock.json` for shipped changes, then run `npm install --package-lock-only` if needed.

- Patch: bug fixes, docs that affect installed usage, internal tweaks, no CLI-surface change.
- Minor: new commands, new flags, or additive output fields.
- Major: breaking changes to commands, flags, config, auth behavior, or output shape that scripts/agents may depend on. Major releases also need a git tag and GitHub Release notes.

Read `RELEASE.md` before release work. The repo uses npm Trusted Publishing/OIDC; do not add npm tokens.

## Security and credentials

Never commit API keys, bearer tokens, local env files, private user data, or user-specific credentials. Examples must use placeholders only.
