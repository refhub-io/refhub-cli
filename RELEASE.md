# Release procedure

`@refhub/cli` is published to npm by GitHub Actions using npm Trusted Publishing. Do not publish locally with an npm token.

The release workflow uses Node.js 24 so the bundled npm CLI supports Trusted Publishing/OIDC.

## One-time npm setup

In the npm package settings for `@refhub/cli`, add a Trusted Publisher for this GitHub Actions workflow:

- Repository: `refhub-io/refhub-cli`
- Workflow file: `release.yml`
- Environment: leave unset unless the workflow is later changed to use one

## Publishing a release

1. Update `package.json` and `package-lock.json` to the new semver version.
2. Merge the version bump to `main` after CI passes.
3. After the `CI` workflow succeeds on `main`, the `Release` workflow runs automatically.
4. If the package version is not already on npm, `Release` builds the CLI, checks the package tarball with `npm pack --dry-run`, and publishes to npm with provenance.

If `@refhub/cli@X.Y.Z` already exists on npm, the workflow exits successfully without publishing again.

GitHub release/tag creation is intentionally not automated because the repository/org currently does not grant `GITHUB_TOKEN` write access. If that policy changes later, the release workflow can create tag `vX.Y.Z` from the package version.

The `Release` workflow can also be started manually from GitHub Actions via `workflow_dispatch`; the same npm-version guard still applies.
