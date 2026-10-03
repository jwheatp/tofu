---
description: Manage the staging release - `add <feature>` merges an accepted feature into staging, `remove <feature>` reverts it.
argument-hint: "add|remove <feature number>"
disable-model-invocation: true
---
Requires profile `full`. Claude merges; nobody reviews code line by line.

**add**: 
1. Check the PR has `tofu:accepted` (warn if not). Check `thresholds.maxFeaturesPerRelease` (default 4) against the milestone.
2. Ensure the milestone `v<x.y.z>` exists (ask for the version if there is none open) and a draft release PR `[tofu] Release v<x.y.z>` from `staging` to `main`.
3. Mark the feature PR ready, merge it into `staging` with a merge commit, tag the merge `tofu-staging/<n>-<slug>`, add the PR to the milestone.
4. Tag a new candidate `v<x.y.z>-rc.<k>` on `staging`, and trigger the staging checks.

**remove**:
1. Refuse if another staged feature depends on it (check the Frame feature list); list the dependants.
2. `git revert -m 1 <merge commit of tofu-staging/<n>-<slug>>` on `staging`, remove the PR from the milestone, tag a new `rc`.

Migrations must stay additive so a revert never breaks the schema; warn if the diff has a destructive migration.
