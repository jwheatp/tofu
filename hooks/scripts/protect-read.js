'use strict';
const L = require('./lib');

const i = L.readInput();
const role = L.roleOf(i);
if (role !== 'challenger' && role !== 'tester') process.exit(0);
const t = i.tool_input || {};
const target = t.file_path || t.path || t.pattern || '';
if (!target) process.exit(0);
const cfg = L.loadConfig();
if (L.isApp(String(target).replace(/\*.*$/, ''), cfg)) L.block(`${role} must not read application code (${L.rel(target)}). Work from the spec, the design and the contracts.`);
