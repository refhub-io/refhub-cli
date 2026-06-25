# CI/CD Workflow Design

**Date:** 2026-06-25
**Project:** `@refhub/cli`

## Overview

Two GitHub Actions workflow files: one for CI (lint + build + test on every push/PR), one for release (same checks + npm publish on semver tags). ESLint is added alongside `tsc --noEmit` type-checking. All Actions are SHA-pinned with Dependabot keeping them current.

## Files Created

```
.github/
  workflows/
    ci.yml
    release.yml
  dependabot.yml
eslint.config.js
```

Changes to `package.json`:
- New dev dependencies: `eslint`, `typescript-eslint`
- New scripts: `lint:types`, `lint:eslint`, `lint`

## ESLint Configuration (`eslint.config.js`)

Flat config (ESLint 9, ESM-compatible) using `typescript-eslint` recommended ruleset.

```js
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
```

## CI Workflow (`.github/workflows/ci.yml`)

- **Trigger:** push to `main`, pull_request targeting `main`
- **Node version:** 20 (LTS, satisfies `engines: >=18`)
- **Steps:** checkout → setup-node (with npm cache) → `npm ci` → `npm run lint` → `npm run build` → `npm test`
- **Failure behavior:** linear pipeline; lint failure skips build and test

## Release Workflow (`.github/workflows/release.yml`)

- **Trigger:** push of tags matching `v*.*.*`
- **Steps:** identical to CI + `npm publish`
- **Auth:** `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` — must be added in GitHub repo Settings → Secrets → Actions
- **Registry config:** `setup-node` with `registry-url: https://registry.npmjs.org` configures `.npmrc` automatically

## Dependabot (`.github/dependabot.yml`)

Weekly PRs for GitHub Actions dependency updates. All `uses:` references in workflow files are pinned to full commit SHAs (with `# vX` comments) to prevent supply chain attacks via mutable tags.

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

## Secrets Required

| Secret | Where to set | Purpose |
|--------|-------------|---------|
| `NPM_TOKEN` | GitHub repo → Settings → Secrets → Actions | Authenticates `npm publish` |

## Out of Scope

- Automated version bumping / changelog generation
- GitHub Release creation
- Branch protection rules
