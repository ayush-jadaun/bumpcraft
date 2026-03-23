# Publishing

Publish packages to npm with `bumpcraft publish`.

## Basic Usage

```bash
# Publish the current package
bumpcraft publish

# Preview without publishing
bumpcraft publish --dry-run

# With npm provenance (supply chain security, CI only)
bumpcraft publish --provenance

# Specific dist-tag
bumpcraft publish --tag beta

# With 2FA one-time password
bumpcraft publish --otp 123456
```

## Monorepo Publishing

```bash
# Publish all public packages
bumpcraft publish

# Publish a specific package
bumpcraft publish --package auth
```

### Private packages

Packages with `"private": true` in `package.json` are **automatically skipped**:

```
auth: published
api: published
internal-tools: private — skipping
```

## npm Provenance

Use `--provenance` to generate npm provenance attestations. This proves the package was built from a specific git commit in a trusted CI environment.

```bash
bumpcraft publish --provenance
```

Requirements:
- Must run in a supported CI (GitHub Actions, GitLab CI)
- npm v9.5.0+
- Package must be published to the public npm registry

## CI Integration

### GitHub Actions

```yaml
- name: Release
  run: npx bumpcraft release --approve --push
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPOSITORY: ${{ github.repository }}

- name: Publish
  run: npx bumpcraft publish --provenance
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### GitLab CI

```yaml
- npx bumpcraft release --approve --push
- npx bumpcraft publish
```

## Options

| Flag | Description |
|------|-------------|
| `--package <name>` | Publish a specific monorepo package |
| `--provenance` | Generate npm provenance attestation |
| `--tag <tag>` | npm dist-tag (default: `latest`) |
| `--dry-run` | Preview without publishing |
| `--otp <code>` | One-time password for npm 2FA |
