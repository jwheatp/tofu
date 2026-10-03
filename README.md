# Tofu

Claude Code plugin: spec-anchored, decision-driven development (Frame → Build → Release → Ship).

- Install: `/plugin marketplace add <org>/tofu` then `/plugin install tofu@tofu-marketplace`
- Core commands: `/tofu:next`, `/tofu:approve`, `/tofu:status`
- Layout: `plugins/tofu` (skills, agents, hooks, `bin/tofu` CLI)
- Tests: `node --test plugins/tofu/test/core.test.js`

Status: **v0.1 skeleton** (state, next/approve/status, warnings, coder locks via hooks, GitHub sync).
Not yet done: `init`/`adopt`, CI workflows, Claude Design snapshot, release/ship (v0.2+).
