---
description: Read the current feature PR, say what to do next and, on confirmation, run that sub-step with the right agent.
argument-hint: "[nothing]"
---
Tofu acts only when you run this skill.

1. Make sure you are on a `tofu/<n>-<slug>` branch. Read the PR: `gh pr view --json number,title,body,labels,isDraft,comments`. Session context may already hold a "Next:" line; treat the PR as the source of truth.
2. Work out the sub-step:

| State of the PR | Sub-step | Do |
| --- | --- | --- |
| No spec, no rules, or Open questions not empty | 1 Spec and design | Run agent `tofu:challenger` |
| Rules not all covered by tests | 2 Tests | Run agent `tofu:tester` |
| Tests cover all rules, no `tofu:approved` | Awaiting Approve | Tell the human to run `/tofu:approve approved`; do nothing else |
| Approved, checks failing or rules uncovered | 3 Code | Run agent `tofu:coder` |
| Checks green, no `<!-- tofu:judge -->` comment | 4 Verification | Run agent `tofu:judge` |
| Verified, no pre-staging link | 5 Pre-staging | Run `deploy.preview` from `tofu.config.json`, then ask CI/status to publish the URL (or add it to the status comment data) |
| Pre-staging up, no `tofu:accepted` | Awaiting Accept | Point to the Accept checklist; tell the human to run `/tofu:approve accepted` |
| Accepted | Done with Build | Suggest `/tofu:release add` |

3. Tell the human the sub-step in one line and **ask for confirmation** before launching an agent.
4. Report any warning (out of order, Frame inputs missing, canvas version different from the approved one). Warn and proceed; never block.
5. Before step 5 and when the PR has an approved design version, compare it with the canvas's current version if you can read it; on a difference, warn and say that Approve must be redone.
