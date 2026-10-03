---
description: Hotfix lane for a critical production bug - reduced Build, patch version.
argument-hint: "<title>"
---
1. Branch `tofu/<n>-hotfix-<slug>` from the latest production tag `v*`; empty commit; draft PR `[tofu] Hotfix: <title>` from the template.
2. Reduced Build: the fix as one rule with one example; test first (`tofu:tester`), code (`tofu:coder`), verification, pre-staging.
3. Normal decisions (Approve, Accept). Ship as a patch version `v<x.y.(z+1)>` through the usual release PR, then merge `main` back into `staging`.
