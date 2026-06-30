# Release procedure

`@refhub/cli` is published to npm by GitHub Actions using npm Trusted Publishing. Do not publish locally with an npm token.

## One-time npm setup

In the npm package settings for `@refhub/cli`, add a Trusted Publisher for this GitHub Actions workflow:

- Repository: `refhub-io/refhub-cli`
- Workflow file: `release.yml`
- Environment: leave unset unless the workflow is later changed to use one

## Publishing a release

1. Update `package.json` and `package-lock.json` to the new semver version.
2. Merge the version bump to `main` after CI passes.
3. After the `CI` workflow succeeds on `main`, the `Release` workflow runs automatically.
4. If the package version is not already on npm, `Release` builds the CLI, checks the package tarball with `npm pack --dry-run`, publishes to npm with provenance, and creates the matching GitHub release/tag.

If `@refhub/cli@X.Y.Z` already exists on npm, the workflow exits successfully without publishing again.

The GitHub release tag is generated from the package version, for example package version `1.2.3` creates tag `v1.2.3`.

The `Release` workflow can also be started manually from GitHub Actions via `workflow_dispatch`; the same npm-version guard still applies.
