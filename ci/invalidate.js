'use strict';
// Editing the spec or design after Approve removes Approve (and Accept) and says why.
const fs = require('fs');
const pr = require('../hooks/scripts/pr');

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
// Ignore the approved-version line, which /tofu:approve itself writes.
const stable = (body) => norm(`${pr.section(body, 'spec') || ''}|${(pr.section(body, 'design') || '').replace(/approved version[^\n]*/gi, '')}`);
const changed = (before, after) => stable(before) !== stable(after);

if (require.main === module) {
  const gh = require('./gh');
  const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH || '/dev/null', 'utf8') || '{}');
  const before = ev.changes && ev.changes.body && ev.changes.body.from;
  if (before === undefined || !ev.pull_request) process.exit(0);
  const n = ev.pull_request.number;
  const data = gh.prData(n);
  if (!/^\[tofu\]/i.test(data.title)) process.exit(0);
  const labels = pr.labelSet(data);
  if (!changed(before, data.body) || !(labels.has('tofu:approved') || labels.has('tofu:accepted'))) process.exit(0);
  for (const l of ['tofu:approved', 'tofu:accepted']) if (labels.has(l)) gh.gh('pr', 'edit', String(n), '--remove-label', l);
  gh.gh('pr', 'comment', String(n), '--body', '⚠️ The spec or design changed after Approve, so **Approve** (and **Accept**) were removed. Review the change, then run `/tofu:approve approved` again.\n\n<sub>Tofu CI</sub>');
  console.log(`Invalidated decisions on #${n}`);
}
module.exports = { changed };
