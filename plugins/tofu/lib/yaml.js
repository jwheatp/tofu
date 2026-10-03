'use strict';
// Minimal YAML subset: nested maps, "- " lists, flow lists [a, b], scalars, comments.
function scalar(v) {
  v = v.trim();
  if (v === '') return null;
  if (v[0] === '[' && v.endsWith(']')) return v.slice(1, -1).split(',').map((x) => scalar(x)).filter((x) => x !== null && x !== '');
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === 'true' || v === 'false') return v === 'true';
  return v.replace(/^(['"])(.*)\1$/, '$2');
}
function parse(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+#.*$/, '').replace(/^#.*$/, '')).filter((l) => l.trim());
  let i = 0;
  const indent = (l) => l.match(/^ */)[0].length;
  function block(ind) {
    if (lines[i] && lines[i].trim().startsWith('- ')) {
      const arr = [];
      while (i < lines.length && indent(lines[i]) === ind && lines[i].trim().startsWith('- ')) arr.push(scalar(lines[i++].trim().slice(2)));
      return arr;
    }
    const obj = {};
    while (i < lines.length && indent(lines[i]) === ind) {
      const m = /^\s*([^:]+?):\s*(.*)$/.exec(lines[i++]);
      if (!m) continue;
      if (m[2] === '' && i < lines.length && indent(lines[i]) > ind) obj[m[1]] = block(indent(lines[i]));
      else obj[m[1]] = scalar(m[2]);
    }
    return obj;
  }
  return lines.length ? block(indent(lines[0])) : {};
}
module.exports = { parse };
