const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const pr = require('../hooks/scripts/pr');

const BODY = fs.readFileSync(path.join(__dirname, '..', 'templates', 'pr-body.md'), 'utf8');
const GOOD = `> **Goal**: x
<!-- tofu:spec -->
## 📋 Rules

### R-AUTH-001 · Sign in
When a user submits valid credentials, the system opens a session.

| Example | Input | Expected |
| --- | --- | --- |
| Normal | a | b |

### R-AUTH-002 · Lock
When 5 failures happen, the system locks.

| Example | Input | Expected |
| --- | --- | --- |
| Normal | a | b |
| Edge | c | d |

## ❓ Open questions
_None. Ready for Approve._

## 🧭 Decisions
| Date | Decision | Rule |
| --- | --- | --- |
<!-- /tofu:spec -->
<!-- tofu:design -->
## 🎨 Design
<!-- /tofu:design -->`;
const status = (d) => ({ body: `<!-- tofu:status -->\n<!-- tofu:data ${JSON.stringify(d)} -->` });

test('parseRules reads ids, titles and example counts', () => {
  const r = pr.parseRules(pr.section(GOOD, 'spec'));
  assert.deepStrictEqual(r.map((x) => [x.id, x.title, x.examples]), [['R-AUTH-001', 'Sign in', 1], ['R-AUTH-002', 'Lock', 2]]);
});
test('open questions: empty vs items', () => {
  assert.ok(pr.openQuestions(pr.section(GOOD, 'spec')).empty);
  assert.strictEqual(pr.openQuestions(pr.section(BODY, 'spec')).items.length, 1);
});
test('decisions parsed from comments', () => {
  const d = pr.parseDecisions([{ body: '<!-- tofu:decision approved -->\n✅ **Approve** · @julien · 03 Oct · commit `a1b2c3d`' }, { body: '<!-- tofu:decision accepted skipped -->\n⏭ Skipped: demo' }]);
  assert.deepStrictEqual([d.approved.by, d.approved.commit, d.accepted.skipped], ['julien', 'a1b2c3d', true]);
});
test('nextAction walks the Build loop', () => {
  const base = { body: GOOD, labels: [], comments: [] };
  assert.strictEqual(pr.nextAction(null).step, 0);
  assert.strictEqual(pr.nextAction({ ...base, body: BODY }).agent, 'challenger');
  assert.strictEqual(pr.nextAction(base).agent, 'tester');
  const covered = [status({ rulesCovered: 2, rulesTotal: 2, failing: 0 })];
  assert.strictEqual(pr.nextAction({ ...base, comments: covered }).awaiting, 'approved');
  const appr = { ...base, labels: [{ name: 'tofu:approved' }] };
  assert.strictEqual(pr.nextAction({ ...appr, comments: [status({ rulesCovered: 2, rulesTotal: 2, failing: 1 })] }).agent, 'coder');
  assert.strictEqual(pr.nextAction({ ...appr, comments: covered }).agent, 'judge');
  const judged = [...covered, { body: '<!-- tofu:judge -->' }];
  assert.strictEqual(pr.nextAction({ ...appr, comments: judged }).step, 5);
  const prev = [status({ rulesCovered: 2, rulesTotal: 2, failing: 0, preview: 'http://x' }), { body: '<!-- tofu:judge -->' }];
  assert.strictEqual(pr.nextAction({ ...appr, comments: prev }).awaiting, 'accepted');
  assert.strictEqual(pr.nextAction({ ...appr, labels: [{ name: 'tofu:approved' }, { name: 'tofu:accepted' }], comments: prev }).step, 6);
});
test('warnings never block and name the issue', () => {
  const w = pr.warningsFor('approve', 'accepted', { body: GOOD, labels: [], comments: [] }, {});
  assert.match(w[0], /before Approve/);
  assert.match(pr.warningsFor('start', '', null, {})[0], /setup/);
});
