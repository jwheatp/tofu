const test = require('node:test');
const assert = require('node:assert');
const { build, parseJunit, scanTests } = require('../ci/status');
const { problems } = require('../ci/validate');
const { analyseDiff } = require('../ci/locks');
const { missing, required } = require('../ci/decisions');
const { changed } = require('../ci/invalidate');
const fs = require('fs');
const path = require('path');
const os = require('os');

const body = (extra = '') => `<!-- tofu:spec -->
## 📋 Rules
### R-A-001 · One
When x, y.

| Example | Input | Expected |
| --- | --- | --- |
| n | 1 | 2 |

### R-A-002 · Two
When x, y.

| Example | Input | Expected |
| --- | --- | --- |
| n | 1 | 2 |
${extra}
## ❓ Open questions
_None. Ready for Approve._
<!-- /tofu:spec -->
<!-- tofu:design -->
## 🎨 Design
<!-- /tofu:design -->`;

test('status comment: coverage, failing rule, preserved checklist', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tofu-c-'));
  fs.mkdirSync(path.join(dir, 'tests'));
  fs.writeFileSync(path.join(dir, 'tests', 'a.test.js'), "it('R-A-001: one', ()=>{}); it('R-A-001: again', ()=>{});");
  const counts = scanTests({ paths: { tests: ['tests/'] } }, dir);
  assert.deepStrictEqual(counts, { 'R-A-001': 2 });
  const junit = parseJunit('<testsuite><testcase name="R-A-001: one"/><testcase name="R-A-001: again"><failure/></testcase></testsuite>');
  const c = build({ data: { title: '[tofu] Auth', body: body(), labels: [], comments: [] }, cfg: {}, counts, junit, sha: 'a1b2c3d4', prevComment: '- [x] Two', preview: 'http://p' });
  assert.match(c, /❌ \| R-A-001/);
  assert.match(c, /⚠️ \| R-A-002 \| Two \| none yet/);
  assert.match(c, /- \[x\] Two/);
  assert.match(c, /1 \/ 2 \|$/m);
  assert.match(c, /"rulesCovered":1,"rulesTotal":2,"testsPassing":1,"testsTotal":2,"failing":1/);
});
test('validate suggests fixes', () => {
  assert.deepStrictEqual(problems(body()), []);
  assert.ok(problems('no markers').length >= 2);
  assert.match(problems(body().replace(/\| n \| 1 \| 2 \|\n\n### R-A-002/, '\n### R-A-002'))[0], /R-A-001 has no example/);
});
test('locks: skips and deleted assertions', () => {
  const a = analyseDiff("-  expect(a).toBe(1)\n+  it.skip('x')\n+  expect(b).toBe(2)\n");
  assert.deepStrictEqual([a.added, a.removed, a.skips.length], [1, 1, 1]);
  assert.ok(analyseDiff('-expect(1)\n-expect(2)\n+expect(3)').removed > 1);
});
test('decisions: labels required per target, override works', () => {
  assert.deepStrictEqual(required('staging', 'tofu/1-a'), ['tofu:approved', 'tofu:accepted']);
  assert.deepStrictEqual(missing({ baseRefName: 'staging', headRefName: 'tofu/1-a', labels: [{ name: 'tofu:approved' }], comments: [] }), ['tofu:accepted']);
  assert.deepStrictEqual(missing({ baseRefName: 'main', headRefName: 'staging', labels: [{ name: 'tofu:override' }], comments: [{ body: '<!-- tofu:override -->' }] }), []);
  assert.deepStrictEqual(required('main', 'staging'), ['tofu:release-accepted', 'tofu:shipped']);
});
test('invalidate: only spec/design edits count, not the approved-version line', () => {
  assert.ok(!changed(body(), body() + '\nnotes outside'));
  assert.ok(changed(body(), body().replace('When x, y.', 'When z, y.')));
  const d1 = body().replace('## 🎨 Design', '## 🎨 Design\nApproved version: 1');
  const d2 = body().replace('## 🎨 Design', '## 🎨 Design\nApproved version: 2');
  assert.ok(!changed(d1, d2));
});
