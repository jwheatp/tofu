'use strict';
const L = require('./lib');
const pr = require('./pr');

const i = L.readInput();
if (i.stop_hook_active) process.exit(0);
const dir = L.projectDir();
const b = L.branch(dir);
if (!L.featureBranch(b)) process.exit(0);
const data = L.readCache(dir, b);
if (!data) process.exit(0);
const d = pr.statusData(data.comments);
const fail = d && d.failing > 0 ? ` · ❌ ${d.failing} failing test(s)` : '';
L.say({ systemMessage: `🥢 Tofu · ${pr.nextAction(data).text}${fail}` });
