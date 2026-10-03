'use strict';
const L = require('./lib');
const pr = require('./pr');

const i = L.readInput();
const text = [i.command_name, i.expansion_name, i.skill, i.prompt, i.command].filter(Boolean).join(' ');
const m = /\/?tofu:([\w-]+)\s*(.*)$/m.exec(text);
if (!m) process.exit(0);
const w = pr.warningsFor(m[1], m[2], L.readCache(), L.loadConfig());
if (w.length) {
  const msg = w.map((x) => `⚠ ${x}`).join('\n');
  L.say({ systemMessage: `Tofu warning (continuing anyway):\n${msg}`, hookSpecificOutput: { hookEventName: 'UserPromptExpansion', additionalContext: `Tofu warnings (tell the user, do not block):\n${msg}` } });
}
