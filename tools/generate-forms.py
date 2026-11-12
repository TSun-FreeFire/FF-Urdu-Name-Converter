#!/usr/bin/env python3
"""Generate lib/forms.json from Unicode data.

Maps each Arabic base letter -> its presentation forms
(isolated / final / initial / medial) using the compatibility
decomposition + name of Arabic Presentation Forms-A/B codepoints.
Joining class is inferred: a letter with initial/medial forms is
dual-joining; one with only a final form is right-joining; otherwise
non-joining.
"""
import json, unicodedata, pathlib

forms = {}
for cp in list(range(0xFB50, 0xFF00)) + list(range(0xFE70, 0xFF00)):
    ch = chr(cp)
    name = unicodedata.name(ch, "")
    if "ARABIC" not in name or "LIGATURE" in name or "LETTER" not in name:
        continue
    dec = unicodedata.decomposition(ch)
    if not dec.startswith("<"):
        continue
    parts = dec.split()
    kind = parts[0].strip("<>")
    if kind not in ("isolated", "final", "initial", "medial"):
        continue
    if len(parts) != 2:
        continue
    base = parts[1].upper()
    forms.setdefault(base, {})[kind] = format(cp, "04X")

out = {}
for base, f in sorted(forms.items()):
    if "isolated" not in f:
        continue
    joining = "dual" if ("initial" in f or "medial" in f) else ("right" if "final" in f else "none")
    out[base] = {"forms": f, "joining": joining}

dest = pathlib.Path(__file__).resolve().parent.parent / "lib" / "forms.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True))
print(f"wrote {dest} with {len(out)} base letters")
# sanity spot checks
for probe in ["062A","06BE","06A9","06C1","0644","062C","0627","0632","0622"]:
    print(probe, out.get(probe))
