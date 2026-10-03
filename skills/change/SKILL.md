---
description: Change request - re-enter Build at the spec, never at the code.
---
1. Read the PR. Warn that editing the spec after Approve removes the Approve label (CI also does this).
2. Run agent `tofu:challenger` with the change request: update rules, examples and Decisions in the spec; reopen questions.
3. After the edit, make sure `tofu:approved` and `tofu:accepted` are removed and a comment explains why. Tests and code follow the normal loop (`/tofu:next`).
