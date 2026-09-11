#!/usr/bin/env python3
"""
Turn the Goethe A1/A2 source PDFs into a reviewable candidate list.

This script never writes data/words/ directly: it produces candidates.json plus a
review queue of everything it cannot decide on its own. A human moves entries into
data/words/ after adding a German definition and an example sentence.

The PDFs are copyrighted and are NOT committed to this repository. Pass their paths:

    python3 scripts/import_goethe.py --a1 path/to/A1_Wortliste.pdf \
                                     --a2 path/to/A2_Vocabulary.pdf \
                                     --out build/

Requires pypdf (pip install pypdf).

See docs/word-list.md § 3.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

GER = "a-zA-ZäöüÄÖÜß"
ARTICLES = ("der", "die", "das")
A2_TYPES = {
    "Verb": "verb", "Substantiv": "noun", "Adjektiv": "adj", "Adverb": "adv",
    "Konjunktion": "other", "Affix": "other", "Präposition": "other",
    "Pronomen": "other", "Numerale": "num", "Partikel": "other", "Interjektion": "other",
}
A2_HEADERS = {"German", "Art.", "Type", "English", "Partizip II"}

# Function words: legal guesses, never answers. There is nothing to put on a
# definition card for "und". Homographs that are also nouns (Morgen) are flagged for
# review instead of being dropped here.
FUNCTION_WORDS = set("""
als auf aus bei bis das der die den dem des für her hin ich ihr mal man mit nie nur
oft pro sie und von vor was wer wie wir zum zur aber also auch dass denn doch dort
etwa euer eure hier ihre kein mein noch oder sehr seit sich sonst dein damit dann
darum dieser diese dieses durch einen einer eines etwas immer jeder jede jedes jetzt
mehr nach neben nichts ohne schon selbst super über unter viel weil wenn werden wird
wohl zwar zwischen gegen ganz gern heute nein nun eben erst fast kaum leider
meistens manchmal nirgends außerdem deshalb trotzdem vielleicht wirklich
""".split())

ABBREVIATIONS = {"lkw", "pkw", "wc", "ec", "km", "eu"}

# Words that are both a function word and a perfectly good noun answer. The importer
# cannot tell them apart from the source lists, so it asks.
HOMOGRAPHS = {"morgen", "sein"}

MIN_LEN, MAX_LEN = 3, 8


def pdf_text(path: Path) -> str:
    try:
        import pypdf
    except ImportError:
        sys.exit("pypdf is required: pip install pypdf")
    reader = pypdf.PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def parse_a1(text: str) -> list[dict]:
    """A1 is line-oriented with no delimiter between German and English:

        die Adresse, -en address
        arbeiten to work
    """
    out: list[dict] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith(("—", "Goethe", "Wortliste", "Word Groups")):
            continue
        if line == "Deutsch English":
            continue
        if re.match(r"^[A-Z][a-zA-Z ]+\([A-ZÄÖÜa-zäöü ]+\)$", line):  # topic heading
            continue

        noun = re.match(rf"^(der|die|das)\s+([{GER}]+)(?:\s*,\s*(-\S+))?\s+(.+)$", line)
        if noun:
            article, lemma, plural_marker, gloss = noun.groups()
            out.append(_entry(lemma, "A1", "noun", gloss, article, plural_marker, "goethe-a1"))
            continue

        other = re.match(rf"^([a-zäöüß][{GER}]*)\s+(.+)$", line)
        if other and "/" not in other.group(1):
            lemma, gloss = other.groups()
            out.append(_entry(lemma, "A1", "other", gloss, None, None, "goethe-a1"))
    return out


def parse_a2(text: str) -> list[dict]:
    """A2 is record-oriented, five fields per entry on consecutive lines. The article
    line is ABSENT for non-nouns, so stride must be probed, not assumed:

        Tasse / die / Substantiv / cup / —
    """
    lines = [l.strip() for l in text.splitlines()]
    out: list[dict] = []
    i = 0
    while i < len(lines):
        lemma = lines[i]
        if (not lemma or lemma in A2_HEADERS or lemma in ARTICLES or lemma in A2_TYPES
                or lemma == "—" or len(lemma) == 1
                or not re.fullmatch(rf"[{GER}\- ()]+", lemma)):
            i += 1
            continue

        j = i + 1
        article = None
        if j < len(lines) and lines[j] in ARTICLES:
            article = lines[j]
            j += 1
        if j < len(lines) and lines[j] in A2_TYPES:
            pos = A2_TYPES[lines[j]]
            gloss = lines[j + 1] if j + 1 < len(lines) else ""
            partizip = lines[j + 2] if j + 2 < len(lines) else "—"
            entry = _entry(lemma, "A2", pos, gloss, article, None, "goethe-a2")
            if pos == "verb" and partizip not in ("—", "", None):
                entry["partizip2"] = partizip
            out.append(entry)
            i = j + 3
            continue
        i += 1
    return out


def _entry(lemma, level, pos, gloss, article, plural_marker, source) -> dict:
    return {
        "lemma_raw": lemma,
        "lemma": lemma.lower(),
        "display": lemma,
        "level": level,
        "pos": pos,
        "definition_en": gloss.strip(),
        "article": article,
        "plural_marker": plural_marker,
        "partizip2": None,
        "source": source,
    }


def classify(e: dict) -> tuple[str, str]:
    """Return (bucket, reason): 'candidate', 'review' or 'excluded'."""
    lemma = e["lemma"]
    n = len([*lemma])

    if " " in e["lemma_raw"] or "(" in e["lemma_raw"]:
        return "excluded", "multi-word or bracketed form"
    if e["lemma_raw"].endswith("-"):
        return "excluded", "bound form / affix"
    if "/" in e["lemma_raw"]:
        return "review", "slashed alternatives — split into separate entries or pick one"
    if not re.fullmatch(r"[a-zäöüß]+", lemma):
        return "excluded", "not plain German letters"
    if n < MIN_LEN:
        return "excluded", f"too short ({n})"
    if n > MAX_LEN:
        return "excluded", f"too long ({n})"
    if lemma in ABBREVIATIONS:
        return "excluded", "abbreviation"
    if lemma in HOMOGRAPHS:
        return "review", "homograph: noun and function word differ only by case/part of speech"
    if lemma in FUNCTION_WORDS:
        return "excluded", "function word — legal guess, never an answer"
    if e["pos"] == "noun" and not e["article"]:
        return "review", "noun with no article in the source"
    if e["pos"] == "noun" and not e["plural_marker"]:
        return "review", "noun with no plural in the source — supply it by hand"
    if e["pos"] == "noun" and e["plural_marker"]:
        return "review", f"abbreviated plural marker {e['plural_marker']!r} — expand it"
    return "candidate", ""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--a1", type=Path, required=True, help="path to the A1 Wortliste PDF")
    ap.add_argument("--a2", type=Path, required=True, help="path to the A2 vocabulary PDF")
    ap.add_argument("--out", type=Path, default=Path("build"), help="output directory")
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    entries = parse_a1(pdf_text(args.a1)) + parse_a2(pdf_text(args.a2))

    # A1 wins on collision: a word in both lists is taught at the lower level.
    merged: dict[str, dict] = {}
    for e in entries:
        merged.setdefault(e["lemma"], e)

    buckets: dict[str, list] = {"candidate": [], "review": [], "excluded": []}
    for e in merged.values():
        bucket, reason = classify(e)
        e["_reason"] = reason
        buckets[bucket].append(e)

    (args.out / "candidates.json").write_text(
        json.dumps(buckets["candidate"] + buckets["review"], ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )

    lines = ["# Review queue", "",
             f"Parsed {len(entries)} source rows into {len(merged)} unique lemmas.", "",
             f"- {len(buckets['candidate'])} ready to curate",
             f"- {len(buckets['review'])} need a decision",
             f"- {len(buckets['excluded'])} excluded", "",
             "## Need a decision", ""]
    for e in sorted(buckets["review"], key=lambda x: (x["_reason"], x["lemma"])):
        lines.append(f"- `{e['display']}` ({e['level']}, {e['pos']}) — {e['_reason']}")
    lines += ["", "## Excluded", ""]
    for e in sorted(buckets["excluded"], key=lambda x: (x["_reason"], x["lemma"])):
        lines.append(f"- `{e['display']}` — {e['_reason']}")
    (args.out / "review-queue.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    by_len: dict[int, int] = {}
    for e in buckets["candidate"] + buckets["review"]:
        by_len[len([*e["lemma"]])] = by_len.get(len([*e["lemma"]]), 0) + 1
    print(f"{len(entries)} source rows -> {len(merged)} unique lemmas")
    print(f"  {len(buckets['candidate']):4} ready to curate")
    print(f"  {len(buckets['review']):4} need a decision  (see {args.out / 'review-queue.md'})")
    print(f"  {len(buckets['excluded']):4} excluded")
    print("  per length: " + "  ".join(f"{n}:{by_len.get(n, 0)}" for n in range(MIN_LEN, MAX_LEN + 1)))


if __name__ == "__main__":
    main()
