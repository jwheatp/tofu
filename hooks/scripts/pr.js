'use strict';
// Pure helpers to read a feature PR. Used by hooks and by CI. No I/O here.

const section = (body, name) => {
  const m = new RegExp(`<!--\\s*tofu:${name}\\s*-->([\\s\\S]*?)<!--\\s*/tofu:${name}\\s*-->`).exec(body || '');
  return m ? m[1] : null;
};

// "### R-AUTH-001 · Title" blocks, with the number of example rows in their table.
function parseRules(spec) {
  if (!spec) return [];
  const re = /^###\s+(R-[A-Z0-9]+-\d+)\s*(?:[·:\-–—]\s*(.*))?$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(spec))) heads.push({ id: m[1], title: (m[2] || '').trim(), start: m.index, end: re.lastIndex });
  return heads.map((h, i) => {
    let block = spec.slice(h.end, i + 1 < heads.length ? heads[i + 1].start : spec.length);
    block = block.split(/^##\s/m)[0];
    const rows = block.split('\n').filter((l) => /^\s*\|/.test(l));
    const examples = Math.max(0, rows.length - 2); // header + separator
    return { id: h.id, title: h.title, examples };
  });
}

function openQuestions(spec) {
  const m = /^##\s*❓[^\n]*\n([\s\S]*?)(?=^##\s|$(?![\s\S]))/m.exec(spec || '');
  const text = m ? m[1].trim() : '';
  const items = text.split('\n').filter((l) => /^\s*(?:[-*]|\d+[.)])\s+\S/.test(l));
  return { present: !!m, items, empty: items.length === 0 };
}

function parseDecisions(comments) {
  const out = {};
  for (const c of comments || []) {
    const m = /<!--\s*tofu:decision\s+([\w-]+)(\s+skipped)?\s*-->/.exec(c.body || '');
    if (!m) continue;
    out[m[1]] = {
      skipped: !!m[2],
      by: ((/@([\w-]+)/.exec(c.body) || [])[1]) || null,
      commit: ((/commit `([0-9a-f]{7,40})`/.exec(c.body) || [])[1]) || null,
      createdAt: c.createdAt || c.created_at || null,
    };
  }
  return out;
}

function statusData(comments) {
  for (const c of comments || []) {
    if (!/<!--\s*tofu:status\s*-->/.test(c.body || '')) continue;
    const m = /<!--\s*tofu:data\s+(\{.*?\})\s*-->/.exec(c.body);
    if (m) try { return JSON.parse(m[1]); } catch { /* ignore */ }
  }
  return null;
}

const labelSet = (pr) => new Set((pr.labels || []).map((l) => (typeof l === 'string' ? l : l.name)));

// Deterministic "what now" for a feature PR.
function nextAction(pr) {
  if (!pr) return { step: 0, text: 'No PR for this branch: run /tofu:start' };
  const labels = labelSet(pr);
  const spec = section(pr.body, 'spec');
  const rules = parseRules(spec);
  const oq = openQuestions(spec);
  if (!spec || !rules.length || !oq.empty) return { step: 1, agent: 'challenger', text: 'Step 1 · Spec: answer open questions and finish the rules (/tofu:next → tofu:challenger)' };
  const d = statusData(pr.comments);
  const covered = d && d.rulesTotal > 0 && d.rulesCovered >= d.rulesTotal;
  const green = d && d.failing === 0 && covered;
  if (!labels.has('tofu:approved')) {
    if (!covered) return { step: 2, agent: 'tester', text: 'Step 2 · Tests: cover every rule (/tofu:next → tofu:tester)' };
    return { step: 2, awaiting: 'approved', text: 'Awaiting your Approve: spec, screens and scenario list (/tofu:approve approved)' };
  }
  if (!green) return { step: 3, agent: 'coder', text: 'Step 3 · Code: make every check pass (/tofu:next → tofu:coder)' };
  if (!(pr.comments || []).some((c) => /<!--\s*tofu:judge\s*-->/.test(c.body || ''))) return { step: 4, agent: 'judge', text: 'Step 4 · Verification: judge review of the diff (/tofu:next → tofu:judge)' };
  if (!labels.has('tofu:accepted')) {
    if (!d.preview) return { step: 5, text: 'Step 5 · Pre-staging: deploy the branch (/tofu:next)' };
    return { step: 5, awaiting: 'accepted', text: 'Awaiting your Accept: try the feature on its pre-staging (/tofu:approve accepted)' };
  }
  return { step: 6, text: 'Accepted: ready for the release (/tofu:release add)' };
}

function warningsFor(skill, args, pr, cfg) {
  const w = [];
  const labels = pr ? labelSet(pr) : new Set();
  const a = (args || '').trim();
  if (['start', 'next'].includes(skill)) {
    const f = (cfg && cfg.frame) || {};
    const miss = ['brief', 'designSystem', 'architecture', 'features'].filter((k) => !f[k]);
    if (!cfg || !Object.keys(cfg).length) w.push('No tofu.config.json: run /tofu:setup');
    else if (miss.length) w.push(`Frame inputs not declared in tofu.config.json: ${miss.join(', ')}`);
  }
  if (skill === 'approve') {
    if (/\baccepted\b/.test(a) && !labels.has('tofu:approved')) w.push('Accept requested before Approve');
    if (/\bapproved\b/.test(a)) {
      const spec = pr && section(pr.body, 'spec');
      if (spec && !openQuestions(spec).empty) w.push('Open questions are not empty');
    }
  }
  if (skill === 'release' && /^add\b/.test(a) && !labels.has('tofu:accepted')) w.push('This feature is not accepted yet');
  if (skill === 'ship' && !labels.has('tofu:release-accepted')) w.push('Release accepted is not recorded on this PR');
  if (['next', 'approve', 'status'].includes(skill) && !pr && !/--all/.test(a)) w.push('No Tofu PR for this branch (expected a tofu/<n>-<slug> branch)');
  return w;
}

module.exports = { section, parseRules, openQuestions, parseDecisions, statusData, labelSet, nextAction, warningsFor };
