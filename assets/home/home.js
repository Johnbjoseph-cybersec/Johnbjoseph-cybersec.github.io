/* Home page: hydrate from data/site.json (kept current by Dude), then motion.
   Every init is isolated; with JS off or failing, the server-rendered content stays readable. */
(function () {
  'use strict';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var DATA = null;
  function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn('[home] ' + name + ' skipped:', e); } }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function icon(id, size, cls) {
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg'), u = document.createElementNS(ns, 'use');
    s.setAttribute('width', size); s.setAttribute('height', size); if (cls) s.setAttribute('class', cls);
    u.setAttribute('href', '#' + id); s.appendChild(u); return s;
  }
  function monthYear(iso) {
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], p = String(iso || '').split('-');
    return p.length > 1 ? m[+p[1] - 1] + ' ' + p[0] : '';
  }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

  /* ---------------- data ---------------- */
  function hydrate(d) {
    var s = d.stats || {};
    safe('stats', function () {
      document.querySelectorAll('[data-count]').forEach(function (n) {
        var st = s[n.getAttribute('data-count')]; if (!st || typeof st.value !== 'number') return;
        n.setAttribute('data-value', st.value);
        if (n.firstChild && n.firstChild.nodeType === 3) n.firstChild.nodeValue = fmt(st.value);
      });
      document.querySelectorAll('[data-src]').forEach(function (n) {
        var st = s[n.getAttribute('data-src')]; if (st) n.textContent = st.source.replace(/, reported by John$/, '') + ' · ' + monthYear(st.as_of);
      });
    });
    safe('ledger', function () {
      var list = (d.contributions || []).slice(); if (!list.length) return;
      var box = document.getElementById('ledger');
      function isWon(c) { return /merged|accepted/.test((c.status || '').toLowerCase()); }
      list.sort(function (a, b) { return (isWon(b) - isWon(a)) || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0); });
      var won = list.filter(isWon), open = list.filter(function (c) { return !isWon(c); });
      var projects = {}; list.forEach(function (c) { projects[c.project] = 1; });
      var LIMIT = 5, view = won.length ? 'won' : 'all', expanded = false;
      var sets = { won: won, open: open, all: list };
      var bar = el('div', 'ledger__bar');
      var sum = el('p', 'ledger__sum');
      [[list.length, 'contributions'], [won.length, 'merged or accepted'], [Object.keys(projects).length, 'projects']].forEach(function (x, i) {
        if (i) sum.appendChild(el('span', 'ledger__dot', '\u00b7'));
        var b = el('b', null, String(x[0])); sum.appendChild(b); sum.appendChild(document.createTextNode(' ' + x[1]));
      });
      var tabs = el('div', 'ledger__tabs'); tabs.setAttribute('role', 'tablist');
      [['won', 'Merged & accepted'], ['open', 'In review'], ['all', 'All']].forEach(function (t) {
        var b = el('button', 'ledger__tab', t[1] + ' (' + sets[t[0]].length + ')'); b.type = 'button';
        b.setAttribute('role', 'tab'); b.setAttribute('data-view', t[0]);
        b.addEventListener('click', function () { view = t[0]; expanded = false; draw(); });
        tabs.appendChild(b);
      });
      bar.appendChild(sum); bar.appendChild(tabs);
      box.parentNode.insertBefore(bar, box);
      var more = el('button', 'ledger__more'); more.type = 'button';
      more.addEventListener('click', function () { expanded = !expanded; draw(); });
      box.parentNode.insertBefore(more, box.nextSibling);
      function row(c) {
        var a = el('a', 'ledger__row'); a.href = c.url; a.target = '_blank'; a.rel = 'noopener';
        a.appendChild(el('span', 'ledger__date', c.date));
        var p = el('span', 'ledger__proj', c.project); p.appendChild(el('small', null, c.org)); a.appendChild(p);
        a.appendChild(el('span', 'ledger__what', c.title));
        var st = (c.status || 'proposed').toLowerCase();
        a.appendChild(el('span', 'chip chip--' + st, st.charAt(0).toUpperCase() + st.slice(1)));
        a.appendChild(icon('out', 18, 'ledger__go'));
        return a;
      }
      function groupStatus(items) {
        var s = items.map(function (c) { return (c.status || 'proposed').toLowerCase(); });
        if (s.some(function (x) { return /merged/.test(x); })) return 'merged';
        if (s.some(function (x) { return /accepted/.test(x); })) return 'accepted';
        return 'proposed';
      }
      function groupRow(items) {
        var det = el('details', 'ledger__group');
        var sum = document.createElement('summary'); sum.className = 'ledger__row ledger__summary';
        sum.appendChild(el('span', 'ledger__date', items[0].date));
        var p = el('span', 'ledger__proj', items[0].project); p.appendChild(el('small', null, items[0].org)); sum.appendChild(p);
        var won = items.filter(isWon).length;
        var sameArea = items.every(function (c) { return c.area === items[0].area; });
        var what = items.length + ' contributions' + (sameArea && items[0].area ? ' in ' + items[0].area : '') + (won ? ' · ' + won + ' merged or accepted' : '');
        sum.appendChild(el('span', 'ledger__what', what));
        var st = groupStatus(items), label = st === 'merged' ? 'Merged' : st === 'accepted' ? 'Accepted' : 'Open';
        sum.appendChild(el('span', 'chip chip--' + st, label));
        sum.appendChild(icon('arrow', 18, 'ledger__go ledger__chev'));
        det.appendChild(sum);
        var sub = el('div', 'ledger__sub');
        items.forEach(function (c) { sub.appendChild(row(c)); });
        det.appendChild(sub);
        return det;
      }
      function draw() {
        var items = sets[view]; box.textContent = '';
        tabs.querySelectorAll('.ledger__tab').forEach(function (b) {
          var on = b.getAttribute('data-view') === view; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        // Group by project so one repo (e.g. Nick's grokbot-clone) is a single expandable row, not a long list.
        var order = [], groups = {};
        items.forEach(function (c) { var k = c.org + '/' + c.project; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(c); });
        var units = order.map(function (k) { return groups[k]; });
        (expanded ? units : units.slice(0, LIMIT)).forEach(function (g) { box.appendChild(g.length === 1 ? row(g[0]) : groupRow(g)); });
        more.hidden = units.length <= LIMIT;
        more.textContent = expanded ? 'Show fewer' : 'Show all ' + units.length + ' projects';
      }
      draw();
      document.getElementById('ledgerFoot').textContent = 'Status is taken from each public thread, and every row links to it.';
    });
    safe('newsletter', function () {
      var nl = d.newsletter; if (!nl || !nl.latest || !nl.latest.length) return;
      document.querySelectorAll('[data-newsletter-link]').forEach(function (a) { a.href = nl.url; });
      var box = document.getElementById('newsList'); box.textContent = '';
      nl.latest.slice(0, 5).forEach(function (e) {
        var a = el('a', 'news__item'); a.href = e.url;
        a.appendChild(el('span', 'news__date', e.date));
        var t = el('span'); t.appendChild(el('span', 'news__t', e.title)); if (e.subtitle) t.appendChild(el('span', 'news__s', e.subtitle));
        a.appendChild(t); a.appendChild(icon('out', 16)); box.appendChild(a);
      });
      document.getElementById('newsCount').textContent = nl.published + ' editions published · new every day';
    });
    safe('videos', function () {
      var yt = d.youtube; if (!yt || !yt.latest || !yt.latest.length) return;
      var box = document.getElementById('vids'); box.textContent = '';
      yt.latest.slice(0, 3).forEach(function (v) {
        var a = el('a', 'vid'); a.href = 'https:\/\/www.youtube.com/watch?v=' + encodeURIComponent(v.id); a.setAttribute('data-reveal', '');
        var img = el('div', 'vid__img'); img.style.backgroundImage = 'url(https:\/\/i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/hqdefault.jpg)';
        var b = el('div', 'vid__b'); b.appendChild(el('div', 'vid__d', v.date)); b.appendChild(el('div', 'vid__t', v.title));
        a.appendChild(img); a.appendChild(b); box.appendChild(a);
      });
    });
    safe('updated', function () { if (d.updated) document.getElementById('updated').textContent = 'Page data updated ' + d.updated; });
  }

  /* ---------------- motion ---------------- */
  var lenis = null;
  function initScroll() {
    gsap.registerPlugin(ScrollTrigger);
    if (!REDUCED && typeof window.Lenis !== 'undefined') {
      lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      window.__lenis = lenis;
      document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (ev) {
          var id = a.getAttribute('href'); if (id.length < 2) return; var t = document.querySelector(id); if (!t) return;
          ev.preventDefault(); lenis.scrollTo(t, { offset: -70, duration: 1.2 });
        });
      });
    }
  }
  function initNav() {
    var nav = document.getElementById('nav'), bar = document.getElementById('progress'), last = 0;
    function onScroll() {
      var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
      nav.classList.toggle('is-solid', y > 24);
      nav.classList.toggle('is-hidden', y > last && y > 400);
      last = y; bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
  function initHero() {
    var h1 = document.querySelector('[data-split]');
    if (typeof window.SplitText !== 'undefined') {
      gsap.registerPlugin(SplitText);
      var split = SplitText.create(h1, { type: 'lines,words', mask: 'lines' });
      gsap.from(split.lines, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: INTRO + 0.15 });
    }
    gsap.from('.hero__lede, .hero__cta, .hero__meta', { y: 18, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: INTRO + 0.45, clearProps: 'all' });
    gsap.from('.stage__halo', { scale: 0.5, autoAlpha: 0, duration: 1.6, ease: 'expo.out', delay: INTRO + 0.05, clearProps: 'all' });
    gsap.from('.stage__me', { y: 30, autoAlpha: 0, duration: 1.4, ease: 'expo.out', delay: INTRO + 0.15, clearProps: 'opacity,visibility' });
  }
  function initReveals() {
    var els = gsap.utils.toArray('[data-reveal]').filter(function (n) { return !n.matches('.sec h2'); });
    gsap.set(els, { autoAlpha: 0, y: 26 });
    ScrollTrigger.batch(els, {
      start: 'top 88%', once: true,
      onEnter: function (batch) { gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.85, ease: 'expo.out', stagger: 0.07, overwrite: true, clearProps: 'transform' }); }
    });
    // failsafe: nothing may stay hidden if a trigger is never reached (short pages, anchor jumps)
    setTimeout(function () { els.forEach(function (n) { if (getComputedStyle(n).opacity < 0.5 && n.getBoundingClientRect().top < window.innerHeight) gsap.to(n, { autoAlpha: 1, y: 0, duration: 0.4 }); }); }, 2500);
  }
  function initCounts() {
    document.querySelectorAll('[data-count]').forEach(function (n) {
      function live() { return +n.getAttribute('data-value') || parseInt((n.firstChild && n.firstChild.nodeValue || '').replace(/[^0-9]/g, ''), 10); }
      if (!live() || !n.firstChild || n.firstChild.nodeType !== 3) return;
      var o = { v: 0 };
      ScrollTrigger.create({ trigger: n, start: 'top 92%', once: true, onEnter: function () {
        var target = live();
        gsap.to(o, { v: target, duration: 1.8, ease: 'expo.out',
          onUpdate: function () { var now = live(); n.firstChild.nodeValue = fmt(now !== target ? o.v * now / target : o.v); },
          onComplete: function () { n.firstChild.nodeValue = fmt(live()); } });
      } });
    });
  }
  function initLab() {
    gsap.to('.win--show', { yPercent: -4, ease: 'none', scrollTrigger: { trigger: '.labstage', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  }


  /* ---------------- lab slideshow: whole screenshots, one at a time ---------------- */
  function initLabSlides() {
    var stage = document.querySelector('.labstage'); if (!stage) return;
    var slides = [].slice.call(stage.querySelectorAll('.slide')), tabs = [].slice.call(stage.querySelectorAll('.ltab')), url = document.getElementById('labSlideUrl');
    if (slides.length < 2) return;
    var i = 0, timer = null, reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      tabs.forEach(function (t, k) { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      if (url) url.textContent = 'grclab.purplecop.io/' + (slides[i].getAttribute('data-path') || '');
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() { stop(); if (!reduce) timer = setInterval(function () { go(i + 1); }, 4500); }
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); start(); }); });
    stage.addEventListener('mouseenter', stop); stage.addEventListener('mouseleave', start);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) start(); else stop(); }).observe(stage); else start();
  }


  /* ---------------- journey rail: arrows, drag to scroll, staggered entrance ---------------- */
  function initJourneyUi() {
    var rail = document.querySelector('.journey__rail'); if (!rail) return;
    var step = function () { return Math.max(240, rail.clientWidth * 0.8); };
    var prev = document.querySelector('.jbtn--prev'), next = document.querySelector('.journey__nav .jbtn:not(.jbtn--prev)');
    if (prev) prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { rail.scrollBy({ left: step(), behavior: 'smooth' }); });
    var down = false, startX = 0, startLeft = 0, moved = false;
    rail.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') return; down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft; rail.style.scrollBehavior = 'auto'; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - startX; if (Math.abs(dx) > 4 && !moved) { moved = true; rail.classList.add('is-dragging'); } if (moved) rail.scrollLeft = startLeft - dx; }, { passive: true });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; rail.style.scrollBehavior = ''; setTimeout(function () { rail.classList.remove('is-dragging'); }, 50); });
  }
  function initJourneyReveal() {
    var cards = gsap.utils.toArray('.jm'); if (!cards.length) return;
    gsap.from(cards, { y: 18, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.045, clearProps: 'transform',
      scrollTrigger: { trigger: '.journey', start: 'top 85%', once: true } });
  }
  /* ---------------- nav: underline follows the section on screen ---------------- */
  function initNavActive() {
    var links = [].slice.call(document.querySelectorAll('.nav__links a[href^="#"]')); if (!links.length) return;
    links.forEach(function (a) {
      var sec = document.querySelector(a.getAttribute('href')); if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%',
        onToggle: function (st) { if (st.isActive) { links.forEach(function (l) { l.classList.remove('is-active'); }); a.classList.add('is-active'); } else a.classList.remove('is-active'); } });
    });
  }


  /* ---------------- motion graphics: run only while on screen ---------------- */
  function initInView() {
    if (!('IntersectionObserver' in window)) { document.querySelectorAll('.stat, .rail__art').forEach(function (n) { n.classList.add('is-in'); }); return; }
    var once = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); once.unobserve(e.target); } }); }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.stat').forEach(function (n) { once.observe(n); });
    var toggle = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('is-in', e.isIntersecting); }); }, { rootMargin: '80px 0px' });
    document.querySelectorAll('.rail__art').forEach(function (n) { toggle.observe(n); });
  }
  /* milestone videos preview muted while on screen; sound stays one tap away on the controls */
  function initVideoPreviews() {
    var vids = [].slice.call(document.querySelectorAll('video[data-preview]')); if (!vids.length) return;
    var conn = navigator.connection || {}; if (REDUCED || conn.saveData) return;
    vids.forEach(function (v) {
      var card = v.closest('.svid'); if (card && !card.querySelector('.svid__live')) { var b = el('span', 'svid__live'); b.appendChild(el('i')); b.appendChild(document.createTextNode('Preview')); card.appendChild(b); }
      v.addEventListener('playing', function () { if (card) card.classList.toggle('is-playing', v.muted); });
      v.addEventListener('pause', function () { if (card) card.classList.remove('is-playing'); });
      v.addEventListener('volumechange', function () { if (card) card.classList.toggle('is-playing', !v.paused && v.muted); });
    });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { if (v.paused && v.muted) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
        else if (!v.paused && v.muted) v.pause();
      });
    }, { threshold: 0.45 });
    vids.forEach(function (v) { io.observe(v); });
  }
  /* the journey rail drifts one card at a time until someone touches it */
  function initJourneyDrift() {
    var rail = document.querySelector('.journey__rail'); if (!rail || REDUCED) return;
    var timer = null, idle = true, visible = false;
    function cardW() { var c = rail.querySelector('.jm'); return c ? c.getBoundingClientRect().width + 12 : 220; }
    function tick() { if (!idle || !visible) return; var max = rail.scrollWidth - rail.clientWidth; if (rail.scrollLeft >= max - 4) rail.scrollTo({ left: 0, behavior: 'smooth' }); else rail.scrollBy({ left: cardW(), behavior: 'smooth' }); }
    function start() { stop(); timer = setInterval(tick, 3200); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function pause() { idle = false; stop(); }
    function resume() { idle = true; start(); }
    rail.addEventListener('pointerenter', pause); rail.addEventListener('pointerleave', resume);
    rail.addEventListener('focusin', pause); rail.addEventListener('focusout', resume);
    rail.addEventListener('touchstart', pause, { passive: true });
    [].slice.call(document.querySelectorAll('.jbtn')).forEach(function (b) { b.addEventListener('click', function () { idle = false; stop(); setTimeout(function () { idle = true; start(); }, 9000); }); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(rail); else { visible = true; start(); }
  }

  /* ---------------- crosswalk: one control, nine frameworks ---------------- */
  function initGraph() {
    var cv = document.getElementById('graph'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var LABELS = ['ISO 27001', 'ISO/IEC 42001', 'SOC 2', 'NIST CSF 2.0', 'NIST AI RMF', 'EU AI Act', 'DPDP Act', 'PCI DSS', 'HIPAA'];
    var nodes = LABELS.map(function (l) { return { label: l, glow: 0, hits: 0 }; });
    var pulses = [], W = 0, H = 0, running = true, last = 0, spawn = 0.2;
    var AMBER = [254, 189, 89], TEXT = '242,243,240';
    function a(c, al) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + al + ')'; }
    function size() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function layout() {
      var narrow = W < 460, cw = Math.min(220, W * (narrow ? 0.4 : 0.36)), ch = narrow ? 100 : 128;
      var sx = narrow ? 4 : W * 0.02, sy = H / 2 - ch / 2, tx = W * (narrow ? 0.6 : 0.64), pad = H * 0.07;
      return { cw: cw, ch: ch, sx: sx, sy: sy, ox: sx + cw, oy: H / 2, tx: tx, fs: narrow ? 10.5 : 13,
        ty: function (i) { return pad + (H - 2 * pad) * (i / (nodes.length - 1)); } };
    }
    function bez(L, i, t) {
      var x0 = L.ox, y0 = L.oy, x3 = L.tx, y3 = L.ty(i), cx1 = x0 + (x3 - x0) * 0.5, cx2 = x0 + (x3 - x0) * 0.5, u = 1 - t;
      return { x: u * u * u * x0 + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * x3, y: u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y3 + t * t * t * y3 };
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var L = layout(), mono = '"JetBrains Mono", ui-monospace, monospace';
      nodes.forEach(function (n, i) {                       // links
        ctx.beginPath(); ctx.moveTo(L.ox, L.oy);
        var mx = L.ox + (L.tx - L.ox) * 0.5; ctx.bezierCurveTo(mx, L.oy, mx, L.ty(i), L.tx, L.ty(i));
        ctx.strokeStyle = a(AMBER, 0.22 + n.glow * 0.55); ctx.lineWidth = 1.2 + n.glow * 1.4; ctx.stroke();
      });
      pulses.forEach(function (q) {                          // evidence in flight
        var p = bez(L, q.n, q.t), g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
        g.addColorStop(0, a(AMBER, 0.95)); g.addColorStop(1, a(AMBER, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
      });
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      nodes.forEach(function (n, i) {                        // frameworks
        var y = L.ty(i), x = L.tx;
        if (n.glow > 0.02) { ctx.beginPath(); ctx.arc(x, y, 7 + n.glow * 9, 0, Math.PI * 2); ctx.fillStyle = a(AMBER, 0.16 * n.glow); ctx.fill(); }
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fillStyle = n.hits ? a(AMBER, 1) : 'rgba(' + TEXT + ',.5)'; ctx.fill();
        ctx.font = '500 ' + L.fs + 'px ' + mono; ctx.fillStyle = 'rgba(' + TEXT + ',' + (0.55 + n.glow * 0.45) + ')'; ctx.fillText(n.label, x + 14, y);
        if (n.hits) {                                         // tick once evidenced
          var w = ctx.measureText(n.label).width, kx = x + 14 + w + 10;
          ctx.beginPath(); ctx.moveTo(kx, y); ctx.lineTo(kx + 3.5, y + 3.5); ctx.lineTo(kx + 10, y - 4);
          ctx.strokeStyle = a(AMBER, 0.6 + n.glow * 0.4); ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineWidth = 1;
        }
      });
      rr(L.sx, L.sy, L.cw, L.ch, 14);                        // the one control
      ctx.fillStyle = 'rgba(21,34,49,.96)'; ctx.fill(); ctx.strokeStyle = a(AMBER, 0.55); ctx.lineWidth = 1.2; ctx.stroke(); ctx.lineWidth = 1;
      ctx.font = '600 ' + (L.fs - 1) + 'px ' + mono; ctx.fillStyle = a(AMBER, 1); ctx.fillText('1 CONTROL', L.sx + 16, L.sy + 24);
      ctx.font = '600 ' + (L.fs + 3) + 'px "Inter Tight", system-ui, sans-serif'; ctx.fillStyle = 'rgba(' + TEXT + ',1)';
      ctx.fillText('Access review', L.sx + 16, L.sy + L.ch / 2 + 2);
      ctx.font = '400 ' + (L.fs - 1) + 'px ' + mono; ctx.fillStyle = 'rgba(' + TEXT + ',.55)'; ctx.fillText('1 evidence record', L.sx + 16, L.sy + L.ch - 22);
      ctx.beginPath(); ctx.arc(L.ox, L.oy, 4, 0, Math.PI * 2); ctx.fillStyle = a(AMBER, 1); ctx.fill();
    }
    function step(t) {
      if (!running) { last = 0; return; }
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016; last = t;
      spawn -= dt; if (spawn <= 0) { pulses.push({ n: Math.floor(Math.random() * nodes.length), t: 0 }); spawn = 0.32 + Math.random() * 0.28; }
      pulses = pulses.filter(function (q) { q.t += dt * 0.7; if (q.t >= 1) { nodes[q.n].glow = 1; nodes[q.n].hits++; return false; } return true; });
      nodes.forEach(function (n) { n.glow *= 0.955; });
      draw(); requestAnimationFrame(step);
    }
    size(); window.addEventListener('resize', function () { size(); if (REDUCED) draw(); });
    if (REDUCED) { nodes.forEach(function (n) { n.hits = 1; }); draw(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); return; }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting; if (vis && !running) { running = true; requestAnimationFrame(step); } running = vis;
    }).observe(cv);
    requestAnimationFrame(step);
  }

  /* ---------------- luxury motion layer ---------------- */
  var INTRO = 0;   // seconds the hero waits for the loader

  function initField() {
    var cv = document.getElementById('field'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), W, H, t = 0, mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, run = true;
    var COLS = 64, ROWS = 26;
    function size() { var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      var horizon = H * 0.38;
      for (var j = ROWS - 1; j >= 0; j--) {
        var z = j / (ROWS - 1), s = 1 / (1 + z * 3.2);
        for (var i = 0; i < COLS; i++) {
          var x = (i / (COLS - 1)) * 2 - 1;
          var dx = x - (mx * 2 - 1), dz = z - (1 - my) * 0.6, ripple = Math.exp(-(dx * dx + dz * dz) * 6) * 0.9;
          var y = Math.sin(x * 3.2 + t * 0.9) * Math.cos(z * 5 + t * 0.6) * 0.55 + Math.sin(x * 7 - t * 1.4 + z * 3) * 0.18 + ripple * Math.sin(t * 3 - (dx * dx + dz * dz) * 20);
          var sx = W / 2 + x * W * 0.95 * s, sy = horizon + (H - horizon) * Math.pow(s, 0.9) - y * 34 * s;
          var al = Math.min(1, (0.14 + 0.9 * s) * (0.6 + 0.4 * (y + 1) / 2));
          ctx.fillStyle = 'rgba(254,189,89,' + al.toFixed(3) + ')';
          var r = 0.8 + 2.2 * s; ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
        }
      }
    }
    function loop() { if (!run) return; t += 0.016; mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04; frame(); requestAnimationFrame(loop); }
    size(); window.addEventListener('resize', size);
    if (REDUCED) { frame(); return; }
    window.addEventListener('pointermove', function (e) { tmx = e.clientX / window.innerWidth; tmy = e.clientY / window.innerHeight; }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { var v = es[0].isIntersecting; if (v && !run) { run = true; requestAnimationFrame(loop); } run = v; }).observe(cv);
    requestAnimationFrame(loop);
  }

  function initMarquee() {
    var tr = document.getElementById('marquee'); if (!tr) return;
    tr.innerHTML += tr.innerHTML;                      // seamless loop: two identical halves
    var x = 0, half = 0, boost = 0;
    function measure() { half = tr.scrollWidth / 2; } measure(); window.addEventListener('resize', measure);
    gsap.ticker.add(function (time, dtMs) {
      var v = lenis ? Math.abs(lenis.velocity || 0) : 0; boost += (Math.min(v, 60) - boost) * 0.08;
      x -= (40 + boost * 9) * (dtMs / 1000); if (half && -x >= half) x += half;
      tr.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0) skewX(' + (-Math.min(boost, 30) * 0.18).toFixed(2) + 'deg)';
    });
  }

  function initHeadings() {
    if (typeof window.SplitText === 'undefined') return;
    gsap.utils.toArray('.sec h2').forEach(function (h) {
      var sp = SplitText.create(h, { type: 'words', mask: 'words' });
      gsap.from(sp.words, { yPercent: 115, duration: 1, ease: 'expo.out', stagger: 0.035,
        scrollTrigger: { trigger: h, start: 'top 86%', once: true } });
    });
  }

  function initStory() {
    var track = document.getElementById('storyTrack'), bar = document.getElementById('storyBar'); if (!track) return;
    var mm = gsap.matchMedia();
    mm.add('(min-width: 1021px)', function () {
      var dist = function () { return Math.max(0, track.scrollWidth - track.parentNode.clientWidth); };
      gsap.to(track, { x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: '#story', start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.7, invalidateOnRefresh: true,
          onUpdate: function (s) { bar.style.transform = 'scaleX(' + s.progress.toFixed(3) + ')'; } } });
      gsap.utils.toArray('.chapter__n').forEach(function (n) {
        gsap.from(n, { xPercent: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '#story', start: 'top 60%', once: true } });
      });
    });
    mm.add('(max-width: 1020px)', function () {
      gsap.utils.toArray('.chapter').forEach(function (c) {
        gsap.from(c, { y: 40, autoAlpha: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 88%', once: true } });
      });
    });
  }

  function initLabReveal() {             // Apple-style product zoom: oversized, settles as you scroll
    var wide = window.matchMedia('(min-width: 1021px)').matches;   // on one column the copy sits above the stage, so no oversizing there
    gsap.fromTo('.labstage', { scale: wide ? 1.28 : 1, yPercent: wide ? 12 : 0, autoAlpha: 0.35 }, { scale: 1, yPercent: 0, autoAlpha: 1, ease: 'none',
      scrollTrigger: { trigger: '.lab', start: 'top 85%', end: 'top 15%', scrub: 0.8 } });
  }

  function initStatement() {             // words brighten one by one while the line holds on screen
    var p = document.querySelector('[data-statement]'); if (!p) return;
    var words = [];
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = el('span', 'w', part); words.push(s); frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) wrap(n);
      });
    })(p);
    ScrollTrigger.create({ trigger: '#statement', start: 'top top', end: '+=120%', pin: '.statement__pin', scrub: true,
      onUpdate: function (s) { var k = Math.round(s.progress * words.length * 1.08); words.forEach(function (w, i) { w.classList.toggle('on', i < k); }); } });
  }

  function initSignature() {
    gsap.to('.signature', { backgroundSize: '100% 100%', ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top 95%', end: 'bottom bottom', scrub: 0.8 } });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    safe('year', function () { document.getElementById('year').textContent = new Date().getFullYear(); });
    safe('graph', initGraph);
    safe('field', initField);
    safe('nav', initNav);
    safe('journeyUi', initJourneyUi);
    safe('inView', initInView);
    safe('videoPreviews', initVideoPreviews);
    safe('journeyDrift', initJourneyDrift);
    if (hasGSAP && !REDUCED) {
      safe('scroll', initScroll);
      safe('marquee', initMarquee);
      safe('hero', initHero);
      safe('headings', initHeadings);
      safe('statement', initStatement);
      safe('story', initStory);
      safe('labReveal', initLabReveal);
      safe('signature', initSignature);
      safe('reveals', initReveals);
      safe('counts', initCounts);
      safe('lab', initLab);
      safe('labSlides', initLabSlides);
      safe('journeyReveal', initJourneyReveal);
      safe('navActive', initNavActive);
      safe('sort', function () { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
      safe('refresh', function () { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); }); });
    }
  }
  var done = false, hydrated = false;
  function go() { if (done) return; done = true; if (DATA) { hydrated = true; safe('hydrate', function () { hydrate(DATA); }); } boot(); }
  // data that lands after the cut-off (slow phone, throttled network) is still drawn, just without entrance motion
  function late(d) {
    if (!d || hydrated) return; hydrated = true; DATA = d;
    safe('hydrate-late', function () { hydrate(d); });
    safe('refresh-late', function () { if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh(); });
  }
  function got(d) { if (done) { late(d); return; } DATA = d; clearTimeout(timer); go(); }
  // data first (hydrated rows join the reveal batch), but never wait longer than 1.5 s for it
  var timer = setTimeout(go, 1500);
  fetch('data/site.json?v=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(got)
    .catch(function () {
      if (!done) { clearTimeout(timer); go(); }
      // one retry once the page has loaded: a dropped first request should not leave the HTML figures in place
      var retry = function () { fetch('data/site.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(late).catch(function () {}); };
      if (document.readyState === 'complete') retry(); else window.addEventListener('load', retry);
    });
})();
