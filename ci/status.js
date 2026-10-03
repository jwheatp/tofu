'use strict';
// Rewrites the single status comment of a feature PR.
const fs = require('fs');
const path = require('path');
const pr = require('../hooks/scripts/pr');
const { asList, load } = require('./config');

const ID = /\b(R-[A-Z0-9]+-\d+):/g;

function walk(dir, out = []) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name.startsWith('.git')) continue;
    const f = path.join(dir, e.name);
    e.isDirectory() ? walk(f, out) : out.push(f);
  }
  return out;
}
// rule id -> number of tests naming it
function scanTests(cfg, root = process.cwd()) {
  const counts = {};
  for (const p of asList(cfg.paths && cfg.paths.tests)) {
    const abs = path.join(root, p);
    const files = fs.existsSync(abs) && fs.statSync(abs).isFile() ? [abs] : walk(abs);
    for (const f of files) {
      let text = '';
      try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
      for (const m of text.matchAll(ID)) counts[m[1]] = (counts[m[1]] || 0) + 1;
    }
  }
  return counts;
}
// Optional JUnit report: rule id -> { pass, fail }
function parseJunit(xml) {
  const res = {};
  const re = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const m of xml.matchAll(re)) {
    const name = (/name="([^"]*)"/.exec(m[1]) || [])[1] || '';
    const id = (/^(R-[A-Z0-9]+-\d+):/.exec(name.replace(/&amp;/g, '&')) || [])[1];
    if (!id) continue;
    const r = (res[id] = res[id] || { pass: 0, fail: 0 });
    /<(failure|error)\b/.test(m[2] || '') ? r.fail++ : r.pass++;
  }
  return res;
}

function build({ data, cfg, counts, junit, quality, sha, prevComment, preview }) {
  const spec = pr.section(data.body, 'spec');
  const rules = pr.parseRules(spec);
  const labels = pr.labelSet(data);
  const dec = pr.parseDecisions(data.comments);
  const ticked = new Set([...(prevComment || '').matchAll(/- \[x\] (.*)/g)].map((m) => m[1].trim()));
  let failing = 0, passing = 0, total = 0, covered = 0;
  const rows = rules.map((r) => {
    const n = counts[r.id] || 0;
    const j = junit && junit[r.id];
    if (n > 0) covered++;
    let icon, cell;
    if (!n) { icon = '⚠️'; cell = 'none yet'; }
    else if (j) { total += j.pass + j.fail; passing += j.pass; failing += j.fail; icon = j.fail ? '❌' : '✅'; cell = j.fail ? `${j.fail} failing` : String(j.pass + j.fail); }
    else { total += n; icon = quality === 'failure' ? '❌' : '✅'; if (quality !== 'failure') passing += n; cell = String(n); }
    return `| ${icon} | ${r.id} | ${r.title} | ${cell} |`;
  });
  if (!junit && quality === 'failure') failing = Math.max(failing, 1);
  const who = (d) => (d ? `${d.skipped ? '⏭ ' : '✅ '}${d.by ? '@' + d.by : 'recorded'}${d.createdAt ? ', ' + new Date(d.createdAt).toDateString().slice(4, 10) : ''}` : '⏳');
  const phase = !labels.has('tofu:approved') ? (rules.length && covered === rules.length ? 'awaiting Approve' : covered ? 'tests' : 'spec')
    : !labels.has('tofu:accepted') ? (failing ? 'code' : preview ? 'awaiting Accept' : 'verification') : 'accepted';
  const data2 = { rulesCovered: covered, rulesTotal: rules.length, testsPassing: passing, testsTotal: total, failing, preview: preview || null };
  const tpl = fs.readFileSync(path.join(__dirname, '..', 'templates', 'status-comment.md'), 'utf8');
  const fill = {
    title: data.title.replace(/^\[tofu\]\s*/i, ''),
    phase,
    approve: who(dec.approved),
    accept: who(dec.accepted),
    tests: junit || quality ? `${passing} / ${total} passing` : `${total} found`,
    covered: `${covered} / ${rules.length}`,
    scenarios: rows.join('\n') || '| | | _No rules yet_ | |',
    preview: preview ? `🔗 [Open the pre-staging](${preview})` : '_Pre-staging not deployed yet._',
    checklist: rules.map((r) => `- [${ticked.has(r.title) ? 'x' : ' '}] ${r.title}`).join('\n'),
    sha: (sha || '').slice(0, 7),
    data: `<!-- tofu:data ${JSON.stringify(data2)} -->`,
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in fill ? fill[k] : ''));
}

if (require.main === module) {
  const gh = require('./gh');
  const n = gh.prNumber();
  if (!n) { console.log('No PR for this branch; nothing to do.'); process.exit(0); }
  const data = gh.prData(n);
  const cfg = load();
  let junit = null;
  const rp = process.env.TOFU_JUNIT || 'junit.xml';
  if (fs.existsSync(rp)) junit = parseJunit(fs.readFileSync(rp, 'utf8'));
  const prev = (data.comments.find((c) => /<!--\s*tofu:status\s*-->/.test(c.body || '')) || {}).body;
  const prevData = pr.statusData(data.comments);
  const body = build({ data, cfg, counts: scanTests(cfg), junit, quality: process.env.TOFU_QUALITY, sha: data.headRefOid, prevComment: prev, preview: process.env.TOFU_PREVIEW_URL || (prevData && prevData.preview) });
  gh.upsert(n, '<!-- tofu:status -->', body);
  console.log(`Status comment updated on #${n}`);
}
module.exports = { scanTests, parseJunit, build };
