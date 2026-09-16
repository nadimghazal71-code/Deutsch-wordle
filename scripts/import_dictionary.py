#!/usr/bin/env python3
"""
Filter a full German word list down to the forms this game can accept as guesses.

The raw list is large (~30 MB, ~1.9M forms) and is NOT committed. This script writes
the filtered, sorted per-length lists to data/dictionary/<n>.txt, which ARE committed
and are the source of truth for guess validation:

    python3 scripts/import_dictionary.py --list path/to/wordlist-german.txt

The output feeds `npm run build:words`, which compiles it into the compact bundles the
apps ship. Answers come from data/words/ only — nothing here can ever be an answer.

See docs/word-list.md § 4.
"""
from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

MIN_LEN, MAX_LEN = 3, 8
# The game's alphabet: 26 letters plus the four German characters. A guess is typed on
# a 30-key keyboard, so anything outside this set could never be entered anyway.
ALLOWED = re.compile(r"[a-zäöüß]+\Z")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--list", type=Path, required=True, help="path to the raw German word list (one form per line)")
    ap.add_argument("--out", type=Path, default=Path("data/dictionary"), help="output directory")
    args = ap.parse_args()

    if not args.list.exists():
        sys.exit(f"no such file: {args.list}")

    by_length: dict[int, set[str]] = defaultdict(set)
    total = skipped_length = skipped_chars = 0

    with args.list.open(encoding="utf-8") as handle:
        for line in handle:
            word = line.strip()
            if not word:
                continue
            total += 1
            # Guesses are compared lowercased, so German noun capitalisation collapses
            # here. NFC so that 'ä' is one character, never a+combining umlaut.
            word = unicodedata.normalize("NFC", word).lower()
            if not MIN_LEN <= len(word) <= MAX_LEN:
                skipped_length += 1
                continue
            if not ALLOWED.fullmatch(word):
                skipped_chars += 1
                continue
            by_length[len(word)].add(word)

    args.out.mkdir(parents=True, exist_ok=True)
    print(f"{total:,} source forms")
    print(f"  {skipped_length:,} outside {MIN_LEN}-{MAX_LEN} letters")
    print(f"  {skipped_chars:,} with characters outside the game's alphabet")
    print(f"  {sum(len(v) for v in by_length.values()):,} kept\n")
    print("len |   words | file")
    print("----+---------+-----")
    for n in range(MIN_LEN, MAX_LEN + 1):
        words = sorted(by_length[n])
        path = args.out / f"{n}.txt"
        path.write_text("\n".join(words) + "\n", encoding="utf-8")
        print(f"{n:3} | {len(words):7,} | {path}")


if __name__ == "__main__":
    main()
