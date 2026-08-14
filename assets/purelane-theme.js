/* PURELANE MOTION ENGINE - Theme Editor safe, multi-instance, accessible */
'use strict';

const PURELANE = new WeakMap();
const HERO_STATE = new WeakMap();
const ROTATOR_STATE = new WeakMap();
let revealObserver = null;
let globalMotionReady = false;
let globalMotionFrame = 0;
let globalPointerListener = null;

const SECTION_SELECTOR = '.shopify-section,[id^="shopify-section-"]';

function getSection(el) {
  return el?.closest?.(SECTION_SELECTOR) || el?.parentElement || null;
}

function eventSection(event) {
  const target = event?.target;
  if (target?.matches?.(SECTION_SELECTOR)) return target;
  const root = target?.closest?.(SECTION_SELECTOR);
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
  HERO_STATE.delete(root);
  root.querySelectorAll('.rv').forEach(el => revealObserver?.unobserve(el));
  root.querySelectorAll('[data-purelane-rotator-ready]').forEach(el => el.removeAttribute('data-purelane-rotator-ready'));
}

function updateScrollState() {
  const viewportHeight = window.innerHeight;

  document.querySelectorAll('#hdr,[data-purelane-header]').forEach(hdr => {
    hdr.classList.toggle('up', window.scrollY > 90);
  });

  document.querySelectorAll('#scenes,[data-purelane-scenes]').forEach(scenes => {
    const sceneEls = [...scenes.querySelectorAll('.scene')];
    if (!sceneEls.length) return;
    let best = Number.parseInt(scenes.dataset.sc, 10) || 1;
    let visible = 0;
    document.querySelectorAll('[data-scene]').forEach(section => {
      const r = section.getBoundingClientRect();
      const amount = Math.max(0, Math.min(r.bottom, viewportHeight) - Math.max(r.top, 0));
      if (amount > visible) {
        visible = amount;
        best = Number.parseInt(section.dataset.scene, 10) || 1;
      }
    });
    if (Number.parseInt(scenes.dataset.sc, 10) !== best) {
      scenes.dataset.sc = String(best);
      sceneEls.forEach((scene, i) => scene.classList.toggle('on', i === best - 1));
    }
  });

  document.querySelectorAll('#rail,[data-purelane-rail]').forEach(rail => {
    rail.querySelectorAll('a').forEach(link => {
      const id = link.getAttribute('href')?.replace(/^#/, '');
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      const r = target.getBoundingClientRect();
      link.classList.toggle('on', r.top < viewportHeight * .6 && r.bottom > viewportHeight * .1);
    });
  });
}

function scheduleScrollState() {
  if (globalMotionFrame) return;
  globalMotionFrame = requestAnimationFrame(() => {
    globalMotionFrame = 0;
    updateScrollState();
  });
}

function setInspectorMode(active) {
  document.documentElement.classList.toggle('purelane-inspect-mode', Boolean(active));
}

function initGlobalMotion() {
  if (globalMotionReady) return;
  globalMotionReady = true;

  window.addEventListener('scroll', scheduleScrollState, { passive: true });
  window.addEventListener('resize', scheduleScrollState, { passive: true });
  updateScrollState();

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
    globalPointerListener = event => {
      if (window.Shopify?.inspectMode) return;
      if (globalMotionFrame) cancelAnimationFrame(globalMotionFrame);
      globalMotionFrame = requestAnimationFrame(() => {
        globalMotionFrame = 0;
        const px = ((event.clientX / window.innerWidth) - .5) * 18;
        const py = ((event.clientY / window.innerHeight) - .5) * 10;
        document.querySelectorAll('.wl').forEach((wl, i) => {
          const f = 1 + i * .35;
          wl.style.setProperty('--px', `${px * f}px`);
          wl.style.setProperty('--py', `${py * f}px`);
        });
      });
    };
    document.addEventListener('mousemove', globalPointerListener, { passive: true });
  }

  setInspectorMode(window.Shopify?.inspectMode);
}

function initReveals(scope = document) {
  const items = [...scope.querySelectorAll('.rv:not(.in)')];
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('in'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .11 });
  }
  items.forEach(item => revealObserver.observe(item));
}

