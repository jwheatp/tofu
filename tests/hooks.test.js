const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const S = (n) => path.join(__dirname, '..', 'hooks', 'scripts', n);
const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'tofu-h-'));
fs.writeFileSync(path.join(proj, 'tofu.config.json'), JSON.stringify({ paths: { tests: ['tests/', 'e2e/'], contracts: 'src/contracts/' }, rules: ['Use design system components.'] }));
const run = (script, input) => spawnSync('node', [S(script)], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: proj, CLAUDE_PLUGIN_ROOT: path.join(__dirname, '..'), CLAUDE_PLUGIN_DATA: proj } });
const edit = (role, f) => run('protect.js', { agent_type: role, tool_input: { file_path: path.join(proj, f) } }).status;
const bash = (role, cmd) => run('protect-bash.js', { agent_type: role, tool_input: { command: cmd } }).status;

test('coder cannot edit tests, CI or config; can edit src', () => {
  for (const f of ['tests/a.test.ts', 'e2e/x/y.ts', '.github/workflows/tofu.yml', 'tofu.config.json', '.claude/settings.json']) assert.strictEqual(edit('tofu:coder', f), 2, f);
  assert.strictEqual(edit('tofu:coder', 'src/app.ts'), 0);
});
test('humans and main agent are not restricted', () => {
  assert.strictEqual(edit(undefined, 'tests/a.test.ts'), 0);
});
test('tester writes only tests', () => {
  assert.strictEqual(edit('tofu:tester', 'tests/a.test.ts'), 0);
  assert.strictEqual(edit('tofu:tester', 'src/app.ts'), 2);
});
test('coder shell writes and PR edits are blocked', () => {
  for (const c of ['sed -i s/a/b/ tests/a.ts', 'echo x > tests/a.ts', 'rm -rf e2e', 'git checkout -- tests/a.ts', 'mv tests/a.ts /tmp', 'gh pr edit 3 --add-label tofu:approved', 'git push --force origin x', 'git push -f']) assert.strictEqual(bash('tofu:coder', c), 2, c);
  for (const c of ['npm test', 'git status', 'cat tests/a.ts', 'echo hi > src/a.ts', 'git push origin tofu/1-x']) assert.strictEqual(bash('tofu:coder', c), 0, c);
});
test('challenger and tester cannot read application code', () => {
  const r = (role, f) => run('protect-read.js', { agent_type: role, tool_input: { file_path: path.join(proj, f) } }).status;
  assert.strictEqual(r('tofu:challenger', 'src/app.ts'), 2);
  assert.strictEqual(r('tofu:tester', 'src/contracts/user.ts'), 0);
  assert.strictEqual(r('tofu:coder', 'src/app.ts'), 0);
});
test('session start injects rules', () => {
  const r = run('session-start.js', {});
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /Tofu rules for agents/);
  assert.match(ctx, /design system components/);
});
test('expand warns but never blocks', () => {
  const r = run('expand.js', { prompt: '/tofu:approve accepted' });
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /warning/i);
});
