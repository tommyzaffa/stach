/* ============== STACH — main.js ============== */

// always start at the top on load/refresh — disable browser scroll restoration
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.addEventListener('beforeunload', () => window.scrollTo(0, 0));

(() => {
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // strip any hash present at load so we don't auto-jump to a section
  if (location.hash){
    history.replaceState(null, '', location.pathname + location.search);
  }
  // ensure top after load (covers async layout shifts)
  window.addEventListener('load', () => window.scrollTo(0, 0));

  /* ---------- YEAR ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- I18N ---------- */
  const I18N = window.STACH_I18N || {};
  const SUPPORTED = ['it', 'en', 'de', 'fr'];

  function detectLang(){
    const saved = localStorage.getItem('stach.lang');
    if (saved && SUPPORTED.includes(saved)) return saved;
    const nav = (navigator.language || 'it').slice(0,2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : 'it';
  }

  function applyLang(lang){
    if (!I18N[lang]) lang = 'it';
    document.documentElement.lang = lang;
    const dict = I18N[lang];
    $$('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (dict[k] != null) el.innerHTML = dict[k];
    });
    localStorage.setItem('stach.lang', lang);
    // visible label
    const cur = $('#langCurrent');
    if (cur) cur.textContent = lang.toUpperCase();
    // active state
    $$('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  }

  /* lang dropdown */
  const langWrap = $('#lang');
  const langTrig = langWrap?.querySelector('.lang__current');
  langTrig?.addEventListener('click', e => {
    e.stopPropagation();
    langWrap.classList.toggle('is-open');
    langTrig.setAttribute('aria-expanded', langWrap.classList.contains('is-open'));
  });
  document.addEventListener('click', () => langWrap?.classList.remove('is-open'));

  $$('[data-lang]').forEach(b => {
    b.addEventListener('click', () => {
      applyLang(b.dataset.lang);
      langWrap?.classList.remove('is-open');
    });
  });

  applyLang(detectLang());

  /* ---------- PRELOADER ---------- */
  const preloader = $('#preloader');
  const counterEl = $('#preloaderCount');
  const barEl     = $('#preloaderBar');

  function runPreloader(){
    if (reduceMotion){
      document.body.classList.add('is-ready');
      preloader?.classList.add('is-done');
      onReady();
      return;
    }
    let p = 0;
    const tick = () => {
      const inc = Math.max(1, Math.round((100 - p) * 0.10));
      p = Math.min(100, p + inc);
      if (counterEl) counterEl.textContent = p;
      if (barEl) barEl.style.width = p + '%';
      if (p < 100){
        setTimeout(tick, 35 + Math.random()*30);
      } else {
        setTimeout(() => {
          preloader?.classList.add('is-done');
          document.body.classList.add('is-ready');
          onReady();
        }, 240);
      }
    };
    tick();
  }

  /* ---------- LENIS smooth scroll ---------- */
  let lenis;
  function initLenis(){
    if (!window.Lenis || reduceMotion) return;
    lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    function raf(t){ lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    if (window.gsap && window.ScrollTrigger){
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    // ensure we're at the top after lenis init
    lenis.scrollTo(0, { immediate: true, force: true });
  }

  /* ---------- ANCHOR LINKS ---------- */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const fromOverlay = !!a.closest('.overlay');
      closeMenu();
      if (fromOverlay){
        // instant teleport — no smooth scroll
        const y = target.getBoundingClientRect().top + window.scrollY - 10;
        if (lenis){
          lenis.scrollTo(y, { immediate: true });
        } else {
          window.scrollTo({ top: y, behavior: 'auto' });
        }
      } else {
        if (lenis){
          lenis.scrollTo(target, { offset: -10, duration: 1.4 });
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* ---------- HEADER scroll state ---------- */
  const nav = $('#nav');
  const onScrollHeader = () => {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 30);
  };
  window.addEventListener('scroll', onScrollHeader, { passive:true });
  onScrollHeader();

  /* ---------- MENU ---------- */
  const menuBtn = $('#menuBtn');
  const overlay = $('#overlay');
  function openMenu(){
    document.body.classList.add('menu-open');
    menuBtn?.setAttribute('aria-expanded', 'true');
    overlay?.setAttribute('aria-hidden', 'false');
    lenis?.stop();
  }
  function closeMenu(){
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open');
    menuBtn?.setAttribute('aria-expanded', 'false');
    overlay?.setAttribute('aria-hidden', 'true');
    lenis?.start();
  }
  menuBtn?.addEventListener('click', () => {
    document.body.classList.contains('menu-open') ? closeMenu() : openMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- CUSTOM CURSOR ---------- */
  const cursor = $('#cursor');
  const cursorLabel = cursor?.querySelector('.cursor__label');
  let cx = window.innerWidth/2, cy = window.innerHeight/2;
  let tx = cx, ty = cy;

  function moveCursor(){
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    if (cursor) cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(moveCursor);
  }
  if (cursor && !('ontouchstart' in window)){
    moveCursor();
    document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hide'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hide'));

    // hover states
    const linkSel = 'a, button, [data-cursor]';
    document.addEventListener('mouseover', e => {
      const t = e.target.closest(linkSel);
      if (!t) return;
      cursor.classList.add('is-link');
      const lab = t.dataset.cursor;
      if (lab){
        cursor.classList.add('is-zoom');
        cursor.classList.remove('is-link');
        if (cursorLabel){
          const labels = { visita:'visita', map:'mappa', img:'guarda' };
          cursorLabel.textContent = labels[lab] || lab;
        }
      }
    });
    document.addEventListener('mouseout', e => {
      const t = e.target.closest(linkSel);
      if (!t) return;
      cursor.classList.remove('is-link', 'is-zoom');
      if (cursorLabel) cursorLabel.textContent = '';
    });
  }

  /* ---------- HERO clock ---------- */
  const clockEl = $('#heroClock');
  if (clockEl){
    const fmt = () => {
      const d = new Date();
      const t = d.toLocaleTimeString('it-CH', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Zurich' });
      clockEl.textContent = `Lugano — ${t}`;
    };
    fmt(); setInterval(fmt, 30_000);
  }

  /* ---------- onReady (after preloader) ---------- */
  function onReady(){
    initLenis();
    initAnimations();
  }

  /* ---------- ANIMATIONS ---------- */
  function initAnimations(){
    // reveal text/blocks
    if (window.gsap && window.ScrollTrigger){
      gsap.registerPlugin(ScrollTrigger);

      // hero entrance
      gsap.set('.hero__title .line > span', { yPercent: 110 });
      gsap.set('.hero__eyebrow', { y: 20, opacity: 0 });
      gsap.set('.hero__lead', { y: 18, opacity: 0 });
      gsap.set('.hero__bottom > *', { y: 12, opacity: 0 });

      const tl = gsap.timeline({ defaults:{ ease:'power3.out' } });
      tl.to('.hero__eyebrow', { y:0, opacity:1, duration:.7 }, .1)
        .to('.hero__title .line > span', { yPercent:0, duration:1.1, stagger:.08 }, .15)
        .to('.hero__lead', { y:0, opacity:1, duration:.7 }, .9)
        .to('.hero__bottom > *', { y:0, opacity:1, duration:.6, stagger:.08 }, 1.0);

      // reveals
      $$('[data-reveal]').forEach(el => {
        gsap.fromTo(el,
          { y: 36, opacity: 0 },
          {
            y: 0, opacity: 1, duration: .9, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          }
        );
      });

      // hero parallax (desktop only — on mobile scrub causes jerky updates)
      const isFinePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
      if (isFinePointer){
        gsap.to('.hero__img', {
          yPercent: 18,
          ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
        });
      }

      // section title lines split
      $$('.bottega__title span, .selezione__title span, .persone__title span, .gift__title span, .visita__title span, .manifesto__quote span').forEach(span => {
        gsap.fromTo(span,
          { y: 60, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 1, ease:'power3.out',
            scrollTrigger:{ trigger: span, start:'top 90%', once: true }
          }
        );
      });

      // parallax images
      $$('[data-parallax-img]').forEach((wrap, i) => {
        const img = wrap.querySelector('img');
        if (!img) return;
        gsap.fromTo(img,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
          }
        );
      });

      // hero parallax — mouse on desktop, gyroscope on mobile
      const heroImgWrap = $('.hero__img-wrap');
      if (heroImgWrap){
        let tx = 0, ty = 0;
        const apply = () => {
          heroImgWrap.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        };
        const isFinePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
        if (isFinePointer){
          document.addEventListener('mousemove', e => {
            tx = -((e.clientX / window.innerWidth) - .5) * 24;
            ty = -((e.clientY / window.innerHeight) - .5) * 18;
            apply();
          });
        } else {
          // gyroscope on Android (no permission needed). iOS 13+ requires an explicit
          // user permission popup which is mandated by Apple — we skip it entirely
          // so no popup is shown; the effect simply won't run on iOS.
          const needsPermission = typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function';
          if (!needsPermission){
            const onOrient = e => {
              const gamma = Math.max(-25, Math.min(25, e.gamma || 0));
              const beta  = Math.max(-25, Math.min(25, (e.beta || 0) - 30));
              tx = -(gamma / 25) * 28;
              ty = -(beta  / 25) * 20;
              apply();
            };
            window.addEventListener('deviceorientation', onOrient, true);
          }
        }
      }

      // big footer reveal
      gsap.fromTo('.footer__big',
        { letterSpacing: '0.1em', opacity: 0 },
        { letterSpacing: '-0.01em', opacity: .06, duration: 1.6, ease:'power3.out',
          scrollTrigger:{ trigger:'.footer', start:'top 80%', once:true } });

      // gallery items reveal (clip)
      $$('.gallery__item').forEach((it, i) => {
        gsap.fromTo(it,
          { y: 60, opacity: 0, clipPath:'inset(20% 10% 20% 10%)' },
          {
            y: 0, opacity: 1, clipPath:'inset(0% 0% 0% 0%)',
            duration: 1, ease:'power3.out', delay: (i % 3) * .05,
            scrollTrigger:{ trigger: it, start:'top 90%', once:true }
          }
        );
      });
    } else {
      // fallback: IntersectionObserver
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-in'); });
      }, { threshold: .15 });
      $$('[data-reveal]').forEach(el => io.observe(el));
    }

    initGiftTilt();
  }

  /* ---------- GIFT CARD TILT ---------- */
  function initGiftTilt(){
    const card = document.querySelector('[data-tilt]');
    if (!card || ('ontouchstart' in window)) return;
    const wrap = card.parentElement;
    let raf;
    wrap.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (y - .5) * -10;
      const ry = (x - .5) * 14;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
        card.style.setProperty('--mx', (x*100)+'%');
        card.style.setProperty('--my', (y*100)+'%');
      });
    });
    wrap.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0) rotateY(0)';
    });
  }

  /* ---------- BOOT ---------- */
  // start preloader as soon as DOM is ready (don't wait for all images)
  if (document.readyState !== 'loading') runPreloader();
  else document.addEventListener('DOMContentLoaded', runPreloader, { once:true });
})();
