# AGENTS.md

Process guide for any coding agent (or human) working in this repo — Claude Code, Codex, Cursor, or otherwise. The point is that behavior stays consistent no matter which tool or session is doing the work. This mirrors the same process used in `refhub.io` and `.netlify`, adapted for a published npm CLI.

## 1. Check existing conventions first

Before adding or changing a command, read `README.md` for the existing flag naming, output format (`chalk` colors, `cli-table3` tables, JSON-by-default output), and auth conventions (`REFHUB_API_KEY` env var / `--api-key` flag). Look at an existing command in `src/` that's similar to what you're adding and match its structure rather than inventing a new pattern.

## 2. Do the work that's actually asked for

No unrequested refactors, no speculative abstractions, no drive-by cleanups bundled into an unrelated change. If you notice something else worth fixing while you're in there, say so — don't silently expand the scope of the current task.

## 3. Commit as soon as a fix or feature works

Don't let one commit accumulate multiple unrelated changes, and don't sit on working code uncommitted. As soon as a change does what it was supposed to do, verify it and commit it:

- `npm test` — all tests passing
- `npm run build` — `tsc` compiles cleanly
- For anything touching the published entry point: verify with a real `npm uninstall -g @refhub/cli` / `npm install -g .` cycle, not just the build step, per the precedent in this repo's history

Small, working commits are easier to review, bisect, and revert than one large commit at the end.

## 4. Ship as a branch + PR

Never commit directly to `main`. Do the work on a feature/fix branch, then push and open a PR. **Merging a version bump to `main` triggers an automatic npm publish** once CI passes (see `RELEASE.md`) — there is no separate manual publish step, so nothing lands on `main` without review.

## 5. Keep `CHANGELOG.md` current

Update `CHANGELOG.md` (Keep a Changelog format, already in use) in the same PR as the change it documents. A shipped change without a changelog entry isn't done — don't let it drift and get backfilled later.

## 6. Versioning policy

Bump `package.json` **and** `package-lock.json` to the new semver version — `RELEASE.md` is the authoritative process for how that bump becomes an npm publish; read it before your first release here.

- **Patch** (`1.5.X`): version bump + `CHANGELOG.md` entry. Bug fixes, internal tweaks, no CLI-surface change.
- **Minor** (`1.X.0`): version bump + `CHANGELOG.md` entry with a clear "Added" section. Use this tier for new commands or flags that don't break existing usage.
- **Major** (`X.0.0`): version bump + `CHANGELOG.md` entry, and manually create the git tag + a GitHub Release with notes — the automated workflow intentionally does *not* create tags/releases (see `RELEASE.md`'s note on `GITHUB_TOKEN` write access), so this step doesn't happen unless you do it. Reserve this tier for breaking changes to commands, flags, or output shape that scripts/agents depend on.

## Anything else worth doing before you start

- Check `git status`, current branch, and recent `git log` before touching anything — this repo often has multiple feature branches in flight; make sure you're building on the right base (usually `main`, not whatever branch happened to be checked out).
- Run the full test suite once at the start so you know the baseline is green, and any later failure is yours to fix, not inherited.
- If the task is large or the requirements are ambiguous, write a short plan and get it confirmed before touching code — don't guess at scope.
