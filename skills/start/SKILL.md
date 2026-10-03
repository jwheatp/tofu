---
description: Start a feature - pick it from the Frame feature list, create the branch and the draft PR from the template.
argument-hint: "[feature]"
---
1. Read `frame.features` from `tofu.config.json` (any format). Warn, never block, if Frame inputs are missing.
2. List open Tofu PRs (`gh pr list --search "[tofu] in:title"`) so you do not start a feature twice. Propose the next feature in order, respecting dependencies, or use the argument. Ask for confirmation.
3. Derive `<n>` (the feature's number in the list, or the next free integer) and `<slug>`.
4. `git checkout -b tofu/<n>-<slug>` from the default branch; `git commit --allow-empty -m "tofu: start <title>"`; push.
5. Fill `${CLAUDE_PLUGIN_ROOT}/templates/pr-body.md` with the goal and out-of-scope in a few sentences from the feature list and open the **draft** PR: `gh pr create --draft --title "[tofu] <Title>"` with the body. Keep the template markers.
6. Tell the human to run `/tofu:next`.
