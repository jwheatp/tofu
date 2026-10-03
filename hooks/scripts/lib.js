'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const projectDir = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();
const dataDir = () => process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'tofu');
const pluginRoot = () => process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..', '..');

function readInput() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}
function loadConfig(dir = projectDir()) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'tofu.config.json'), 'utf8')); } catch { return {}; }
}
function branch(dir = projectDir()) {
  try { return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).trim(); } catch { return ''; }
}
const featureBranch = (b) => /^tofu\/(\d+)-(.+)$/.exec(b || '') && { n: Number(RegExp.$1), slug: RegExp.$2 };

const cacheFile = (dir, b) => path.join(dataDir(), `pr-${crypto.createHash('sha1').update(dir + '\0' + b).digest('hex').slice(0, 12)}.json`);
function readCache(dir = projectDir(), b = branch(dir)) {
  try { return JSON.parse(fs.readFileSync(cacheFile(dir, b), 'utf8')); } catch { return null; }
}
function writeCache(pr, dir = projectDir(), b = branch(dir)) {
  try { fs.mkdirSync(dataDir(), { recursive: true }); fs.writeFileSync(cacheFile(dir, b), JSON.stringify(pr)); } catch { /* cache is best effort */ }
}
// The only network call of a session.
function fetchPr(dir = projectDir()) {
  const out = execFileSync('gh', ['pr', 'view', '--json', 'number,title,body,labels,isDraft,state,url,comments'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 });
  return JSON.parse(out);
}

// ---- roles and protected paths ----
const roleOf = (input) => {
  const t = String(input.agent_type || process.env.TOFU_ROLE || '');
  const m = /(?:^|:)(challenger|tester|coder|judge)$/.exec(t);
  return m ? m[1] : null;
};
const asList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const PROTECTED_EXTRA = ['.github/**', 'tofu.config.json', '.claude/settings.json', '.claude/settings.local.json'];

function toPattern(p) {
  let g = String(p).replace(/\\/g, '/').replace(/^\.\//, '');
  if (g.endsWith('/')) g += '**';
  const re = g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\0').replace(/\*\*/g, '\u0001').replace(/\*/g, '[^/]*').replace(/\0/g, '(?:.*/)?').replace(/\u0001/g, '.*');
  return new RegExp(`^${re}$`);
}
const testPatterns = (cfg) => asList(cfg.paths && cfg.paths.tests).map(toPattern);
const protectedPatterns = (cfg) => [...asList(cfg.paths && cfg.paths.tests), ...PROTECTED_EXTRA].map(toPattern);
const appPatterns = (cfg) => asList((cfg.paths && cfg.paths.app) || ['src/**']).map(toPattern);
const contractPatterns = (cfg) => asList(cfg.paths && cfg.paths.contracts).map(toPattern);

function rel(file, dir = projectDir()) {
  return path.relative(dir, path.resolve(dir, String(file))).split(path.sep).join('/');
}
const matches = (pats, r) => pats.some((p) => p.test(r) || p.test(r + '/'));
const isProtected = (file, cfg, dir) => matches(protectedPatterns(cfg), rel(file, dir));
const isTest = (file, cfg, dir) => matches(testPatterns(cfg), rel(file, dir));
const isApp = (file, cfg, dir) => { const r = rel(file, dir); return matches(appPatterns(cfg), r) && !matches(contractPatterns(cfg), r); };

// Heuristic: does this shell command write to a protected path?
const WRITE_HINT = /(\bsed\s+(-[a-zA-Z]*i|--in-place)|>>?\s*\S|\btee\b|\bmv\b|\brm\b|\bcp\b|\btouch\b|\btruncate\b|\bdd\b|\binstall\b|git\s+(checkout|restore|reset|clean|stash|rm|apply|mv)\b|\bperl\s+-[a-z]*i|\bpython\d?\s+-c|\bnode\s+-e)/;
function shellTouches(cmd, cfg, dir) {
  if (!WRITE_HINT.test(cmd)) return null;
  const tokens = (cmd.match(/"[^"]*"|'[^']*'|[^\s;&|<>()]+/g) || []).map((t) => t.replace(/^["']|["']$/g, ''));
  return tokens.find((t) => !t.startsWith('-') && t.length > 1 && isProtected(t, cfg, dir)) || null;
}
const FORBIDDEN_CODER_SHELL = [
  [/\bgh\s+pr\s+(edit|ready|review|merge|close|reopen)\b/, 'the coder cannot change the pull request'],
  [/\bgh\s+(label|issue\s+edit|release)\b/, 'the coder cannot change labels or releases'],
  [/\bgh\s+api\b[^\n]*(-X|--method)\s*(PATCH|POST|PUT|DELETE)/i, 'the coder cannot write to GitHub'],
  [/\bgit\s+push\b[^\n]*(--force\b|--force-with-lease|\s-f\b|\s\+\S)/, 'force push is blocked'],
];

const block = (msg) => { process.stderr.write(`Tofu: ${msg}\n`); process.exit(2); };
const say = (obj) => { process.stdout.write(JSON.stringify(obj)); };

module.exports = { projectDir, dataDir, pluginRoot, readInput, loadConfig, branch, featureBranch, readCache, writeCache, fetchPr, roleOf, asList, toPattern, rel, isProtected, isTest, isApp, shellTouches, FORBIDDEN_CODER_SHELL, block, say, matches, protectedPatterns };
