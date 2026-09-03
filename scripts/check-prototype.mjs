import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = (file) => fs.readFile(new URL(file, root), 'utf8');
const [html, css, script, config, privacy, feedback] = await Promise.all(['index.html', 'assets/css/site.css', 'assets/js/site.js', 'assets/js/config.js', 'privacy.html', 'assets/js/feedback.js'].map(read));
const results = [];
function check(name, run) { run(); results.push({ name, status: 'PASS' }); }
check('Seven sections, one H1, ten FAQ entries', () => {
  assert.equal((html.match(/<section\b/g) || []).length, 7);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal((html.split('<div class="faq-list">')[1].split('</div>')[0].match(/<details>/g) || []).length, 10);
});
check('All fragment links have targets; IDs are unique', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const link of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(link[1]), link[1]);
  assert.doesNotMatch(html, /href=""/);
});
check('One local brief, no analytics, storage, network submission or inline scripts', () => {
  assert.equal((html.match(/<dialog\b/g) || []).length, 1);
  assert.equal((html.match(/<form\b/g) || []).length, 1);
  assert.match(html, /<form[^>]+method="dialog"/);
  assert.doesNotMatch(html, /<iframe\b|analytics\.js|<style\b|on(?:click|load|error)=/i);
  assert.doesNotMatch(script + feedback, /sessionStorage|localStorage|clipboard\.read|postMessage|fetch\s*\(|XMLHttpRequest|document\.cookie|utm_|\.innerHTML\s*=/i);
  assert.equal((html.match(/<script /g) || []).length, 3);
  assert.equal((html.match(/data-cooperation/g) || []).length, 4);
});
check('Local video, portrait, indexing and CSP', () => {
  assert.match(html, /media-src 'self'/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /alt="Ксения Богатова, финансовый директор на аутсорсе"/);
  assert.match(html, /<video controls playsinline preload="metadata" width="1280" height="720"/);
  assert.doesNotMatch(html, /\sautoplay\b/);
  for (const page of [html, privacy]) assert.match(page, /name="robots" content="noindex, nofollow"/);
});
check('Reduced motion and visible keyboard focus have CSS rules', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation: none !important; transition: none !important/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /overflow-x:\s*(hidden|clip)/);
});

function environment(values = {}, reduce = false) {
  const node = (extra = {}) => ({ hidden: true, textContent: '', setAttribute(k,v) { this[k]=v; }, replaceChildren(...children) { this.children=children; }, ...extra });
  const cta = node({href:'#contact',hidden:false});
  const max = node();
  const email = node();
  const maxPlaceholder = node({hidden:false});
  const emailPlaceholder = node({hidden:false});
  const footerMax=node(),footerEmail=node();
  const legal=node({dataset:{legal:'legalName'},textContent:'ИП [полное имя]'});
  const step=node({classList:{remove(){},toggle(){}}});
  let observers=0;
  const map = {
    '[data-contact-max]':[max],
    '[data-max-placeholder]':[maxPlaceholder],
    '[data-footer-max]':[footerMax],
    '[data-contact-email]':[email],
    '[data-email-placeholder]':[emailPlaceholder],
    '[data-footer-email]':[footerEmail],
    '[data-legal]':[legal],
    '.cycle-step':[step]
  };
  const context = {
    URL, encodeURIComponent,
    window:{SITE_CONFIG:values, matchMedia:()=>({matches:reduce,addEventListener(){}}),IntersectionObserver:true},
    document:{querySelector:()=>null,querySelectorAll:q=>map[q]||[],createElement:()=>node(),documentElement:{classList:{replace(){}}}},
    IntersectionObserver:class {constructor(){observers++;} observe(){} disconnect(){}}
  };
  vm.runInNewContext(script,context);
  return {cta,max,email,maxPlaceholder,emailPlaceholder,footerMax,footerEmail,legal,observers};
}
check('Empty configuration preserves contact fallback', () => {
  const r=environment();
  assert.equal(r.cta.href,'#contact'); assert.equal(r.max.hidden,true); assert.equal(r.email.hidden,true);
  assert.equal(r.maxPlaceholder.hidden,false); assert.equal(r.legal.textContent,'ИП [полное имя]');
});
check('Configured links: HTTPS, noopener and plain mailto', () => {
  const r=environment({maxUrl:'https://example.com/confirmed-contact',email:'test@example.com',legalName:'Test operator'});
  assert.equal(r.max.href,'https://example.com/confirmed-contact'); assert.equal(r.max.target,'_blank'); assert.equal(r.max.rel,'noopener');
  assert.equal(r.cta.href,'#contact');
  assert.equal(r.email.href,'mailto:test@example.com'); assert.equal(r.email.hidden,false); assert.equal(r.maxPlaceholder.hidden,true);
  assert.equal(r.legal.textContent,'Test operator'); assert.equal(r.footerMax.children.length,1);
});
check('Unsafe links, placeholders and mailto query injection are rejected', () => {
  for(const url of ['javascript:alert(1)','http://example.com','https://user:password@example.com','{{MAX_URL}}','[MAX_URL]']) assert.equal(environment({maxUrl:url}).max.hidden,true);
  for(const email of ['test@example.com?body=message','test@example.com\r\nBcc: x@example.com','[e-mail]']) assert.equal(environment({email}).email.hidden,true);
  assert.equal(environment({email:'test#tag@example.com'}).email.href,'mailto:test%23tag@example.com');
});
check('Pages without the interactive cycle create no motion observer', () => {
  assert.equal(environment({},true).observers,0); assert.equal(environment({},false).observers,0);
});
check('Config has empty confirmed-contact slots', () => {
  const c={window:{}};vm.runInNewContext(config,c);
  assert.equal(c.window.SITE_CONFIG.maxUrl,'');assert.equal(c.window.SITE_CONFIG.email,'');
});
function luminance(hex) {
  const rgb=hex.match(/[\da-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
const contrasts=[['0d1a36','f4f0e7'],['46516a','f4f0e7'],['765019','f4f0e7'],['765019','fffaf1'],['fffaf1','0d1a36'],['c5cedf','0d1a36'],['c5cedf','172b52'],['dfb56c','172b52'],['0d1a36','fcfaf5'],['46516a','fcfaf5'],['765019','fcfaf5'],['765019','fffefb'],['0d1a36','efd8b2'],['0d1a36','f2ebde']].map(([fg,bg])=>({foreground:'#'+fg,background:'#'+bg,ratio:Number(((Math.max(luminance(fg),luminance(bg))+.05)/(Math.min(luminance(fg),luminance(bg))+.05)).toFixed(2))}));
check('All intended body text colour pairs exceed 4.5:1',()=>contrasts.forEach(c=>assert.ok(c.ratio>=4.5)));
await fs.mkdir(new URL('artifacts/prototype/',root),{recursive:true});
await fs.writeFile(new URL('artifacts/prototype/source-checks.json',root),JSON.stringify({results,contrasts},null,2));
console.log(JSON.stringify({passed:results.length,contrasts},null,2));
