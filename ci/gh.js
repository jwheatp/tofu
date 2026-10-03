'use strict';
const { execFileSync } = require('child_process');
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const repo = () => process.env.GITHUB_REPOSITORY;
function prNumber() {
  if (process.env.PR_NUMBER) return process.env.PR_NUMBER;
  const b = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
  const out = gh('pr', 'list', '--head', b, '--state', 'open', '--json', 'number', '-q', '.[0].number').trim();
  return out || null;
}
function comments(n) {
  return JSON.parse(gh('api', `repos/${repo()}/issues/${n}/comments`, '--paginate', '--slurp')).flat();
}
function prData(n) {
  const pr = JSON.parse(gh('pr', 'view', String(n), '--json', 'number,title,body,labels,isDraft,baseRefName,headRefName,headRefOid'));
  pr.comments = comments(n);
  return pr;
}
// Create or update the single comment carrying `marker`.
function upsert(n, marker, body) {
  const old = comments(n).find((c) => c.body && c.body.includes(marker));
  if (old) gh('api', '-X', 'PATCH', `repos/${repo()}/issues/comments/${old.id}`, '-f', `body=${body}`);
  else gh('api', '-X', 'POST', `repos/${repo()}/issues/${n}/comments`, '-f', `body=${body}`);
}
module.exports = { gh, repo, prNumber, comments, prData, upsert };
