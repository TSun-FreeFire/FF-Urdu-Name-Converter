'use strict';
/**
 * Generative ASCII field — built on the ascii-animation skill:
 *  - brightness ramp ' .:-=+*#%@' (dark -> light), luminance 0..1 mapped
 *    with Math.round(lum * (ramp.length - 1))
 *  - plasma: layered sine waves normalised into that luminance range
 *  - character-cell aspect correction (fontAspect ~ 0.5): sample fewer
 *    rows than columns, and double the y term in the radial distance,
 *    so shapes are not vertically stretched
 *  - frame(time) is a pure function of injected time — reproducible,
 *    which is what makes the ?t=N seek harness and tests possible.
 */
var AsciiField = (function () {
  var RAMP = ' .:-=+*#%@';
  var FONT_ASPECT = 0.5;

  function gridFor(width, height, charWidth) {
    var cols = Math.max(40, Math.min(150, Math.floor(width / charWidth)));
    var rows = Math.max(10, Math.min(46, Math.round(cols * (height / width) * FONT_ASPECT)));
    return { cols: cols, rows: rows };
  }

  function frame(cols, rows, t) {
    var out = '';
    var cx = cols / 2, cy = rows / 2;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var dx = x - cx, dy = (y - cy) * 2; // *2 = cell aspect correction
        var v =
          Math.sin(x * 0.11 + t * 0.0006) +
          Math.sin(y * 0.23 + t * 0.0008) +
          Math.sin((x + y) * 0.07 + t * 0.0004) +
          Math.sin(Math.sqrt(dx * dx + dy * dy) * 0.14 - t * 0.0009);
        var lum = (v + 4) / 8; // -4..4 -> 0..1
        out += RAMP[Math.round(lum * (RAMP.length - 1))];
      }
      if (y < rows - 1) out += '\n';
    }
    return out;
  }

  return { RAMP: RAMP, FONT_ASPECT: FONT_ASPECT, gridFor: gridFor, frame: frame };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = AsciiField;
