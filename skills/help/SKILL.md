---
description: List Tofu skills and the three you need every day.
---
Daily: `/tofu:next` (what to do now), `/tofu:approve` (record a human decision), `/tofu:status` (where the feature stands).
Optional: `/tofu:setup`, `/tofu:start`, `/tofu:release add|remove`, `/tofu:ship`, `/tofu:change`, `/tofu:hotfix`, `/tofu:help`.
Everything about a feature is in its pull request (`[tofu] <Title>`). Tofu warns but never blocks, except the two locks: the coder cannot edit tests/spec/config, and merges to staging/main need the matching labels.
