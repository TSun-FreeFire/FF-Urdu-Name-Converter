'use strict';
/* FF Urdu Name — converter UI (minimal).
   POST /api/convert { text, mode: 'urdu', separator: 'filler' } →
   { output, charCount, limit, overLimit, words, warnings }.
   Everything user/API-provided is rendered with textContent.

   Two input rules, enforced live:
   1. Gaps — any space the user types or pastes is replaced in the box
      itself with the hidden FF gap, U+FFA0.
   2. Limit — a name whose converted form would exceed the API limit
      (12) is refused: the box snaps back to the last name that fit. */

const $ = (s) => document.querySelector(s);
const FILLER = '\uFFA0';

const input = $('#nameInput');
const outputText = $('#outputText');
const outputPlaceholder = $('#outputPlaceholder');
const copyBtn = $('#copyBtn');
const selectBtn = $('#selectBtn');
const clearBtn = $('#clearBtn');
const copyNote = $('#copyNote');
const status = $('#status');
const counter = $('#counter');
const charCount = $('#charCount');
const charLimit = $('#charLimit');
const counterNote = $('#counterNote');
const warningsBox = $('#warnings');
const breakdownWrap = $('#breakdownWrap');
const breakdownBox = $('#breakdown');

let lastOutput = '';
let lastGood = null; // { value, data } — most recent input whose conversion fits
let requestSeq = 0;
let debounceTimer = null;
let copyResetTimer = null;

function setCounter(count, limit, overLimit) {
  charCount.textContent = String(count);
  charLimit.textContent = String(limit);
  if (overLimit || count > limit) {
    counter.dataset.state = 'over';
    counterNote.textContent = 'Over the Free Fire limit — shorten the name.';
  } else if (count > 0 && count >= limit - 2) {
    counter.dataset.state = 'warn';
    counterNote.textContent = 'Almost at the limit.';
  } else {
    counter.dataset.state = 'ok';
    counterNote.textContent = '';
  }
}

function showAlert(label, message) {
  const div = document.createElement('div');
  div.className = 'alert';
  div.setAttribute('role', 'alert');
  const strong = document.createElement('strong');
  strong.textContent = label + ' — ';
  div.appendChild(strong);
  div.appendChild(document.createTextNode(message));
  warningsBox.appendChild(div);
}

function renderBreakdown(words) {
  breakdownBox.textContent = '';
  if (!words || !words.length) { breakdownWrap.hidden = true; return; }
  words.forEach((word, i) => {
    const block = document.createElement('div');
    block.className = 'word-block';
    const title = document.createElement('div');
    title.className = 'word-title';
    title.appendChild(document.createTextNode('Word ' + (i + 1)));
    const w = document.createElement('span');
    w.className = 'w';
    w.setAttribute('lang', 'ur');
    w.textContent = word.input || '';
    title.appendChild(w);
    block.appendChild(title);

    (word.letters || []).forEach((letter) => {
      const row = document.createElement('div');
      row.className = 'letter-row';
      const from = document.createElement('span');
      from.className = 'from';
      from.setAttribute('lang', 'ur');
      from.textContent = letter.input || '';
      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '→';
      const to = document.createElement('span');
      to.className = 'to';
      to.setAttribute('lang', 'ur');
      to.textContent = letter.output || '';
      const form = document.createElement('span');
      form.className = 'form';
      form.textContent = letter.form || '';
      row.append(from, arrow, to, form);
      block.appendChild(row);
    });
    breakdownBox.appendChild(block);
  });
  breakdownWrap.hidden = false;
}

function renderData(data) {
  lastOutput = data.output || '';
  outputText.textContent = lastOutput;
  outputPlaceholder.style.display = lastOutput ? 'none' : '';
  copyBtn.disabled = !lastOutput;
  selectBtn.disabled = !lastOutput;
  setCounter(data.charCount ?? [...lastOutput].length, data.limit ?? 12, !!data.overLimit);
  warningsBox.textContent = '';
  (data.warnings || []).forEach((w) => showAlert('Warning', w));
  renderBreakdown(data.words);
}

function resetResults() {
  lastOutput = '';
  lastGood = null;
  outputText.textContent = '';
  outputPlaceholder.style.display = '';
  copyBtn.disabled = true;
  selectBtn.disabled = true;
  copyBtn.textContent = 'Copy nickname';
  copyNote.textContent = '';
  warningsBox.textContent = '';
  breakdownBox.textContent = '';
  breakdownWrap.hidden = true;
  setCounter(0, Number(charLimit.textContent) || 12, false);
  status.textContent = 'Ready';
}

async function convert() {
  const text = input.value;
  const seq = ++requestSeq;
  if (!text.trim()) { resetResults(); return; }

  status.textContent = 'Converting…';
  try {
    const res = await fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode: 'urdu', separator: 'filler' }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (seq !== requestSeq) return; // newer input already won

    if (data.overLimit || data.charCount > data.limit) {
      // Hard limit: refuse the extra characters — snap the box back to
      // the last name that fit and explain, once, in the counter note.
      const good = lastGood;
      input.value = good ? good.value : '';
      if (good) renderData(good.data); else resetResults();
      counter.dataset.state = 'over';
      counterNote.textContent = 'Maximum ' + data.limit + ' characters — extra letters were not added.';
      status.textContent = good ? 'Converted' : 'Ready';
      return;
    }

    lastGood = { value: text, data };
    renderData(data);
    status.textContent = 'Converted';
  } catch (err) {
    if (seq !== requestSeq) return;
    status.textContent = 'Error';
    warningsBox.textContent = '';
    showAlert('Error', 'Could not reach the converter. Check your connection and try again.');
  }
}

/* Replace typed/pasted spaces with the hidden FF gap, in the box
   itself. One-for-one character swap, so the caret never jumps. */
function hiddenGaps() {
  const v = input.value;
  if (!/[ \t\n\r\u00A0]/.test(v)) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = v.replace(/[ \t\n\r\u00A0]/g, FILLER);
  try { input.setSelectionRange(start, end); } catch (e) { /* not focused */ }
}

input.addEventListener('input', () => {
  hiddenGaps();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(convert, 250);
});
input.addEventListener('paste', () => setTimeout(() => { hiddenGaps(); convert(); }, 0));

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
    copyBtn.textContent = 'Copied';
    copyNote.textContent = 'Now paste it as your nickname in Free Fire.';
    clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => { copyBtn.textContent = 'Copy nickname'; }, 1800);
  } catch (err) {
    copyNote.textContent = 'Copy failed — use Select all and copy manually.';
  }
});

selectBtn.addEventListener('click', () => {
  if (!lastOutput) return;
  const range = document.createRange();
  range.selectNodeContents(outputText);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  copyNote.textContent = 'Selected — press Copy nickname or Ctrl+C.';
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  requestSeq++;
  resetResults();
  input.focus();
});

resetResults();
