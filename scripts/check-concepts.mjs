import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Source-level checks only: this is not a rendered-browser accessibility audit.
const root = fileURLToPath(new URL('../', import.meta.url));
const variants = ['system', 'money', 'growth'];
const requiredSections = ['top', 'questions', 'cases', 'system', 'formats', 'about', 'contact'];
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const expectedFields = ['business', 'question'];
const results = [];
const serviceBodies = [];

for (const variant of variants) {
  const filename = `variants/${variant}.html`;
  const fullpath = path.join(root, filename);
  const html = fs.readFileSync(fullpath, 'utf8');
  const stack = [], nodes = [], ids = new Set();
  const tokens = html.match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>/g) || [];
  for (const token of tokens) {
    if (token.startsWith('<!')) continue;
    if (token.startsWith('</')) {
      const tag = token.match(/^<\/([\w:-]+)/)[1].toLowerCase();
      assert.equal(stack.pop(), tag, `${filename}: unbalanced closing ${tag}`);
      continue;
    }
    const tagMatch = token.match(/^<([\w:-]+)/);
    const tag = tagMatch[1].toLowerCase();
    const attrs = Object.fromEntries([...token.slice(tagMatch[0].length, -1).matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s=<>]+)))?/g)].map(m => [m[1], m[2] ?? m[3] ?? m[4] ?? '']));
    nodes.push({ tag, attrs });
    if (attrs.id) {
      assert(!ids.has(attrs.id), `${filename}: duplicate id ${attrs.id}`);
      ids.add(attrs.id);
    }
    assert(!Object.keys(attrs).some(a => /^on[a-z]/i.test(a)), `${filename}: inline event handler`);
    if (!voidTags.has(tag)) stack.push(tag);
  }
  assert.equal(stack.length, 0, `${filename}: unclosed tags`);
  assert.equal(nodes.filter(n => n.tag === 'h1').length, 1, `${filename}: expected one H1`);
  assert.deepEqual(nodes.filter(n => n.tag === 'section').map(n => n.attrs.id), requiredSections);
  assert.deepEqual(nodes.filter(n => Object.hasOwn(n.attrs, 'required')).map(n => n.attrs.name), expectedFields);
  assert(ids.has('results') && ids.has('case-trade'), `${filename}: retained anchors missing`);

  let checkedLocalFiles = 0;
  for (const { tag, attrs } of nodes) {
    for (const reference of ['aria-labelledby', 'aria-describedby']) {
      for (const id of (attrs[reference] || '').split(/\s+/).filter(Boolean)) {
        assert(ids.has(id), `${filename}: missing ${reference} target ${id}`);
      }
    }
    if (attrs.for) assert(ids.has(attrs.for), `${filename}: missing label target`);
    for (const attribute of ['src', 'href', 'srcset']) {
      if (!attrs[attribute]) continue;
      const value = attrs[attribute];
      if (value.startsWith('data:')) continue;
      if (value.startsWith('#')) {
        assert(ids.has(value.slice(1)), `${filename}: missing anchor ${value}`);
        continue;
      }
      assert(!/^[a-z]+:/i.test(value), `${filename}: unexpected external dependency ${value}`);
      const localPath = path.resolve(path.dirname(fullpath), value.split(/[?#]/)[0]);
      assert(!path.relative(root, localPath).startsWith('..'), `${filename}: resource escapes project`);
      assert(fs.existsSync(localPath), `${filename}: resource missing: ${value}`);
      checkedLocalFiles++;
    }
    if (tag === 'img') assert(attrs.width && attrs.height && attrs.alt, `${filename}: image metadata missing`);
  }

  const navLinks = nodes.filter(n => Object.hasOwn(n.attrs, 'data-variant-link'));
  assert.equal(navLinks.length, 6, `${filename}: comparison links missing`);
  assert.equal(navLinks.filter(n => n.attrs['aria-current'] === 'page').length, 2);
  assert(navLinks.filter(n => n.attrs['aria-current'] === 'page').every(n => n.attrs.href === `${variant}.html`));
  assert.deepEqual(navLinks.slice(0, 3).map(n => n.attrs.href), variants.map(v => `${v}.html`));
  assert.deepEqual(nodes.filter(n => n.attrs['data-topic']).map(n => n.attrs['data-topic']), ['cash', 'control', 'growth']);
  assert(html.includes('content="noindex, nofollow"'), `${filename}: noindex required`);
  assert(html.includes("connect-src 'none'") && html.includes("form-action 'none'"), `${filename}: CSP changed`);
  assert(html.includes('id="qualifier-title" tabindex="-1"'), `${filename}: dialog title focus missing`);
  assert.equal(nodes.filter(n => n.tag === 'dialog').length, 1);
  assert.equal(nodes.filter(n => n.attrs.class === 'situation-card').length, 3);
  assert.equal(nodes.filter(n => n.tag === 'details' && n.attrs['data-faq-id']).length, 6);
  for (const price of ['150&nbsp;000&nbsp;₽', '90&nbsp;000&nbsp;₽', '45&nbsp;000&nbsp;₽']) assert(html.includes(price), `${filename}: approved price missing`);
  serviceBodies.push(html.match(/<div class="service-list">[\s\S]*?<div class="owner-section-end">/)[0]);
  results.push({ page: filename, sections: requiredSections.length, scenarios: 3, requiredFields: 2, checkedLocalFiles, status: 'PASS' });
}

assert(serviceBodies.every(body => body === serviceBodies[0]), 'Service facts and prices must match across variants');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/config.js'), 'utf8'), sandbox, { timeout: 1000 });
assert.equal(sandbox.window.SITE_CONFIG.environment, 'development');
assert.equal(sandbox.window.SITE_CONFIG.analytics.mode, 'disabled');

const switcherSource = fs.readFileSync(path.join(root, 'assets/js/concept-variants.js'), 'utf8');
const switchCases = [
  { name: 'first screen', positions: [0, 800, 1600, 2400, 3200, 4000, 4800], expected: '' },
  { name: 'practice section', positions: [-1700, -900, 40, 900, 1700, 2500, 3300], expected: '#cases' },
  { name: 'open situation', positions: [-900, 20, 1000, 1900, 2700, 3500, 4300], situation: true, expected: '#situation-cash' },
  { name: 'footer returns to start', positions: [-5000, -4000, -3000, -2000, -1000, -500, 0], fromTop: true, expected: '' }
];
for (const test of switchCases) {
  let click;
  const link = {
    href: 'http://127.0.0.1:4174/variants/money.html',
    dataset: test.fromTop ? { compareFromTop: 'true' } : {},
    addEventListener(name, handler) { assert.equal(name, 'click'); click = handler; }
  };
  const sections = requiredSections.map((id, i) => ({ id, getBoundingClientRect: () => ({ top: test.positions[i] }) }));
  const details = test.situation ? [{ id: 'situation-cash', getBoundingClientRect: () => ({ top: 80, bottom: 700 }) }] : [];
  const testDocument = {
    querySelector(selector) {
      assert(['.concept-review-bar', '.site-header'].includes(selector));
      return { offsetHeight: 64 };
    },
    querySelectorAll(selector) {
      if (selector === '[data-variant-link]') return [link];
      if (selector === 'main > section[id]') return sections;
      if (selector === '.situation-card[open]') return details;
      throw new Error(`Unexpected selector in switcher: ${selector}`);
    }
  };
  vm.runInNewContext(switcherSource, {
    document: testDocument,
    window: { location: { href: 'http://127.0.0.1:4174/variants/system.html' } },
    URL
  }, { timeout: 1000 });
  assert.equal(typeof click, 'function');
  click();
  assert.equal(new URL(link.href).hash, test.expected, test.name);
}
console.log(JSON.stringify(results, null, 2));
console.log(`Comparison navigation unit checks: PASS (${switchCases.length} cases; mocked DOM, not a browser).`);
console.log('Concept source checks: PASS. Visual layout and live interactions are not tested by this script.');
