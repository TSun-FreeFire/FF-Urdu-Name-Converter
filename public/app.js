'use strict';
/* ── ASCII hero field ─────────────────────────────────────────────
   Per the ascii-animation skill: <pre> + textContent, frame(time)
   with injected time, throttled to a deliberate retro 18 fps,
   ?t=N renders one deterministic frame, prefers-reduced-motion
   gets a single static frame, and the loop pauses off-screen.   */
(function initAscii() {
  const pre = document.getElementById('asciiField');
  const hero = pre.parentElement;
  if (!pre || typeof AsciiField === 'undefined') return;

  const measure = document.createElement('canvas').getContext('2d');
  measure.font = '11px "JetBrains Mono", monospace';
  const charWidth = Math.max(5, measure.measureText('M').width || 6.7);

  let grid = { cols: 0, rows: 0 };
  function resize() {
    const r = hero.getBoundingClientRect();
    grid = AsciiField.gridFor(r.width, r.height, charWidth);
  }
  resize();
  let resizeTimer = null;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); draw(lastT); }, 200);
  });

  let lastT = 0;
  function draw(t) {
    lastT = t;
    if (grid.cols) pre.textContent = AsciiField.frame(grid.cols, grid.rows, t);
  }

  const seek = new URLSearchParams(location.search).get('t');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (seek !== null) {                       // seek harness: one frozen frame
    draw(parseFloat(seek));
    window.__ready = true;
    return;
  }
  if (reduced) {                             // reduced motion: static frame
    draw(1400);
    window.__ready = true;
    return;
  }

  const FRAME_MS = 1000 / 18;                // deliberate retro throttle
  let raf = null, lastDraw = 0, visible = true, onScreen = true;

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!visible || !onScreen) return;
    if (now - lastDraw < FRAME_MS) return;
    lastDraw = now;
    draw(now);
  }
  function start() { if (raf === null) raf = requestAnimationFrame(loop); }
  function stop() { if (raf !== null) cancelAnimationFrame(raf); raf = null; }

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) { lastDraw = 0; start(); }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  }
  draw(0);
  start();
  window.__ready = true;
})();

/* ── Converter ──────────────────────────────────────────────────── */
(function initConverter() {
  // Fixed by design: original Urdu letters in their joined forms,
  // words always joined with the hidden FF space.
  const MODE = 'urdu';
  const SEPARATOR = 'filler';
  const $ = (s) => document.querySelector(s);

  const input = $('#nameInput');
  const rawOutput = $('#rawOutput');
  const countBadge = $('#countBadge');
  const warningsEl = $('#warnings');
  const breakdownEl = $('#breakdown');
  const statusEl = $('#consoleStatus');

  let lastOutput = '';
  let debounce = null;
  let spinner = null;

  const SPINNER = ['|', '/', '—', '\\'];
  function setBusy(busy) {
    if (busy) {
      statusEl.textContent = 'WORKING ';
      statusEl.classList.add('busy');
      let i = 0;
      const spinEl = document.createElement('span');
      statusEl.appendChild(spinEl);
      spinEl.textContent = SPINNER[0];
      spinner = setInterval(() => { spinEl.textContent = SPINNER[++i % SPINNER.length]; }, 100);
    } else {
      clearInterval(spinner);
      spinner = null;
      statusEl.textContent = 'READY';
      statusEl.classList.remove('busy');
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(convert, 140);
  });

  async function convert() {
    setBusy(true);
    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.value, mode: MODE, separator: SEPARATOR }),
      });
      if (!res.ok) throw new Error('bad response');
      render(await res.json());
    } catch {
      rawOutput.textContent = 'Converter is unreachable — check your connection and reload.';
      rawOutput.classList.remove('empty');
    } finally {
      setBusy(false);
    }
  }

  function render(r) {
    lastOutput = r.output;
    if (r.output) {
      rawOutput.textContent = r.output;
      rawOutput.classList.remove('empty');
    } else {
      rawOutput.textContent = 'Your converted name will appear here';
      rawOutput.classList.add('empty');
    }

    countBadge.textContent = `${r.charCount} / ${r.limit}`;
    countBadge.className = 'count-badge ' + (r.overLimit ? 'over' : 'ok');

    warningsEl.innerHTML = '';
    for (const w of r.warnings) {
      const li = document.createElement('li');
      li.textContent = '⚠️ ' + w;
      warningsEl.appendChild(li);
    }

    breakdownEl.innerHTML = '';
    if (!r.words.length) {
      const p = document.createElement('p');
      p.className = 'empty-note';
      p.textContent = 'Start typing above — each letter and the form it takes will be listed here.';
      breakdownEl.appendChild(p);
      return;
    }
    for (const word of r.words) {
      const row = document.createElement('div');
      row.className = 'word-row';
      const inw = document.createElement('span');
      inw.className = 'word-in';
      inw.setAttribute('dir', 'rtl');
      inw.textContent = word.input;
      const arrow = document.createElement('span');
      arrow.className = 'word-arrow';
      arrow.textContent = '→';
      const out = document.createElement('code');
      out.className = 'word-out';
      out.textContent = word.output;
      row.append(inw, arrow, out);

      const chips = document.createElement('div');
      chips.className = 'letter-chips';
      for (const l of word.letters) {
        const c = document.createElement('span');
        c.className = 'lchip';
        const dot = document.createElement('i');
        dot.className = 'dot ' + (l.form === 'kept' ? 'isolated' : l.form);
        const b = document.createElement('b');
        b.textContent = l.input;
        const label = document.createElement('span');
        label.textContent = l.form === 'kept' ? 'kept as-is' : l.form;
        c.append(dot, b, label);
        chips.appendChild(c);
      }
      row.appendChild(chips);
      breakdownEl.appendChild(row);
    }
  }

  async function copyOutput(btn) {
    if (!lastOutput) { input.focus(); return; }
    const label = btn.textContent;
    try {
      await navigator.clipboard.writeText(lastOutput);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = lastOutput;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = label; }, 1600);
  }
  $('#copyBtn').addEventListener('click', (e) => copyOutput(e.currentTarget));

  convert();
})();
