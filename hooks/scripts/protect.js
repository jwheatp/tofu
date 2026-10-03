'use strict';
const L = require('./lib');

const i = L.readInput();
const role = L.roleOf(i);
const file = i.tool_input && (i.tool_input.file_path || i.tool_input.path || i.tool_input.notebook_path);
if (!role || !file) process.exit(0);
const cfg = L.loadConfig();
if (role === 'coder' && L.isProtected(file, cfg)) L.block(`the coder cannot modify ${L.rel(file)} (tests, CI, Tofu config are locked).`);
if (role === 'tester' && !L.isTest(file, cfg)) L.block(`the tester can only write test files, not ${L.rel(file)}.`);
if ((role === 'challenger' || role === 'judge')) L.block(`${role} is read-only on files; the spec lives in the pull request.`);
