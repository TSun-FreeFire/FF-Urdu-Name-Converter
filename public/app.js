'use strict';
/* FF Urdu Name — converter UI (minimal).
   POST /api/convert { text, mode: 'urdu', separator: 'filler' } →
   { output, charCount, limit, overLimit, words, warnings }.
   Everything user/API-provided is rendered with textContent. */

const $ = (s) => document.querySelector(s);

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

function resetResults() {
  lastOutput = '';
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

    lastOutput = data.output || '';
    outputText.textContent = lastOutput;
    outputPlaceholder.style.display = lastOutput ? 'none' : '';
    copyBtn.disabled = !lastOutput;
    selectBtn.disabled = !lastOutput;
    setCounter(data.charCount ?? [...lastOutput].length, data.limit ?? 12, !!data.overLimit);
    status.textContent = 'Converted';

    warningsBox.textContent = '';
    (data.warnings || []).forEach((w) => showAlert('Warning', w));
    renderBreakdown(data.words);
  } catch (err) {
    if (seq !== requestSeq) return;
    status.textContent = 'Error';
    warningsBox.textContent = '';
    showAlert('Error', 'Could not reach the converter. Check your connection and try again.');
  }
}

input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(convert, 250);
});
input.addEventListener('paste', () => setTimeout(convert, 0));

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
