'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { convert } = require('../lib/convert');

test('verified sample: تھک آلہ جہاز (urdu mode)', () => {
  const r = convert('تھک آلہ جہاز');
  assert.equal(r.output, '\uFEAF\uFE8E\uFBA9\uFE9F\uFFA0\uFBA7\uFEDF\uFE81\uFFA0\uFB8F\uFBAD\uFE97');
  assert.equal(r.charCount, 12);
  assert.equal(r.overLimit, false);
});

test('verified sample: تھک آلہ جہاز (safe mode)', () => {
  const r = convert('تھک آلہ جہاز', { mode: 'safe' });
  assert.equal(r.output, '\uFEAF\uFE8E\uFEEC\uFE9F\uFFA0\uFEEA\uFEDF\uFE81\uFFA0\uFEDA\uFEEC\uFE97');
  assert.equal(r.charCount, 12);
});

test('single word joins: محمد', () => {
  const r = convert('محمد');
  // visual order: dal(final) meem(medial) hah(medial) meem(initial)
  assert.equal(r.output, '\uFEAA\uFEE4\uFEA4\uFEE3');
});

test('non-joining letters stay separate: ز and آ never join forward', () => {
  const r = convert('جہاز');
  const forms = r.words[0].letters.map((l) => l.form);
  assert.deepEqual(forms, ['initial', 'medial', 'final', 'isolated']);
});

test('over limit warns', () => {
  const r = convert('تھک آلہ جہاز تھک');
  assert.equal(r.overLimit, true);
  assert.ok(r.warnings.length);
});

test('empty input', () => {
  const r = convert('   ');
  assert.equal(r.output, '');
  assert.equal(r.charCount, 0);
});

test('separator options', () => {
  assert.equal(convert('آلہ جہاز', { separator: 'space' }).output.includes(' '), true);
  assert.equal(convert('آلہ جہاز', { separator: 'none' }).output.includes('\uFFA0'), false);
});
