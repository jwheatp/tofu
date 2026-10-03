'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const pr = require('./pr');

const dir = L.projectDir();
const cfg = L.loadConfig(dir);
const parts = [];
try { parts.push(fs.readFileSync(path.join(L.pluginRoot(), 'rules', 'agents.md'), 'utf8')); } catch { /* optional */ }
if (Array.isArray(cfg.rules) && cfg.rules.length) parts.push('## Project rules\n' + cfg.rules.map((r) => `- ${r}`).join('\n'));

const b = L.branch(dir);
if (L.featureBranch(b)) {
  let data = null, note = '';
  try { data = L.fetchPr(dir); L.writeCache(data, dir, b); }
  catch { data = L.readCache(dir, b); note = data ? ' (offline: cached)' : ' (no PR found; is `gh` authenticated?)'; }
  if (data) {
    const labels = [...pr.labelSet(data)].filter((l) => l.startsWith('tofu:')).join(', ') || 'none';
    const spec = pr.section(data.body, 'spec');
    parts.push(`## Current Tofu feature${note}\nPR #${data.number} ${data.title} (${data.isDraft ? 'draft' : data.state}) · labels: ${labels}\nRules: ${pr.parseRules(spec).map((r) => r.id).join(', ') || 'none'} · open questions: ${spec ? pr.openQuestions(spec).items.length : 'n/a'}\nNext: ${pr.nextAction(data).text}`);
  } else parts.push(`## Current Tofu feature${note}`);
}
if (parts.length) L.say({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: parts.join('\n\n') } });
