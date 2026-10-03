# Tofu

Claude Code plugin: spec-anchored, decision-driven development (Frame → Build → Release → Ship).

- Install: `/plugin marketplace add <org>/tofu` then `/plugin install tofu@tofu-marketplace`
- Daily commands: `/tofu:next`, `/tofu:approve`, `/tofu:status`
- Advanced: `init`, `adopt`, `start`, `goto`, `release`, `ship`, `change`, `hotfix`, `retro`, `sync`, `help`
- Layout: `plugins/tofu` (skills, agents, hooks, `bin/tofu` CLI, `lib/`), `.github/workflows` (reusable CI: feature, locks, decisions, preview, staging, release)
- Tests: `node --test "plugins/tofu/test/*.test.js"`

Hard locks: the coder cannot edit tests/specs/docs/CI/config (hooks + `locks.yml`); merges to staging/main need recorded decisions (`decisions.yml`).

Not yet implemented: Claude Design export/drift check, judge on a second model, Tofu pane (v2), mutation/duplication checks in `feature.yml`.
