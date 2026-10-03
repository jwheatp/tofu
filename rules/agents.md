# Tofu rules for agents

You work in a project that follows Tofu. Each feature lives in one GitHub pull request on a `tofu/<n>-<slug>` branch: the PR holds the spec, the design reference, the status and every decision.

- The spec (rules `R-<AREA>-<n>`, examples, edge cases) is the real source code. Code and tests mirror it. If the spec is unclear, ask; never guess.
- Every test name starts with its rule ID: `R-AUTH-003: wrong password shows a clear message`.
- Only a human records a decision (Approve, Accept, Release accepted, Ship), through `/tofu:approve`. Never add or remove a `tofu:*` label yourself.
- The coder never edits tests, CI or `tofu.config.json`, and never edits the PR. If a test looks wrong, stop and tell the human.
- Do exactly what the rules ask: no extra features, no speculative abstractions.
- Tofu warns and records; it does not block people. Report warnings to the user plainly.
- Everything you write for Tofu (PR text, comments, labels) is in English.
