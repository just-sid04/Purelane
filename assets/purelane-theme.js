/* PURELANE MOTION ENGINE - section-safe Theme Editor version */
'use strict';

const PURELANE = new WeakMap();
let revealObserver = null;
let globalMotionReady = false;

function getSection(el) {
  return el?.closest('.shopify-section,[id^="shopify-section-"]') || el?.parentElement || null;
}
function eventSection(event) {
  const target = event?.target;
  if (target?.matches?.('.shopify-section,[id^="shopify-section-"]')) return target;
  const root = target?.closest?.('.shopify-section,[id^="shopify-section-"]');
  if (root) return root;
  const id = event?.detail?.sectionId;
  return id ? document.getElementById(`shopify-section-${id}`) : null;
}
function addCleanup(root, fn) {
  if (!root) return;
  const list = PURELANE.get(root) || [];
  list.push(fn);
  PURELANE.set(root, list);
}
function cleanup(root) {
  if (!root) return;
  (PURELANE.get(root) || []).forEach(fn => { try { fn(); } catch (_) {} });
  PURELANE.delete(root);
  root.querySelectorAll('.rv').forEach(el => revealObserver?.unobserve(el));
}

function updateScrollState() {
  const hdr = document.querySelector('#hdr,[data-purelane-header]');
  if (hdr) hdr.classList.toggle('up', window.scrollY > 90);

  document.querySelectorAll('#scenes,[data-purelane-scenes]').forEach(scenes => {
    const sceneEls = [...scenes.querySelectorAll('.scene')];
    if (!sceneEls.length) return;
    let best = parseInt(scenes.dataset.sc, 10) || 1;
    let visible = 0;
    document.querySelectorAll('[data-scene]').forEach(section => {
      const r = section.getBoundingClientRect();
      const amount = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      if (amount > visible) {
        visible = amount;
        best = parseInt(section.dataset.scene, 10) || 1;
      }
    });
    if (parseInt(scenes.dataset.sc, 10) !== best) {
      scenes.dataset.sc = best;
      sceneEls.forEach((scene, i) => scene.classList.toggle('on', i === best - 1));
    }
  });

  const rail = document.querySelector('#rail,[data-purelane-rail]');
  if (rail) rail.querySelectorAll('a').forEach(link => {
    const id = link.getAttribute('href')?.replace(/^#/, '');
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    const r = target.getBoundingClientRect();
    link.classList.toggle('on', r.top < innerHeight * .6 && r.bottom > innerHeight * .1);
  });
}

function initGlobalMotion() {
  if (globalMotionReady) return;
  globalMotionReady = true;
  window.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();
  if (!matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    document.addEventListener('mousemove', event => {
      const px = ((event.clientX / innerWidth) - .5) * 18;
      const py = ((event.clientY / innerHeight) - .5) * 10;
      document.querySelectorAll('.wl').forEach((wl, i) => {
        const f = 1 + i * .35;
        wl.style.setProperty('--px', `${px * f}px`);
        wl.style.setProperty('--py', `${py * f}px`);
      });
    }, { passive: true });
  }
}

function initReveals(scope = document) {
  const items = [...scope.querySelectorAll('.rv:not(.in)')];
  if (!items.length) return;
  if (!revealObserver) revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .11 });
  items.forEach(item => revealObserver.observe(item));
}

