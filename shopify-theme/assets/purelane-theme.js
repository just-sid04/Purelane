/* ==========================================================================
   PURELANE SHOPIFY THEME - FULL MOTION ENGINE (100% prototype parity)
   Source of Truth: purelane-homepage.html (JS block lines 1567-1714)
   ========================================================================== */
'use strict';

/* ─── DOM REFERENCES ─────────────────────────────────────────────── */
const hdr    = document.getElementById('hdr');
const scenes = document.getElementById('scenes');
const heroProd = document.getElementById('heroProd');
const hstage = document.getElementById('hstage');
const hdots  = document.getElementById('hdots');
const rotEl  = document.getElementById('rot');

/* ─── SCENE / BACKGROUND CROSSFADE ENGINE ───────────────────────── */
function getSecEls() { return [...document.querySelectorAll('[data-scene]')]; }
const sceneEls = [...document.querySelectorAll('#scenes .scene')];

function setScene(n) {
  if (!scenes) return;
  const current = parseInt(scenes.dataset.sc, 10) || 1;
  if (current === n) return;
  scenes.dataset.sc = n;
  sceneEls.forEach((s, i) => s.classList.toggle('on', i === n - 1));
}

/* ─── SCROLL ENGINE ─────────────────────────────────────────────── */
let lastY = 0;
function onScroll() {
  const y = window.scrollY;

  /* header docking */
  if (hdr) hdr.classList.toggle('up', y > 90);

  /* scene crossfade based on most-visible data-scene section */
  const secEls = getSecEls();
  if (secEls.length) {
    let bestScene = 1;
    let bestVis = 0;
    secEls.forEach(el => {
      const r = el.getBoundingClientRect();
      const vis = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
      if (vis > bestVis) { bestVis = vis; bestScene = parseInt(el.dataset.scene, 10) || 1; }
    });
    setScene(bestScene);
  }

  /* side rail active dot */
  const rail = document.getElementById('rail');
  if (rail) {
    const railLinks = [...rail.querySelectorAll('a')];
    railLinks.forEach(link => {
      const id = link.getAttribute('href')?.replace('#','');
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      const r = target.getBoundingClientRect();
      const active = r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.1;
      link.classList.toggle('on', active);
    });
  }

  lastY = y;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ─── MOUSE PARALLAX ON WATER LAYERS ───────────────────────────── */
const wls = document.querySelectorAll('.wl');
if (wls.length) {
  document.addEventListener('mousemove', e => {
    const px = ((e.clientX / window.innerWidth) - 0.5) * 18;
    const py = ((e.clientY / window.innerHeight) - 0.5) * 10;
    wls.forEach((wl, i) => {
      const f = 1 + i * 0.35;
      wl.style.setProperty('--px', `${px * f}px`);
      wl.style.setProperty('--py', `${py * f}px`);
    });
  }, { passive: true });
}

/* ─── SCROLL REVEAL (IntersectionObserver) ────────────────────────
   Guard: skip elements already revealed (.rv.in) so re-calls from
   shopify:section:load don't create stacked observers on resolved els.
   ─────────────────────────────────────────────────────────────── */
let _revealIO = null;

function initReveals() {
  /* Collect only elements not yet revealed */
  const rvEls = [...document.querySelectorAll('.rv:not(.in)')];
  if (!rvEls.length) return;

  /* Reuse a single shared observer if possible */
  if (!_revealIO) {
    _revealIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          _revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.11 });
  }

  rvEls.forEach(el => _revealIO.observe(el));
}
initReveals();

/* ─── HERO CAROUSEL ─────────────────────────────────────────────── */
/* Guard: only ever run once. shopify:section:load re-call is safe   */
let _heroInitialized = false;
(function heroCarousel() {
  if (_heroInitialized) return;
  if (!hstage || !hdots) return;
  _heroInitialized = true;

  const slides = [...hstage.querySelectorAll('.hslide')];
  const dots   = [...hdots.querySelectorAll('button')];
  if (!slides.length) return;
  let cur = 0;
  let breathAnim = null;

  /* Breathing ambient shadow on the product container */
  function startBreathing() {
    if (breathAnim) breathAnim.cancel();
    if (!heroProd || !window.Animation) return;
    try {
      breathAnim = heroProd.animate([
        { filter: 'drop-shadow(0 34px 54px rgba(2,20,19,.60))' },
        { filter: 'drop-shadow(0 42px 68px rgba(2,20,19,.72))' },
        { filter: 'drop-shadow(0 34px 54px rgba(2,20,19,.60))' }
      ], { duration: 4800, easing: 'ease-in-out', iterations: Infinity });
    } catch(e) {
      /* Fallback: CSS animation handles this */
    }
  }

  function goTo(n) {
    slides[cur].classList.remove('on');
    dots[cur]?.classList.remove('on');
    cur = (n + slides.length) % slides.length;
    slides[cur].classList.add('on');
    dots[cur]?.classList.add('on');
  }

  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  /* Auto-advance every 4 s */
  let timer = setInterval(() => goTo(cur + 1), 4000);
  hstage.addEventListener('pointerenter', () => clearInterval(timer));
  hstage.addEventListener('pointerleave', () => { timer = setInterval(() => goTo(cur + 1), 4000); });

  startBreathing();
})();

