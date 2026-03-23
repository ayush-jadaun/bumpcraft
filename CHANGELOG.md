# Changelog

## [1.5.4](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.5.4) (2026-03-23) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.5.3...v1.5.4))

### 🐛 Bug Fixes

- default plugins to conventional-commits + changelog-md when not specified ([e869845](https://github.com/ayush-jadaun/bumpcraft/commit/e86984585b38347d8fd3588e58c120115887ad43))

## [1.5.3](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.5.3) (2026-03-23) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.5.2...v1.5.3))

### 🐛 Bug Fixes

- add verbose logging to monorepo release for debugging ([5cb7f32](https://github.com/ayush-jadaun/bumpcraft/commit/5cb7f32dfd96650b9c27e747861933a8cab424d0))

### 📚 Documentation

- add npm downloads badge to README ([5133c5f](https://github.com/ayush-jadaun/bumpcraft/commit/5133c5f2c8bda3f58f8cf86aa23564fe6c43ed0a))

## [1.5.2](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.5.2) (2026-03-23) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.5.1...v1.5.2))

### 🐛 Bug Fixes

- auto-detect monorepo from pnpm-workspace.yaml ([195f2da](https://github.com/ayush-jadaun/bumpcraft/commit/195f2da5477b7f6a47014065a3ea62cfca29e703))

## [1.5.1](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.5.1) (2026-03-23) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.5.0...v1.5.1))

### 🐛 Bug Fixes

- validate and changelog commands now monorepo-aware ([b5a93e6](https://github.com/ayush-jadaun/bumpcraft/commit/b5a93e61ffb2636c7cb201443d8597479809186a))

## [1.5.0](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.5.0) (2026-03-23) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.4.1...v1.5.0))

### 🚀 Features

- changeset files and version PR mode (224 tests) ([1f850ed](https://github.com/ayush-jadaun/bumpcraft/commit/1f850eded3df0aca24bbb2c68f76729e810c4475))
- publish, hooks, workspace detect, linked packages, GitLab/Bitbucket plugins, custom templates, status command (205 tests) ([a4ca293](https://github.com/ayush-jadaun/bumpcraft/commit/a4ca293b5032b359db12bc2a98ba87636b5c5b08))
- monorepo support with 29 comprehensive tests (163 total) ([82b28c7](https://github.com/ayush-jadaun/bumpcraft/commit/82b28c7807cd2e06e6884b2242a5cb97c2a35cd0))
- --push adds [skip ci] to release commits ([6f1da26](https://github.com/ayush-jadaun/bumpcraft/commit/6f1da26856ff9704fa3e436c27d4532754772a06))

### 🐛 Bug Fixes

- resolve TS2451 duplicate config declaration in release.ts ([1fa651c](https://github.com/ayush-jadaun/bumpcraft/commit/1fa651ca25fe7e55eb3cf99b8bd9aa49530759c1))

### 📚 Documentation

- update all docs for [skip ci] in --push release commits ([6c3642a](https://github.com/ayush-jadaun/bumpcraft/commit/6c3642af4818df3a78e13ba7becbb49273c89aa4))

## [1.4.1](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.4.1) (2026-03-22) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.4.0...v1.4.1))

### 🐛 Bug Fixes

- --push silently skips pushTag when tag already exists on remote ([c016b19](https://github.com/ayush-jadaun/bumpcraft/commit/c016b193cc941b1ff7b885fca248277f0ac8a039))

## [1.4.0](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.4.0) (2026-03-22) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.3.1...v1.4.0))

### 🚀 Features

- --push auto-creates GitHub release when GITHUB_TOKEN is set ([32b9750](https://github.com/ayush-jadaun/bumpcraft/commit/32b97502583e9e1cabb3ac4c57fdf6174a7d571d))

## [1.3.1](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.3.1) (2026-03-22) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.3.0...v1.3.1))

### 🐛 Bug Fixes

- performance and robustness hardening ([57f1a28](https://github.com/ayush-jadaun/bumpcraft/commit/57f1a28cf45ab1fc55d222561b393e3e8f1d739d))

### ✅ Tests

- add edge case tests for all untested scenarios (132 total) ([5e3a792](https://github.com/ayush-jadaun/bumpcraft/commit/5e3a792762add2788f598971d0685269c607f03e))
- comprehensive edge case tests for all failure scenarios ([f601836](https://github.com/ayush-jadaun/bumpcraft/commit/f601836bf7a96d6c101800229870f86f5c12555c))

## [1.3.0](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.3.0) (2026-03-22) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.2.2...v1.3.0))

### 🚀 Features

- add --push flag to release and init-release commands ([9a1b90e](https://github.com/ayush-jadaun/bumpcraft/commit/9a1b90e0290db9567c4a39b1768d5bf33c4921f4))

## [1.2.2](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.2.2) (2026-03-22) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.2.1...v1.2.2))

### 🐛 Bug Fixes

- rename --version to --tag-version in init-release (conflicts with commander global --version flag) ([baf5969](https://github.com/ayush-jadaun/bumpcraft/commit/baf5969200ee4877bad092a029e71e6afd2c7ed1))

## [1.2.1](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.2.1) (2026-03-22) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.2.0...v1.2.1))

### 🐛 Bug Fixes

- init-release now commits version change before tagging ([05c3723](https://github.com/ayush-jadaun/bumpcraft/commit/05c37232974ef1727ed6fe1d9dc1185bee424d74))

## [1.2.0](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.2.0) (2026-03-22) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.1.2...v1.2.0))

### 🚀 Features

- add init-release command for baseline tagging ([c1fba98](https://github.com/ayush-jadaun/bumpcraft/commit/c1fba983ed3501c1feed4d351c1dcd2ff4ceb389))

### 📚 Documentation

- add llms.txt for AI agent context, include in npm package ([8593b40](https://github.com/ayush-jadaun/bumpcraft/commit/8593b406337bc2af0e858d9d6084ae54d373b74e))

### ci

- skip CI on docs-only changes (README, docs/, examples/, LICENSE) ([a5874e0](https://github.com/ayush-jadaun/bumpcraft/commit/a5874e06e3da7ba4d8983ed4165e9b2b1c151633))

## [1.1.2](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.1.2) (2026-03-22) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.1.1...v1.1.2))

### 🐛 Bug Fixes

- CI release — fetch tags, create local git tag, fix exit code capture ([1be68d6](https://github.com/ayush-jadaun/bumpcraft/commit/1be68d610d86541a20d9aa43c709cb3dc5535693))

## [1.1.1](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.1.1) (2026-03-22) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.1.0...v1.1.1))

### 🐛 Bug Fixes

- CI pipeline — skip bot commits, proper error handling, conditional npm publish ([5e71654](https://github.com/ayush-jadaun/bumpcraft/commit/5e716543bfe9cb87fef24ecbd292e48b41f73acf))

## [1.1.0](https://github.com/ayush-jadaun/bumpcraft/releases/tag/v1.1.0) (2026-03-22) ([compare](https://github.com/ayush-jadaun/bumpcraft/compare/v1.0.3...v1.1.0))

### 🚀 Features

- rich changelog with emoji sections, commit links, and compare URLs ([5f7101a](https://github.com/ayush-jadaun/bumpcraft/commit/5f7101aa216e12dab727bee5358b917c2dce4766))
- CHANGELOG.md auto-generated on release + audit fixes ([5b7a343](https://github.com/ayush-jadaun/bumpcraft/commit/5b7a3432207764897f72512c71e6b36040d85f2b))

### 📚 Documentation

- add npm and license badges to README ([0ad4d8f](https://github.com/ayush-jadaun/bumpcraft/commit/0ad4d8f9d0349fe9fcb4bdb34256edab74f27cad))
- add CHANGELOG, CONTRIBUTING, and issue templates for open-source release ([e430711](https://github.com/ayush-jadaun/bumpcraft/commit/e4307113ef4713bfc69d47198cc721a410687315))
- add production examples (GitHub Actions, GitLab CI, programmatic, groups, Docker API) ([b949501](https://github.com/ayush-jadaun/bumpcraft/commit/b949501e728a7845193c7eb187f2d23f8826f271))

### ci

- enable CI/CD pipeline — tests on push/PR, auto-release on main ([d689c82](https://github.com/ayush-jadaun/bumpcraft/commit/d689c82b877aa2049cc8de945f8419aadb793b4b))

## 1.0.3 (2026-03-18)

First public release of Bumpcraft.
