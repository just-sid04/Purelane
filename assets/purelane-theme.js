/* Purelane interaction engine: multi-instance + Theme Editor lifecycle safe. */
'use strict';

const PURELANE = new WeakMap();
const HERO_STATE = new WeakMap();
let revealObserver = null;
let globalReady = false;
let scrollFrame = 0;
let pointerFrame = 0;
const SECTION_SELECTOR = '.shopify-section,[id^="shopify-section-"]';

const sectionFor = el => el?.closest?.(SECTION_SELECTOR) || el?.parentElement || null;
function eventSection(event) {
  const target = event?.target;
  if (target?.matches?.(SECTION_SELECTOR)) return target;
  return target?.closest?.(SECTION_SELECTOR) || (event?.detail?.sectionId ? document.getElementById(`shopify-section-${event.detail.sectionId}`) : null);
}
function addCleanup(root, fn) { if (!root) return; const list = PURELANE.get(root) || []; list.push(fn); PURELANE.set(root, list); }
function cleanup(root) {
  if (!root) return;
  (PURELANE.get(root) || []).forEach(fn => { try { fn(); } catch (_) {} });
  PURELANE.delete(root); HERO_STATE.delete(root);
  root.querySelectorAll('.rv').forEach(el => revealObserver?.unobserve(el));
}
function updateScrollState() {
  const vh = innerHeight;
  document.querySelectorAll('#hdr,[data-purelane-header]').forEach(el => el.classList.toggle('up', scrollY > 90));
  document.querySelectorAll('#scenes,[data-purelane-scenes]').forEach(scenes => {
    const sceneEls = [...scenes.querySelectorAll('.scene')]; if (!sceneEls.length) return;
    let best = Number.parseInt(scenes.dataset.sc, 10) || 1, visible = 0;
    document.querySelectorAll('[data-scene]').forEach(section => { const r = section.getBoundingClientRect(); const amount = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)); if (amount > visible) { visible = amount; best = Number.parseInt(section.dataset.scene, 10) || 1; } });
    if (Number.parseInt(scenes.dataset.sc, 10) !== best) { scenes.dataset.sc = String(best); sceneEls.forEach((scene, i) => scene.classList.toggle('on', i === best - 1)); }
  });
  document.querySelectorAll('#rail,[data-purelane-rail]').forEach(rail => rail.querySelectorAll('a').forEach(link => { const id = link.getAttribute('href')?.replace(/^.*#/, ''); const target = id ? document.getElementById(id) : null; if (!target) return; const r = target.getBoundingClientRect(); link.classList.toggle('on', r.top < vh * .6 && r.bottom > vh * .1); }));
}
function scheduleScrollState() { if (scrollFrame) return; scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; updateScrollState(); }); }
function initGlobal() {
  if (globalReady) return; globalReady = true;
  addEventListener('scroll', scheduleScrollState, { passive: true }); addEventListener('resize', scheduleScrollState, { passive: true }); updateScrollState();
  if (!matchMedia?.('(prefers-reduced-motion: reduce)').matches) document.addEventListener('mousemove', e => { if (window.Shopify?.inspectMode) return; if (pointerFrame) cancelAnimationFrame(pointerFrame); pointerFrame = requestAnimationFrame(() => { pointerFrame = 0; const px = ((e.clientX / innerWidth) - .5) * 18, py = ((e.clientY / innerHeight) - .5) * 10; document.querySelectorAll('.wl').forEach((el, i) => { const f = 1 + i * .35; el.style.setProperty('--px', `${px * f}px`); el.style.setProperty('--py', `${py * f}px`); }); }); }, { passive: true });
  document.documentElement.classList.toggle('purelane-inspect-mode', Boolean(window.Shopify?.inspectMode));
}
function initReveals(scope = document) {
  const items = [...scope.querySelectorAll('.rv:not(.in)')]; if (!items.length) return;
  if (!('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('in')); return; }
  if (!revealObserver) revealObserver = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); revealObserver.unobserve(entry.target); } }), { threshold: .11 });
  items.forEach(el => revealObserver.observe(el));
}
function initHeroes(scope = document) {
  scope.querySelectorAll('.hstage').forEach(stage => {
    const root = sectionFor(stage), slides = [...stage.querySelectorAll('.hslide')]; if (!root || HERO_STATE.has(root) || !slides.length) return;
    const dots = [...(stage.querySelector('#hdots,[data-hero-dots]') || root.querySelector('#hdots,[data-hero-dots]'))?.querySelectorAll('button') || []];
    const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const state = { current: Math.max(0, slides.findIndex(s => s.classList.contains('on'))), timer: null, breath: null, paused: false, editorPaused: false }; HERO_STATE.set(root, state);
    const sync = () => dots.forEach((dot, i) => { dot.classList.toggle('on', i === state.current); dot.setAttribute('aria-current', i === state.current ? 'true' : 'false'); });
    const go = n => { state.current = (n + slides.length) % slides.length; slides.forEach((s, i) => { s.classList.toggle('on', i === state.current); s.setAttribute('aria-hidden', i === state.current ? 'false' : 'true'); }); sync(); };
    const stop = () => { if (state.timer) { clearInterval(state.timer); state.timer = null; } };
    const start = () => { if (state.paused || state.editorPaused || reduced || slides.length < 2) return; stop(); state.timer = setInterval(() => go(state.current + 1), 4000); };
    dots.forEach((dot, i) => dot.addEventListener('click', () => { go(i); start(); }));
    const enter = () => { state.paused = true; stop(); }, leave = () => { state.paused = false; start(); };
    stage.addEventListener('pointerenter', enter); stage.addEventListener('pointerleave', leave);
    const product = root.querySelector('#heroProd,[data-hero-product]');
    if (product && window.Animation && !reduced) { try { state.breath = product.animate([{ filter: 'drop-shadow(0 34px 54px rgba(2,20,19,.60))' }, { filter: 'drop-shadow(0 42px 68px rgba(2,20,19,.72))' }, { filter: 'drop-shadow(0 34px 54px rgba(2,20,19,.60))' }], { duration: 4800, easing: 'ease-in-out', iterations: Infinity }); } catch (_) {} }
    go(state.current); start();
    addCleanup(root, () => { stop(); state.breath?.cancel?.(); stage.removeEventListener('pointerenter', enter); stage.removeEventListener('pointerleave', leave); });
  });
}
function initRotators(scope = document) {
  scope.querySelectorAll('#rot,.rot,[data-purelane-rotator]').forEach(rot => {
    if (rot.dataset.purelaneRotatorReady === '1') return; const root = sectionFor(rot), imgs = [...rot.querySelectorAll('.pimg')], dots = [...rot.querySelectorAll('.dots i')], cap = rot.querySelector('.cap'); if (!root || !imgs.length) return;
    rot.dataset.purelaneRotatorReady = '1'; let current = Math.max(0, imgs.findIndex(x => x.classList.contains('on'))); const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const show = n => { const old = current; current = (n + imgs.length) % imgs.length; imgs[old]?.classList.remove('on'); dots[old]?.classList.remove('on'); imgs[current]?.classList.add('on'); dots[current]?.classList.add('on'); if (cap) { const b = cap.querySelector('b'), s = cap.querySelector('span'); if (b) b.textContent = imgs[current]?.dataset.name || ''; if (s) s.textContent = imgs[current]?.dataset.note || ''; } };
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i))); const timer = reduced || imgs.length < 2 ? null : setInterval(() => show(current + 1), 2800); show(current);
    addCleanup(root, () => { clearInterval(timer); delete rot.dataset.purelaneRotatorReady; });
  });
}
function initHints(scope = document) {
  scope.querySelectorAll('.comborail').forEach(rail => { const root = sectionFor(rail), cue = root?.querySelector('.swipecue'); if (!root || !cue || rail.dataset.purelaneHintReady === '1') return; rail.dataset.purelaneHintReady = '1'; const fn = () => { cue.style.opacity = rail.scrollLeft > 20 ? '0' : '1'; }; rail.addEventListener('scroll', fn, { passive: true }); addCleanup(root, () => { rail.removeEventListener('scroll', fn); delete rail.dataset.purelaneHintReady; }); });
  scope.querySelectorAll('.stripwrap').forEach(strip => { const root = sectionFor(strip), hint = root?.querySelector('.striphint'); if (!root || !hint || strip.dataset.purelaneHintReady === '1') return; strip.dataset.purelaneHintReady = '1'; const fn = () => { hint.style.opacity = strip.scrollLeft > 10 ? '0' : '1'; }; strip.addEventListener('scroll', fn, { passive: true }); addCleanup(root, () => { strip.removeEventListener('scroll', fn); delete strip.dataset.purelaneHintReady; }); });
}
async function addToCart(e) { const button = e.target.closest?.('[name="add"],[data-atc]'); if (!button) return; const form = button.closest('form'); if (!form || button.disabled) return; e.preventDefault(); const id = form.querySelector('[name="id"]')?.value; if (!id) return; button.disabled = true; const original = button.textContent; button.textContent = 'Adding…'; try { const r = await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: JSON.stringify({ id, quantity: 1 }) }); if (!r.ok) throw 0; await r.json(); const cr = await fetch('/cart.js', { headers: { 'X-Requested-With': 'XMLHttpRequest' } }); if (!cr.ok) throw 0; const cart = await cr.json(); document.querySelectorAll('.dot').forEach(dot => dot.textContent = cart.item_count); button.textContent = 'Added ✓'; setTimeout(() => { button.textContent = original; button.disabled = false; }, 1600); } catch (_) { button.textContent = 'Error — retry'; setTimeout(() => { button.textContent = original; button.disabled = false; }, 1600); } }
function burgerToggle(e) { const burger = e.target.closest?.('.burger'); if (!burger) return; const root = sectionFor(burger), nav = root?.querySelector('.nav'); if (!nav) return; const open = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); }
function closeMobileNav(e) { const link = e.target.closest?.('.nav a'); if (!link) return; const root = sectionFor(link), nav = root?.querySelector('.nav'), burger = root?.querySelector('.burger'); if (!nav || !burger) return; nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); }
function smoothAnchor(e) { const link = e.target.closest?.('a[href^="#"]'); if (!link) return; const id = link.getAttribute('href')?.slice(1), target = id ? document.getElementById(id) : null; if (!target) return; e.preventDefault(); target.scrollIntoView({ behavior: matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
function selectBlock(e) { const block = e.target?.closest?.('.hslide'); if (!block) return; const root = sectionFor(block), state = HERO_STATE.get(root); if (!state) return; const slides = [...root.querySelectorAll('.hslide')], index = slides.indexOf(block); if (index < 0) return; state.editorPaused = true; state.paused = true; if (state.timer) clearInterval(state.timer); state.timer = null; state.current = index; slides.forEach((s, i) => { s.classList.toggle('on', i === index); s.setAttribute('aria-hidden', i === index ? 'false' : 'true'); }); }
function deselectBlock(e) { const block = e.target?.closest?.('.hslide'); if (!block) return; const root = sectionFor(block), state = HERO_STATE.get(root); if (!state) return; state.editorPaused = false; state.paused = false; const slides = [...root.querySelectorAll('.hslide')]; slides.forEach((s, i) => { s.classList.toggle('on', i === state.current); s.setAttribute('aria-hidden', i === state.current ? 'false' : 'true'); }); if (!matchMedia?.('(prefers-reduced-motion: reduce)').matches && slides.length > 1) { if (state.timer) clearInterval(state.timer); state.timer = setInterval(() => { state.current = (state.current + 1) % slides.length; slides.forEach((s, i) => { s.classList.toggle('on', i === state.current); s.setAttribute('aria-hidden', i === state.current ? 'false' : 'true'); }); }, 4000); } }
function initialise(scope = document) { initGlobal(); initReveals(scope); initHeroes(scope); initRotators(scope); initHints(scope); scheduleScrollState(); }

initialise();
document.addEventListener('click', addToCart); document.addEventListener('click', burgerToggle); document.addEventListener('click', closeMobileNav); document.addEventListener('click', smoothAnchor);
document.addEventListener('shopify:section:load', e => { const root = eventSection(e); if (root) { cleanup(root); initialise(root); } });
document.addEventListener('shopify:section:unload', e => { const root = eventSection(e); if (root) cleanup(root); scheduleScrollState(); });
document.addEventListener('shopify:section:reorder', () => initialise());
document.addEventListener('shopify:section:select', e => { const root = eventSection(e); if (root) { root.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); initReveals(root); } scheduleScrollState(); });
document.addEventListener('shopify:section:deselect', scheduleScrollState);
document.addEventListener('shopify:block:select', e => { selectBlock(e); e.target?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }); });
document.addEventListener('shopify:block:deselect', deselectBlock);
document.addEventListener('shopify:inspector:activate', () => document.documentElement.classList.add('purelane-inspect-mode'));
document.addEventListener('shopify:inspector:deactivate', () => document.documentElement.classList.remove('purelane-inspect-mode'));
