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
    safe('ledger', function () { ledger(d.contributions || [], d.counts); });
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
      var yt = d.youtube; if (!yt || !yt.top || !yt.top.length) return;      // older data has no ranking: keep the static tiles
      var box = document.getElementById('vids'); box.textContent = '';
      yt.top.slice(0, 6).forEach(function (v, k) {
        var a = el('a', 'vid'); a.href = 'https:\/\/www.youtube.com/watch?v=' + encodeURIComponent(v.id); a.setAttribute('data-reveal', '');
        var im = el('div', 'vid__img'), img = el('img'); img.src = 'https:\/\/i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/hqdefault.jpg'; img.alt = ''; img.loading = 'lazy'; img.width = 480; img.height = 360;
        im.appendChild(img); im.appendChild(el('span', 'vid__rank', (k < 9 ? '0' : '') + (k + 1)));
        var pl = el('span', 'vid__play'); pl.setAttribute('aria-hidden', 'true'); pl.appendChild(icon('play', 22)); im.appendChild(pl);
        var b = el('div', 'vid__b'); b.appendChild(el('div', 'vid__t', v.title));
        var dd = el('div', 'vid__d');
        if (typeof v.views === 'number') { var vv = el('span', 'vid__v'); vv.appendChild(el('b', null, fmt(v.views))); vv.appendChild(document.createTextNode(' views')); dd.appendChild(vv); }
        dd.appendChild(el('span', null, v.date)); b.appendChild(dd);
        a.appendChild(im); a.appendChild(b); box.appendChild(a);
      });
      box.appendChild(el('p', 'vids__src', 'Ranked by views among the channel’s ' + yt.feed_n + ' newest uploads · ' + yt.source + ' · as of ' + yt.as_of));
    });
    safe('updated', function () { if (d.updated) document.getElementById('updated').textContent = 'Page data updated ' + d.updated; });
  }

  /* contributions ledger: scoreboard + Latest / Accepted / In review views, grouped by project, newest first */
  function ledger(all, cnt) {
    var list = all.slice(); if (!list.length) return;
    var box = document.getElementById('ledger'); if (!box) return;
    // 'accepted' is decided once, by the builder (c.landed; COUNT DEFINITIONS in build_site_data.py). Older data has no flag.
    function isWon(c) { return typeof c.landed === 'boolean' ? c.landed : /merged|accepted/.test((c.status || '').toLowerCase()); }
    function isRecog(c) { return /recogn/.test((c.status || '').toLowerCase()); }
    // Newest first everywhere (John, 2026-11-14: a won-first default hid every new proposal, so the page looked stale).
    list.sort(function (a, b) { return (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) || (isWon(b) - isWon(a)); });
    var won = list.filter(isWon), open = list.filter(function (c) { return !isWon(c) && !isRecog(c); });   // in review = not accepted, not recognition
    var keys = {}; list.forEach(function (c) { keys[c.org + '/' + c.project] = 1; });
    var nProj = cnt && typeof cnt.projects === 'number' ? cnt.projects : Object.keys(keys).length;
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
    // modules tile: all 43 names, opened in place
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
    var G = typeof window.gsap !== 'undefined' && !REDUCED;
    function moveInd(list, tab, instant) {
      var ind = list.querySelector('.tabs__ind'); if (!ind || !tab.offsetWidth) return;
      var x = tab.offsetLeft, y = tab.offsetTop, w = tab.offsetWidth, h = tab.offsetHeight;
      if (G && !instant) gsap.to(ind, { x: x, y: y, width: w, height: h, duration: 0.55, ease: 'expo.out' });
      else { ind.style.transform = 'translate(' + x + 'px,' + y + 'px)'; ind.style.width = w + 'px'; ind.style.height = h + 'px'; if (G) gsap.set(ind, { x: x, y: y }); }
    }
    function activate(tab, focus, instant) {
      var list = tab.parentNode, dir = 1, prevIdx = -1, tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
      tabs.forEach(function (t, k) { if (t.classList.contains('is-on')) prevIdx = k; });
      dir = tabs.indexOf(tab) >= prevIdx ? 1 : -1;
      var shown = null;
      tabs.forEach(function (t) {
        var on = t === tab, p = document.getElementById(t.getAttribute('aria-controls'));
        t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
        if (p) { var was = p.hidden; p.hidden = !on; if (on && was) shown = p; }
      });
      moveInd(list, tab, instant);
      if (focus) tab.focus();
      if (shown && G && !instant) {
        gsap.fromTo(shown, { autoAlpha: 0, x: 26 * dir }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
        var kids = shown.querySelectorAll('.tile, .svid, .quote, .jm, .ach, .badge, .ledger__row, .ledger__group');
        if (kids.length) gsap.fromTo(kids, { y: 18 }, { y: 0, duration: 0.7, ease: 'expo.out', stagger: { each: 0.025, from: 'start' }, clearProps: 'transform' });
      }
      document.dispatchEvent(new CustomEvent('panelchange'));
      if (window.ScrollTrigger) requestAnimationFrame(function () { ScrollTrigger.refresh(); });
    }
    lists.forEach(function (list) {
      var ind = el('span', 'tabs__ind'); ind.setAttribute('aria-hidden', 'true'); list.insertBefore(ind, list.firstChild); list.classList.add('has-ind');
      var tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
      tabs.forEach(function (t, i) {
        var p = document.getElementById(t.getAttribute('aria-controls')); if (p) { p.tabIndex = -1; }
        t.addEventListener('click', function () { if (!t.classList.contains('is-on')) activate(t); });
        t.addEventListener('keydown', function (e) {
          var k = e.key, j = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : null;
          if (j === null) return; e.preventDefault(); activate(tabs[(j + tabs.length) % tabs.length], true);
        });
      });
      activate(list.querySelector('.is-on') || tabs[0], false, true);
    });
    root.classList.add('tabs-on');
    function settle() { lists.forEach(function (l) { var on = l.querySelector('.is-on'); if (on) moveInd(l, on, true); }); }
    window.addEventListener('resize', settle); if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
    function follow() {                      // a link to something inside a hidden panel opens that panel first
      var id = decodeURIComponent(location.hash.slice(1)); if (!id) return;
      var target = document.getElementById(id); if (!target) return;
      var panel = target.closest('[role="tabpanel"]');
      if (panel && panel.hidden) { var tab = document.querySelector('[aria-controls="' + panel.id + '"]'); if (tab) { activate(tab, false, true); target.scrollIntoView(); } }
    }
    window.addEventListener('hashchange', follow); follow();
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
      var t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
      var panel = t.closest('[role="tabpanel"]');
      if (panel && panel.hidden) { var tab = document.querySelector('[aria-controls="' + panel.id + '"]'); if (tab) activate(tab, false, true); }
    });
  }

  /* ---------------- nav: solid on scroll, hides going down, progress, active section ---------------- */
  function initNav() {
    var nav = document.getElementById('nav'), bar = document.getElementById('progress'), last = 0, tick = false;
    var links = [].slice.call(document.querySelectorAll('.nav__links a[href^="#"]')), box = document.querySelector('.nav__links');
    var ind = el('span', 'nav__ind'); ind.setAttribute('aria-hidden', 'true'); if (box) box.appendChild(ind);
    // chapter rail: a dot per section on the left edge, filled up to where you are
    var rail = el('nav', 'rail-x'); rail.setAttribute('aria-label', 'Chapters'); var fill = el('i', 'rail-x__fill'); rail.appendChild(fill);
    var dots = links.map(function (l) { var a = el('a'); a.href = l.getAttribute('href'); a.appendChild(el('span', null, '~/' + l.getAttribute('href').slice(1))); a.setAttribute('aria-label', l.textContent); rail.appendChild(a); return a; });
    document.body.appendChild(rail);
    var secs = links.map(function (l) { return document.querySelector(l.getAttribute('href')); });
    function setActive(k) {
      links.forEach(function (l, i) { l.classList.toggle('is-active', i === k); });
      dots.forEach(function (d, i) { d.classList.toggle('is-on', i === k); d.classList.toggle('is-past', k > -1 && i < k); });
      if (k < 0) { ind.style.opacity = 0; return; }
      var a = links[k]; ind.style.opacity = 1; ind.style.width = a.offsetWidth + 'px'; ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    }
    var cur = -2;
    function onScroll() {
      tick = false;
      var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight, mid = window.innerHeight * 0.45;
      nav.classList.toggle('is-solid', y > 24);
      nav.classList.toggle('is-hidden', y > last + 2 && y > 500);
      if (y < last - 2) nav.classList.remove('is-hidden');
      last = y; var p = h > 0 ? Math.min(1, y / h) : 0; bar.style.transform = 'scaleX(' + p + ')';
      document.body.classList.toggle('is-scrolled', y > 700);
      var k = -1; secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < mid) k = i; });
      if (k !== cur) { cur = k; setActive(k); }
      var a0 = secs[0] ? secs[0].offsetTop : 0, span = h - a0; fill.style.transform = 'scaleY(' + Math.max(0, Math.min(1, (y - a0 + mid) / (span + mid))) + ')';
    }
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();
    window.addEventListener('resize', function () { cur = -2; onScroll(); });
    var tt = document.getElementById('totop'); if (tt) tt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); });
  }

  /* ---------------- entrance: rows rise once; never the reading lists in #open ---------------- */
  function initReveals() {
    if (REDUCED) return;
    var G = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    root.classList.add('motion');
    function onEnter(nodes, fn, start) {          // once, on enter; a jump past the trigger also fires it
      [].slice.call(document.querySelectorAll(nodes)).forEach(function (n) {
        if (G) ScrollTrigger.create({ trigger: n, start: start || 'top 85%', once: true, onEnter: function () { fn(n); } });
        else { var o = io(function (es) { if (es[0].isIntersecting) { fn(n); o.disconnect(); } }, { rootMargin: '0px 0px -12% 0px' }); if (o) o.observe(n); else fn(n); }
      });
    }
    // drawn things (CSS transitions keyed on .is-drawn): story line, score bar, growth chart, course ring, missions, journey bars
    onEnter('.tl, .score, .tile--growth, .tile--course, .tile--missions, .journey', function (n) { n.classList.add('is-drawn'); }, 'top 80%');
    onEnter('.sec__head', function (n) { n.classList.add('is-in'); }, 'top 82%');
    document.addEventListener('panelchange', function () { document.querySelectorAll('[role=tabpanel]:not([hidden]) .tile--growth, [role=tabpanel]:not([hidden]) .tile--course, [role=tabpanel]:not([hidden]) .tile--missions, [role=tabpanel]:not([hidden]) .journey').forEach(function (n) { if (n.getBoundingClientRect().top < innerHeight) n.classList.add('is-drawn'); }); });
    if (!G) return;
    gsap.registerPlugin(ScrollTrigger);
    if (typeof window.SplitText !== 'undefined') {          // headings: words rise out of a mask
      gsap.utils.toArray('.sec h2, .h3xl, .panel__h').forEach(function (h) {
        var sp = SplitText.create(h, { type: 'words', mask: 'words' });
        gsap.from(sp.words, { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.035, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
      });
    }
    // rows of tiles rise in sequence (y + opacity, once). The reading lists in #open never take part.
    var els = gsap.utils.toArray('[data-reveal], .tile, .xwalk, .proof__i, .speak > *, .stories__vids > *, .quote, .badge, .mostw .vid, .lab__copy > *, .gms__copy > *, .gms__feed')
      .filter(function (n) { return !n.closest('#ledgerPanel') && !n.closest('.ledger') && !n.closest('.hero'); });
    els = els.filter(function (n, i) { return els.indexOf(n) === i && !els.some(function (m) { return m !== n && m.contains(n); }); });
    gsap.set(els, { autoAlpha: 0, y: 34 });
    var queue = [], qf = 0;                       // elements entering in the same frame rise as one staggered row
    function flush() { qf = 0;
      var above = queue.filter(function (n) { return n.getBoundingClientRect().bottom < 0; });   // jumped past: show at once, no queue
      if (above.length) { gsap.set(above, { clearProps: 'transform,opacity,visibility' }); queue = queue.filter(function (n) { return above.indexOf(n) < 0; }); }
      if (!queue.length) return;
      queue.sort(function (a, b) { var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return (ra.top - rb.top) || (ra.left - rb.left); });
      gsap.to(queue, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07, overwrite: true, clearProps: 'transform,opacity,visibility' }); queue = []; }
    els.forEach(function (n) { ScrollTrigger.create({ trigger: n, start: 'top 92%', once: true, onEnter: function () { queue.push(n); if (!qf) qf = requestAnimationFrame(flush); } }); });
    // achievement tiles: a quick cascade, transform only after the first frame (never dims while being read)
    ScrollTrigger.batch('#achWall .ach', { start: 'top 92%', once: true, interval: 0.02,
      onEnter: function (b) { b = b.filter(function (n) { return n.getBoundingClientRect().bottom > 0; }); if (!b.length) return; gsap.fromTo(b, { y: 26, scale: 0.97, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.7, ease: 'expo.out', stagger: 0.045, clearProps: 'transform,opacity,visibility' }); } });
    // pictures arrive with a clip wipe
    gsap.utils.toArray('.proj__main, .proj__strip > *, .win, .svid video, .vid__img').forEach(function (n) {
      gsap.fromTo(n, { clipPath: 'inset(0 0 100% 0 round 12px)' }, { clipPath: 'inset(0 0 0% 0 round 12px)', duration: 1.2, ease: 'expo.inOut', clearProps: 'clipPath',
        scrollTrigger: { trigger: n, start: 'top 88%', once: true } });
    });
    // the lab screens settle in with a slow scrubbed parallax; the hero portrait drifts as the hero hands over
    gsap.fromTo('.labstage', { y: 50, rotateX: 8, transformPerspective: 1200 }, { y: 0, rotateX: 0, ease: 'none', scrollTrigger: { trigger: '.lab__top', start: 'top bottom', end: 'top 25%', scrub: 0.6 } });
    gsap.to('.stage__me', { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 } });
    gsap.to('.hero__field', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    // failsafe: anything that never met its trigger (short viewport, print) is shown
    setTimeout(function () { els.forEach(function (n) { if (getComputedStyle(n).visibility === 'hidden' && n.getBoundingClientRect().top < innerHeight) gsap.to(n, { autoAlpha: 1, y: 0, duration: 0.4, clearProps: 'transform,opacity,visibility' }); }); }, 3000);
    window.addEventListener('beforeprint', function () { gsap.set(els, { clearProps: 'all' }); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
  /* cards: lift + glow + gentle 3D tilt + cursor spotlight, all from one pointer handler (fine pointers only) */
  function initTilt() {
    var cards = '.tile:not(.tile--modules), .prob, .quote, .jm, .vid, .svid, .badge, .xwalk';
    document.querySelectorAll(cards).forEach(function (c) { c.classList.add('fx'); });
    if (!HOVER) return;
    var hot = null, raf = 0, ev = null;
    function frame() {
      raf = 0; if (!ev) return;
      var c = ev.target.closest && ev.target.closest('.fx, .ach__in');
      if (hot && hot !== c) { hot.classList.remove('is-hot'); hot.style.setProperty('--rx', '0deg'); hot.style.setProperty('--ry', '0deg'); }
      hot = c; if (!c) return;
      var r = c.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
      c.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); c.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      if (c.classList.contains('fx') && !REDUCED) {
        var k = Math.min(1, 420 / r.width) * 5;
        c.classList.add('is-hot'); c.style.setProperty('--rx', ((0.5 - py) * k).toFixed(2) + 'deg'); c.style.setProperty('--ry', ((px - 0.5) * k).toFixed(2) + 'deg');
      }
    }
    document.addEventListener('pointermove', function (e) { ev = e; if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
    document.addEventListener('pointerleave', function () { ev = null; if (hot) { hot.classList.remove('is-hot'); hot = null; } });
  }
  /* primary buttons lean toward the pointer and spring back */
  function initMagnetic() {
    if (!HOVER || REDUCED || typeof window.gsap === 'undefined') return;
    document.querySelectorAll('.btn--primary').forEach(function (b) {
      var qx = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3.out' }), qy = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * 0.3); qy((e.clientY - r.top - r.height / 2) * 0.4); });
      b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }); });
    });
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
  function initField() {
    var cv = document.getElementById('field'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), run = true, last = 0;
    var mx = -999, my = -999, pts = [], pulses = [], spawn = 0, LINK = 150;
    function size() {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(110, Math.max(36, W * H / 15000))); LINK = W < 700 ? 110 : 150; pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, r: Math.random() < 0.12 ? 2.6 : 1.4, g: 0 });
    }
    function frame(t) {
      var dt = last ? Math.min(48, t - last) / 16.7 : 1; last = t;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i]; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
        var dx = mx - p.x, dy = my - p.y, d2 = dx * dx + dy * dy;
        if (d2 < 32000) { var f = (1 - d2 / 32000) * 0.012; p.x += dx * f * dt; p.y += dy * f * dt; p.g = Math.min(1, p.g + 0.08); }
        p.g *= 0.97;
      }
      ctx.lineWidth = 1;
      for (i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) {
        var a = pts[i], b = pts[j], ex = a.x - b.x, ey = a.y - b.y, dd = ex * ex + ey * ey;
        if (dd < LINK * LINK) {
          var al = (1 - Math.sqrt(dd) / LINK) * (0.16 + Math.max(a.g, b.g) * 0.5);
          ctx.strokeStyle = 'rgba(254,189,89,' + al.toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          if (spawn <= 0 && Math.random() < 0.002) { pulses.push({ a: a, b: b, t: 0 }); }
        }
      }
      spawn -= dt; if (spawn <= 0) spawn = 6;
      pulses = pulses.filter(function (q) { q.t += 0.012 * dt; if (q.t >= 1) { q.b.g = 1; return false; } var x = q.a.x + (q.b.x - q.a.x) * q.t, y = q.a.y + (q.b.y - q.a.y) * q.t;
        var gr = ctx.createRadialGradient(x, y, 0, x, y, 7); gr.addColorStop(0, 'rgba(254,189,89,.95)'); gr.addColorStop(1, 'rgba(254,189,89,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill(); return true; });
      if (pulses.length > 14) pulses.splice(0, pulses.length - 14);
      for (i = 0; i < pts.length; i++) { var q = pts[i]; ctx.fillStyle = q.g > 0.05 ? 'rgba(254,189,89,' + (0.45 + q.g * 0.55).toFixed(3) + ')' : 'rgba(169,179,190,.6)'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r + q.g * 1.6, 0, 6.283); ctx.fill(); }
      if (run) requestAnimationFrame(frame);
    }
    size(); var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); if (REDUCED) frame(0); }, 150); });
    if (REDUCED) { run = false; frame(0); return; }
    var hero = document.querySelector('.hero');
    hero.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive: true });
    hero.addEventListener('pointerleave', function () { mx = my = -999; });
    var obs = io(function (es) { var v = es[0].isIntersecting; if (v && !run) { run = true; last = 0; requestAnimationFrame(frame); } run = v; });
    if (obs) obs.observe(cv);
    requestAnimationFrame(frame);
  }
  function initGraph() {                   // crosswalk: one control, evidence pulses out to nine frameworks
    var cv = document.getElementById('graph'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var LABELS = ['ISO 27001', 'ISO/IEC 42001', 'SOC 2', 'NIST CSF 2.0', 'NIST AI RMF', 'EU AI Act', 'DPDP Act', 'PCI DSS', 'HIPAA'];
    var nodes = LABELS.map(function (l) { return { label: l, glow: 0, hits: 0 }; });
    var pulses = [], W = 0, H = 0, running = true, last = 0, spawn = 0.2, grow = REDUCED ? 1 : 0, growing = false;
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
      nodes.forEach(function (n, i) {                      // each link draws itself out, staggered top to bottom
        var g = Math.max(0, Math.min(1, grow * 1.6 - i * 0.07)); if (g <= 0) return;
        ctx.beginPath(); ctx.moveTo(L.ox, L.oy); for (var k = 1; k <= 28; k++) { var q = bez(L, i, g * k / 28); ctx.lineTo(q.x, q.y); }
        ctx.strokeStyle = a(AMBER, 0.2 + n.glow * 0.55); ctx.lineWidth = 1.2 + n.glow * 1.4; ctx.stroke();
      });
      pulses.forEach(function (q) { var p = bez(L, q.n, q.t), g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9); g.addColorStop(0, a(AMBER, 0.95)); g.addColorStop(1, a(AMBER, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill(); });
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      nodes.forEach(function (n, i) {
        var y = L.ty(i), x = L.tx; ctx.globalAlpha = Math.max(0, Math.min(1, (grow * 1.6 - i * 0.07 - 0.6) * 2.5));
        if (n.glow > 0.02) { ctx.beginPath(); ctx.arc(x, y, 7 + n.glow * 8, 0, Math.PI * 2); ctx.fillStyle = a(AMBER, 0.16 * n.glow); ctx.fill(); }
        ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fillStyle = n.hits ? a(AMBER, 1) : 'rgba(' + TEXT + ',.5)'; ctx.fill();
        ctx.font = '500 ' + L.fs + 'px ' + mono; ctx.fillStyle = 'rgba(' + TEXT + ',' + (0.6 + n.glow * 0.4) + ')'; ctx.fillText(n.label, x + 13, y);
        if (n.hits) { var w = ctx.measureText(n.label).width, kx = x + 13 + w + 9; ctx.beginPath(); ctx.moveTo(kx, y); ctx.lineTo(kx + 3.5, y + 3.5); ctx.lineTo(kx + 10, y - 4); ctx.strokeStyle = a(AMBER, 0.6 + n.glow * 0.4); ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineWidth = 1; }
      });
      ctx.globalAlpha = 1; rr(L.sx, L.sy, L.cw, L.ch, 12); ctx.fillStyle = 'rgba(21,34,49,.96)'; ctx.fill(); ctx.strokeStyle = a(AMBER, 0.55); ctx.lineWidth = 1.2; ctx.stroke(); ctx.lineWidth = 1;
      ctx.font = '600 ' + (L.fs - 1) + 'px ' + mono; ctx.fillStyle = a(AMBER, 1); ctx.fillText('1 CONTROL', L.sx + 14, L.sy + 22);
      ctx.font = '600 ' + (L.fs + 3) + 'px "Inter Tight", system-ui, sans-serif'; ctx.fillStyle = 'rgba(' + TEXT + ',1)'; ctx.fillText('Access review', L.sx + 14, L.sy + L.ch / 2 + 2);
      ctx.font = '400 ' + (L.fs - 1) + 'px ' + mono; ctx.fillStyle = 'rgba(' + TEXT + ',.55)'; ctx.fillText('1 evidence record', L.sx + 14, L.sy + L.ch - 20);
      ctx.beginPath(); ctx.arc(L.ox, L.oy, 4, 0, Math.PI * 2); ctx.fillStyle = a(AMBER, 1); ctx.fill();
    }
    function step(t) {
      if (!running) { last = 0; return; }
      var dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016; last = t;
      if (growing && grow < 1) grow = Math.min(1, grow + dt * 0.55);
      spawn -= dt; if (grow > 0.9 && spawn <= 0) { pulses.push({ n: Math.floor(Math.random() * nodes.length), t: 0 }); spawn = 0.32 + Math.random() * 0.28; }
      pulses = pulses.filter(function (q) { q.t += dt * 0.7; if (q.t >= 1) { nodes[q.n].glow = 1; nodes[q.n].hits++; return false; } return true; });
      nodes.forEach(function (n) { n.glow *= 0.955; });
      draw(); requestAnimationFrame(step);
    }
    size(); window.addEventListener('resize', function () { size(); draw(); });
    if (REDUCED) { nodes.forEach(function (n) { n.hits = 1; }); draw(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); return; }
    var obs = io(function (es) { var vis = es[0].isIntersecting; if (vis) growing = true; if (vis && !running) { running = true; requestAnimationFrame(step); } running = vis; }, { rootMargin: '0px 0px -15% 0px' });
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
    safe('missionIdx', function () { document.querySelectorAll('.mission').forEach(function (m, i) { m.style.setProperty('--i', i); }); });
    safe('marquee', initMarquee);
    safe('hero', initHero);
    safe('tilt', initTilt);
    safe('magnetic', initMagnetic);
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
