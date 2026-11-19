/* Home page (redesign 2026-11): hydrate from data/site.json (kept current by Dude), then interaction and motion.
   Every init is isolated; with JS off or failing, the static HTML (written by the builder) stays complete and readable:
   tabs only exist once initTabs runs (.tabs-on), reveals only once initReveals runs (.rv). */
(function () {
  'use strict';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
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
  function io(cb, opts) { return 'IntersectionObserver' in window ? new IntersectionObserver(cb, opts) : null; }

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
    safe('ledger', function () { ledger(d.contributions || []); });
    safe('achievements', function () { achFromData(d.achievements); });
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
        var a = el('a', 'vid'); a.href = 'https:\/\/www.youtube.com/watch?v=' + encodeURIComponent(v.id);
        var img = el('div', 'vid__img'); img.style.backgroundImage = 'url(https:\/\/i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/hqdefault.jpg)';
        var b = el('div', 'vid__b'); b.appendChild(el('div', 'vid__d', v.date)); b.appendChild(el('div', 'vid__t', v.title));
        a.appendChild(img); a.appendChild(b); box.appendChild(a);
      });
    });
    safe('updated', function () { if (d.updated) document.getElementById('updated').textContent = 'Page data updated ' + d.updated; });
  }

  /* contributions ledger: scoreboard + Latest / Accepted / In review views, grouped by project, newest first */
  function ledger(all) {
    var list = all.slice(); if (!list.length) return;
    var box = document.getElementById('ledger'); if (!box) return;
    function isWon(c) { return /merged|accepted/.test((c.status || '').toLowerCase()); }
    // Newest first everywhere (John, 2026-11-14: a won-first default hid every new proposal, so the page looked stale).
    list.sort(function (a, b) { return (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) || (isWon(b) - isWon(a)); });
    var won = list.filter(isWon), open = list.filter(function (c) { return !isWon(c); });
    var keys = {}; list.forEach(function (c) { keys[c.org + '/' + c.project] = 1; });
    var nProj = Object.keys(keys).length;
    [['openN1', list.length], ['openN2', won.length], ['openN3', nProj]].forEach(function (x) { var n = document.getElementById(x[0]); if (n) { n.textContent = String(x[1]); n.setAttribute('data-value', x[1]); } });
    var barEl = document.getElementById('openBar'); if (barEl) barEl.style.setProperty('--p', (list.length ? won.length / list.length : 0).toFixed(3));
    var LIMIT = 6, view = 'all', expanded = false, sets = { won: won, open: open, all: list };
    var bar = el('div', 'ledger__bar'), sum = el('p', 'ledger__sum');
    [[list.length, 'contributions'], [won.length, 'accepted'], [nProj, 'projects']].forEach(function (x, i) {
      if (i) sum.appendChild(el('span', 'ledger__dot', '·'));
      sum.appendChild(el('b', null, String(x[0]))); sum.appendChild(document.createTextNode(' ' + x[1]));
    });
    var tabs = el('div', 'ledger__tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Filter contributions');
    [['all', 'Latest'], ['won', 'Contributions accepted'], ['open', 'In review']].forEach(function (t) {
      var b = el('button', 'ledger__tab', t[1] + ' (' + sets[t[0]].length + ')'); b.type = 'button'; b.setAttribute('data-view', t[0]);
      b.addEventListener('click', function () { view = t[0]; expanded = false; draw(); });
      tabs.appendChild(b);
    });
    bar.appendChild(sum); bar.appendChild(tabs); box.parentNode.insertBefore(bar, box);
    var more = el('button', 'ledger__more'); more.type = 'button';
    more.addEventListener('click', function () { expanded = !expanded; draw(); if (!expanded) box.scrollIntoView({ block: 'nearest' }); });
    box.parentNode.insertBefore(more, box.nextSibling);
    function row(c) {
      var a = el('a', 'ledger__row'); a.href = c.url; a.target = '_blank'; a.rel = 'noopener';
      a.appendChild(el('span', 'ledger__date', c.date));
      var p = el('span', 'ledger__proj', c.project); p.appendChild(el('small', null, c.org)); a.appendChild(p);
      a.appendChild(el('span', 'ledger__what', c.title));
      var st = (c.status || 'proposed').toLowerCase();
      a.appendChild(el('span', 'chip chip--' + st.replace(/[^a-z-]/g, ''), st.charAt(0).toUpperCase() + st.slice(1)));
      a.appendChild(icon('out', 18, 'ledger__go'));
      return a;
    }
    function groupRow(items) {
      var det = el('details', 'ledger__group'), sm = document.createElement('summary'); sm.className = 'ledger__row ledger__summary';
      sm.appendChild(el('span', 'ledger__date', items[0].date));
      var p = el('span', 'ledger__proj', items[0].project); p.appendChild(el('small', null, items[0].org)); sm.appendChild(p);
      var w = items.filter(isWon).length, same = items.every(function (c) { return c.area === items[0].area; });
      sm.appendChild(el('span', 'ledger__what', items.length + ' contributions' + (same && items[0].area ? ' in ' + items[0].area : '') + (w ? ' · ' + w + ' accepted' : '')));
      var sts = items.map(function (c) { return (c.status || '').toLowerCase(); });
      var st = sts.some(function (x) { return /merged/.test(x); }) ? 'merged' : sts.some(function (x) { return /accepted/.test(x); }) ? 'accepted' : 'proposed';
      sm.appendChild(el('span', 'chip chip--' + st, st === 'merged' ? 'Merged' : st === 'accepted' ? 'Accepted' : 'Open'));
      sm.appendChild(icon('arrow', 18, 'ledger__go ledger__chev'));
      det.appendChild(sm);
      var sub = el('div', 'ledger__sub'); items.forEach(function (c) { sub.appendChild(row(c)); }); det.appendChild(sub);
      return det;
    }
    function draw() {
      box.textContent = '';
      tabs.querySelectorAll('.ledger__tab').forEach(function (b) { var on = b.getAttribute('data-view') === view; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      var order = [], groups = {};
      sets[view].forEach(function (c) { var k = c.org + '/' + c.project; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(c); });
      var units = order.map(function (k) { return groups[k]; });
      (expanded ? units : units.slice(0, LIMIT)).forEach(function (g) { box.appendChild(g.length === 1 ? row(g[0]) : groupRow(g)); });
      more.hidden = units.length <= LIMIT;
      more.textContent = expanded ? 'Show fewer' : 'Show all ' + units.length + ' projects';
    }
    draw();
    var foot = document.getElementById('ledgerFoot'); if (foot) foot.textContent = 'Status is taken from each public thread, and every row links to it.';
  }

  /* achievements: make sure every tile carries every item (older builder markup carried 3) */
  function achFromData(a) {
    if (!a || !a.tiles) return;
    var byName = {}; a.tiles.forEach(function (t) { byName[t.name] = t; });
    var LABEL = { recognised: 'Recognised', merged: 'Merged', accepted: 'Accepted' };
    document.querySelectorAll('#achWall .ach').forEach(function (tile) {
      var nm = tile.querySelector('.ach__who b'), ul = tile.querySelector('.ach__list'); if (!nm || !ul) return;
      var t = byName[nm.textContent]; if (!t || !t.items || ul.children.length >= t.items.length) return;
      ul.textContent = '';
      t.items.forEach(function (i) {
        var li = el('li'), a2 = el('a'); a2.href = /^https:\/\//.test(i.url) ? i.url : '#achievements';
        a2.appendChild(el('span', 'ach__proj', i.project)); a2.appendChild(el('span', 'ach__t', i.title));
        var m = el('span', 'ach__meta'); m.appendChild(el('span', 'chip chip--' + i.kind, LABEL[i.kind] || i.kind)); m.appendChild(document.createTextNode(i.date)); a2.appendChild(m);
        li.appendChild(a2); ul.appendChild(li);
      });
      tile.setAttribute('data-n', t.items.length);
      var h = tile.querySelector('.ach__hint'); if (h) h.textContent = t.items.length > 1 ? 'Read all ' + t.items.length : 'Read in full';
      var more = tile.querySelector('.ach__more'); if (more) more.remove();
    });
  }

  /* ---------------- expandable tiles: hover (CSS), keyboard focus (CSS :focus-within), tap / click (here) ---------------- */
  function initExpanders() {
    var wall = document.getElementById('achWall');
    // older builder markup: wrap each tile so it can open over its neighbours without moving them
    document.querySelectorAll('#achWall .ach').forEach(function (t) {
      if (!t.querySelector(':scope > .ach__in')) { var w = el('div', 'ach__in'); while (t.firstChild) w.appendChild(t.firstChild); t.appendChild(w); }
      if (!t.hasAttribute('tabindex')) t.tabIndex = 0;
      if (!t.querySelector('.ach__hint')) { var n = t.querySelectorAll('.ach__list li').length, h = el('span', 'ach__hint', n > 1 ? 'Read all ' + n : 'Read in full'); h.setAttribute('aria-hidden', 'true'); t.querySelector('.ach__in').appendChild(h); }
      var more = t.querySelector('.ach__more'); if (more) more.remove();
      var who = t.querySelector('.ach__who b'), cnt = t.querySelector('.ach__count');
      if (who) t.setAttribute('aria-label', who.textContent + (cnt ? ', ' + cnt.textContent : '') + '. Press Tab to read each item.');
    });
    // modules tile: all 44 names, opened in place
    var mod = document.querySelector('.tile--modules');
    if (mod && !mod.querySelector('.xp__in')) {
      var w = el('div', 'xp__in'); while (mod.firstChild) w.appendChild(mod.firstChild); mod.appendChild(w);
      var hint = el('span', 'xp__hint', 'Show every module'); hint.setAttribute('aria-hidden', 'true'); w.appendChild(hint);
      mod.tabIndex = 0; mod.setAttribute('aria-label', 'Modules in one workspace. Focus to list them all.');
    }
    function place(t) {                    // on narrow grids, open a tile across both columns
      t.classList.remove('is-wide-l', 'is-wide-r');
      var g = t.parentNode; if (!g || !t.classList.contains('ach') || window.innerWidth > 700 || t.classList.contains('ach--star')) return;
      var gr = g.getBoundingClientRect(), r = t.getBoundingClientRect();
      if (r.width > gr.width * 0.7) return;
      t.classList.add(r.left + r.width / 2 < gr.left + gr.width / 2 ? 'is-wide-l' : 'is-wide-r');
    }
    function closeAll(except) { document.querySelectorAll('.ach.is-open, .tile--modules.is-open, .prob.is-open').forEach(function (n) { if (n !== except) n.classList.remove('is-open'); }); }
    var sel = '.ach, .tile--modules, .prob';
    document.addEventListener('focusin', function (e) { var t = e.target.closest && e.target.closest(sel); if (t) place(t); });
    document.addEventListener('mouseover', function (e) { var t = e.target.closest && e.target.closest('.ach'); if (t) place(t); });
    // touch: the first tap opens a closed tile (instead of following its first link); taps elsewhere close it
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest(sel);
      if (!t) { closeAll(); return; }
      if (HOVER) return;
      if (!t.classList.contains('is-open')) { e.preventDefault(); closeAll(t); place(t); t.classList.add('is-open'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { var t = document.activeElement && document.activeElement.closest && document.activeElement.closest(sel); closeAll(); if (t) { t.blur(); } }
    });
    if (wall) wall.addEventListener('click', function (e) {   // filter chips (static HTML from the builder; work without data)
      var b = e.target.closest('.ach__tab'); if (!b) return;
      var f = b.getAttribute('data-f');
      wall.querySelectorAll('.ach__tab').forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
      wall.querySelectorAll('.ach').forEach(function (t) { t.hidden = !(f === 'all' || (' ' + t.getAttribute('data-kind') + ' ').indexOf(' ' + f + ' ') > -1); });
      var bw = wall.querySelector('.ach__badges'); if (bw) bw.hidden = !(f === 'all' || f === 'badges');
      var grid = wall.querySelector('.ach__grid'); if (grid) grid.hidden = f === 'badges';
    });
  }

  /* ---------------- tabs: ARIA tablist, arrow keys, deep links (#achievements, #videos, #lab-stories ...) ---------------- */
  function initTabs() {
    var lists = [].slice.call(document.querySelectorAll('.tabs[role="tablist"]')); if (!lists.length) return;
    function activate(tab, focus) {
      var list = tab.parentNode;
      list.querySelectorAll('[role="tab"]').forEach(function (t) {
        var on = t === tab, p = document.getElementById(t.getAttribute('aria-controls'));
        t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
      document.dispatchEvent(new CustomEvent('panelchange'));
    }
    lists.forEach(function (list) {
      var tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
      tabs.forEach(function (t, i) {
        var p = document.getElementById(t.getAttribute('aria-controls')); if (p) { p.tabIndex = -1; }
        t.addEventListener('click', function () { activate(t); });
        t.addEventListener('keydown', function (e) {
          var k = e.key, j = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : null;
          if (j === null) return; e.preventDefault(); activate(tabs[(j + tabs.length) % tabs.length], true);
        });
      });
      activate(list.querySelector('.is-on') || tabs[0]);
    });
    root.classList.add('tabs-on');
    function follow() {                      // a link to something inside a hidden panel opens that panel first
      var id = decodeURIComponent(location.hash.slice(1)); if (!id) return;
      var target = document.getElementById(id); if (!target) return;
      var panel = target.closest('[role="tabpanel"]');
      if (panel && panel.hidden) { var tab = document.querySelector('[aria-controls="' + panel.id + '"]'); if (tab) { activate(tab); target.scrollIntoView(); } }
    }
    window.addEventListener('hashchange', follow); follow();
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
      var t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
      var panel = t.closest('[role="tabpanel"]');
      if (panel && panel.hidden) { var tab = document.querySelector('[aria-controls="' + panel.id + '"]'); if (tab) activate(tab); }
    });
  }

  /* ---------------- nav: solid on scroll, hides going down, progress, active section ---------------- */
  function initNav() {
    var nav = document.getElementById('nav'), bar = document.getElementById('progress'), last = 0, tick = false;
    var links = [].slice.call(document.querySelectorAll('.nav__links a'));
    function onScroll() {
      tick = false;
      var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
      nav.classList.toggle('is-solid', y > 24);
      nav.classList.toggle('is-hidden', y > last + 2 && y > 500);
      if (y < last - 2) nav.classList.remove('is-hidden');
      last = y; bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
      document.body.classList.toggle('is-scrolled', y > 700);
      if (y < 200) links.forEach(function (l) { l.classList.remove('is-active'); });
    }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();
    var obs = io(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id); }); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    if (obs) links.forEach(function (l) { var s = document.querySelector(l.getAttribute('href')); if (s) obs.observe(s); });
    var tt = document.getElementById('totop'); if (tt) tt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); });
  }

  /* ---------------- entrance: rows rise once; never the reading lists in #open ---------------- */
  function initReveals() {
    if (REDUCED) return;
    var els = [].slice.call(document.querySelectorAll('[data-reveal]')).filter(function (n) { return !n.closest('#open'); });
    var obs = io(function (es) {
      var k = 0;
      es.forEach(function (e) { if (e.isIntersecting) { e.target.style.setProperty('--rd', (k++ * 0.07).toFixed(2) + 's'); e.target.classList.add('is-in'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    if (!obs) return;
    // anything already above the fold is shown at once; the rest waits for its row
    els.forEach(function (n) { if (n.getBoundingClientRect().top < window.innerHeight * 0.92) n.classList.add('is-in'); else obs.observe(n); });
    root.classList.add('rv');
    // failsafe: hidden panels, anchor jumps, print
    document.addEventListener('panelchange', function () { els.forEach(function (n) { if (!n.classList.contains('is-in') && n.offsetParent && n.getBoundingClientRect().top < window.innerHeight) n.classList.add('is-in'); }); });
    window.addEventListener('beforeprint', function () { els.forEach(function (n) { n.classList.add('is-in'); }); });
  }
  function initCounts() {
    if (REDUCED) return;
    var obs = io(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; obs.unobserve(e.target);
        var n = e.target, node = n.firstChild; if (!node || node.nodeType !== 3) return;
        var target = +n.getAttribute('data-value') || parseInt(node.nodeValue.replace(/[^0-9]/g, ''), 10); if (!target) return;
        var t0 = performance.now(), dur = 1400;
        (function step(now) {
          var u = Math.min(1, (now - t0) / dur), v = 1 - Math.pow(1 - u, 4);
          var live = +n.getAttribute('data-value') || target;
          node.nodeValue = fmt(live * v); if (u < 1) requestAnimationFrame(step); else node.nodeValue = fmt(live);
        })(t0);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    if (obs) document.querySelectorAll('[data-count]').forEach(function (n) { obs.observe(n); });
  }
  function initHero() {
    if (REDUCED || typeof window.gsap === 'undefined') return;
    var h1 = document.querySelector('[data-split]');
    if (typeof window.SplitText !== 'undefined' && h1) {
      gsap.registerPlugin(SplitText);
      var split = SplitText.create(h1, { type: 'lines,words', mask: 'lines' });
      gsap.from(split.lines, { yPercent: 110, duration: 1.05, ease: 'expo.out', stagger: 0.08, delay: 0.1 });
    }
    gsap.from('.hero__lede, .hero__cta, .hero__meta', { y: 16, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, delay: 0.4, clearProps: 'all' });
    gsap.from('.stage__me', { y: 24, autoAlpha: 0, duration: 1.3, ease: 'expo.out', delay: 0.1, clearProps: 'opacity,visibility,transform' });
    gsap.from('.proof__i', { y: 14, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06, delay: 0.55, clearProps: 'all' });
  }
  function initMarquee() {
    var tr = document.getElementById('marquee'); if (!tr || REDUCED) return;
    tr.innerHTML += tr.innerHTML; root.classList.add('mq-on');
  }
  /* decorative SVG loops only run while on screen */
  function initArtPause() {
    var obs = io(function (es) { es.forEach(function (e) { e.target.classList.toggle('paused', !e.isIntersecting); }); }, { rootMargin: '60px 0px' });
    if (obs) document.querySelectorAll('.rail__art').forEach(function (n) { n.classList.add('paused'); obs.observe(n); });
  }

  /* ---------------- canvases ---------------- */
  function initField() {                   // hero: a field of amber points that ripples under the pointer (one canvas)
    var cv = document.getElementById('field'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), W, H, t = 0, mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, run = true;
    var COLS = window.innerWidth < 700 ? 36 : 60, ROWS = 20;
    function size() { var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      var horizon = H * 0.12;
      for (var j = ROWS - 1; j >= 0; j--) {
        var z = j / (ROWS - 1), s = 1 / (1 + z * 3.2);
        for (var i = 0; i < COLS; i++) {
          var x = (i / (COLS - 1)) * 2 - 1;
          var dx = x - (mx * 2 - 1), dz = z - (1 - my) * 0.6, ripple = Math.exp(-(dx * dx + dz * dz) * 6) * 0.9;
          var y = Math.sin(x * 3.2 + t * 0.9) * Math.cos(z * 5 + t * 0.6) * 0.55 + Math.sin(x * 7 - t * 1.4 + z * 3) * 0.18 + ripple * Math.sin(t * 3 - (dx * dx + dz * dz) * 20);
          var sx = W / 2 + x * W * 0.95 * s, sy = horizon + (H - horizon) * Math.pow(s, 0.9) - y * 26 * s;
          var al = Math.min(1, (0.1 + 0.7 * s) * (0.6 + 0.4 * (y + 1) / 2));
          ctx.fillStyle = 'rgba(254,189,89,' + al.toFixed(3) + ')';
          var r = 0.7 + 1.9 * s; ctx.fillRect(sx - r / 2, sy - r / 2, r, r);
        }
      }
    }
    function loop() { if (!run) return; t += 0.016; mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04; frame(); requestAnimationFrame(loop); }
    size(); window.addEventListener('resize', function () { size(); if (REDUCED) frame(); });
    if (REDUCED) { frame(); return; }
    window.addEventListener('pointermove', function (e) { tmx = e.clientX / window.innerWidth; tmy = e.clientY / window.innerHeight; }, { passive: true });
    var obs = io(function (es) { var v = es[0].isIntersecting; if (v && !run) { run = true; requestAnimationFrame(loop); } run = v; });
    if (obs) obs.observe(cv);
    requestAnimationFrame(loop);
  }
  function initGraph() {                   // crosswalk: one control, evidence pulses out to nine frameworks
    var cv = document.getElementById('graph'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var LABELS = ['ISO 27001', 'ISO/IEC 42001', 'SOC 2', 'NIST CSF 2.0', 'NIST AI RMF', 'EU AI Act', 'DPDP Act', 'PCI DSS', 'HIPAA'];
    var nodes = LABELS.map(function (l) { return { label: l, glow: 0, hits: 0 }; });
    var pulses = [], W = 0, H = 0, running = true, last = 0, spawn = 0.2;
    var AMBER = [254, 189, 89], TEXT = '242,243,240';
    function a(c, al) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + al + ')'; }
    function size() { var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function layout() {
      var narrow = W < 460, cw = Math.min(200, W * (narrow ? 0.4 : 0.34)), ch = narrow ? 92 : 116;
      var sx = 2, sy = H / 2 - ch / 2, tx = W * (narrow ? 0.58 : 0.6), pad = H * 0.06;
      return { cw: cw, ch: ch, sx: sx, sy: sy, ox: sx + cw, oy: H / 2, tx: tx, fs: narrow ? 10.5 : 12.5, ty: function (i) { return pad + (H - 2 * pad) * (i / (nodes.length - 1)); } };
    }
    function bez(L, i, t) {
      var x0 = L.ox, y0 = L.oy, x3 = L.tx, y3 = L.ty(i), cx = x0 + (x3 - x0) * 0.5, u = 1 - t;
      return { x: u * u * u * x0 + 3 * u * u * t * cx + 3 * u * t * t * cx + t * t * t * x3, y: u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y3 + t * t * t * y3 };
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var L = layout(), mono = '"JetBrains Mono", ui-monospace, monospace';
      nodes.forEach(function (n, i) { ctx.beginPath(); ctx.moveTo(L.ox, L.oy); var mx = L.ox + (L.tx - L.ox) * 0.5; ctx.bezierCurveTo(mx, L.oy, mx, L.ty(i), L.tx, L.ty(i)); ctx.strokeStyle = a(AMBER, 0.2 + n.glow * 0.55); ctx.lineWidth = 1.2 + n.glow * 1.4; ctx.stroke(); });
      pulses.forEach(function (q) { var p = bez(L, q.n, q.t), g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9); g.addColorStop(0, a(AMBER, 0.95)); g.addColorStop(1, a(AMBER, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill(); });
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      nodes.forEach(function (n, i) {
        var y = L.ty(i), x = L.tx;
        if (n.glow > 0.02) { ctx.beginPath(); ctx.arc(x, y, 7 + n.glow * 8, 0, Math.PI * 2); ctx.fillStyle = a(AMBER, 0.16 * n.glow); ctx.fill(); }
        ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fillStyle = n.hits ? a(AMBER, 1) : 'rgba(' + TEXT + ',.5)'; ctx.fill();
        ctx.font = '500 ' + L.fs + 'px ' + mono; ctx.fillStyle = 'rgba(' + TEXT + ',' + (0.6 + n.glow * 0.4) + ')'; ctx.fillText(n.label, x + 13, y);
        if (n.hits) { var w = ctx.measureText(n.label).width, kx = x + 13 + w + 9; ctx.beginPath(); ctx.moveTo(kx, y); ctx.lineTo(kx + 3.5, y + 3.5); ctx.lineTo(kx + 10, y - 4); ctx.strokeStyle = a(AMBER, 0.6 + n.glow * 0.4); ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineWidth = 1; }
      });
      rr(L.sx, L.sy, L.cw, L.ch, 12); ctx.fillStyle = 'rgba(21,34,49,.96)'; ctx.fill(); ctx.strokeStyle = a(AMBER, 0.55); ctx.lineWidth = 1.2; ctx.stroke(); ctx.lineWidth = 1;
      ctx.font = '600 ' + (L.fs - 1) + 'px ' + mono; ctx.fillStyle = a(AMBER, 1); ctx.fillText('1 CONTROL', L.sx + 14, L.sy + 22);
      ctx.font = '600 ' + (L.fs + 3) + 'px "Inter Tight", system-ui, sans-serif'; ctx.fillStyle = 'rgba(' + TEXT + ',1)'; ctx.fillText('Access review', L.sx + 14, L.sy + L.ch / 2 + 2);
      ctx.font = '400 ' + (L.fs - 1) + 'px ' + mono; ctx.fillStyle = 'rgba(' + TEXT + ',.55)'; ctx.fillText('1 evidence record', L.sx + 14, L.sy + L.ch - 20);
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
    size(); window.addEventListener('resize', function () { size(); draw(); });
    if (REDUCED) { nodes.forEach(function (n) { n.hits = 1; }); draw(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); return; }
    var obs = io(function (es) { var vis = es[0].isIntersecting; if (vis && !running) { running = true; requestAnimationFrame(step); } running = vis; });
    if (obs) obs.observe(cv);
    requestAnimationFrame(step);
  }
  function initGlobe() {
    var cv = document.getElementById('globeCv'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), N = 700, pts = [], dpr = Math.min(2, window.devicePixelRatio || 1), size = 0, rot = 0, pings = [], last = 0, running = false, raf = 0;
    var ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) { var yy = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - yy * yy), th = ga * i; pts.push([Math.cos(th) * rr, yy, Math.sin(th) * rr]); }
    function fit() { var w = cv.clientWidth || 160; if (w === size) return; size = w; cv.width = w * dpr; cv.height = w * dpr; }
    var tilt = -0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
    function draw(now) {
      fit(); var w = cv.width, cx = w / 2, cy = w / 2, Rg = w * 0.44, dt = last ? Math.min(50, now - last) : 16; last = now; rot += dt * 0.00022;
      ctx.clearRect(0, 0, w, w);
      var cr = Math.cos(rot), sr = Math.sin(rot), front = [];
      for (var i = 0; i < N; i++) {
        var p = pts[i], x1 = p[0] * cr + p[2] * sr, z1 = -p[0] * sr + p[2] * cr, y1 = p[1], y2 = y1 * ct - z1 * st, z2 = y1 * st + z1 * ct;
        if (z2 < -0.15) continue;
        var al = 0.12 + (z2 + 0.15) / 1.15 * 0.62, px = cx + x1 * Rg, py = cy - y2 * Rg;
        ctx.fillStyle = 'rgba(242,243,240,' + al.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(px, py, dpr * (0.9 + z2 * 0.6), 0, 6.283); ctx.fill();
        if (z2 > 0.55) front.push([px, py]);
      }
      if (now - (pings.t || 0) > 1300 && front.length) { var f = front[(Math.random() * front.length) | 0]; pings.push({ x: f[0], y: f[1], t: now }); pings.t = now; }
      for (var k = pings.length - 1; k >= 0; k--) {
        var g = pings[k], u = (now - g.t) / 1400; if (u >= 1) { pings.splice(k, 1); continue; }
        ctx.strokeStyle = 'rgba(254,189,89,' + (0.9 * (1 - u)).toFixed(3) + ')'; ctx.lineWidth = dpr * 1.3; ctx.beginPath(); ctx.arc(g.x, g.y, dpr * (3 + u * 20), 0, 6.283); ctx.stroke();
        ctx.fillStyle = 'rgba(254,189,89,' + (1 - u * 0.6).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(g.x, g.y, dpr * 2.2, 0, 6.283); ctx.fill();
      }
      if (running) raf = requestAnimationFrame(draw);
    }
    function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(draw); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    if (REDUCED) { draw(performance.now()); return; }
    var obs = io(function (es) { if (es[0].isIntersecting) start(); else stop(); }, { rootMargin: '60px 0px' });
    if (obs) obs.observe(cv); else start();
    document.addEventListener('panelchange', function () { if (!cv.offsetParent) stop(); else if (cv.getBoundingClientRect().bottom > 0) { size = 0; start(); } });
  }

  /* ---------------- lab ---------------- */
  var LAB_MODULES = ['Dashboard', 'Start Here', 'Asset Inventory', 'Vendor Management', 'Policy Library', 'Risk Register', 'Control Catalog', 'Risk Treatments', 'Risk Matrix', 'Issue Tracker', 'Incident Log', 'Task Management', 'Audit Schedule', 'Evidence Library', 'Control Testing', 'Audit Findings', 'Statement of Applicability', 'Traceability Matrix', 'Reports & Analytics', 'Framework Library', 'GRC Projects', 'Portfolio Builder', 'Compliance Requirements', 'Exceptions', 'Due & Activity', 'IT General Controls', 'SOX Compliance', 'Evidence Scoring', 'Control Lifecycle', 'Cloud Risk Scenarios', 'Risk Appetite Statement', 'Key Risk Indicators', 'Business Impact Analysis', 'BCM / DR Plans', 'Control Mapping', 'Vendor Risk Assessment', 'Compliance Calendar', 'Audit Simulator', 'Guided Missions', 'ISO 27001 Lead Implementer', 'Interview Prep', 'GRC AI Agent Command', 'WebGPU Agent Setup'];
  var LAB_MILESTONES = [ // LinkedIn post dates (urn ids decode to these days); launch size from the February launch post
    { d: '2026-02-05', v: 1200, k: 'Launch' }, { d: '2026-07-28', v: 7000, k: '7K' }, { d: '2026-08-26', v: 8000, k: '8K' }, { d: '2026-09-29', v: 10000, k: '10K' }, { d: '2026-11-11', v: 12000, k: '12K' }];
  function initModules() {
    var box = document.getElementById('modticker'); if (!box) return;
    box.textContent = ''; LAB_MODULES.forEach(function (n) { box.appendChild(el('span', null, n)); });
  }
  function initGrowth() {
    var box = document.getElementById('growth'); if (!box) return;
    var built = 0;
    function build() {
      var W = Math.max(260, Math.round(box.clientWidth || 480)); if (Math.abs(W - built) < 24 || !box.clientWidth) return; built = W;
      var small = W < 420, H = small ? 140 : 168, L = 16, R = 34, T = 26, B = 24, t0 = Date.UTC(2026, 1, 1), t1 = Date.UTC(2026, 10, 30), vmax = 13200;
      var x = function (iso) { var p = iso.split('-'); return L + (Date.UTC(+p[0], p[1] - 1, +p[2]) - t0) / (t1 - t0) * (W - L - R); };
      var y = function (v) { return T + (1 - v / vmax) * (H - T - B); };
      var pts = LAB_MILESTONES.map(function (m) { return [x(m.d), y(m.v)]; });
      var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      var area = line + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - B) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - B) + ' Z';
      var ax = '';
      'FMAMJJASON'.split('').forEach(function (m, i) { var xx = L + (Date.UTC(2026, i + 1, 1) - t0) / (t1 - t0) * (W - L - R); ax += '<line class="growth__grid" x1="' + xx.toFixed(1) + '" y1="' + T + '" x2="' + xx.toFixed(1) + '" y2="' + (H - B) + '"/><text class="growth__ax" x="' + xx.toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + m + '</text>'; });
      var ms = '';
      LAB_MILESTONES.forEach(function (m, i) {
        var p = pts[i], lastM = i === LAB_MILESTONES.length - 1, above = i % 2 === 0 || lastM, ty = above ? p[1] - 11 : p[1] + 19, anchor = lastM ? 'end' : i === 0 ? 'start' : 'middle', tx = i === 0 ? p[0] - 6 : p[0];
        var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m.d.split('-')[1] - 1];
        ms += '<g class="growth__ms"><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4"/><text x="' + tx.toFixed(1) + '" y="' + ty + '" text-anchor="' + anchor + '">' + m.k + (small ? '' : ' <tspan class="dim">· ' + mon + '</tspan>') + '</text></g>';
      });
      box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><defs><linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#febd59" stop-opacity=".22"/><stop offset="1" stop-color="#febd59" stop-opacity="0"/></linearGradient></defs>' + ax + '<path class="growth__area" d="' + area + '"/><path class="growth__line" d="' + line + '"/>' + ms + '</svg>';
    }
    build();
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(build, 160); }, { passive: true });
    document.addEventListener('panelchange', build);
  }
  function initLabSlides() {
    var stage = document.querySelector('.labstage'); if (!stage) return;
    var slides = [].slice.call(stage.querySelectorAll('.slide')), tabs = [].slice.call(stage.querySelectorAll('.ltab')), url = document.getElementById('labSlideUrl');
    if (slides.length < 2) return;
    var i = 0, timer = null;
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); if (k === i) s.loading = 'eager'; });
      tabs.forEach(function (t, k) { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      if (url) url.textContent = 'grclab.purplecop.io/' + (slides[i].getAttribute('data-path') || '');
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() { stop(); if (!REDUCED) timer = setInterval(function () { go(i + 1); }, 4500); }
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); start(); }); });
    stage.addEventListener('mouseenter', stop); stage.addEventListener('mouseleave', start);
    var obs = io(function (es) { if (es[0].isIntersecting) start(); else stop(); }); if (obs) obs.observe(stage); else start();
  }
  function initJourney() {
    var rail = document.querySelector('.journey__rail'); if (!rail) return;
    var step = function () { return Math.max(220, rail.clientWidth * 0.8); };
    var prev = document.querySelector('.jbtn--prev'), next = document.querySelector('.journey__nav .jbtn:not(.jbtn--prev)');
    if (prev) prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { rail.scrollBy({ left: step(), behavior: 'smooth' }); });
    var down = false, startX = 0, startLeft = 0, moved = false;
    rail.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') return; down = true; moved = false; startX = e.clientX; startLeft = rail.scrollLeft; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - startX; if (Math.abs(dx) > 4 && !moved) { moved = true; rail.classList.add('is-dragging'); } if (moved) rail.scrollLeft = startLeft - dx; }, { passive: true });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; setTimeout(function () { rail.classList.remove('is-dragging'); }, 50); });
  }
  /* milestone videos preview muted while on screen; sound stays one tap away on the controls */
  function initVideoPreviews() {
    var vids = [].slice.call(document.querySelectorAll('video[data-preview]')); if (!vids.length) return;
    var conn = navigator.connection || {}; if (REDUCED || conn.saveData) return;
    vids.forEach(function (v) {
      var card = v.closest('.svid'); if (card && !card.querySelector('.svid__live')) { var b = el('span', 'svid__live'); b.appendChild(el('i')); b.appendChild(document.createTextNode('Preview')); card.appendChild(b); }
      v.addEventListener('playing', function () { if (card) card.classList.toggle('is-playing', v.muted); });
      v.addEventListener('pause', function () { if (card) card.classList.remove('is-playing'); });
    });
    var obs = io(function (es) {
      es.forEach(function (e) { var v = e.target; if (e.isIntersecting) { if (v.paused && v.muted) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } } else if (!v.paused && v.muted) v.pause(); });
    }, { threshold: 0.45 });
    if (obs) vids.forEach(function (v) { obs.observe(v); });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    safe('year', function () { document.getElementById('year').textContent = new Date().getFullYear(); });
    safe('expanders', initExpanders);
    safe('tabs', initTabs);
    safe('nav', initNav);
    safe('modules', initModules);
    safe('growth', initGrowth);
    safe('globe', initGlobe);
    safe('graph', initGraph);
    safe('field', initField);
    safe('labSlides', initLabSlides);
    safe('journey', initJourney);
    safe('videoPreviews', initVideoPreviews);
    safe('artPause', initArtPause);
    safe('marquee', initMarquee);
    safe('hero', initHero);
    safe('reveals', initReveals);
    safe('counts', initCounts);
  }
  var done = false, hydrated = false, DATA = null;
  function go() { if (done) return; done = true; if (DATA) { hydrated = true; safe('hydrate', function () { hydrate(DATA); }); } boot(); }
  // data that lands after the cut-off (slow phone, throttled network) is still drawn, just without entrance motion
  function late(d) { if (!d || hydrated) return; hydrated = true; safe('hydrate-late', function () { hydrate(d); }); }
  function got(d) { if (done) { late(d); return; } DATA = d; clearTimeout(timer); go(); }
  var timer = setTimeout(go, 1500);
  fetch('data/site.json?v=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(got)
    .catch(function () {
      if (!done) { clearTimeout(timer); go(); }
      var retry = function () { fetch('data/site.json?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(late).catch(function () {}); };
      if (document.readyState === 'complete') retry(); else window.addEventListener('load', retry);
    });
})();
