# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## 0.1.5

### Features

- Add --help, --version flags, vault path validation, prepublishOnly script
- Server factory, CLI with stdio/HTTP transports, examples, README
- All tool handlers -- init, CRUD, ingest, search, lint
- Wiki manager with CRUD, backlink detection, index/log integration
- Search provider interface, simple and qmd providers, auto-detect
- Index manager with categorized page catalog
- Log manager with append-only log.md and filtered reads
- Link resolver with wikilink and markdown modes
- Schema loader with yaml parsing and defaults
- Project scaffold with types and build config

### Fixes

- Require Node.js >= 20 (vitest v4 needs styleText from node:util)
- Add missing @cfworker/json-schema dependency

### Docs

- Simplify use cases and when-to-use guidance
- Add scenarios and guidance on when to use llm-wiki-mcp
- Add npm, CI, and license badges to README
- Update README with consistent naming, Claude Code config, and Node.js requirement
- Enrich README with Karpathy's LLM Wiki pattern context and correct gist link
- Add CLAUDE.md for Claude Code context
- Add CONTRIBUTING.md

### CI

- Use ci environment for npm publish secrets
- Use env environment for npm publish secrets
- Add auto-publish to npm on version tags
- Add GitHub Actions workflow for test, type check, and build

### Chores

- Add issue/PR templates, code of conduct, and test coverage
- Update repo URLs to llm-wiki-mcp
- Rename package to llm-wiki-mcp for npm publishing
- Prepare for public release -- LICENSE, gitignore, package.json metadata
