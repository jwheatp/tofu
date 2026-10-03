'use strict';
// Every rule ID in the PR spec must have a test. Fails only after Approve.
const pr = require('../hooks/scripts/pr');
const { scanTests } = require('./status');
const { load } = require('./config');

function missing(data, counts) {
  return pr.parseRules(pr.section(data.body, 'spec')).filter((r) => !counts[r.id]).map((r) => r.id);
}
if (require.main === module) {
  const gh = require('./gh');
  const n = gh.prNumber();
  if (!n) process.exit(0);
  const data = gh.prData(n);
  if (!/^\[tofu\]/i.test(data.title)) process.exit(0);
  const m = missing(data, scanTests(load()));
  if (!m.length) { console.log('Traceability OK'); process.exit(0); }
  const approved = pr.labelSet(data).has('tofu:approved');
  console.log(`${approved ? '::error::' : '::warning::'}Rules without a test: ${m.join(', ')}`);
  process.exit(approved ? 1 : 0);
}
module.exports = { missing };
