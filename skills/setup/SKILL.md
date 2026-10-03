---
description: Set Tofu up in a project: write tofu.config.json by asking where things are, add the CI workflow and settings entries. Never touches existing files.
---
Never overwrite or edit a file Tofu did not create; show a diff and ask first when a file exists.

1. **Frame inputs**: ask where each output is (brief, design system, architecture, feature list; a path or URL, or "none"). Look in the repo first and propose what you find. Move nothing.
2. **Tests and contracts**: detect test folders and a contracts folder; confirm with the human.
3. **Write `tofu.config.json`** from `${CLAUDE_PLUGIN_ROOT}/templates/tofu.config.json` with the answers (ask for `deploy.preview` and `deploy.production` commands).
4. **CI**: write `.github/workflows/tofu.yml` from `${CLAUDE_PLUGIN_ROOT}/templates/tofu.yml`. Confirm the owner of the Tofu repository in `uses:`. Remind that Actions access to the Tofu repository must be enabled for the organisation.
5. **`.claude/settings.json`**: merge (never replace) the Tofu marketplace (`extraKnownMarketplaces`) and `enabledPlugins`, and add `permissions.deny` entries `Edit(<path>)` and `Write(<path>)` for each test path, `.github/**` and `tofu.config.json`. Tell the human these deny rules also apply to them inside Claude Code; they remain free to edit those files in their editor.
6. **Labels**: create with `gh label create --force`: `tofu:approved`, `tofu:accepted`, `tofu:release-accepted`, `tofu:shipped`, `tofu:override`.
7. Print what was created and what was left alone.
