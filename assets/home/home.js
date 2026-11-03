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
      var list = d.contributions || []; if (!list.length) return;
      var box = document.getElementById('ledger'); box.textContent = '';
      list.forEach(function (c) {
        var a = el('a', 'ledger__row'); a.href = c.url; a.setAttribute('data-reveal', '');
        a.appendChild(el('span', 'ledger__date', c.date));
        var p = el('span', 'ledger__proj', c.project); p.appendChild(el('small', null, c.org)); a.appendChild(p);
        a.appendChild(el('span', 'ledger__what', c.title));
        var st = (c.status || 'proposed').toLowerCase();
        a.appendChild(el('span', 'chip chip--' + st, st.charAt(0).toUpperCase() + st.slice(1)));
        a.appendChild(icon('out', 18, 'ledger__go'));
        box.appendChild(a);
      });
      var merged = list.filter(function (c) { return /merged|accepted/.test(c.status); }).length;
      document.getElementById('ledgerFoot').textContent = list.length + ' contribution' + (list.length === 1 ? '' : 's') +
        (merged ? ' · ' + merged + ' accepted' : '') + ' · status is taken from each public thread';
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
    gsap.from('.stage__me', { yPercent: 12, autoAlpha: 0, duration: 1.5, ease: 'expo.out', delay: INTRO + 0.15, clearProps: 'opacity,visibility' });
    gsap.from('.hero__word', { xPercent: 18, autoAlpha: 0, duration: 2, ease: 'expo.out', delay: INTRO, clearProps: 'opacity,visibility' });
    gsap.to('.stage__me', { yPercent: 4, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 } });
    gsap.to('.hero__word', { xPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 } });
    gsap.to('.hero__copy', { yPercent: -12, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: 0.5 } });
    var eb = document.querySelector('[data-scramble]');
    if (eb && typeof window.ScrambleTextPlugin !== 'undefined') {
      gsap.registerPlugin(ScrambleTextPlugin);
      var html = eb.innerHTML, txt = eb.textContent;
      gsap.to(eb, { duration: 1.2, delay: INTRO + 0.1, scrambleText: { text: txt, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ/', speed: 0.6 }, onComplete: function () { eb.innerHTML = html; } });
    }
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
      var target = +n.getAttribute('data-value') || parseInt((n.textContent || '').replace(/[^0-9]/g, ''), 10);
      if (!target || !n.firstChild || n.firstChild.nodeType !== 3) return;
      var o = { v: 0 };
      ScrollTrigger.create({ trigger: n, start: 'top 92%', once: true, onEnter: function () {
        gsap.to(o, { v: target, duration: 1.8, ease: 'expo.out', onUpdate: function () { n.firstChild.nodeValue = fmt(o.v); } });
      } });
    });
  }
  function initLab() {
    gsap.to('.shot--a', { yPercent: -10, rotateY: -3, ease: 'none', scrollTrigger: { trigger: '.shots', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    gsap.to('.shot--b', { yPercent: 12, rotateY: -14, ease: 'none', scrollTrigger: { trigger: '.shots', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
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
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var INTRO = 0;   // seconds the hero waits for the loader

  function initLoader() {
    var seen = false; try { seen = sessionStorage.getItem('jbj-intro') === '1'; sessionStorage.setItem('jbj-intro', '1'); } catch (e) {}
    if (seen) return;
    var L = el('div', 'loader'); L.setAttribute('aria-hidden', 'true');
    var name = el('div', 'loader__name');
    'John B Joseph'.split('').forEach(function (ch) { var s = el(ch === 'B' ? 'b' : 'span'); s.textContent = ch === ' ' ? '\u00a0' : ch; if (ch === 'B') s.style.display = 'inline-block'; name.appendChild(s); });
    var n = el('div', 'loader__n', '000'), bar = el('div', 'loader__bar');
    L.appendChild(name); L.appendChild(n); L.appendChild(bar); document.body.appendChild(L);
    INTRO = 1.75;
    var o = { v: 0 }, tl = gsap.timeline({ onComplete: function () { L.remove(); } });
    tl.from(name.children, { yPercent: 110, autoAlpha: 0, duration: 0.7, ease: 'expo.out', stagger: 0.035 }, 0)
      .to(o, { v: 100, duration: 1.2, ease: 'power2.inOut', onUpdate: function () { n.textContent = String(Math.round(o.v)).padStart(3, '0'); } }, 0)
      .to(bar, { scaleX: 1, duration: 1.2, ease: 'power2.inOut' }, 0)
      .to(name.children, { yPercent: -110, autoAlpha: 0, duration: 0.45, ease: 'expo.in', stagger: 0.015 }, 1.25)
      .to(L, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' }, 1.45);
  }

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

  function initCursor() {
    if (!FINE) return;
    var ring = el('div', 'cursor'), dot = el('div', 'cursor__dot');
    document.body.appendChild(ring); document.body.appendChild(dot);
    var rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    var dx = gsap.quickTo(dot, 'x', { duration: 0.08 }), dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
    ring.style.opacity = dot.style.opacity = '0';
    window.addEventListener('pointermove', function (e) { ring.style.opacity = dot.style.opacity = '1'; rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', function (e) { ring.classList.toggle('is-link', !!(e.target.closest && e.target.closest('a,button'))); });
  }

  function initMagnetic() {
    if (!FINE) return;
    document.querySelectorAll('.btn').forEach(function (b) {
      var xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' }), yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.28); yTo((e.clientY - r.top - r.height / 2) * 0.35); });
      b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, .4)' }); });
    });
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

  function initLabReveal() {
    gsap.fromTo('.lab', { clipPath: 'circle(12% at 50% 60%)' }, { clipPath: 'circle(150% at 50% 50%)', ease: 'none',
      scrollTrigger: { trigger: '.lab', start: 'top 95%', end: 'top 15%', scrub: 0.6 } });
  }

  function initSignature() {
    gsap.to('.signature', { backgroundSize: '100% 100%', ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top 95%', end: 'bottom bottom', scrub: 0.8 } });
  }

  function initDepth() {
    if (!FINE) return;
    var layers = gsap.utils.toArray('[data-depth]').map(function (n) {
      var d = parseFloat(n.getAttribute('data-depth')) || 0;
      return { d: d, x: gsap.quickTo(n, 'x', { duration: 1.1, ease: 'power3' }), y: gsap.quickTo(n, 'y', { duration: 1.1, ease: 'power3' }) };
    });
    window.addEventListener('pointermove', function (e) {
      var mx = e.clientX / window.innerWidth - 0.5, my = e.clientY / window.innerHeight - 0.5;
      layers.forEach(function (l) { l.x(mx * l.d * 1.8); l.y(my * l.d * 1.2); });
    }, { passive: true });
  }

  function initTilt() {
    if (!FINE) return;
    var stage = document.querySelector('.stage'), st = document.getElementById('stageTilt');
    if (stage && st) {
      var srx = gsap.quickTo(st, 'rotationX', { duration: 0.9, ease: 'power3' }), sry = gsap.quickTo(st, 'rotationY', { duration: 0.9, ease: 'power3' });
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        sry((px - 0.5) * 18); srx(-(py - 0.5) * 12);
        stage.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); stage.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      stage.addEventListener('pointerleave', function () { srx(0); sry(0); });
    }
    document.querySelectorAll('.chapter, .vid, .ledger__row, .news__card, .speak').forEach(function (c) {
      c.classList.add('tilt');
      var max = c.classList.contains('ledger__row') ? 2 : (c.classList.contains('speak') || c.classList.contains('news__card') ? 3 : 7);
      var rx = gsap.quickTo(c, 'rotationX', { duration: 0.6, ease: 'power3' }), ry = gsap.quickTo(c, 'rotationY', { duration: 0.6, ease: 'power3' });
      gsap.set(c, { transformPerspective: 900 });
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * max * 2); rx(-(py - 0.5) * max * 2);
        c.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); c.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', function () { rx(0); ry(0); });
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    safe('year', function () { document.getElementById('year').textContent = new Date().getFullYear(); });
    safe('graph', initGraph);
    safe('field', initField);
    safe('nav', initNav);
    if (hasGSAP && !REDUCED) {
      safe('loader', initLoader);
      safe('scroll', initScroll);
      safe('cursor', initCursor);
      safe('magnetic', initMagnetic);
      safe('marquee', initMarquee);
      safe('hero', initHero);
      safe('headings', initHeadings);
      safe('story', initStory);
      safe('labReveal', initLabReveal);
      safe('signature', initSignature);
      safe('depth', initDepth);
      safe('tilt', initTilt);
      safe('reveals', initReveals);
      safe('counts', initCounts);
      safe('lab', initLab);
      safe('refresh', function () { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); }); });
    }
  }
  var done = false;
  function go() { if (done) return; done = true; if (DATA) safe('hydrate', function () { hydrate(DATA); }); boot(); }
  // data first (hydrated rows join the reveal batch), but never wait longer than 1.5 s for it
  var timer = setTimeout(go, 1500);
  fetch('data/site.json?v=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { DATA = d; clearTimeout(timer); go(); })
    .catch(function () { clearTimeout(timer); go(); });
  // late data after the 1.5 s cut-off still lands, just without entrance motion
  window.addEventListener('load', function () { if (done && DATA === null) fetch('data/site.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) { safe('hydrate-late', function () { hydrate(d); }); }).catch(function () {}); });
})();