/* ─── PRODUCT ROTATOR ────────────────────────────────────────────── */
/* Guard: only ever run once.                                         */
let _rotatorInitialized = false;
(function productRotator() {
  if (_rotatorInitialized) return;
  if (!rotEl) return;
  _rotatorInitialized = true;

  const imgs   = [...rotEl.querySelectorAll('.pimg')];
  const capEl  = rotEl.querySelector('.cap');
  const dotsEl = rotEl.querySelectorAll('.dots i');
  if (!imgs.length) return;

  let cur = 0;
  function showProduct(n) {
    imgs[cur].classList.remove('on');
    dotsEl[cur]?.classList.remove('on');
    cur = (n + imgs.length) % imgs.length;
    imgs[cur].classList.add('on');
    dotsEl[cur]?.classList.add('on');
    if (capEl) {
      const name = imgs[cur].dataset.name || '';
      const note = imgs[cur].dataset.note || '';
      capEl.querySelector('b').textContent = name;
      capEl.querySelector('span').textContent = note;
    }
  }

  setInterval(() => showProduct(cur + 1), 2800);
  dotsEl.forEach((d, i) => d.addEventListener('click', () => showProduct(i)));
  showProduct(0);
})();

/* ─── AJAX ADD-TO-CART ─────────────────────────────────────────── */
/* Using event delegation (single listener on document) — duplicate-safe */
document.addEventListener('click', async e => {
  const btn = e.target.closest('[name="add"],[data-atc]');
  if (!btn) return;
  const form = btn.closest('form');
  if (!form) return;
  e.preventDefault();

  const id = form.querySelector('[name="id"]')?.value;
  if (!id) return;

  btn.disabled = true;
  const origText = btn.textContent;
  btn.textContent = 'Adding…';

  try {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ id, quantity: 1 })
    });
    if (!res.ok) throw new Error('Cart error');
    await res.json();

    /* Update cart count dot */
    const cartCount = await fetch('/cart.js').then(r => r.json()).then(c => c.item_count);
    document.querySelectorAll('.dot').forEach(d => { d.textContent = cartCount; });

    btn.textContent = 'Added ✓';
    setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 1600);
  } catch {
    btn.textContent = 'Error — retry';
    setTimeout(() => { btn.textContent = origText; btn.disabled = false; }, 1600);
  }
});

/* ─── COMBO SWIPE CUE FADE ─────────────────────────────────────── */
(function swipeCue() {
  const rail = document.querySelector('.comborail');
  const cue  = document.querySelector('.swipecue');
  if (!rail || !cue) return;
  rail.addEventListener('scroll', () => { cue.style.opacity = rail.scrollLeft > 20 ? '0' : '1'; }, { passive: true });
})();

/* ─── RANGE SHELF SCROLL HINT ───────────────────────────────────── */
(function rangeHint() {
  const hint = document.querySelector('.striphint');
  const stripwrap = document.querySelector('.stripwrap');
  if (!hint || !stripwrap) return;
  stripwrap.addEventListener('scroll', () => { hint.style.opacity = stripwrap.scrollLeft > 10 ? '0' : '1'; }, { passive: true });
})();

/* ─── MOBILE BURGER TOGGLE ──────────────────────────────────────── */
/* Using event delegation to stay duplicate-safe */
document.addEventListener('click', e => {
  const burger = e.target.closest('.burger');
  if (!burger) return;
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});

/* ─── DEEP-LINK SMOOTH SCROLL (event delegation — duplicate-safe) ── */
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href').slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ─── SHOPIFY THEME EDITOR LIFECYCLE HOOKS ─────────────────────── */
/* section:load fires after a section is added or reloaded in the   */
/* Theme Editor. Re-run reveals for new .rv elements. Scene + scroll */
/* state is recalculated. Hero & rotator guards prevent re-init.     */
document.addEventListener('shopify:section:load', () => {
  initReveals();
  onScroll();
});

/* section:unload fires before a section is removed */
document.addEventListener('shopify:section:unload', () => {
  onScroll();
});

/* section:reorder fires after drag-drop reorder */
document.addEventListener('shopify:section:reorder', () => {
  onScroll();
});

/* section:select fires when merchant clicks on a section in sidebar */
document.addEventListener('shopify:section:select', () => {
  onScroll();
});

/* section:deselect fires when merchant deselects a section */
document.addEventListener('shopify:section:deselect', () => {
  onScroll();
});

/* block:select fires when merchant selects a block within a section */
document.addEventListener('shopify:block:select', e => {
  /* Scroll into view for better editing UX */
  const sectionEl = e.target;
  if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
