'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const AsciiField = require('../public/ascii.js');

test('ramp is the skill standard 10-level ramp, dark to light', () => {
  assert.equal(AsciiField.RAMP, ' .:-=+*#%@');
});

test('frame has exact grid dimensions and only ramp characters', () => {
  const f = AsciiField.frame(80, 24, 1000);
  const rows = f.split('\n');
  assert.equal(rows.length, 24);
  for (const row of rows) {
    assert.equal(row.length, 80);
    for (const ch of row) assert.ok(AsciiField.RAMP.includes(ch), `char ${JSON.stringify(ch)} not in ramp`);
  }
});

test('frame is deterministic for injected time (seek harness)', () => {
  assert.equal(AsciiField.frame(60, 20, 1500), AsciiField.frame(60, 20, 1500));
});

test('motion evolves between simulated times', () => {
  assert.notEqual(AsciiField.frame(60, 20, 0), AsciiField.frame(60, 20, 1000));
  assert.notEqual(AsciiField.frame(60, 20, 1000), AsciiField.frame(60, 20, 2000));
});

test('grid applies cell aspect correction (rows roughly half the image ratio)', () => {
  const g = AsciiField.gridFor(1000, 500, 6.7);
  // cols ~149; rows = round(cols * 0.5 * 0.5) ~ 37, well below cols
  assert.ok(g.rows < g.cols * 0.4, `rows ${g.rows} should be aspect-corrected vs cols ${g.cols}`);
  assert.ok(g.rows >= 10 && g.cols >= 40);
});
