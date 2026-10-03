---
description: Move the project or a feature one step forward in the Tofu process, or say which human decision is awaited.
argument-hint: "[feature number]"
---
1. Run `tofu next $ARGUMENTS` and read the JSON.
2. `kind: decision` → tell the human which decision is awaited and to run `/tofu:approve <decision>`. Never record it yourself.
3. `kind: step` → run the step with its agent: 5 `challenger`, 6 `tester`, 7 `coder`, 8 `judge`, 9 deploy via `deploy.preview` and write `report.md`. When the step is done, run `tofu advance <n>`.
4. Show any warning returned by `tofu status`; warn but never block.
