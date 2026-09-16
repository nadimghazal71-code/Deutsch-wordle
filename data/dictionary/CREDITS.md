# Data sources and licences

## Guess dictionary — `data/dictionary/<n>.txt`

Filtered from a full German word list (~1.9M inflected forms) by
[`scripts/import_dictionary.py`](../../scripts/import_dictionary.py). The raw list was
supplied for this project and is not committed. **Its licence is not yet confirmed —
do that, and add the required attribution here, before distributing the app.**

## Excluded names — `data/dictionary/excluded-names.txt`

Built by [`scripts/import_names.py`](../../scripts/import_names.py) from three sources.

### 1. German first and last name lists

2,000 surnames and 500 + 500 given names, from a data set by **Alexander L.**, used
under the MIT licence:

```
MIT License

Copyright (c) 2023 Alexander L.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 2. A historical German first-name list

~2,000 Germanic given names, supplied for this project.

### 3. `data/dictionary/names-common.txt`

Written for this project, to cover common modern names the historical list omits.

## Answers — `data/words/`

Word selection follows the Goethe-Institut A1 and A2 word lists; the definitions,
examples and translations are written for this project. See
[docs/word-list.md § 1](../../docs/word-list.md#sourcing-and-licence).
