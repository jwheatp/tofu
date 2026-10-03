'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const L = require('./lib');

const MAX_RETRIES = 5;
const i = L.readInput();
const dir = L.projectDir();
const cfg = L.loadConfig(dir);

let checks = Array.isArray(cfg.checks) ? cfg.checks : [];
if (!checks.length) {
  try {
    const scripts = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts || {};
    checks = ['typecheck', 'lint', 'test'].filter((s) => scripts[s]).map((s) => `npm run --silent ${s}`);
  } catch { /* no package.json */ }
}
if (!checks.length) process.exit(0);

const counter = path.join(L.dataDir(), `coder-${String(i.session_id || 'x').replace(/\W/g, '')}.json`);
let tries = 0;
try { tries = JSON.parse(fs.readFileSync(counter, 'utf8')).tries; } catch { /* first run */ }

for (const c of checks) {
  const r = spawnSync(c, { cwd: dir, shell: true, encoding: 'utf8', timeout: 540000 });
  if (r.status !== 0) {
    tries += 1;
    try { fs.mkdirSync(L.dataDir(), { recursive: true }); fs.writeFileSync(counter, JSON.stringify({ tries })); } catch { /* best effort */ }
    if (tries >= MAX_RETRIES) { L.say({ systemMessage: `Tofu: "${c}" still fails after ${MAX_RETRIES} attempts. Stopping; escalate to the human.` }); process.exit(0); }
    L.block(`"${c}" fails (attempt ${tries}/${MAX_RETRIES}). Fix the code, never the tests.\n${(r.stdout + r.stderr).slice(-1500)}`);
  }
}
try { fs.unlinkSync(counter); } catch { /* none */ }
