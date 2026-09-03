import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = await fs.readFile(new URL('../assets/js/feedback.js', import.meta.url), 'utf8');
function setup({ contacts = false, clipboardDenied = false, compact = false } = {}) {
  const nodes = new Map();
  const writes = [];
  let focused;
  function node(key) {
    if (nodes.has(key)) return nodes.get(key);
    const attrs = new Map();
    const element = {
      hidden: false, value: '', textContent: '', open: false, selected: false,
      events: {}, classList: { add() {}, remove() {} },
      addEventListener(type, listener) { this.events[type] = listener; },
      setAttribute(name, value) { attrs.set(name, value); },
      getAttribute(name) { return attrs.get(name) ?? null; },
      hasAttribute(name) { return attrs.has(name); },
      removeAttribute(name) { attrs.delete(name); },
      focus() { focused = this; }, select() { this.selected = true; },
      querySelector: node,
      querySelectorAll() { return []; },
      getBoundingClientRect() { return { left: 100, top: 100, right: 740, bottom: 800 }; },
      showModal() { this.open = true; },
      close() { this.open = false; this.events.close?.(); }
    };
    nodes.set(key, element);
    return element;
  }
  const fields = new Map(['business', 'question', 'dataSources', 'scale', 'deadline'].map(name => [name, node('field:' + name)]));
  node('#qualifier-form').elements = { namedItem: name => fields.get(name) };
  const opener = node('opener');
  const heading = node('format-heading');
  heading.textContent = 'Финансовая модель решения';
  opener.closest = () => ({ querySelector: () => heading });
  const directMax = node('[data-contact-max][href]');
  const directEmail = node('[data-contact-email][href]');
  if (contacts) {
    directMax.setAttribute('href', 'https://example.invalid/confirmed-contact');
    directEmail.setAttribute('href', 'mailto:test%23tag@example.invalid');
  }
  const media = { matches: compact, addEventListener(type, listener) { this.onChange = listener; } };
  vm.runInNewContext(source, {
    document: { querySelector: node, querySelectorAll: () => [opener], documentElement: node('root'), execCommand: () => false, get activeElement() { return focused; } },
    window: { isSecureContext: true, matchMedia: () => media },
    navigator: { clipboard: { async writeText(text) { if (clipboardDenied) throw new Error('Denied'); writes.push(text); } } },
    encodeURIComponent
  });
  const click = target => node(target).events.click({ preventDefault() {} });
  const open = () => opener.events.click({ preventDefault() {} });
  const submit = () => node('#qualifier-form').events.submit({ preventDefault() {} });
  return { node, fields, opener, writes, click, open, submit, media, focused: () => focused };
}

const draft = setup();
draft.open();
draft.fields.get('business').value = '   ';
draft.fields.get('question').value = 'Вопрос';
draft.submit();
assert.equal(draft.fields.get('business').getAttribute('aria-invalid'), 'true');
draft.fields.get('business').value = '  Производство\u0000 мебели  ';
draft.fields.get('question').value = 'Покупка & аренда? <b>Только текст</b>';
draft.submit();
assert.equal(draft.node('[data-qualifier-confirmation]').hidden, false);
assert.match(draft.node('[data-message-preview]').value, /Сфера и модель бизнеса: Производство мебели/);
assert.match(draft.node('[data-message-preview]').value, /<b>Только текст<\/b>/);
assert.doesNotMatch(draft.node('[data-message-preview]').value, /не указано|Где сейчас ведётся/);
assert.equal(draft.node('[data-open-max]').hidden, true);
assert.equal(draft.node('[data-send-email]').hidden, true);
assert.equal(draft.writes.length, 0, 'Preparing the message must not change the clipboard');
await draft.click('[data-copy-again]');
assert.equal(draft.writes[0], draft.node('[data-message-preview]').value);
const testDialog = draft.node('#qualifier-dialog');
const inside = { target: testDialog, clientX: 110, clientY: 110 };
testDialog.events.pointerdown(inside);
testDialog.events.click(inside);
assert.equal(testDialog.open, true, 'Dialog padding must not dismiss the form');
const outside = { target: testDialog, clientX: 50, clientY: 50 };
testDialog.events.pointerdown(outside);
testDialog.events.click(outside);
assert.equal(testDialog.open, false, 'An intentional backdrop click dismisses the form');

