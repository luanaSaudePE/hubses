const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function load(legacy = {}, preferences) {
  const stored = new Map([['ses-hub-v1', JSON.stringify(legacy)]]);
  if (preferences) stored.set('ses-hub-preferences-v2', JSON.stringify(preferences));
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', innerHTML: '', textContent: '', listeners: {},
      classList: { add() {}, toggle() {} }, setAttribute() {},
      addEventListener(name, callback) { this.listeners[name] = callback; },
    });
    return elements.get(id);
  }
  const context = vm.createContext({
    URL, AbortSignal, setInterval() {}, fetch: async () => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'catalog.json'), 'utf8')) }), navigator: { platform: 'Windows' }, window: { addEventListener() {} },
    localStorage: { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) },
    document: { getElementById: element, querySelector: () => element('meta'), documentElement: { dataset: {} }, addEventListener() {} },
  });
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (!match[1].includes('tailwind.config')) vm.runInContext(match[1], context);
  }
  context.fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'catalog.json'), 'utf8')).tools;
  vm.runInContext('catalog = fixture; render()', context);
  return { context, elements, stored };
}
test('published catalog ignores old browser overrides and custom links', () => {
  const { context, elements } = load({ links: { miro: 'https://obsolete.example' }, custom: [{ id: 'old', name: 'Old shortcut', category: 'gestao' }] });
  assert.equal(vm.runInContext('tools().find(tool => tool.id === "miro").url', context), 'https://miro.com/app/board/uXjVJs_eJ3I=/');
  assert.ok(!elements.get('board').innerHTML.includes('obsolete.example'));
  assert.ok(!elements.get('board').innerHTML.includes('Old shortcut'));
  assert.ok(elements.get('board').innerHTML.includes('data-edit'));
});
test('preferences migrate while preserving legacy data', () => {
  const legacy = { favorites: ['miro'], theme: 'light', links: { miro: 'https://old.example' } };
  const { context, stored } = load(legacy);
  assert.equal(vm.runInContext('state.theme', context), 'light');
  vm.runInContext('saveState()', context);
  assert.deepEqual(JSON.parse(stored.get('ses-hub-preferences-v2')), { favorites: ['miro'], theme: 'light' });
  assert.deepEqual(JSON.parse(stored.get('ses-hub-v1')), legacy);
  const next = load(legacy, { favorites: [], theme: 'dark' });
  assert.equal(vm.runInContext('state.theme', next.context), 'dark');
});
test('search and favorites filter the catalog', () => {
  const { elements } = load({ favorites: ['miro'] });
  elements.get('favorites-toggle').listeners.click();
  assert.ok(elements.get('board').innerHTML.includes('Miro'));
  assert.ok(!elements.get('board').innerHTML.includes('Redmine'));
  elements.get('search').value = 'nonexistent';
  elements.get('search').listeners.input();
  assert.ok(elements.get('board').innerHTML.includes('Nenhuma ferramenta encontrada'));
});
