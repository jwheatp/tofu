---
description: Merge staging into main, tag the version, publish the release.
---
Run `tofu ship`. It requires the `release-accepted` decision unless config marks it optional, merges `staging` into `main`, and tags `vX.Y.Z`. Then publish the GitHub Release from the milestone.
