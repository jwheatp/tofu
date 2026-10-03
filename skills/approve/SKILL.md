---
description: Record a human decision (approved, accepted, release-accepted, shipped) after showing the evidence and asking for typed confirmation.
argument-hint: "[approved|accepted|release-accepted|shipped] [--skip \"reason\"]"
disable-model-invocation: true
---
Only a human records a decision. Never confirm on the human's behalf.

1. Pick the decision from the argument, or from the PR state (`/tofu:next` logic) if omitted.
2. Run the checks for it and **show the evidence**:

| Decision | Evidence to show |
| --- | --- |
| `approved` | Spec rules, open questions (must be empty), the screens table, the scenario list from the status comment, rule coverage |
| `accepted` | Green checks, pre-staging link, the Accept checklist |
| `release-accepted` | Staging deploy and E2E result, features in the release milestone |
| `shipped` | Release PR content and release notes draft |

3. Warn about anything missing (warnings never block). With `--skip "reason"` skip the checks and record the reason.
4. Ask the human to type `approve` (or the reason with `--skip`). Anything else cancels.
5. Record it:
   - `gh pr edit --add-label tofu:<decision>` (create the label if missing).
   - `gh pr comment` with exactly this shape (`<by>` from `gh api user -q .login`, `<sha>` from `git rev-parse --short HEAD`):
     ```
     <!-- tofu:decision <decision>[ skipped] -->
     ✅ **<Decision name>** · @<by> · <date> · commit `<sha>`
     Evidence: <one line>   (or: ⏭ Skipped: <reason>)
     ```
6. On `approved`: write the canvas's current version into the design section (`approved version`) with `gh pr edit --body-file`, touching nothing else.
