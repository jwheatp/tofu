'use strict';
const fs = require('fs');
const path = require('path');
const asList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const load = (dir = process.cwd()) => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'tofu.config.json'), 'utf8')); } catch { return {}; } };
module.exports = { asList, load };