const connected = setup({ contacts: true });
connected.opener.setAttribute('data-cooperation', '');
connected.open();
connected.fields.get('business').value = 'Компания';
connected.fields.get('question').value = 'Расчёт? & Bcc: test@example.invalid\nНовая строка';
connected.fields.get('dataSources').value = '1С и таблицы';
connected.fields.get('scale').value = 'x'.repeat(200);
connected.submit();
assert.match(connected.node('[data-message-preview]').value, /Интересующий формат: Финансовая модель решения/);
assert.match(connected.node('[data-message-preview]').value, /Где сейчас ведётся учёт: 1С и таблицы/);
assert.ok(connected.node('[data-message-preview]').value.endsWith('x'.repeat(180)));
assert.equal(connected.node('[data-open-max]').href, 'https://example.invalid/confirmed-contact');
const mailto = new URL(connected.node('[data-send-email]').href);
assert.equal(mailto.protocol, 'mailto:');
assert.equal(mailto.pathname, 'test%23tag@example.invalid');
assert.deepEqual([...mailto.searchParams.keys()], ['subject', 'body']);
assert.equal(mailto.searchParams.get('body'), connected.node('[data-message-preview]').value);
assert.equal(connected.writes.length, 0);
connected.opener.removeAttribute('data-cooperation');
connected.open();
connected.submit();
assert.equal(connected.node('[data-selected-topic]').hidden, true);
assert.doesNotMatch(connected.node('[data-message-preview]').value, /Интересующий формат/);

const denied = setup({ clipboardDenied: true });
denied.open();
denied.fields.get('business').value = 'Компания';
denied.fields.get('question').value = 'Вопрос';
denied.submit();
await denied.click('[data-copy-again]');
assert.equal(denied.node('[data-message-preview]').selected, true);
assert.match(denied.node('[data-copy-status]').textContent, /вручную/);
assert.equal(denied.node('[data-copy-again]').disabled, false);

const mobile = setup({ compact: true });
mobile.opener.setAttribute('data-cooperation', '');
mobile.open();
assert.equal(mobile.node('[data-question-field]').hidden, true);
assert.equal(mobile.node('[data-prepare-message]').hidden, true);
mobile.click('[data-next-question]');
assert.equal(mobile.focused(), mobile.fields.get('business'));
assert.equal(mobile.node('#business-hint').hidden, true);
mobile.fields.get('business').value = 'Производство';
mobile.click('[data-next-question]');
assert.equal(mobile.node('[data-business-field]').hidden, true);
assert.equal(mobile.node('[data-question-field]').hidden, false);
assert.equal(mobile.node('[data-prepare-message]').hidden, false);
assert.equal(mobile.focused(), mobile.fields.get('question'));
mobile.click('[data-open-extras]');
assert.equal(mobile.node('[data-qualifier-form-view]').hidden, true);
assert.equal(mobile.node('[data-qualifier-extras-view]').hidden, false);
assert.equal(mobile.node('#qualifier-dialog').getAttribute('aria-labelledby'), 'qualifier-extras-title');
mobile.fields.get('dataSources').value = '1С';
mobile.click('[data-save-extras]');
assert.equal(mobile.node('[data-qualifier-extras-view]').hidden, true);
assert.equal(mobile.node('[data-question-field]').hidden, false);
assert.equal(mobile.fields.get('dataSources').value, '1С');
mobile.submit();
assert.equal(mobile.focused(), mobile.fields.get('question'));
mobile.fields.get('question').value = 'Где находятся деньги?';
mobile.click('[data-previous-question]');
assert.equal(mobile.node('[data-selected-topic]').hidden, false);
assert.equal(mobile.fields.get('question').value, 'Где находятся деньги?');
mobile.media.matches = false;
mobile.media.onChange();
assert.equal(mobile.node('[data-business-field]').hidden, false);
assert.equal(mobile.node('[data-question-field]').hidden, false);
assert.equal(mobile.node('[data-next-question]').hidden, true);
mobile.submit();
assert.equal(mobile.node('#qualifier-form').hidden, true);
assert.match(mobile.node('[data-message-preview]').value, /Интересующий формат: Финансовая модель решения/);
assert.match(mobile.node('[data-message-preview]').value, /Где сейчас ведётся учёт: 1С/);
mobile.click('[data-edit-qualifier]');
assert.equal(mobile.node('#qualifier-form').hidden, false);
assert.equal(mobile.fields.get('question').value, 'Где находятся деньги?');
mobile.media.matches = true;
mobile.media.onChange();
assert.equal(mobile.node('[data-question-field]').hidden, true);
assert.equal(mobile.node('[data-business-field]').hidden, false);
console.log('PASS: validation, optional fields, mobile steps, resize, draft preservation, plain text, format switching, mailto encoding, explicit copying and denied-clipboard fallback.');
