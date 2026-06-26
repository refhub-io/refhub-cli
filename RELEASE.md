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
3. Create and push a matching tag from `main`:

   ```bash
   git checkout main
   git pull --ff-only origin main
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

4. The `Release` workflow installs dependencies, runs tests, builds the CLI, checks the package tarball with `npm pack --dry-run`, publishes to npm with provenance, and creates a GitHub release.

The tag version should match the package version, for example package version `1.2.3` uses tag `v1.2.3`.
