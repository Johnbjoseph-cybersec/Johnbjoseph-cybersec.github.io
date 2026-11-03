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
      document.getElementById('newsCount').textContent = nl.published + ' editions published · new every weekday';
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
      gsap.from(split.lines, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.15 });
    }
    gsap.from('.hero__lede, .hero__cta, .hero__meta', { y: 18, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.45, clearProps: 'all' });
    gsap.from('.graph', { scale: 0.92, autoAlpha: 0, duration: 1.4, ease: 'expo.out', delay: 0.2, clearProps: 'all' });
    var eb = document.querySelector('[data-scramble]');
    if (eb && typeof window.ScrambleTextPlugin !== 'undefined') {
      gsap.registerPlugin(ScrambleTextPlugin);
      var html = eb.innerHTML, txt = eb.textContent;
      gsap.to(eb, { duration: 1.2, delay: 0.1, scrambleText: { text: txt, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ/', speed: 0.6 }, onComplete: function () { eb.innerHTML = html; } });
    }
  }
  function initReveals() {
    var els = gsap.utils.toArray('[data-reveal]');
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

  /* ---------------- hero graph: one control, nine frameworks ---------------- */
  function initGraph() {
    var cv = document.getElementById('graph'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), LABELS = ['ISO 27001', 'ISO/IEC 42001', 'EU AI Act', 'NIST AI RMF', 'NIST CSF 2.0', 'SOC 2', 'DPDP Act', 'OWASP ACS', 'ML-DSA (PQC)'];
    var nodes = LABELS.map(function (l, i) { return { label: l, a: (i / LABELS.length) * Math.PI * 2 - Math.PI / 2, glow: 0, w: 0.9 + (i % 3) * 0.07 }; });
    var pulses = [], W = 0, H = 0, dpr = 1, rot = 0, mx = 0, my = 0, tmx = 0, tmy = 0, running = true, last = 0, spawn = 0;
    var accent = [155, 107, 255];
    function size() {
      var r = cv.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function rgba(a) { return 'rgba(' + accent[0] + ',' + accent[1] + ',' + accent[2] + ',' + a + ')'; }
    function pos(n, R, cx, cy) {
      var a = n.a + rot, k = n.w;
      return { x: cx + Math.cos(a) * R * k + mx * 10 * k, y: cy + Math.sin(a) * R * k + my * 10 * k, a: a };
    }
    function draw(dt) {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2, S = Math.min(W, H), R = S * (S < 480 ? 0.27 : 0.33), core = S * 0.15, fs = Math.max(9, Math.min(11.5, S / 48));
      [0.62, 1, 1.18].forEach(function (k, i) {
        ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
        ctx.setLineDash(i === 1 ? [] : [2, 6]); ctx.strokeStyle = 'rgba(255,255,255,' + (i === 1 ? 0.06 : 0.05) + ')'; ctx.lineWidth = 1; ctx.stroke();
      });
      ctx.setLineDash([]);
      var P = nodes.map(function (n) { return pos(n, R, cx, cy); });
      for (var i = 0; i < P.length; i++) {           // crosswalk links between frameworks
        var j = (i + 2) % P.length;
        ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.quadraticCurveTo(cx + (P[i].x + P[j].x - 2 * cx) * 0.25, cy + (P[i].y + P[j].y - 2 * cy) * 0.25, P[j].x, P[j].y);
        ctx.strokeStyle = rgba(0.07); ctx.stroke();
      }
      P.forEach(function (p, i) {                     // spokes from the control
        var sx = cx + Math.cos(p.a) * core, sy = cy + Math.sin(p.a) * core;
        var g = ctx.createLinearGradient(sx, sy, p.x, p.y); g.addColorStop(0, rgba(0.38)); g.addColorStop(1, rgba(0.08 + nodes[i].glow * 0.5));
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(p.x, p.y); ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.stroke();
      });
      pulses.forEach(function (q) {                   // evidence travelling outwards
        var p = P[q.n], sx = cx + Math.cos(p.a) * core, sy = cy + Math.sin(p.a) * core, e = 1 - Math.pow(1 - q.t, 3);
        var x = sx + (p.x - sx) * e, y = sy + (p.y - sy) * e;
        var gr = ctx.createRadialGradient(x, y, 0, x, y, 9); gr.addColorStop(0, rgba(0.95)); gr.addColorStop(1, rgba(0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      });
      ctx.font = '500 ' + fs + 'px "JetBrains Mono", ui-monospace, monospace'; ctx.textBaseline = 'middle';
      P.forEach(function (p, i) {
        var n = nodes[i], c = Math.cos(p.a);
        if (n.glow > 0.02) { ctx.beginPath(); ctx.arc(p.x, p.y, 6 + n.glow * 10, 0, Math.PI * 2); ctx.fillStyle = rgba(0.14 * n.glow); ctx.fill(); }
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2); ctx.fillStyle = n.glow > 0.3 ? rgba(1) : 'rgba(236,235,242,.85)'; ctx.fill();
        ctx.textAlign = c > 0.25 ? 'left' : c < -0.25 ? 'right' : 'center';
        var lx = p.x + (c > 0.25 ? 12 : c < -0.25 ? -12 : 0), ly = p.y + (Math.abs(c) <= 0.25 ? (Math.sin(p.a) > 0 ? 16 : -16) : 0);
        ctx.fillStyle = 'rgba(236,235,242,' + (0.5 + n.glow * 0.5) + ')'; ctx.fillText(n.label, lx, ly);
      });
    }
    function step(t) {
      if (!running) { last = 0; return; }
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016; last = t;
      rot += dt * 0.035; mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
      spawn -= dt; if (spawn <= 0) { pulses.push({ n: Math.floor(Math.random() * nodes.length), t: 0 }); spawn = 0.38 + Math.random() * 0.3; }
      pulses = pulses.filter(function (q) { q.t += dt * 0.75; if (q.t >= 1) { nodes[q.n].glow = 1; return false; } return true; });
      nodes.forEach(function (n) { n.glow *= 0.965; });
      draw(dt); requestAnimationFrame(step);
    }
    size(); window.addEventListener('resize', function () { size(); if (REDUCED) draw(0); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (REDUCED) draw(0); });
    if (REDUCED) { nodes.forEach(function (n, i) { n.glow = i % 3 === 0 ? 0.6 : 0; }); draw(0); return; }
    cv.parentNode.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width - 0.5; tmy = (e.clientY - r.top) / r.height - 0.5;
    });
    cv.parentNode.addEventListener('pointerleave', function () { tmx = tmy = 0; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting; if (vis && !running) { running = true; requestAnimationFrame(step); } running = vis;
    }).observe(cv);
    requestAnimationFrame(step);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    safe('year', function () { document.getElementById('year').textContent = new Date().getFullYear(); });
    safe('graph', initGraph);
    safe('nav', initNav);
    if (hasGSAP && !REDUCED) {
      safe('scroll', initScroll);
      safe('hero', initHero);
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
