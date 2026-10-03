---
description: How to write a Tofu spec - rules with IDs, examples, edge cases.
user-invocable: false
---
- One rule, one heading: `### R-<AREA>-<nnn> · Short title`, then **one** sentence starting with "When", naming trigger and observable response.
- IDs are stable and never reused. `<AREA>` is 3-6 capital letters.
- Each rule has an examples table (`| Example | Input | Expected |`) with at least a normal case; add boundary cases.
- Edge cases go in a `<details>` block, one line each.
- Observable behaviour only; no implementation details.
- Fixed order: 📋 Rules, ❓ Open questions, 🧭 Decisions, 🎨 Design. Write empty states out ("_None. Ready for Approve._").
