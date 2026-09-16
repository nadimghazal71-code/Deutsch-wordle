#!/usr/bin/env python3
"""
Turn a list of German first names into a guess-dictionary exclusion list.

A full German word list contains given names (Albin, Aaron) and, because German
capitalises every noun, there is no structural way to tell 'Albin' from 'Haus'. So the
names have to be named explicitly.

The catch is that many German first names ARE ordinary words: Rot, Wald, Gast, Ort,
Ecke, Wolke, Kraft, Linde, Ernst, Frank. Removing those would reject real German —
and seven of them are answers this game can actually set, which would show a player a
valid answer being refused. So a name is only excluded when it is not a word the game
needs, and the protections are explicit:

  1. it is never one of the curated answers (data/words/)
  2. it is never a Goethe A1/A2 lemma — the vocabulary the app teaches
  3. it is never a string that also exists in lowercase in the word list, which means
     a verb, adjective or adverb of the same spelling exists (rot, hart, frei, rein)
  4. it is never a string with a noun inflection family in the word list. German
     surnames are mostly occupations and nature words, so a great many of them are
     ordinary nouns: Müller, Fischer, Weber, Koch, Bauer, Schneider, Richter, Adler,
     Stein, Linde. A common noun takes plural and genitive endings (Stein -> Steine,
     Steines, Steinen; Abt -> Äbte); a surname takes at most a genitive -s, which is
     why -s alone is not treated as evidence.

    python3 scripts/import_names.py \
        --names path/to/firstnames.txt \
        --list  path/to/wordlist-german.txt \
        --goethe build/candidates.json        # optional but recommended

Writes data/dictionary/excluded-names.txt, which `npm run build:words` subtracts.

See docs/word-list.md § 4.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

MIN_LEN, MAX_LEN = 3, 8
ALLOWED = re.compile(r"[a-zäöüß]{3,8}\Z")


def normalise(text: str) -> str:
    return unicodedata.normalize("NFC", text.strip()).lower()


UMLAUT = str.maketrans({"a": "ä", "o": "ö", "u": "ü"})


def umlauted(word: str) -> str | None:
    """Umlaut the last a/o/u, the way a German plural does: Abt -> Äbt(e)."""
    for i in range(len(word) - 1, -1, -1):
        if word[i] in "aou":
            return word[:i] + word[i].translate(UMLAUT) + word[i + 1:]
    return None


def has_noun_family(word: str, forms: set[str]) -> bool:
    """Protection 4 — see the module docstring."""
    stems = [word]
    stem = umlauted(word)
    if stem:
        stems.append(stem)
    return any(s + suffix in forms for s in stems for suffix in ("e", "en", "er", "n", "es", "ern"))


def read_json_names(path: Path) -> set[str]:
    """A JSON array of names, as published by the germanenames data sets."""
    data = json.loads(path.read_text(encoding="utf-8"))
    return {normalise(x) for x in data if isinstance(x, str)}


def read_names(path: Path) -> set[str]:
    """The supplied list is Latin-1, comma separated, with CRLF line endings."""
    raw = path.read_bytes()
    for encoding in ("utf-8", "cp1252"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        sys.exit(f"could not decode {path}")

    out = set()
    for token in re.split(r"[,\r\n]+", text):
        name = normalise(token)
        if ALLOWED.fullmatch(name):
            out.add(name)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--names", type=Path, required=True)
    ap.add_argument("--extra", type=Path, nargs="*", default=[],
                    help="further name files, one per line, # for comments")
    ap.add_argument("--json", type=Path, nargs="*", default=[],
                    help="further name files as JSON arrays")
    ap.add_argument("--list", type=Path, required=True, help="the full German word list")
    ap.add_argument("--goethe", type=Path, help="candidates.json from import_goethe.py")
    ap.add_argument("--words", type=Path, default=Path("src/data"), help="generated answer bundles")
    ap.add_argument("--out", type=Path, default=Path("data/dictionary/excluded-names.txt"))
    args = ap.parse_args()

    names = read_names(args.names)
    for extra in args.extra:
        if not extra.exists():
            sys.exit(f"no such file: {extra}")
        for line in extra.read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0]
            name = normalise(line)
            if ALLOWED.fullmatch(name):
                names.add(name)
    for path in args.json:
        if not path.exists():
            sys.exit(f"no such file: {path}")
        names |= {n for n in read_json_names(path) if ALLOWED.fullmatch(n)}

    # Protection 1: the game's own answers.
    answers: set[str] = set()
    for n in range(MIN_LEN, MAX_LEN + 1):
        path = args.words / f"words.{n}.json"
        if path.exists():
            answers |= {w["lemma"] for w in json.loads(path.read_text(encoding="utf-8"))}

    # Protection 2: the vocabulary the app teaches.
    goethe: set[str] = set()
    if args.goethe and args.goethe.exists():
        goethe = {normalise(e["lemma"]) for e in json.loads(args.goethe.read_text(encoding="utf-8"))}
        goethe = {w for w in goethe if ALLOWED.fullmatch(w)}
    else:
        print("warning: no --goethe given, so A1/A2 words that are also names may be excluded")

    # Protections 3 and 4 both need the word list. Every length is loaded, not just
    # 3-8: an inflected form is usually longer than its lemma.
    lowercase_words: set[str] = set()
    all_forms: set[str] = set()
    with args.list.open(encoding="utf-8") as handle:
        for line in handle:
            word = line.strip()
            if not word:
                continue
            lowered = normalise(word)
            all_forms.add(lowered)
            if word[:1].islower() and ALLOWED.fullmatch(lowered):
                lowercase_words.add(lowered)

    by_rule_123 = (answers | goethe | lowercase_words) & names
    by_noun_family = {n for n in names - by_rule_123 if has_noun_family(n, all_forms)}
    protected = by_rule_123 | by_noun_family
    excluded = sorted(names - protected)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(excluded) + "\n", encoding="utf-8")

    print(f"{len(names)} names at {MIN_LEN}-{MAX_LEN} letters")
    print(f"  {len(protected)} protected as real words, NOT excluded:")
    print(f"    answers:      {', '.join(sorted(names & answers)) or '—'}")
    print(f"    Goethe A1/A2: {', '.join(sorted((names & goethe) - answers)) or '—'}")
    others = sorted(by_rule_123 - answers - goethe)
    print(f"    lowercase too: {', '.join(others[:20])}{' …' if len(others) > 20 else ''}")
    family = sorted(by_noun_family)
    print(f"    noun inflections ({len(family)}): {', '.join(family[:20])}{' …' if len(family) > 20 else ''}")
    print(f"  {len(excluded)} excluded -> {args.out}")


if __name__ == "__main__":
    main()
