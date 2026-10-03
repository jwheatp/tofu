'use strict';
// Checks the PR template structure and comments a friendly fix suggestion.
const pr = require('../hooks/scripts/pr');

function problems(body) {
  const p = [];
  const spec = pr.section(body, 'spec');
  if (spec === null) p.push('The `<!-- tofu:spec -->` ... `<!-- /tofu:spec -->` markers are missing around the spec.');
  if (pr.section(body, 'design') === null) p.push('The `<!-- tofu:design -->` ... `<!-- /tofu:design -->` markers are missing around the design section.');
  if (spec !== null) {
    const rules = pr.parseRules(spec);
    if (!rules.length) p.push('No rule found. Add a heading like `### R-AUTH-001 · Short title`.');
    for (const r of rules) if (!r.examples) p.push(`${r.id} has no example. Add a table \`| Example | Input | Expected |\` with at least one row.`);
    if (!pr.openQuestions(spec).present) p.push('The `## ❓ Open questions` section is missing (write "_None. Ready for Approve._" when empty).');
  }
  return p;
}
if (require.main === module) {
  const gh = require('./gh');
  const n = gh.prNumber();
  if (!n) process.exit(0);
  const data = gh.prData(n);
  if (!/^\[tofu\]/i.test(data.title)) process.exit(0);
  const p = problems(data.body);
  const body = p.length
    ? `<!-- tofu:validation -->\n👋 The spec structure needs a small fix so Tofu can read it:\n\n${p.map((x) => `- ${x}`).join('\n')}\n\n<sub>Tofu CI · updates on every push</sub>`
    : '<!-- tofu:validation -->\n✅ Spec structure looks good.';
  if (p.length || gh.comments(n).some((c) => (c.body || '').includes('<!-- tofu:validation -->'))) gh.upsert(n, '<!-- tofu:validation -->', body);
  p.forEach((x) => console.log(`::warning::${x.replace(/`/g, '')}`));
}
module.exports = { problems };