function initHeroes(scope = document) {
  scope.querySelectorAll('.hstage').forEach(stage => {
    const root = getSection(stage);
    if (!root || HERO_STATE.has(root)) return;

    const slides = [...stage.querySelectorAll('.hslide')];
    const dotsWrap = stage.querySelector('#hdots,[data-hero-dots]') || root.querySelector('#hdots,[data-hero-dots]');
    if (!slides.length) return;

    const dots = dotsWrap ? [...dotsWrap.querySelectorAll('button')] : [];
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const state = { current: 0, timer: null, breath: null, paused: false, editorPaused: false };
    HERO_STATE.set(root, state);

    const syncDots = () => {
      dots.forEach((dot, i) => {
        dot.classList.toggle('on', i === state.current);
        dot.setAttribute('aria-current', i === state.current ? 'true' : 'false');
      });
    };

    const go = n => {
      const next = (n + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('on', i === next);
      });
      state.current = next;
      syncDots();
    };

    const stop = () => {
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
    };

    const start = () => {
      if (state.paused || state.editorPaused || reduced || slides.length < 2) return;
      stop();
      state.timer = setInterval(() => go(state.current + 1), 4000);
    };

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        go(i);
        start();
      });
    });

    const onEnter = () => { state.paused = true; stop(); };
    const onLeave = () => { state.paused = false; start(); };
    stage.addEventListener('pointerenter', onEnter);
    stage.addEventListener('pointerleave', onLeave);

    const product = root.querySelector('#heroProd,[data-hero-product]');
    if (product && window.Animation && !reduced) {
      try {
        state.breath = product.animate([
          { filter: 'drop-shadow(0 34px 54px rgba(2,20,19,.60))' },
          { filter: 'drop-shadow(0 42px 68px rgba(2,20,19,.72))' },
          { filter: 'drop-shadow(0 34px 54px rgba(2,20,19,.60))' }
        ], { duration: 4800, easing: 'ease-in-out', iterations: Infinity });
      } catch (_) {}
    }

    go(Math.max(0, slides.findIndex(x => x.classList.contains('on'))));
    start();

    addCleanup(root, () => {
      stop();
      state.breath?.cancel?.();
      stage.removeEventListener('pointerenter', onEnter);
      stage.removeEventListener('pointerleave', onLeave);
      HERO_STATE.delete(root);
    });
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
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
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
        if (b) b.textContent = imgs[current]?.dataset.name || '';
        if (s) s.textContent = imgs[current]?.dataset.note || '';
      }
    };
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
    const timer = reduced || imgs.length < 2 ? null : setInterval(() => show(current + 1), 2800);
    show(current);
    ROTATOR_STATE.set(rot, { timer });
    addCleanup(root, () => {
      clearInterval(timer);
      ROTATOR_STATE.delete(rot);
      delete rot.dataset.purelaneRotatorReady;
    });
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
  const button = event.target.closest?.('[name="add"],[data-atc]');
  if (!button) return;
  const form = button.closest('form');
  if (!form || button.disabled) return;
  event.preventDefault();
  const id = form.querySelector('[name="id"]')?.value;
  if (!id) return;

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
    const cartResponse = await fetch('/cart.js', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    if (!cartResponse.ok) throw new Error('cart');
    const cart = await cartResponse.json();
    document.querySelectorAll('.dot').forEach(dot => { dot.textContent = cart.item_count; });
    button.textContent = 'Added ✓';
    setTimeout(() => { button.textContent = original; button.disabled = false; }, 1600);
  } catch (_) {
    button.textContent = 'Error — retry';
    setTimeout(() => { button.textContent = original; button.disabled = false; }, 1600);
  }
}

function burgerToggle(event) {
  const burger = event.target.closest?.('.burger');
  if (!burger) return;
  const root = getSection(burger);
  const nav = root?.querySelector('.nav');
  if (!nav) return;
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

function closeMobileNav(event) {
  const link = event.target.closest?.('.nav a');
  if (!link) return;
  const root = getSection(link);
  const burger = root?.querySelector('.burger');
  const nav = root?.querySelector('.nav');
  if (!nav || !burger) return;
  nav.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Open menu');
}

function smoothAnchor(event) {
  const link = event.target.closest?.('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href')?.slice(1);
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start'
  });
}

function selectHeroBlock(event) {
  const block = event.target?.closest?.('.hslide');
  if (!block) return;
  const root = getSection(block);
  const state = HERO_STATE.get(root);
  if (!state) return;
  const slides = [...root.querySelectorAll('.hslide')];
  const index = slides.indexOf(block);
  if (index < 0) return;
  state.editorPaused = true;
  state.paused = true;
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  const dots = [...root.querySelectorAll('#hdots button,[data-hero-dots] button')];
  slides.forEach((slide, i) => slide.classList.toggle('on', i === index));
  dots.forEach((dot, i) => {
    dot.classList.toggle('on', i === index);
    dot.setAttribute('aria-current', i === index ? 'true' : 'false');
  });
  state.current = index;
}

function deselectHeroBlock(event) {
  const block = event.target?.closest?.('.hslide');
  if (!block) return;
  const root = getSection(block);
  const state = HERO_STATE.get(root);
  if (!state) return;
  state.editorPaused = false;
  state.paused = false;
  const slides = [...root.querySelectorAll('.hslide')];
  slides.forEach((slide, i) => slide.classList.toggle('on', i === state.current));
  if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && slides.length > 1) {
    state.timer = setInterval(() => {
      const next = (state.current + 1) % slides.length;
      state.current = next;
      slides.forEach((slide, i) => slide.classList.toggle('on', i === next));
    }, 4000);
  }
}

function initialise(scope = document) {
  initGlobalMotion();
  initReveals(scope);
  initHeroes(scope);
  initRotators(scope);
  initScrollHints(scope);
  scheduleScrollState();
}

initialise();
document.addEventListener('click', addToCart);
document.addEventListener('click', burgerToggle);
document.addEventListener('click', closeMobileNav);
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
  scheduleScrollState();
});

document.addEventListener('shopify:section:reorder', () => {
  initialise();
});

document.addEventListener('shopify:section:select', event => {
  const root = eventSection(event);
  if (root) {
    root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    initReveals(root);
  }
  scheduleScrollState();
});

document.addEventListener('shopify:section:deselect', scheduleScrollState);
document.addEventListener('shopify:block:select', event => {
  selectHeroBlock(event);
  event.target?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
});
document.addEventListener('shopify:block:deselect', deselectHeroBlock);
document.addEventListener('shopify:inspector:activate', () => setInspectorMode(true));
document.addEventListener('shopify:inspector:deactivate', () => setInspectorMode(false));
