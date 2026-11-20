/* Headless visual-review harness — zero dependencies.
 *
 *   node tools/review.js                       → screenshots + report in tools/shots/
 *   node tools/review.js --out C:\tmp\shots
 *   node tools/review.js --url http://localhost:5173
 *   node tools/review.js --only desktop        → skip the mobile + reduced-motion passes
 *
 * Drives the installed Chrome over the DevTools Protocol using Node's built-in
 * fetch and WebSocket, so there is nothing to npm install. It scrolls section by
 * section (reveals are IntersectionObserver-driven, so a single full-page capture
 * would photograph them mid-fade), then reports console errors, failed requests,
 * and a set of layout assertions.
 *
 * Exit code is 1 if any page exception, console error, or assertion failure is found.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const PAGE = arg('url', 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/'));
const OUT = path.resolve(arg('out', path.join(__dirname, 'shots')));
const ONLY = arg('only', 'all');
const PORT = 9333 + Math.floor(Math.random() * 400);

const CHROME = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
].find(p => p && fs.existsSync(p));

if (!CHROME) {
  console.error('Chrome not found. Set CHROME_PATH to chrome.exe and retry.');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'review-profile-'));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--allow-file-access-from-files',
  '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + profile,
  'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function endpoint() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (p) return p.webSocketDebuggerUrl;
    } catch (e) { /* still starting */ }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    const events = [];
    let id = 0;
    ws.onopen = () => resolve({
      events,
      send: (method, params) => new Promise((rs, rj) => {
        const i = ++id;
        pending.set(i, { rs, rj });
        ws.send(JSON.stringify({ id: i, method, params: params || {} }));
      }),
      close: () => ws.close()
    });
    ws.onerror = () => reject(new Error('websocket failed'));
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id);
        pending.delete(m.id);
        m.error ? p.rj(new Error(JSON.stringify(m.error))) : p.rs(m.result);
      } else if (m.method) events.push(m);
    };
  });
}

