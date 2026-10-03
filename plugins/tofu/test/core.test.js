const test = require('node:test');
const assert = require('node:assert');
const c = require('../lib/core');

const fresh = () => ({ decisions: {}, warnings: [], features: { 42: { slug: 'auth', step: 5, decisions: {}, warnings: [] } } });

test('project waits for frame decisions', () => {
  assert.strictEqual(c.nextAction({ decisions: {}, features: {} }).decision, 'frame-client');
});
test('Build before Frame warns', () => {
  assert.match(c.warningsFor(fresh(), 42)[0], /before Frame/);
});
test('gate after step 6 awaits approved, then coding', () => {
  const s = fresh(); s.features[42].step = 7;
  assert.strictEqual(c.nextAction(s, 42).decision, 'approved');
  c.approve(s, 'approved', 42, {});
  assert.strictEqual(c.nextAction(s, 42).step, 7);
});
test('editing an approved file invalidates downstream', () => {
  const s = fresh(); c.approve(s, 'approved', 42, {}); c.approve(s, 'accepted', 42, {});
  c.invalidate(s, 42, 'approved');
  assert.deepStrictEqual(s.features[42].decisions, {});
});
test('protected paths', () => {
  const r = '/p';
  assert.ok(c.isProtected('/p/tests/a/b.test.ts', r));
  assert.ok(c.isProtected('/p/features/42-auth/SPEC.md', r));
  assert.ok(!c.isProtected('/p/src/app.ts', r));
});
