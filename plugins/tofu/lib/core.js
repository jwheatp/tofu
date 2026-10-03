'use strict';
const fs = require('fs');
const path = require('path');

const DECISIONS = ['frame-client', 'frame-foundations', 'approved', 'accepted', 'release-accepted', 'shipped'];
const FRAME_DECISIONS = ['frame-client', 'frame-foundations'];
const STEP_ACTIONS = {
  5: 'Write the spec and design (challenger agent)',
  6: 'Write the tests (tester agent)',
  7: 'Implement until checks pass (coder agent)',
  8: 'Verify (judge agent + CI)',
  9: 'Deploy to pre-staging and write report.md',
};
// Decision awaited once a step is done: [after step, decision]
const GATES = [[6, 'approved'], [9, 'accepted']];
const DEFAULT_PROTECTED = ['tests/**', 'e2e/**', 'features/**', 'docs/**', '.github/**', 'tofu.config.yml'];

const root = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();
const statePath = (r = root()) => path.join(r, '.tofu', 'state.json');

function loadState(r = root()) {
  try { return JSON.parse(fs.readFileSync(statePath(r), 'utf8')); }
  catch { return { decisions: {}, warnings: [], features: {} }; }
}
function saveState(s, r = root()) {
  fs.mkdirSync(path.dirname(statePath(r)), { recursive: true });
  fs.writeFileSync(statePath(r), JSON.stringify(s, null, 2) + '\n');
}

function globToRe(g) {
  const re = g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '\0').replace(/\*/g, '[^/]*').replace(/\0/g, '(?:.*/)?');
  return new RegExp('^' + re.replace(/\/\(\?:\.\*\/\)\?$/, '(?:/.*)?') + '$');
}
function protectedGlobs(r = root()) {
  try {
    const y = fs.readFileSync(path.join(r, 'tofu.config.yml'), 'utf8');
    const m = y.match(/^\s*protected:\s*\[(.*?)\]/m);
    if (m) return m[1].split(',').map((x) => x.trim()).filter(Boolean);
  } catch {}
  return DEFAULT_PROTECTED;
}
function isProtected(file, r = root()) {
  const rel = path.relative(r, path.resolve(r, file)).split(path.sep).join('/');
  return protectedGlobs(r).some((g) => globToRe(g).test(rel));
}

function missingFrame(s, cfg = {}) {
  return FRAME_DECISIONS.filter((d) => !s.decisions[d]);
}

// Deterministic "what next" for a feature (or the project when n is undefined).
function nextAction(s, n) {
  if (n === undefined) {
    const m = missingFrame(s);
    return m.length ? { kind: 'decision', decision: m[0], text: `Frame: awaiting human decision "${m[0]}"` }
      : { kind: 'start', text: 'Frame approved: start a feature (/tofu:start <feature>)' };
  }
  const f = s.features[n];
  if (!f) return { kind: 'error', text: `Unknown feature #${n}` };
  if (f.step >= 10) return { kind: 'release', text: 'Feature accepted: ready for release/staging' };
  const gate = GATES.find(([after, d]) => f.step > after && !f.decisions[d]);
  if (gate) return { kind: 'decision', decision: gate[1], text: `Awaiting human decision "${gate[1]}"` };
  return { kind: 'step', step: f.step, text: `Step ${f.step}: ${STEP_ACTIONS[f.step]}` };
}

function warningsFor(s, n) {
  const w = [];
  const f = s.features[n];
  const m = missingFrame(s);
  if (f && m.length) w.push(`Build started before Frame approved (missing: ${m.join(', ')})`);
  if (f) w.push(...(f.warnings || []));
  return w;
}

function approve(s, decision, n, { person, reason, evidence } = {}) {
  if (!DECISIONS.includes(decision)) throw new Error(`Unknown decision "${decision}"`);
  const rec = { person: person || 'unknown', date: new Date().toISOString(), ...(reason ? { skipped: reason } : {}), ...(evidence ? { evidence } : {}) };
  const target = FRAME_DECISIONS.includes(decision) ? s : s.features[n];
  if (!target) throw new Error(`Feature #${n} not found`);
  target.decisions[decision] = rec;
  if (n !== undefined && s.features[n]) {
    const f = s.features[n];
    if (decision === 'approved' && f.step <= 6) f.step = 7;
    if (decision === 'accepted') f.step = 10;
  }
  return s;
}

function invalidate(s, n, decision) {
  const f = s.features[n];
  if (!f) return s;
  const order = ['approved', 'accepted', 'release-accepted', 'shipped'];
  for (const d of order.slice(order.indexOf(decision))) delete f.decisions[d];
  f.warnings = [...(f.warnings || []), `${decision} invalidated by edit`];
  return s;
}

function statusLine(s) {
  const ids = Object.keys(s.features);
  if (!ids.length) return `Tofu · ${missingFrame(s).length ? 'Frame pending' : 'Frame ✓'}`;
  return ids.map((n) => {
    const f = s.features[n];
    const w = warningsFor(s, n).length;
    return `#${n} ${f.slug} · step ${f.step} · approved ${f.decisions.approved ? '✓' : '…'} accepted ${f.decisions.accepted ? '✓' : '…'}${w ? ` · ⚠ ${w}` : ''}`;
  }).join(' | ');
}

module.exports = { DECISIONS, loadState, saveState, isProtected, nextAction, warningsFor, approve, invalidate, statusLine, globToRe, root };
