const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function app() {
  const elements = new Map();
  const context = vm.createContext({
    document: { querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, {
        value: '', checked: selector !== '#capitalise', textContent: '',
        style: {}, addEventListener() {},
      });
      return elements.get(selector);
    } },
    window: { addEventListener() {} },
    navigator: {}, setTimeout() {},
  });
  vm.runInContext(readFileSync(path.join(__dirname, '../app.js'), 'utf8'), context);
  return { context, elements, split(raw, options = {}) {
    context.raw = raw;
    context.options = options;
    return Array.from(vm.runInContext('parseNames(preprocessRaw(raw), options)', context));
  } };
}

const examples = [
  ['#陈泰亨', '陈泰亨'], ['# 陈香羽', '陈香羽'],
  ['5) 林金殿', '林金殿'], ['7） 林俊宏', '林俊宏'],
  ['• 李小龙', '李小龙'], ['### 陈志强', '陈志强'],
  ['8) Ingrid Jonker-Kikkert', 'Ingrid Jonker-Kikkert'],
  ['7)林俊宏', '林俊宏'], ['７）　林俊宏', '林俊宏'],
  ['[12] ★ → 陈志强', '陈志强'], ['# • 2) Élodie O’Neill', 'Élodie O’Neill'],
];
for (const [raw, expected] of examples) test(`cleans ${raw}`, () => {
  assert.deepEqual(app().split(raw), [expected]);
});

test('all eight screenshot-style rows have consistent unnumbered output', async () => {
  const instance = app();
  const names = ['陈志强', '林晓芸', '陈泰亨', '陈香羽', '林金殿', '李亚莲', '林俊宏', 'Ingrid Jonker-Kikkert'];
  instance.elements.get('#rawInput').value = names.map((name, i) => `${i + 1}) ${name}`).join('\n');
  await vm.runInContext('runSplit(false)', instance.context);
  assert.equal(instance.elements.get('#output').value, names.join('\n'));
  assert.equal(instance.elements.get('#countBadge').textContent, '8');
});

test('preserves punctuation, Unicode and digits inside names', () => {
  const names = ["Anne-Marie O'Neill", 'Élodie O’Neill', 'Jose\u0301 Alvarez', 'J. R. Smith', '陈·志强', 'Studio 54', 'A & B (SG)'];
  assert.deepEqual(app().split(names.join('\n')), names);
});

test('cleans each separator-delimited name and deduplicates after cleaning', () => {
  const instance = app();
  assert.deepEqual(instance.split('#陈泰亨 / • 陈泰亨 | 2) Anne-Marie，### 林俊宏'), ['陈泰亨', 'Anne-Marie', '林俊宏']);
  assert.deepEqual(instance.split('#陈泰亨\n• 陈泰亨', { doDedupe: false }), ['陈泰亨', '陈泰亨']);
});

test('ignores junk-only entries and keeps existing label and deceased handling', () => {
  assert.deepEqual(app().split('###\n•\n７）\nName＃12: 陈志强\nNo. 3 林俊宏\n# 故陈泰亨'), ['陈志强', '林俊宏', '故 陈泰亨']);
});

test('cleaning works with trimming off and capitalisation enabled', () => {
  const instance = app();
  instance.elements.get('#capitalise').checked = true;
  assert.deepEqual(instance.split('8) ingrid jonker-kikkert', { doTrim: false }), ['Ingrid Jonker-Kikkert']);
});
