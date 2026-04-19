# skills.ws — Agent Skills for AI Coding Assistants

> Curated library of SKILL.md files that plug into OpenClaw, Claude Code, Cursor, and Codex. Marketing, growth, web3, dev, design and operations skills.

Site: https://skills.ws
Package: `npx skills-ws`
Repository: https://github.com/san-npm/skills-ws

## Machine-readable entry points

- Full skill registry — https://skills.ws/skills.json
- Agent Skills discovery index — https://skills.ws/.well-known/agent-skills/index.json
- Canonical SKILL.md files — https://skills.ws/.well-known/agent-skills/{name}/SKILL.md
- API catalog — https://skills.ws/.well-known/api-catalog
- OpenAPI spec — https://skills.ws/.well-known/openapi.yaml
- Long-form reference — https://skills.ws/llms-full.txt

## Using skills

Each skill is a standalone SKILL.md file containing a description, workflow, and checklists. To install all skills locally:

    npx skills-ws

This drops skills into the platform-appropriate location for OpenClaw, Claude Code, Cursor or Codex. Individual skills can also be fetched by URL; `digest` values in the discovery index let clients cache and verify them.

## Categories

`analytics`, `conversion`, `design`, `dev`, `growth`, `marketing`, `operations`, `web3`.

See /skills.json for the authoritative list with descriptions, features, and use cases.
