---
description: Record a human decision (frame-client, frame-foundations, approved, accepted, release-accepted, shipped) after showing the evidence.
argument-hint: "[decision] [feature] [--skip reason]"
disable-model-invocation: true
---
1. Show the evidence for the decision (spec, scenarios, report, checks) from the repository.
2. Ask the human to type `yes` to confirm. An AI agent never confirms on a human's behalf.
3. Only then run `tofu approve $ARGUMENTS`.
4. If GitHub is configured, add the label `tofu:<decision>` and post a comment (person, date, evidence, commit) with `gh`.