(async () => {
  const cdp = await connect(await endpoint());
  for (const d of ['Page', 'Runtime', 'Log', 'Network']) await cdp.send(d + '.enable');

  const evaluate = async expr => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + r.exceptionDetails.text);
    return r.result.value;
  };
  const viewport = (w, h, mobile) => cdp.send('Emulation.setDeviceMetricsOverride',
    { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  const shoot = async name => {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  };
  const load = async () => {
    await cdp.send('Page.navigate', { url: PAGE });
    await sleep(600);
    await evaluate('new Promise(r=>{if(document.readyState==="complete")r(1);else addEventListener("load",()=>r(1))})');
    await sleep(3200);                       // preloader (~1.75s) + hero entrance
  };
  const scrollTo = async sel => {
    await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});
      if(e)window.scrollTo({top:e.getBoundingClientRect().top+window.scrollY-60,behavior:'instant'});return 1})()`);
    await sleep(1500);                       // reveal animation + stagger
  };

  /* ── desktop ── */
  await viewport(1440, 900);
  await load();
  await shoot('01-hero');

  const stops = await evaluate(`[...document.querySelectorAll('main section[id]')].map(s=>'#'+s.id)`);
  let n = 1;
  for (const sel of stops.slice(1)) {        // slice(1): the hero is already shot
    await scrollTo(sel);
    await shoot(String(++n).padStart(2, '0') + '-' + sel.slice(1));
  }

  const checks = await evaluate(`(()=>{
    const q = s => document.querySelector(s);
    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      pageHeight: document.documentElement.scrollHeight,
      loaderRemoved: !q('#loader'),
      levelBadge: q('#levelText') && q('#levelText').textContent,
      footerYear: q('#year') && q('#year').textContent,
      engravingEllipses: document.querySelectorAll('.engrave ellipse').length,
      fansAnimating: getComputedStyle(q('.fan')).animationName === 'spin',
      timelineDotsLit: document.querySelectorAll('.t-item.lit').length,
      revealsStillHidden: [...document.querySelectorAll('[data-reveal]')]
        .filter(e => parseFloat(getComputedStyle(e).opacity) < 0.9).length,
      activeNavLink: q('#navLinks a.active') && q('#navLinks a.active').textContent,
      usingPhoto: q('#photo') && !q('#photo').hidden
    };
  })()`);

  /* ── mobile ── */
  let mobile = null;
  if (ONLY === 'all' || ONLY === 'mobile') {
    await viewport(390, 844, true);
    await load();
    await shoot('40-mobile-hero');
    for (const sel of stops.slice(1)) {
      await scrollTo(sel);
      await shoot('4' + (stops.indexOf(sel)) + '-mobile-' + sel.slice(1));
    }
    await evaluate('window.scrollTo({top:0,behavior:"instant"});document.getElementById("navToggle").click();1');
    await sleep(700);
    await shoot('49-mobile-menu');
    mobile = await evaluate(`({
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      menuOpen: document.getElementById('navLinks').classList.contains('open'),
      navBarVisible: getComputedStyle(document.getElementById('nav')).transform !== 'matrix(1, 0, 0, 1, 0, -60)'
        && !document.getElementById('nav').classList.contains('hide')
    })`);
  }

  /* ── reduced motion ── */
  let reduced = null;
  if (ONLY === 'all' || ONLY === 'reduced') {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await viewport(1440, 900);
    await load();
    await shoot('60-reduced-hero');
    reduced = await evaluate(`({
      loaderRemoved: !document.querySelector('#loader'),
      nothingHidden: [...document.querySelectorAll('[data-reveal]')]
        .every(e => parseFloat(getComputedStyle(e).opacity) > 0.9),
      heroName: document.querySelector('h1').textContent.trim()
    })`);
  }

  /* ── diagnostics ── */
  const exceptions = cdp.events.filter(e => e.method === 'Runtime.exceptionThrown')
    .map(e => e.params.exceptionDetails.text);
  const consoleErrors = cdp.events.filter(e => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
    .map(e => (e.params.args || []).map(a => a.value || a.description).join(' '));
  // the assets/yushu.jpg probe 404s by design until a portrait is added
  const failed = cdp.events.filter(e => e.method === 'Network.loadingFailed')
    .map(e => e.params.errorText + ' (' + e.params.type + ')')
    .filter(t => !/ERR_FILE_NOT_FOUND \(Image\)|ERR_ABORTED \(Image\)/.test(t));

  const problems = [];
  if (checks.horizontalOverflow) problems.push('page scrolls horizontally on desktop');
  if (mobile && mobile.horizontalOverflow) problems.push('page scrolls horizontally on mobile');
  if (mobile && mobile.menuOpen && !mobile.navBarVisible) problems.push('mobile menu is open while the nav bar is hidden — no way to close it');
  if (checks.revealsStillHidden) problems.push(checks.revealsStillHidden + ' reveal element(s) never became visible');
  if (!checks.loaderRemoved) problems.push('preloader never dismissed');
  if (!checks.fansAnimating) problems.push('rig fans are not animating');
  if (reduced && !reduced.nothingHidden) problems.push('content hidden under prefers-reduced-motion');
  exceptions.forEach(e => problems.push('page exception: ' + e));
  consoleErrors.forEach(e => problems.push('console error: ' + e));
  failed.forEach(f => problems.push('failed request: ' + f));

  console.log(JSON.stringify({ page: PAGE, out: OUT, desktop: checks, mobile, reduced, problems }, null, 2));
  console.log(problems.length ? `\n✗ ${problems.length} problem(s) found\n` : '\n✓ clean\n');

  cdp.close();
  chrome.kill();
  process.exit(problems.length ? 1 : 0);
})().catch(e => {
  console.error('FAILED: ' + e.message);
  try { chrome.kill(); } catch (_) {}
  process.exit(1);
});
