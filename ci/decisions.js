'use strict';
// Lock 2 in CI: merges to staging/main need the matching labels, unless a human override is recorded.
const pr = require('../hooks/scripts/pr');

function required(base, head) {
  if (base === 'staging') return ['tofu:approved', 'tofu:accepted'];
  if (base === 'main' && head === 'staging') return ['tofu:release-accepted', 'tofu:shipped'];
  if (base === 'main') return ['tofu:approved', 'tofu:accepted']; // hotfix
  return [];
}
function missing(data) {
  const labels = pr.labelSet(data);
  if (labels.has('tofu:override') && (data.comments || []).some((c) => /<!--\s*tofu:override\s*-->/.test(c.body || ''))) return [];
  return required(data.baseRefName, data.headRefName).filter((l) => !labels.has(l));
}
if (require.main === module) {
  const gh = require('./gh');
  const n = gh.prNumber();
  if (!n) process.exit(0);
  const data = gh.prData(n);
  const m = missing(data);
  if (m.length) { console.log(`::error::Missing decision label(s): ${m.join(', ')}. Record them with /tofu:approve, or a human override (label tofu:override + comment with <!-- tofu:override --> and a reason).`); process.exit(1); }
  console.log('Decisions OK');
}
module.exports = { required, missing };
