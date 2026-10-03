---
description: Ship the release - merge staging into main, tag the version, publish the GitHub Release from the milestone.
disable-model-invocation: true
---
1. Warn if the release PR lacks `tofu:release-accepted` (record it with `/tofu:approve release-accepted` first). Ask for `/tofu:approve shipped`.
2. Merge the release PR (`staging` into `main`); CI `decisions` must pass.
3. Tag `v<x.y.z>` on `main`, run `deploy.production`, run the smoke test.
4. Publish the GitHub Release with notes from the milestone (merged PRs).
5. Close the milestone. Offer a short retrospective note: for each escaped defect, one rule for `tofu.config.json` `rules`, or one generic test.
