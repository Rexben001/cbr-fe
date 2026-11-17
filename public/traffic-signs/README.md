# RijFiks official Dutch RVV traffic sign asset extraction

Extracted from the user's `traffic-signs.zip`; no new or altered SVGs were generated.

**Coverage: 183 of 186 Annex 1 sign codes (July 2026 RVV 1990)**.

Missing SVGs from the supplied ZIP: **E8a, E8b, E8c**. These were not fabricated or substituted. See `missing_signs.json` for verified links.

Each sign lives in `<series>/<code>.svg`. `manifest.csv` and `manifest.json` preserve the original filename, Commons source page, supplied licence, candidate count, and SHA-256 hash.

## Selection rules
- One primary SVG per code, selecting by filename. Prefers 2026 or 2023 version when present, then exact current-looking code filenames.
- Excludes out-of-scope historical names, zone variants, and extra variants from the primary folder.
- Several sign codes have meaningful visual variants (e.g., C4 left/right, L19 direction). The single SVG chosen is **one representative**; obtain additional variants separately if your use case requires them.
- C22a–C22d (old environmental-zone codes) are excluded as they were removed from Annex 1 effective January 2026.

## IMPORTANT for use in your app
- Selection is based on official **code** and file **name**, not a manual visual correctness or legal review of every SVG.
- Each selected SVG is XML-parseable, but you must sanitize any third-party SVG you serve inline (or rasterize at build time) and review source licences before production.
- Only sign artwork appears in the ZIP; mandatory road markings, traffic light instructions, and other non-Annex-1 traffic symbols are outside this 186-code list.
- RVV model signs with placeholders (speed, dimensions, destinations, etc.) may need several renderings for lessons.

## Official regulation
- https://wetten.overheid.nl/BWBR0004825/
- https://openwet.nl/nl/BWBR0004825/2026-07-01.html
- https://zoek.officielebekendmakingen.nl/stb-2025-265.html

## Selected counts
- A: 5 / 5
- B: 7 / 7
- C: 37 / 37
- D: 7 / 7
- E: 13 / 16
- F: 22 / 22
- G: 16 / 16
- H: 2 / 2
- J: 39 / 39
- K: 14 / 14
- L: 21 / 21

SVGs flagged for potentially active content: none found by basic string scan.
