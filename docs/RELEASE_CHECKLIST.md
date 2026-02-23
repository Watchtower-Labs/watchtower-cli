# Release Checklist

Use this checklist when preparing for a new Watchtower release.

## Pre-Release

### Required GitHub Secrets (one-time setup)

Before the first release, configure these secrets in **Settings → Secrets and variables → Actions → New repository secret**:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `NPM_TOKEN` | npm publish token | npmjs.com → Account → Access Tokens → Granular token (scoped to `@watchtower/cli`) |
| `PYPI_TOKEN` | PyPI API token | pypi.org → Account Settings → API tokens → Add token |
| `CODECOV_TOKEN` | Coverage reporting token | codecov.io → Repository Settings → copy token |

### Code Quality
- [ ] All tests passing locally
  ```bash
  python3 -m pytest tests/
  pnpm --filter @watchtower/cli test
  ```
- [ ] No linting errors
  ```bash
  ruff check watchtower/
  black --check watchtower/
  pnpm --filter @watchtower/cli lint
  ```
- [ ] Type checking passes
  ```bash
  mypy watchtower/
  pnpm --filter @watchtower/cli typecheck
  ```
- [ ] Code formatted correctly
  ```bash
  black --check watchtower/
  prettier --check packages/cli/src/
  ```

### Documentation
- [ ] README.md is up to date
- [ ] CHANGELOG.md updated with version notes
- [ ] All example files tested and working
- [ ] API documentation is current
- [ ] Version numbers consistent across all files

### Security
- [ ] Dependencies audited
  ```bash
  pip-audit
  pnpm audit
  ```
- [ ] No known security vulnerabilities
- [ ] Secrets/keys not committed
  ```bash
  git log --all --full-history -S "api_key" -S "secret" -S "password"
  ```

### Build & Package
- [ ] Python package builds successfully
  ```bash
  python3 -m build
  ```
- [ ] TypeScript packages build successfully
  ```bash
  pnpm build
  pnpm --filter @watchtower/cli build
  pnpm --filter @watchtower/web build
  ```
- [ ] Package metadata is complete
  - [ ] Description included
  - [ ] License specified
  - [ ] Author/maintainer set
  - [ ] Repository URL included
  - [ ] Keywords present
  - [ ] Homepage set

### Version Bump
- [ ] Version numbers updated in all files
  ```bash
  # Manual or using script:
  ./scripts/bump-version.sh patch  # or minor, major
  ```
- [ ] Files updated:
  - [ ] pyproject.toml
  - [ ] packages/cli/package.json
  - [ ] packages/web/package.json
  - [ ] package.json
  - [ ] README.md (if version referenced)

## Release

### Tag & Commit
- [ ] Version bump committed
  ```bash
  git add -A
  git commit -m "chore: bump version to X.Y.Z"
  ```
- [ ] Git tag created
  ```bash
  git tag -a vX.Y.Z -m "Release vX.Y.Z"
  ```
- [ ] Tag pushed to remote
  ```bash
  git push origin vX.Y.Z
  ```
- [ ] Branch merged to main (if releasing from feature branch)

### Publish
- [ ] Python package published to PyPI
  ```bash
  python3 -m build
  twine upload dist/*
  # OR
  pip install build && pip install twine
  python3 -m build && python3 -m twine upload dist/*
  ```
- [ ] CLI package published to npm
  ```bash
  cd packages/cli
  pnpm publish
  ```
- [ ] Verify packages are installable
  ```bash
  # Test Python:
  pip install watchtower-adk==X.Y.Z
  python3 -c "import watchtower; print(watchtower.__version__)"

  # Test CLI:
  npm install -g @watchtower/cli@X.Y.Z
  watchtower --version
  ```

## Post-Release

### Announcements
- [ ] GitHub release created with notes
- [ ] Changelog published in release notes
- [ ] Breaking changes clearly documented
- [ ] Upgrade instructions included
- [ ] Migration guide updated (if needed)

### Monitoring
- [ ] Check for immediate issues on GitHub
- [ ] Monitor download stats
- [ ] Watch for bug reports
- [ ] Respond to user questions

### Housekeeping
- [ ] Create tracking issue for next version
- [ ] Close issues resolved in this release
- [ ] Update roadmap if needed
- [ ] Archive release notes

## Quick Reference Commands

```bash
# Full release flow
./scripts/bump-version.sh patch
git add -A
git commit -m "chore: bump version to X.Y.Z"
git tag -a vX.Y.Z -m "Release vY.Y.Z"
git push origin main
git push origin vX.Y.Z

# Build and publish
python3 -m build
twine upload dist/*
cd packages/cli && pnpm publish
```

## Rollback Plan (if issues occur)

### Immediate Rollback (<1 hour)
1. Delete PyPI version: `pip install twine && twine delete watchtower-adk==X.Y.Z`
2. Unpublish npm version: `npm unpublish @watchtower/cli@X.Y.Z --force`
3. Announce rollback with clear reason

### Planned Rollback (<24 hours)
1. Fix the critical issue
2. Create hotfix branch: `git checkout -b hotfix/vX.Y.Z+1`
3. Bump patch version and test
4. Release hotfix
5. Announce fixed version

### Version Semantics

- **Major (X.0.0)**: Breaking changes, API modifications
- **Minor (0.Y.0)**: New features, backward compatible
- **Patch (0.0.Z)**: Bug fixes, no breaking changes
