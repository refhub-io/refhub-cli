# CI/CD Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ESLint + tsc type-checking, a CI workflow (lint/build/test on push/PR), and a release workflow (same + npm publish on semver tags), with SHA-pinned Actions and Dependabot keeping them current.

**Architecture:** Two independent GitHub Actions workflow files share the same linear lint → build → test pipeline; `release.yml` appends an `npm publish` step gated behind `NPM_TOKEN`. ESLint uses flat config with `typescript-eslint` recommended rules. All `uses:` references are pinned to commit SHAs.

**Tech Stack:** GitHub Actions, ESLint 10, typescript-eslint 8, npm

## Global Constraints

- Node version in workflows: 20 (satisfies `engines: >=18`)
- `actions/checkout` SHA: `34e114876b0b11c390a56381ad16ebd13914f8d5` # v4
- `actions/setup-node` SHA: `49933ea5288caeca8642d1e84afbd3f7d6820020` # v4
- ESLint version: `10.5.0`
- typescript-eslint version: `8.62.0`
- All `uses:` lines must include a `# vX` comment after the SHA
- `npm publish` auth uses env var `NODE_AUTH_TOKEN` mapped from secret `NPM_TOKEN`

---

### Task 1: ESLint setup

**Files:**
- Modify: `package.json`
- Create: `eslint.config.js`

**Interfaces:**
- Produces: `npm run lint` script (runs `tsc --noEmit` then `eslint src`)

- [ ] **Step 1: Verify lint script does not exist yet**

Run: `npm run lint`
Expected: `npm error Missing script: "lint"` — confirms we're starting from a clean state.

- [ ] **Step 2: Install ESLint dependencies**

```bash
npm install --save-dev eslint@10.5.0 typescript-eslint@8.62.0
```

Expected: both packages appear in `package.json` devDependencies and `package-lock.json` is updated.

- [ ] **Step 3: Create `eslint.config.js`**

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

- [ ] **Step 4: Add lint scripts to `package.json`**

Add the following three entries inside the `"scripts"` object (after `"dev"`):

```json
"lint:types": "tsc --noEmit",
"lint:eslint": "eslint src",
"lint": "npm run lint:types && npm run lint:eslint"
```

- [ ] **Step 5: Run type-check and verify it passes**

```bash
npm run lint:types
```

Expected: exits 0 with no output.

- [ ] **Step 6: Run ESLint and fix any pre-existing errors**

```bash
npm run lint:eslint
```

Expected: exits 0. If there are existing lint errors, fix them now before continuing. Warnings (`no-explicit-any`) are acceptable and will not block CI.

- [ ] **Step 7: Run full lint to confirm both pass together**

```bash
npm run lint
```

Expected: exits 0.

- [ ] **Step 8: Confirm build and tests still pass**

```bash
npm run build && npm test
```

Expected: both exit 0.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json eslint.config.js
git commit -m "feat: add ESLint and tsc type-check scripts"
```

---

### Task 2: GitHub Actions workflows and Dependabot

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Create: `.github/dependabot.yml`

**Interfaces:**
- Consumes: `npm run lint`, `npm run build`, `npm test` from Task 1
- Produces: CI checks on push/PR; npm publish on `v*.*.*` tags

- [ ] **Step 1: Create the `.github/workflows/` directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

- [ ] **Step 3: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 20
          cache: npm
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 4: Validate both YAML files parse correctly**

```bash
node -e "
import('fs').then(fs => {
  ['ci', 'release'].forEach(name => {
    try {
      JSON.parse(JSON.stringify(fs.readFileSync(\`.github/workflows/\${name}.yml\`, 'utf8')));
      console.log(\`\${name}.yml: readable\`);
    } catch(e) { console.error(e); process.exit(1); }
  });
});
"
```

Expected: prints `ci.yml: readable` and `release.yml: readable`. (This just checks the files exist and are readable — full YAML validation requires a YAML parser, but syntax errors would surface in the next step.)

Actually, run this simpler check instead:

```bash
cat .github/workflows/ci.yml && cat .github/workflows/release.yml
```

Expected: both files print without error. Review the output and confirm the SHAs and structure match this plan.

- [ ] **Step 5: Create `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 6: Commit**

```bash
git add .github/
git commit -m "feat: add CI, release workflows and Dependabot config"
```

---

## Pre-flight checklist before first release

Before pushing a `v*.*.*` tag, confirm:

- [ ] `NPM_TOKEN` secret is set in GitHub repo → Settings → Secrets → Actions
- [ ] `npm run lint && npm run build && npm test` all pass locally
- [ ] `package.json` version matches the tag you're about to push
