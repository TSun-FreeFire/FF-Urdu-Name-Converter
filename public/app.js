'use strict';
const FILLER = '\uFFA0';
const $ = (s) => document.querySelector(s);

const input = $('#nameInput');
const rawOutput = $('#rawOutput');
const countBadge = $('#countBadge');
const warningsEl = $('#warnings');
const breakdownEl = $('#breakdown');
const modeHint = $('#modeHint');

let mode = 'urdu';
let separator = 'filler';
let lastOutput = '';
let debounce = null;

const MODE_HINTS = {
  urdu: 'Original Urdu letters in their joined forms.',
  safe: 'Urdu-only letters swapped for plain Arabic ones — use this if any letter shows as a box in the game.',
};

function segmented(id, cb) {
  const el = $(id);
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    el.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    cb(btn.dataset.value);
  });
}
segmented('#modeSeg', (v) => { mode = v; modeHint.textContent = MODE_HINTS[v]; schedule(); });
segmented('#sepSeg', (v) => { separator = v; schedule(); });
input.addEventListener('input', schedule);

function schedule() {
  clearTimeout(debounce);
  debounce = setTimeout(convert, 140);
}

async function convert() {
  const text = input.value;
  try {
    const res = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode, separator }),
    });
    if (!res.ok) throw new Error('bad response');
    render(await res.json());
  } catch {
    rawOutput.textContent = 'Converter is unreachable — check your connection and reload.';
    rawOutput.classList.remove('empty');
  }
}

/* Draw the name the way FF does: strictly left-to-right, one glyph at a
   time, no right-to-left reordering and no re-shaping by the browser. */
function fillGamePreview(el, output, placeholder) {
  el.innerHTML = '';
  if (!output) {
    const span = document.createElement('span');
    span.className = 'placeholder';
    span.textContent = placeholder;
    el.appendChild(span);
    return;
  }
  for (const ch of output) {
    const span = document.createElement('span');
    span.className = 'glyph';
    if (ch === FILLER || ch === ' ') { span.classList.add('gap'); span.textContent = '\u00A0'; }
    else span.textContent = ch;
    el.appendChild(span);
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

  fillGamePreview($('#previewWide'), r.output, 'Your name here');
  fillGamePreview($('#previewPhone'), r.output, 'Your name');

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
    p.textContent = 'Start typing above — the breakdown will appear here.';
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
$('#stickyCopy').addEventListener('click', (e) => copyOutput(e.currentTarget));

convert();
