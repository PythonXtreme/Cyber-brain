/* script.js: vanilla JS. Sections: 1 Nav/progress · 2 Menu · 3 Hero network · 4 Reveals
   5 Skill bars + count-up · 6 Active link · 7 Micro-interactions · 8 Form · 9 Misc */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Weak-device check: little RAM, few cores or data-saver on -> lower frame rate, fewer dots and strips
  const LOW = (navigator.deviceMemory || 4) <= 2 || (navigator.hardwareConcurrency || 4) <= 2 || !!(navigator.connection && navigator.connection.saveData);
  const FPS = LOW ? 12 : 20; // redraw cap for every canvas / pulse loop below

  /* 1. NAV STATE + SCROLL PROGRESS */
  const header = $('.site-header'), bar = $('.progress'), hero = $('.hero');
  const onScroll = () => {
    header.classList.toggle('scrolled', scrollY > 40);
    hero.style.setProperty('--hs', Math.min(scrollY / (innerHeight * .8), 1).toFixed(3)); // 0 at top -> 1 once the hero is mostly gone
    bar.style.width = (scrollY / (document.documentElement.scrollHeight - innerHeight) * 100) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* 2. MOBILE MENU */
  const toggle = $('.nav-toggle'), links = $('.nav-links');
  const setMenu = (o) => { toggle.setAttribute('aria-expanded', o); links.classList.toggle('open', o); };
  toggle.onclick = () => setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  links.onclick = (e) => e.target.closest('a') && setMenu(false);
  addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  /* 3. HERO: headline word split + pointer parallax */
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); parent.appendChild(el); return el; };

  const h1 = $('#hero-title'), title = h1.textContent.trim(); // words rise in one by one (CSS .w); aria-label keeps it readable
  h1.setAttribute('aria-label', title);
  h1.innerHTML = title.split(/\s+/).map((w, n) => `<span class="w" aria-hidden="true" style="--n:${n}">${w}</span>`).join(' ');

  const brain = $('#brain');
  const overBrain = (e) => { const r = brain.getBoundingClientRect(); return e.clientX > r.left + r.width * .1 && e.clientX < r.right - r.width * .1 && e.clientY > r.top + r.height * .1 && e.clientY < r.bottom - r.height * .1; };
  if (!reduced && matchMedia('(pointer: fine)').matches) { // pointer nudges the brain; hovering it brightens the halo (mouse only)
    let f = 0, nx = 0, ny = 0;
    const set = () => { hero.style.setProperty('--px', nx.toFixed(3)); hero.style.setProperty('--py', ny.toFixed(3)); f = 0; };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect(); nx = (e.clientX - r.left) / r.width * 2 - 1; ny = (e.clientY - r.top) / r.height * 2 - 1;
      brain.classList.toggle('hot', overBrain(e)); f = f || requestAnimationFrame(set);
    });
    hero.addEventListener('pointerleave', () => { nx = ny = 0; set(); brain.classList.remove('hot'); });
  }

  /* 3b. PROJECT SCENES: scatter dots and calculator keys are generated here (edit the data to restyle) */
  const dots = $('#dots'), keys = $('#keys');
  [[38,126],[50,124],[60,108],[70,88],[78,110],[88,98],[96,104],[104,82],[112,96],[120,90],[128,70],[138,84],[148,74],[156,62],[166,72],[176,54],[186,66],[196,58],[204,50],[214,44]]
    .forEach(([x, y], k) => mk('circle', { cx: x, cy: y, r: 2.8, style: `--k:${k}` }, dots));
  '789÷456×123−0.='.split('').forEach((ch, i) => { // 4-column keypad; "=" is double width
    const eq = ch === '=', x = 22 + (i % 4) * 23, y = 54 + Math.floor(i / 4) * 24, w = eq ? 42 : 19;
    mk('rect', { class: 'key' + (eq ? ' eq' : ''), x, y, width: w, height: 20, rx: 5 }, keys);
    mk('text', { x: x + w / 2, y: y + 13.5, 'text-anchor': 'middle' }, keys).textContent = ch;
  });

  /* 3c. PULSE FLOW (hero + circuit background): evenly spaced pulses move along SVG paths at a constant speed,
     independent of scrolling. FPS caps redraws for weak devices; SPEED = SVG units/second; period = dash pattern total in CSS. */
  const SPEED = 60;
  const startFlow = (el, selector, period) => {
    if (reduced) return;
    const flows = $$(selector, el).flatMap((p) => { const g = p.cloneNode(); g.classList.add('g'); p.before(g); return [p, g]; }); // glow twin (no SVG filter)
    let live = false, running = false, last = 0;
    const loop = (t) => {
      if (!live) { running = false; return; }
      if (t - last >= 1000 / FPS) {
        last = t; const off = (t * SPEED / 1000) % period;
        flows.forEach((p) => { p.style.strokeDashoffset = (-off * p.dataset.s).toFixed(1); }); // data-s = +1 / -1 (direction only)
      }
      requestAnimationFrame(loop);
    };
    new IntersectionObserver(([en]) => { live = en.isIntersecting; if (live && !running) { running = true; requestAnimationFrame(loop); } }).observe(el); // only while on screen
  };
  startFlow($('.circuit-zone'), '.flow path', 240);

  /* 3d. BRAIN: every few seconds the brain beats. A ring of light races out through its circuitry (CSS, masked to the circuit lines),
     and as it reaches each edge node a pulse of electricity runs out along that node's cable to the screen edge (JS, capped at FPS).
     Between beats nothing runs, so idle cost is zero. Click the brain for an instant beat.
     Tweak: GAP (rest between beats, ms), PSPEED (pulse speed, units/s), PL (pulse length), the anchors list (points on the brain outline, in 447px image units). */
  $('.brain-img').src = HERO.brain;
  const fx = $('.brain-fx'); fx.style.webkitMaskImage = fx.style.maskImage = `url(${HERO.mask})`;
  const cab = $('#cables'), C = 223, PL = 22, PSPEED = 600, RING = 156, GAP = () => 3000 + Math.random() * 2500; // RING = ring speed in units/s (matches the 1.9s CSS ring)
  let seed = 5; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  // Anchor points on the brain's outline (image units, 447px square). Each cable leaves the brain from one of these.
  const anchors = {"L": [[104, 110], [97, 140], [82, 175], [75, 215], [73, 255], [80, 290], [97, 325], [125, 355]], "R": [[335, 110], [345, 140], [359, 175], [368, 215], [370, 255], [360, 290], [352, 325], [330, 355]], "T": [[130, 85], [170, 65], [275, 61], [315, 88]], "B": [[140, 366], [175, 387], [265, 391], [300, 374]]};
  const items = []; let k = 0;
  const cable = (x, y, d) => { // d = path from the anchor out to far away
    const wire = mk('path', { class: 'cw', d, pathLength: 1, style: `--k:${k++}` }, cab);
    const p = mk('path', { class: 'cp', d }, cab), g = mk('path', { class: 'cp g', d }, cab), len = p.getTotalLength();
    p.style.strokeDasharray = g.style.strokeDasharray = `${PL} ${len + PL}`;
    items.push({ els: [p, g], len, delay: Math.hypot(x - C, y - C) / RING + rnd() * 0.1, dur: len / PSPEED });
  };
  const pick = (arr) => LOW ? arr.filter((_, i) => i % 2 === 0) : arr; // fewer cables on weak devices
  pick(anchors.L).forEach(([x, y]) => { const s = y < C ? -1 : 1, a = 20 + rnd() * 50, d = 15 + rnd() * 35; cable(x, y, `M${x} ${y}H${x - a}l${-d} ${s * d}H-1400`); });
  pick(anchors.R).forEach(([x, y]) => { const s = y < C ? -1 : 1, a = 20 + rnd() * 50, d = 15 + rnd() * 35; cable(x, y, `M${x} ${y}H${x + a}l${d} ${s * d}H1850`); });
  pick(anchors.T).forEach(([x, y]) => { const s = x < C ? -1 : 1, a = 20 + rnd() * 40, d = 15 + rnd() * 30; cable(x, y, `M${x} ${y}V${y - a}l${s * d} ${-d}V-900`); });
  pick(anchors.B).forEach(([x, y]) => { const s = x < C ? -1 : 1, a = 20 + rnd() * 40, d = 15 + rnd() * 30; cable(x, y, `M${x} ${y}V${y + a}l${s * d} ${d}V1350`); });
  let timer = 0, beating = false, onScreen = false;
  const schedule = (ms) => { clearTimeout(timer); if (!reduced && onScreen) timer = setTimeout(beat, ms); };
  const endBeat = () => { beating = false; brain.classList.remove('beat'); schedule(GAP()); };
  const beat = () => {
    if (beating) return; beating = true; clearTimeout(timer);
    brain.classList.remove('beat'); void brain.offsetWidth; brain.classList.add('beat'); // restart the CSS animations
    const t0 = performance.now(), total = Math.max(...items.map((c) => c.delay + c.dur)) + 0.2; let last = 0;
    const step = (now) => {
      const el = (now - t0) / 1000;
      if (now - last >= 1000 / FPS) { // pulse = dash sliding along the cable; hidden until the ring reaches its node
        last = now;
        items.forEach((c) => { const pr = (el - c.delay) / c.dur, on = pr > 0 && pr < 1, off = (PL - pr * (c.len + PL)).toFixed(1);
          c.els.forEach((p) => { p.style.opacity = on ? 1 : 0; if (on) p.style.strokeDashoffset = off; }); });
      }
      el < total ? requestAnimationFrame(step) : endBeat();
    };
    requestAnimationFrame(step);
  };
  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) { if (!beating) schedule(900); } else clearTimeout(timer); }).observe(hero);
  hero.addEventListener('pointerdown', (e) => { if (!reduced && !e.target.closest('a, button') && overBrain(e)) beat(); }); // click the brain = instant beat

  /* 4. SCROLL REVEALS: fire once at 12% visible */
  const io = new IntersectionObserver((es, o) => es.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('visible'); o.unobserve(en.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* 5. SKILL BARS: fill to data-level and count the % up */
  const bio = new IntersectionObserver((es, o) => es.forEach((en) => {
    if (!en.isIntersecting) return;
    const f = en.target, n = $('[data-count]', f.closest('.skill')), to = +f.dataset.level, t0 = performance.now();
    f.style.width = to + '%'; o.unobserve(f);
    const tick = (t) => { const p = Math.min((t - t0) / 1300, 1); n.textContent = Math.round(to * p) + '%'; p < 1 && requestAnimationFrame(tick); };
    reduced ? (n.textContent = to + '%') : requestAnimationFrame(tick);
  }), { threshold: .5 });
  $$('.fill').forEach((f) => bio.observe(f));

  /* 6. ACTIVE NAV LINK */
  const navA = $$('a', links);
  const sio = new IntersectionObserver((es) => es.forEach((en) => en.isIntersecting &&
    navA.forEach((a) => a.classList.toggle('active', a.hash === '#' + en.target.id))), { rootMargin: '-45% 0px -50% 0px' });
  navA.forEach((a) => { const t = $(a.hash); t && sio.observe(t); });

  /* 7. MICRO-INTERACTIONS */
  $$('.glass').forEach((el) => el.addEventListener('pointermove', (e) => { // cursor spotlight
    const r = el.getBoundingClientRect(); el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px');
  }));
  $$('.btn').forEach((b) => {
    if (!reduced) { // magnetic pull
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect();
        b.style.setProperty('--tx', (e.clientX - r.left - r.width / 2) * .18 + 'px'); b.style.setProperty('--ty', (e.clientY - r.top - r.height / 2) * .25 + 'px'); });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
    }
    b.addEventListener('click', (e) => { // click ripple
      const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement('span');
      s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(s); setTimeout(() => s.remove(), 600);
    });
  });
  const toast = $('.toast'); let tt;
  const say = (m) => { toast.textContent = m; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 1800); };
  $$('[data-copy]').forEach((b) => b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => {
    const chip = $('.chip', b); b.classList.add('done'); chip.textContent = 'Copied'; say(b.dataset.label + ' copied'); // chip confirms + toast
    setTimeout(() => { b.classList.remove('done'); chip.textContent = 'Copy'; }, 1600);
  }, () => say('Copy failed')));
  const mark = $('.mark'); // logo mark: spin once per click
  $('.logo').addEventListener('click', () => { mark.classList.remove('spin'); void mark.offsetWidth; mark.classList.add('spin'); });

  /* 8. CONTACT FORM: validate on blur/submit, plane animation on success.
     Swap the simulated send for fetch('YOUR_ENDPOINT', {method:'POST', body:new FormData(form)}). */
  const form = $('#form'), status = $('.status', form), send = $('.send', form);
  const rules = {
    name: (v) => v.trim().length >= 2 || 'Enter your name.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Enter a valid email address.',
    message: (v) => v.trim().length >= 10 || 'Write at least 10 characters.'
  };
  const check = (f) => { const r = rules[f.name](f.value); $(`.error[data-for="${f.name}"]`, form).textContent = r === true ? '' : r; f.setAttribute('aria-invalid', r !== true); return r === true; };
  $$('input,textarea', form).forEach((f) => f.addEventListener('blur', () => check(f)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (![...$$('input,textarea', form)].map(check).every(Boolean)) { status.textContent = 'Fix the highlighted fields and try again.'; return; }
    send.classList.add('sent'); status.textContent = 'Message sent. I’ll reply soon.'; form.reset();
    setTimeout(() => send.classList.remove('sent'), 1600);
  });

  /* 9. FOOTER YEAR */
  $('#year').textContent = new Date().getFullYear();
})();
