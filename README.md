# 🥢 Tofu

Lightweight Claude Code plugin that guides and guards the build of each feature, from spec to production. **Passive**: it reminds, warns and protects, and acts only when you run a skill. Only skills, agents and hooks — no CLI, no service.

Each feature lives in one draft pull request (`[tofu] <Title>`, branch `tofu/<n>-<slug>`): spec, design reference, status and every decision.

## Install
```
/plugin marketplace add jwheatp/tofu
/plugin install tofu@tofu-marketplace
/tofu:setup        # writes tofu.config.json + .github/workflows/tofu.yml, nothing else
```

## Daily use
`/tofu:next` · `/tofu:approve` · `/tofu:status` — optional: `setup`, `start`, `release`, `ship`, `change`, `hotfix`, `help`.

## Layout
- `skills/`, `agents/` (`tofu:challenger|tester|coder|judge`), `hooks/` (Node scripts called only by hooks), `rules/agents.md`, `templates/`, `schema/`
- `ci/` + `.github/workflows/tofu.yml`: reusable CI (quality, status comment, locks, decisions, invalidation on spec edit); call it with `templates/tofu.yml` pinned at `@v1`
- Tests: `npm test`

## Hard locks
1. The coder cannot modify tests, CI or Tofu config, nor edit the PR (hooks + CI `locks`).
2. Merges to `staging`/`main` need the matching `tofu:*` labels (CI `decisions`); only a recorded human override bypasses.

## Notes / to verify against your Claude Code version
- Hooks identify subagents through `agent_type` (`tofu:coder`…); `UserPromptExpansion` input field names are read loosely.
- `checks` (optional list of commands run when the coder stops) is an addition to the spec's config keys.
- Pin the shared CI by tagging this repo `v1`; enable Actions access to this private repo for your organisation (and optionally set the `TOFU_READ_TOKEN` secret).
