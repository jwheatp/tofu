'use strict';
const L = require('./lib');

const i = L.readInput();
const role = L.roleOf(i);
const cmd = (i.tool_input && i.tool_input.command) || '';
if (!role || !cmd) process.exit(0);
const cfg = L.loadConfig();
if (role === 'coder') {
  for (const [re, why] of L.FORBIDDEN_CODER_SHELL) if (re.test(cmd)) L.block(why + '.');
  const hit = L.shellTouches(cmd, cfg);
  if (hit) L.block(`the coder cannot write to ${hit} from the shell (tests, CI, Tofu config are locked).`);
}
if (role === 'tester') {
  const hit = L.shellTouches(cmd, { paths: { tests: [] } });
  if (hit) L.block(`the tester cannot write to ${hit}.`);
}
if (role === 'judge' && /\bgit\s+(commit|push|checkout|reset|merge|rebase)\b|>>?\s*\S/.test(cmd)) L.block('the judge is read-only.');
