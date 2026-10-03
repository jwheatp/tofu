---
description: Manage the release batch: new, add, remove, accept.
---
Run `tofu release $ARGUMENTS` (`new <x.y.z>`, `add <n>`, `remove <n>`, `accept`). `add` merges the accepted feature into `staging` and tags it; `remove` reverts the merge and refuses if a staged feature depends on it.