function initHeroes(scope = document) {
  scope.querySelectorAll('.hstage').forEach(stage => {
    const root = getSection(stage);
    if (!root || root.dataset.purelaneHeroReady === '1') return;
    const slides = [...stage.querySelectorAll('.hslide')];
    const dotsWrap = stage.querySelector('#hdots,[data-hero-dots]') || root.querySelector('#hdots,[data-hero-dots]');
    const dots = dotsWrap ? [...dotsWrap.querySelectorAll('button')] : [];
    if (!slides.length) return;
    root.dataset.purelaneHeroReady = '1';

    let current = Math.max(0, slides.findIndex(x => x.classList.contains('on')));
    let timer = null;
    let breath = null;
    let paused = false;
    const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const go = n => {
      const old = current;
      current = (n + slides.length) % slides.length;
      slides[old]?.classList.remove('on');
      dots[old]?.classList.remove('on');
      slides[current]?.classList.add('on');
      dots[current]?.classList.add('on');
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => {
      if (paused || reduced || slides.length < 2) return;
      stop();
      timer = setInterval(() => go(current + 1), 4000);
    };

    dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
    stage.addEventListener('pointerenter', () => { paused = true; stop(); });
    stage.addEventListener('pointerleave', () => { paused = false; start(); });

    const product = root.querySelector('#heroProd,[data-hero-product]');
    if (product && window.Animation && !reduced) {
      try {
        breath = product.animate([
          { filter: 'drop-shadow(0 34px 54px rgba(2,20,19,.60))' },
          { filter: 'drop-shadow(0 42px 68px rgba(2,20,19,.72))' },
          { filter: 'drop-shadow(0 34px 54px rgba(2,20,19,.60))' }
        ], { duration: 4800, easing: 'ease-in-out', iterations: Infinity });
      } catch (_) {}
    }
    go(current);
    start();
    addCleanup(root, () => { stop(); breath?.cancel?.(); delete root.dataset.purelaneHeroReady; });
  });
}

function initRotators(scope = document) {
  scope.querySelectorAll('#rot,.rot,[data-purelane-rotator]').forEach(rot => {
    if (rot.dataset.purelaneRotatorReady === '1') return;
    const root = getSection(rot);
    const imgs = [...rot.querySelectorAll('.pimg')];
    const dots = [...rot.querySelectorAll('.dots i')];
    const cap = rot.querySelector('.cap');
    if (!root || !imgs.length) return;
    rot.dataset.purelaneRotatorReady = '1';
    let current = Math.max(0, imgs.findIndex(x => x.classList.contains('on')));
    const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const show = n => {
      const old = current;
      current = (n + imgs.length) % imgs.length;
      imgs[old]?.classList.remove('on');
      dots[old]?.classList.remove('on');
      imgs[current]?.classList.add('on');
      dots[current]?.classList.add('on');
      if (cap) {
        const b = cap.querySelector('b');
        const s = cap.querySelector('span');
        if (b) b.textContent = imgs[current].dataset.name || '';
        if (s) s.textContent = imgs[current].dataset.note || '';
      }
    };
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
    const timer = reduced || imgs.length < 2 ? null : setInterval(() => show(current + 1), 2800);
    show(current);
    addCleanup(root, () => { clearInterval(timer); delete rot.dataset.purelaneRotatorReady; });
  });
}

function initScrollHints(scope = document) {
  scope.querySelectorAll('.comborail').forEach(rail => {
    const root = getSection(rail), cue = root?.querySelector('.swipecue');
    if (!root || !cue || rail.dataset.purelaneHintReady === '1') return;
    rail.dataset.purelaneHintReady = '1';
    const fn = () => { cue.style.opacity = rail.scrollLeft > 20 ? '0' : '1'; };
    rail.addEventListener('scroll', fn, { passive: true });
    addCleanup(root, () => { rail.removeEventListener('scroll', fn); delete rail.dataset.purelaneHintReady; });
  });
  scope.querySelectorAll('.stripwrap').forEach(strip => {
    const root = getSection(strip), hint = root?.querySelector('.striphint');
    if (!root || !hint || strip.dataset.purelaneHintReady === '1') return;
    strip.dataset.purelaneHintReady = '1';
    const fn = () => { hint.style.opacity = strip.scrollLeft > 10 ? '0' : '1'; };
    strip.addEventListener('scroll', fn, { passive: true });
    addCleanup(root, () => { strip.removeEventListener('scroll', fn); delete strip.dataset.purelaneHintReady; });
  });
}

async function addToCart(event) {
  const button = event.target.closest('[name="add"],[data-atc]');
  if (!button) return;
  const form = button.closest('form');
  if (!form) return;
  event.preventDefault();
  const id = form.querySelector('[name="id"]')?.value;
  if (!id || button.disabled) return;
  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'Adding…';
  try {
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ id, quantity: 1 })
    });
    if (!response.ok) throw new Error('cart');
    await response.json();
    const cart = await fetch('/cart.js').then(r => r.json());
    document.querySelectorAll('.dot').forEach(dot => { dot.textContent = cart.item_count; });
    button.textContent = 'Added ✓';
    setTimeout(() => { button.textContent = original; button.disabled = false; }, 1600);
  } catch (_) {
    button.textContent = 'Error — retry';
    setTimeout(() => { button.textContent = original; button.disabled = false; }, 1600);
  }
}

function burgerToggle(event) {
  const burger = event.target.closest('.burger');
  if (!burger) return;
  const root = getSection(burger);
  const nav = root?.querySelector('.nav') || document.querySelector('.nav');
  if (!nav) return;
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
}

function smoothAnchor(event) {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href')?.slice(1);
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function initialise(scope = document) {
  initGlobalMotion();
  initReveals(scope);
  initHeroes(scope);
  initRotators(scope);
  initScrollHints(scope);
  updateScrollState();
}

initialise();
document.addEventListener('click', addToCart);
document.addEventListener('click', burgerToggle);
document.addEventListener('click', smoothAnchor);

document.addEventListener('shopify:section:load', event => {
  const root = eventSection(event);
  if (!root) return;
  cleanup(root);
  initialise(root);
});
document.addEventListener('shopify:section:unload', event => {
  const root = eventSection(event);
  if (root) cleanup(root);
  updateScrollState();
});
document.addEventListener('shopify:section:reorder', () => { initReveals(); updateScrollState(); });
document.addEventListener('shopify:section:select', event => { const root = eventSection(event); if (root) initReveals(root); updateScrollState(); });
document.addEventListener('shopify:section:deselect', updateScrollState);
document.addEventListener('shopify:block:select', event => { event.target?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }); });
