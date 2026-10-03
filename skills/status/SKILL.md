---
description: Summarise the current feature's PR; with --all list every open Tofu PR.
argument-hint: "[--all]"
---
1. Default: `gh pr view --json number,title,body,labels,isDraft,url,comments` and show in a few lines: title and link, phase, decisions (Approve, Accept with person and date, skips with reason), rule coverage and failing tests from the status comment, open questions, warnings, next action.
2. `--all`: `gh pr list --search "head:tofu/" --json number,title,labels,isDraft,url` (also `--search "[tofu]" in:title`) and show one line per PR: title, phase from labels, link.
3. Warn about design drift if the canvas's current version differs from the approved one. Never modify anything.
