'use strict';
// Lock 1 in CI: tests must not change after Approve, nor together with code without a fresh Approve.
const { execFileSync } = require('child_process');
const pr = require('../hooks/scripts/pr');
const L = require('../hooks/scripts/lib');
const { load } = require('./config');

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const ASSERT = /\b(expect\s*\(|assert\w*\s*[.(]|should\.|\.to(Be|Equal|Have|Throw|Match)|self\.assert|assert_)/;
const SKIP = /(\.skip\b|\bxit\s*\(|\bxdescribe\s*\(|\bit\.todo\b|\btest\.todo\b|@Disabled|@pytest\.mark\.skip|\bt\.Skip\()/;

function analyseDiff(patch) {
  let added = 0, removed = 0;
  const skips = [];
  for (const l of patch.split('\n')) {
    if (l.startsWith('+++') || l.startsWith('---')) continue;
    if (l.startsWith('+')) { if (ASSERT.test(l)) added++; if (SKIP.test(l)) skips.push(l.slice(1).trim()); }
    else if (l.startsWith('-') && ASSERT.test(l)) removed++;
  }
  return { added, removed, skips };
}

function check({ base, head, approveSha, cfg }) {
  const errors = [];
  const files = git('diff', '--name-only', `${base}...${head}`).split('\n').filter(Boolean);
  const tests = files.filter((f) => L.isTest(f, cfg));
  const code = files.filter((f) => !L.isTest(f, cfg) && !f.startsWith('.github/'));
  if (tests.length) {
    if (approveSha) {
      let after = [];
      try { after = git('diff', '--name-only', `${approveSha}..${head}`).split('\n').filter((f) => L.isTest(f, cfg)); } catch { /* unknown sha */ }
      if (after.length) errors.push(`Tests changed after Approve (${after.slice(0, 3).join(', ')}). Re-run /tofu:approve approved.`);
    } else if (code.length) errors.push('Tests and application code changed together without an Approve. Approve the tests first.');
    const a = analyseDiff(git('diff', '-U0', `${base}...${head}`, '--', ...tests));
    if (a.skips.length) errors.push(`Skipped tests added: ${a.skips.slice(0, 2).join(' | ')}`);
    if (a.removed > a.added) errors.push(`Assertions deleted (${a.removed} removed, ${a.added} added).`);
  }
  return errors;
}

if (require.main === module) {
  const gh = require('./gh');
  const n = gh.prNumber();
  if (!n) process.exit(0);
  const data = gh.prData(n);
  if (!/^\[tofu\]/i.test(data.title)) process.exit(0);
  const dec = pr.parseDecisions(data.comments).approved;
  const base = `origin/${data.baseRefName}`;
  const errors = check({ base, head: 'HEAD', approveSha: dec && !dec.skipped ? dec.commit : null, cfg: load() });
  if (errors.length) { errors.forEach((e) => console.log(`::error::${e}`)); process.exit(1); }
  console.log('Locks OK');
}
module.exports = { analyseDiff, check };
