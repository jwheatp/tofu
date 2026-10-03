---
description: How test names map to the scenario list in the status comment.
user-invocable: false
---
- Every test name starts with its rule ID and a colon: `R-AUTH-003: wrong password shows a clear message`.
- The scenario list is derived from these names, one row per rule; write the part after the colon as a sentence a client can read.
- A rule with no test appears as ⚠️ in the status comment; any failing test as ❌.
