'use strict';
/**
 * Free Fire Urdu name converter.
 *
 * Free Fire renders nicknames strictly left-to-right and does not shape
 * Arabic script, so a normal Urdu name comes out reversed with every
 * letter in its isolated form. This converter:
 *   1. shapes every letter (isolated / final / initial / medial) from
 *      its neighbours inside its word,
 *   2. stores the result in *visual* order (words and letters reversed),
 *      so a naive left-to-right renderer draws it correctly joined,
 *   3. joins words with U+FFA0 (the filler FF accepts as a space).
 *
 * The letter -> presentation-form table lives in forms.json and is
 * generated from Unicode data by tools/generate-forms.py.
 */
const FORMS = require('./forms.json');

const FILLER = '\uFFA0'; // HALFWIDTH HANGUL FILLER - looks like a space, FF accepts it
const FF_LIMIT = 12;

// Urdu letters whose joined forms live in Arabic Presentation Forms-A.
// "Safe" mode swaps them for plain Arabic letters whose forms are in
// the widely-supported Forms-B block, for fonts/games that show boxes.
const SAFE_MAP = {
  '\u06C1': '\u0647', // heh goal      -> heh
  '\u06BE': '\u0647', // heh doachashmee -> heh
  '\u06C0': '\u0647', // heh goal with hamza above -> heh
  '\u06A9': '\u0643', // keheh         -> kaf
  '\u06AD': '\u0643', // swash kaf     -> kaf
};

// Arabic vowel marks / Quranic annotation marks: transparent for
// joining, and dropped from nicknames.
const DIACRITIC = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;

const hex = (ch) => ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');

function joiningOf(ch) {
  if (ch === '\u0640') return 'dual'; // tatweel joins both sides
  const entry = FORMS[hex(ch)];
  return entry ? entry.joining : 'none';
}

function formOf(ch, kind) {
  if (ch === '\u0640') return ch; // tatweel has no presentation forms
  const entry = FORMS[hex(ch)];
  if (!entry) return null;
  const cp = entry.forms[kind] || entry.forms.isolated;
  return cp ? String.fromCodePoint(parseInt(cp, 16)) : null;
}

/** Shape one word (logical order in, visual order out). */
function shapeWord(word, mode, warnings) {
  const letters = [];
  for (const rawCh of word) {
    let ch = rawCh;
    if (mode === 'safe' && SAFE_MAP[ch]) ch = SAFE_MAP[ch];
    letters.push(ch);
  }
  const shaped = letters.map((ch, i) => {
    const prev = letters[i - 1];
    const next = letters[i + 1];
    const myJoin = joiningOf(ch);
    const joinsPrev =
      prev !== undefined &&
      (joiningOf(prev) === 'dual') &&
      (myJoin === 'dual' || myJoin === 'right');
    const joinsNext =
      next !== undefined &&
      myJoin === 'dual' &&
      (joiningOf(next) === 'dual' || joiningOf(next) === 'right');
    const kind = joinsPrev && joinsNext ? 'medial'
      : joinsPrev ? 'final'
      : joinsNext ? 'initial'
      : 'isolated';
    const out = formOf(ch, kind);
    if (out === null) {
      warnings.add(`No joined form known for “${ch}” (U+${hex(ch)}) — kept as-is.`);
      return { input: ch, output: ch, form: 'kept' };
    }
    return { input: ch, output: out, form: kind };
  });
  const hasArabic = letters.some((ch) => FORMS[hex(ch)]);
  const ordered = hasArabic ? [...shaped].reverse() : shaped;
  return { letters: shaped, output: ordered.map((l) => l.output).join('') };
}

/**
 * convert(text, { mode: 'urdu'|'safe', separator: 'filler'|'space'|'none' })
 */
function convert(input, options = {}) {
  const mode = options.mode === 'safe' ? 'safe' : 'urdu';
  const sepKind = ['filler', 'space', 'none'].includes(options.separator) ? options.separator : 'filler';
  const separator = sepKind === 'filler' ? FILLER : sepKind === 'space' ? ' ' : '';

  const warnings = new Set();
  let strippedMarks = 0;
  const cleaned = [...String(input || '')]
    .filter((ch) => {
      if (DIACRITIC.test(ch)) { strippedMarks++; return false; }
      return ch !== '\u200C' && ch !== '\u200D'; // ZWNJ/ZWJ handled as plain breaks is unsafe; drop
    })
    .join('');
  if (strippedMarks) warnings.add(`Removed ${strippedMarks} vowel mark(s) — FF nicknames don't carry them.`);

  const wordsIn = cleaned.trim().split(/\s+/).filter(Boolean);
  const words = wordsIn.map((w) => {
    const r = shapeWord(w, mode, warnings);
    return { input: w, output: r.output, letters: r.letters };
  });
  const anyArabic = wordsIn.some((w) => [...w].some((ch) => FORMS[hex(ch)]));
  const orderedWords = anyArabic ? [...words].reverse() : words;
  const output = orderedWords.map((w) => w.output).join(separator);
  const charCount = [...output].length;
  if (charCount > FF_LIMIT) {
    warnings.add(`This is ${charCount} characters — FF nicknames are limited to ${FF_LIMIT}. Shorten the name.`);
  }
  return {
    input: String(input || ''),
    output,
    mode,
    separator: sepKind,
    charCount,
    limit: FF_LIMIT,
    overLimit: charCount > FF_LIMIT,
    words, // logical order, with per-letter form breakdown
    warnings: [...warnings],
  };
}

module.exports = { convert, FILLER, FF_LIMIT };
