# GitLab CI Example

Automatically release on every push to `main` in GitLab CI/CD.

## Setup

1. Copy `.gitlab-ci.yml` to your repo root
2. Run `npx bumpcraft init`
3. In GitLab: Settings > CI/CD > Variables > add `GITLAB_TOKEN` with `api` scope
4. Push to main

## Notes

- The `validate` step exits cleanly if there's nothing to release
- Tags and version bumps are pushed back to the repo automatically
- Bumpcraft doesn't have a built-in GitLab release plugin, but you can add a `curl` step to create GitLab releases via API
