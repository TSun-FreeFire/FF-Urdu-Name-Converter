'use strict';
/* FF Urdu Name — converter UI.
   Talks to POST /api/convert with { text, mode: 'urdu', separator: 'filler' }
   and renders exactly what the API returns: output, charCount, limit,
   overLimit, words (letter-by-letter forms) and warnings.
   All user/API text is rendered with textContent — never as HTML. */

const $ = (s) => document.querySelector(s);

const input = $('#nameInput');
const outputText = $('#outputText');
const outputPlaceholder = $('#outputPlaceholder');
const copyBtn = $('#copyBtn');
const copyBtnLabel = $('#copyBtnLabel');
const selectBtn = $('#selectBtn');
const clearBtn = $('#clearBtn');
const copyNote = $('#copyNote');
const statusPill = $('#statusPill');
const counter = $('#counter');
const charCount = $('#charCount');
const charLimit = $('#charLimit');
const counterNote = $('#counterNote');
const warningsBox = $('#warnings');
const breakdownWrap = $('#breakdownWrap');
const breakdownBox = $('#breakdown');

let lastOutput = '';
let requestSeq = 0;
let debounceTimer = null;
let copyResetTimer = null;

const WARN_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
const ERR_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>';

function setStatus(state, label) {
  statusPill.dataset.state = state;
  statusPill.textContent = '';
  if (state === 'working') {
    const spin = document.createElement('span');
    spin.className = 'spinner';
    spin.setAttribute('aria-hidden', 'true');
    statusPill.appendChild(spin);
  }
  statusPill.appendChild(document.createTextNode(label));
}

function setCounter(count, limit, overLimit) {
  charCount.textContent = String(count);
  charLimit.textContent = String(limit);
  if (overLimit || count > limit) {
    counter.dataset.state = 'over';
    counterNote.textContent = 'over the Free Fire limit — shorten the name';
  } else if (count >= limit - 2 && count > 0) {
    counter.dataset.state = 'warn';
    counterNote.textContent = 'characters — almost at the limit';
  } else {
    counter.dataset.state = 'ok';
    counterNote.textContent = 'characters';
  }
}

function showAlert(kind, message) {
  const div = document.createElement('div');
  div.className = 'alert ' + (kind === 'error' ? 'alert-error' : 'alert-warn');
  div.setAttribute('role', 'alert');
  div.innerHTML = kind === 'error' ? ERR_ICON : WARN_ICON; // static icon only
  const span = document.createElement('span');
  span.textContent = message;
  div.appendChild(span);
  warningsBox.appendChild(div);
}

function renderBreakdown(words) {
  breakdownBox.textContent = '';
  if (!words || !words.length) { breakdownWrap.hidden = true; return; }
  words.forEach((word, i) => {
    const group = document.createElement('div');
    group.className = 'word-group';

    const head = document.createElement('div');
    head.className = 'word-head';
    const label = document.createElement('span');
    label.className = 'w-label';
    label.textContent = 'Word ' + (i + 1);
    const orig = document.createElement('span');
    orig.className = 'w-original';
    orig.setAttribute('lang', 'ur');
    orig.textContent = word.input || '';
    head.append(label, orig);
    group.appendChild(head);

    const chips = document.createElement('div');
    chips.className = 'letter-chips';
    (word.letters || []).forEach((letter) => {
      const chip = document.createElement('span');
      chip.className = 'letter-chip';
      const lo = document.createElement('span');
      lo.className = 'l-original';
      lo.setAttribute('lang', 'ur');
      lo.textContent = letter.input || '';
      const arrow = document.createElement('span');
      arrow.className = 'l-arrow';
      arrow.textContent = '→';
      const lc = document.createElement('span');
      lc.className = 'l-converted';
      lc.setAttribute('lang', 'ur');
      lc.textContent = letter.output || '';
      const badge = document.createElement('span');
      badge.className = 'form-badge form-' + (letter.form || 'isolated');
      badge.textContent = letter.form || '';
      chip.append(lo, arrow, lc, badge);
      chips.appendChild(chip);
    });
    group.appendChild(chips);
    breakdownBox.appendChild(group);
  });
  breakdownWrap.hidden = false;
}

function resetResults() {
  lastOutput = '';
  outputText.textContent = '';
  outputPlaceholder.style.display = '';
  copyBtn.disabled = true;
  selectBtn.disabled = true;
  copyNote.textContent = '';
  warningsBox.textContent = '';
  breakdownBox.textContent = '';
  breakdownWrap.hidden = true;
  setCounter(0, Number(charLimit.textContent) || 12, false);
  setStatus('ready', 'Ready');
}

async function convert() {
  const text = input.value;
  const seq = ++requestSeq;

  if (!text.trim()) { resetResults(); return; }

  setStatus('working', 'Converting');
  try {
    const res = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode: 'urdu', separator: 'filler' }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (seq !== requestSeq) return; // a newer input already won

    lastOutput = data.output || '';
    outputText.textContent = lastOutput;
    outputPlaceholder.style.display = lastOutput ? 'none' : '';
    copyBtn.disabled = !lastOutput;
    selectBtn.disabled = !lastOutput;
    setCounter(data.charCount ?? [...lastOutput].length, data.limit ?? 12, !!data.overLimit);
    setStatus('done', 'Converted');

    warningsBox.textContent = '';
    (data.warnings || []).forEach((w) => showAlert('warn', w));
    renderBreakdown(data.words);
  } catch (err) {
    if (seq !== requestSeq) return;
    setStatus('error', 'Error');
    warningsBox.textContent = '';
    showAlert('error', 'Could not reach the converter. Check your connection and try again.');
  }
}

function scheduleConvert() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(convert, 250);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

copyBtn.addEventListener('click', async () => {
  if (!lastOutput) return;
  try {
    await copyText(lastOutput);
    copyBtnLabel.textContent = 'Copied Successfully';
    copyNote.textContent = 'Copied — now paste it as your nickname in Free Fire.';
    clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copyBtnLabel.textContent = 'Copy Nickname';
    }, 1800);
  } catch (err) {
    copyNote.textContent = 'Copy failed — use Select All and copy manually.';
  }
});

selectBtn.addEventListener('click', () => {
  if (!lastOutput) return;
  const range = document.createRange();
  range.selectNodeContents(outputText);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  copyNote.textContent = 'Selected — press Copy Nickname or Ctrl+C.';
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  requestSeq++; // ignore any in-flight response
  resetResults();
  input.focus();
});

input.addEventListener('input', scheduleConvert);
input.addEventListener('paste', () => setTimeout(convert, 0));

/* ── Mobile navigation ─────────────────────────────────── */
const header = $('#siteHeader');
const navToggle = $('#navToggle');
navToggle.addEventListener('click', () => {
  const open = header.classList.toggle('menu-open');
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
document.querySelectorAll('.nav-links a').forEach((a) => {
  a.addEventListener('click', () => {
    header.classList.remove('menu-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

/* ── API section copy buttons ──────────────────────────── */
document.querySelectorAll('.copy-code').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const target = document.getElementById(btn.dataset.copyTarget);
    if (!target) return;
    try {
      await copyText(target.textContent);
      const old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = old; }, 1500);
    } catch (err) { /* clipboard unavailable — text stays selectable */ }
  });
});

resetResults();
