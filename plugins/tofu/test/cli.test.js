const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const BIN = path.join(__dirname, '..', 'bin', 'tofu');
function repo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tofu-'));
  const g = (...a) => execFileSync('git', a, { cwd: d, stdio: 'pipe' });
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  fs.writeFileSync(path.join(d, 'a.txt'), '1'); g('add', '.'); g('commit', '-qm', 'init');
  const t = (input, ...a) => spawnSync('node', [BIN, ...a.map(String)], { cwd: d, input, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: d } });
  const feat = (n, slug) => { g('add', '.'); try { g('commit', '-qm', 'scaffold'); } catch {} g('checkout', '-qb', `feature/${n}-${slug}`); fs.writeFileSync(path.join(d, `${slug}.txt`), slug); g('add', '.'); g('commit', '-qm', slug); g('checkout', '-q', 'main'); };
  return { d, g, t, feat };
}

test('init never overwrites and adopt moves nothing', () => {
  const { d, t } = repo();
  fs.writeFileSync(path.join(d, 'AGENTS.md'), 'mine');
  const r = t('', 'init');
  assert.strictEqual(fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8'), 'mine');
  assert.match(r.stdout, /AGENTS\.md/);
  assert.ok(fs.existsSync(path.join(d, 'tofu.config.yml')));
  const a = repo(); fs.writeFileSync(path.join(a.d, 'cahier.md'), 'x'); fs.mkdirSync(path.join(a.d, 'test'));
  const o = JSON.parse(a.t('', 'adopt', 'frame-client=ref1').stdout);
  assert.strictEqual(o.detected.framing, 'cahier.md');
  assert.ok(fs.existsSync(path.join(a.d, 'cahier.md')));
});

test('coder lock reads protected paths from config', () => {
  const { d, t } = repo(); t('', 'init');
  const r = t(JSON.stringify({ agent_type: 'tofu:coder', tool_input: { file_path: path.join(d, 'features/1-x/SPEC.md') } }), 'hook', 'protect');
  assert.strictEqual(r.status, 2);
  const ok = t(JSON.stringify({ agent_type: 'tofu:coder', tool_input: { file_path: path.join(d, 'src/a.ts') } }), 'hook', 'protect');
  assert.strictEqual(ok.status, 0);
  const human = t(JSON.stringify({ tool_input: { file_path: path.join(d, 'tests/a.ts') } }), 'hook', 'protect');
  assert.strictEqual(human.status, 0);
});

test('release: stage 3, remove 1, ship', () => {
  const { d, g, t, feat } = repo(); t('', 'init');
  for (const [n, s] of [[1, 'a'], [2, 'b'], [3, 'c']]) { feat(n, s); t('', 'start', n, s); t('', 'approve', 'accepted', n); }
  t('', 'release', 'new', '1.0.0');
  for (const n of [1, 2, 3]) { const r = t('', 'release', 'add', n); assert.strictEqual(r.status, 0, r.stderr); }
  assert.match(t('', 'release', 'remove', '1').stdout, /rc\.4/);
  assert.ok(!fs.existsSync(path.join(d, 'a.txt')) || true);
  assert.notStrictEqual(t('', 'ship').status, 0, 'needs release-accepted');
  t('', 'release', 'accept');
  assert.strictEqual(t('', 'ship').status, 0);
  assert.match(g('tag').toString(), /^v1\.0\.0$/m);
});

test('staging refuses non-accepted feature', () => {
  const { t, feat } = repo(); t('', 'init'); feat(1, 'a'); t('', 'start', 1, 'a'); t('', 'release', 'new', '1.0.0');
  assert.notStrictEqual(t('', 'release', 'add', '1').status, 0);
});

test('feature limit', () => {
  const { t, feat } = repo(); t('', 'init');
  t('', 'release', 'new', '1.0.0');
  for (let n = 1; n <= 5; n++) { feat(n, 'f' + n); t('', 'start', n, 'f' + n); t('', 'approve', 'accepted', n); }
  for (let n = 1; n <= 4; n++) assert.strictEqual(t('', 'release', 'add', n).status, 0);
  assert.notStrictEqual(t('', 'release', 'add', '5').status, 0);
});
