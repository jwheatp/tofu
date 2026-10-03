'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CONFIG = (o = {}) => `profile: ${o.profile || 'full'}
language:
  repo: en
  client: ${o.client || 'en'}
paths:
  framing: ${o.framing || 'docs/framing/'}
  adr: ${o.adr || 'docs/adr/'}
  features: features/
  tests: [${(o.tests || ['tests/', 'e2e/']).join(', ')}]
  contracts: src/contracts/
  protected: [tests/**, e2e/**, features/**, docs/**, .github/**, tofu.config.yml]
decisions:
  frame-client: ${o.profile === 'loop' ? 'off' : 'required'}
  frame-foundations: ${o.profile === 'loop' ? 'off' : 'required'}
  release-client-acceptance: off
thresholds:
  mutation_score: 75
  max_features_per_release: 4
light_mode:
  max_changed_lines: 50
  forbidden_paths: [src/domain/**, src/contracts/**]
deploy:
  preview: npm run deploy:preview
  production: npm run deploy:prod
`;

const FILES = {
  'AGENTS.md': '# Agent rules\n\nFollow the Tofu process (see `tofu.config.yml`). Specs, tests and docs are human-owned: the coder never edits them.\nRun `/tofu:status` to see where the project stands.\n',
  'CLAUDE.md': '@AGENTS.md\n',
  '.github/CODEOWNERS': 'tests/ @OWNER\ne2e/ @OWNER\nfeatures/ @OWNER\ndocs/ @OWNER\ntofu.config.yml @OWNER\n',
  '.github/workflows/tofu.yml': `name: tofu
on: { push: { branches: ['feature/**', staging, main] }, pull_request: {} }
jobs:
  feature: { uses: ORG/tofu/.github/workflows/feature.yml@v1 }
  locks: { uses: ORG/tofu/.github/workflows/locks.yml@v1 }
  decisions: { uses: ORG/tofu/.github/workflows/decisions.yml@v1 }
`,
  '.claude/settings.json': JSON.stringify({ extraKnownMarketplaces: { 'tofu-marketplace': { source: { source: 'github', repo: 'ORG/tofu' } } }, enabledPlugins: { 'tofu@tofu-marketplace': true } }, null, 2) + '\n',
  'docs/features.md': '# Features\n\nOrdered list with dependencies.\n',
  'docs/architecture.md': '# Architecture\n',
  'docs/framing/.gitkeep': '', 'docs/adr/.gitkeep': '', 'features/.gitkeep': '', 'src/contracts/.gitkeep': '', 'tests/.gitkeep': '', 'e2e/.gitkeep': '',
};

// Never overwrites: returns {created, skipped}.
function init(r, opts = {}) {
  const created = [], skipped = [];
  const put = (rel, content) => {
    const f = path.join(r, rel);
    if (fs.existsSync(f)) return skipped.push(rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
    created.push(rel);
  };
  put('tofu.config.yml', CONFIG(opts));
  for (const [k, v] of Object.entries(FILES)) put(k, v);
  const gi = path.join(r, '.gitignore');
  const cur = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
  if (!/^\.tofu\/?$/m.test(cur)) { fs.writeFileSync(gi, cur + (cur && !cur.endsWith('\n') ? '\n' : '') + '.tofu/\n'); created.push('.gitignore (+.tofu/)'); }
  return { created, skipped };
}

// Scans for existing artifacts; moves nothing.
function scan(r) {
  const has = (p) => fs.existsSync(path.join(r, p));
  const first = (list) => list.find(has);
  const ls = (d) => { try { return fs.readdirSync(path.join(r, d)); } catch { return []; } };
  const framing = ls('.').find((f) => /cahier|requirement|brief|spec/i.test(f) && /\.(md|pdf|docx?)$/i.test(f));
  return {
    framing: framing || first(['docs/framing', 'docs/requirements']),
    adr: first(['docs/adr', 'docs/decisions', 'adr']),
    tests: ['tests', 'test', '__tests__', 'e2e', 'cypress'].filter(has).map((d) => d + '/'),
    ci: ls('.github/workflows').length > 0,
  };
}
function adopt(r, opts = {}) {
  const found = scan(r);
  const f = path.join(r, 'tofu.config.yml');
  let wrote = false;
  if (!fs.existsSync(f)) {
    fs.writeFileSync(f, CONFIG({ profile: 'loop', framing: found.framing, adr: found.adr, tests: found.tests.length ? found.tests : undefined, client: opts.client }));
    wrote = true;
  }
  const gi = path.join(r, '.gitignore');
  const cur = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
  if (!/^\.tofu\/?$/m.test(cur)) fs.writeFileSync(gi, cur + (cur && !cur.endsWith('\n') ? '\n' : '') + '.tofu/\n');
  return { found, wrote };
}

const git = (r, ...a) => execFileSync('git', a, { cwd: r, encoding: 'utf8' }).trim();
const tagExists = (r, t) => { try { git(r, 'rev-parse', '-q', '--verify', `refs/tags/${t}`); return true; } catch { return false; } };
const branchExists = (r, b) => { try { git(r, 'rev-parse', '-q', '--verify', `refs/heads/${b}`); return true; } catch { return false; } };

// Merge an accepted feature into staging (no PR), tag the merge and a new RC.
function stage(r, s, n, cfg) {
  const f = s.features[n];
  if (!f) throw new Error(`Unknown feature #${n}`);
  if (!f.decisions.accepted && !f.skipOverride) throw new Error(`#${n} is not accepted (Accept missing). Use --override "reason" as a human.`);
  const rel = s.release || (s.release = { version: null, features: [], rc: 0 });
  const max = (cfg.thresholds && cfg.thresholds.max_features_per_release) || 4;
  if (!rel.features.includes(n) && rel.features.length >= max) throw new Error(`Release already has ${max} features`);
  if (!rel.version) throw new Error('No release version: run `tofu release new <x.y.z>`');
  const cur = git(r, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (!branchExists(r, 'staging')) git(r, 'branch', 'staging', cur);
  git(r, 'checkout', 'staging');
  try {
    git(r, 'merge', '--no-ff', '-m', `Merge feature #${n} ${f.slug}`, `feature/${n}-${f.slug}`);
    git(r, 'tag', `staging/${n}-${f.slug}`);
    rel.rc += 1;
    git(r, 'tag', `v${rel.version}-rc.${rel.rc}`);
  } finally { git(r, 'checkout', cur); }
  if (!rel.features.includes(n)) rel.features.push(n);
  f.merge = git(r, 'rev-parse', `staging/${n}-${f.slug}`);
  return `#${n} staged as v${rel.version}-rc.${rel.rc}`;
}

function unstage(r, s, n) {
  const rel = s.release, f = s.features[n];
  if (!rel || !rel.features.includes(n)) throw new Error(`#${n} is not in the release`);
  const dependants = rel.features.filter((m) => m !== n && (s.features[m].dependsOn || []).includes(Number(n)));
  if (dependants.length) throw new Error(`Cannot remove #${n}: needed by ${dependants.map((d) => '#' + d).join(', ')}`);
  const cur = git(r, 'rev-parse', '--abbrev-ref', 'HEAD');
  git(r, 'checkout', 'staging');
  try {
    git(r, 'revert', '-m', '1', '--no-edit', f.merge);
    rel.rc += 1;
    git(r, 'tag', `v${rel.version}-rc.${rel.rc}`);
  } finally { git(r, 'checkout', cur); }
  rel.features = rel.features.filter((m) => m !== n);
  return `#${n} removed (revert), now v${rel.version}-rc.${rel.rc}`;
}

function ship(r, s, cfg) {
  const rel = s.release;
  if (!rel || !rel.features.length) throw new Error('Nothing to ship');
  const mode = (cfg.decisions && cfg.decisions['release-accepted']) || 'required';
  if (mode === 'required' && !rel.accepted) throw new Error('Decision "release-accepted" missing (tofu approve release-accepted)');
  const cur = git(r, 'rev-parse', '--abbrev-ref', 'HEAD');
  const main = branchExists(r, 'main') ? 'main' : 'master';
  git(r, 'checkout', main);
  try {
    git(r, 'merge', '--no-ff', '-m', `Release v${rel.version}`, 'staging');
    git(r, 'tag', `v${rel.version}`);
  } finally { git(r, 'checkout', cur); }
  const notes = rel.features.map((n) => `- #${n} ${s.features[n].slug}`).join('\n');
  s.history = [...(s.history || []), { version: rel.version, features: rel.features }];
  s.release = null;
  return `Shipped v${rel.version}\n${notes}`;
}

const LABELS = ['tofu:feature', 'tofu:project', ...[5, 6, 7, 8, 9, 10, 11, 12].map((k) => `tofu:step-${k}`), ...['frame-client', 'frame-foundations', 'approved', 'accepted', 'release-accepted', 'shipped'].map((d) => `tofu:${d}`)];

module.exports = { init, adopt, scan, stage, unstage, ship, LABELS, CONFIG, git, tagExists };
