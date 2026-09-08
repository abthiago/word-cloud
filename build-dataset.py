#!/usr/bin/env python3
"""
build-dataset.py — turns the Microsoft Forms export into data/presets.js

Source of truth:
  "Round table participants 24 08 2026.xlsx", sheet "Sheet1",
  column "Keywords - what's on your mind? (The purpose of this is to
  create a relevant word cloud)"

The spreadsheet holds personal data (names, work e-mail addresses, dietary
requirements) and is deliberately NOT committed to this public repository
(see .gitignore). Only the anonymised keyword terms below are published.

Run:  python build-dataset.py
"""

import json
import re
import sys
from datetime import date
from pathlib import Path

import openpyxl

SOURCE_XLSX = "Round table participants 24 08 2026.xlsx"
OUTPUT_JS = Path("data/presets.js")
KEYWORD_HEADER_PREFIX = "keywords"

# Responses excluded from the word cloud altogether.
# One respondent answered the keyword question with questions for the panel
# ("How can Elsevier AI support us? / Easy access?") rather than with terms;
# the same point is made in their answer to the challenge question ("How to
# connect Elsevier AI with internal platforms / initiatives"), so it belongs in
# the discussion, not in the cloud. Excluded here, before the corpus is scored,
# so it does not influence any other phrase's weight either.
EXCLUDED_RESPONSES = {
    "how can elsevier ai support us?\neasy access?",
}

# Editorial rewrites, applied to the normalised phrase.
# One respondent answered in a sentence rather than terms, and two phrases are
# too long to read at display size. Every rewrite is listed here so the mapping
# from raw response to rendered term stays auditable.
REWRITES = {
    "ai in literature search and analysis": "AI in Literature Search",
    "scaling up projects faster": "Scaling Up Projects",
    "cost efficient": "Cost Efficiency",
}

# Words that keep a fixed casing rather than title case.
CASING = {
    "ai": "AI",
    "r&d": "R&D",
    "in": "in",
    "up": "up",
    "and": "and",
}

# Words ignored when scoring a phrase's weight (see weighting note in README).
SCORING_STOPWORDS = {
    "a", "and", "can", "how", "in", "of", "the", "to", "up", "us", "we",
}


def load_responses(path: Path) -> tuple[list[str], str, str, int]:
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]

    col = next(
        (
            i
            for i, h in enumerate(header)
            if isinstance(h, str) and h.strip().lower().startswith(KEYWORD_HEADER_PREFIX)
        ),
        None,
    )
    if col is None:
        sys.exit(f"No column starting with '{KEYWORD_HEADER_PREFIX}' found in {path}")

    # Every submitted form, whether or not it carried keywords — the caption
    # says "N of M people", so we need M as well as N.
    submissions = [r for r in rows[1:] if any(c is not None for c in r)]

    responses = [
        str(r[col]).strip()
        for r in submissions
        if r[col] is not None
        and str(r[col]).strip()
        and normalise_response(str(r[col])) not in EXCLUDED_RESPONSES
    ]
    return responses, ws.title, str(header[col]).strip(), len(submissions)


def normalise_response(response: str) -> str:
    """Lower-cased, whitespace-tidied form used to match EXCLUDED_RESPONSES."""
    lines = [re.sub(r"[ \t]+", " ", ln.strip()) for ln in response.strip().splitlines()]
    return "\n".join(ln for ln in lines if ln).lower()


def split_phrases(response: str) -> list[str]:
    """Respondents separated terms with commas, semicolons, periods or newlines."""
    parts = re.split(r"[,;.\n/]+", response)
    out = []
    for p in parts:
        p = re.sub(r"\s+", " ", p.strip().strip("?!").strip())
        if p:
            out.append(p)
    return out


def display_form(phrase: str) -> str:
    key = phrase.lower()
    if key in REWRITES:
        return REWRITES[key]
    return " ".join(CASING.get(w, w.capitalize()) for w in key.split(" "))


def content_words(text: str) -> list[str]:
    tokens = re.findall(r"[a-z&]+", text.lower())
    return [t for t in tokens if len(t) > 1 and t not in SCORING_STOPWORDS]


def build_phrases(responses: list[str]) -> list[dict]:
    # Corpus-wide mention count per content word.
    word_mentions: dict[str, int] = {}
    for r in responses:
        for w in content_words(r):
            word_mentions[w] = word_mentions.get(w, 0) + 1

    seen: dict[str, dict] = {}
    for r in responses:
        for raw in split_phrases(r):
            label = display_form(raw)
            words = content_words(raw)
            # A phrase weighs as much as its most-mentioned content word, so a
            # theme several participants raised (e.g. "AI") outranks a one-off.
            weight = max((word_mentions.get(w, 1) for w in words), default=1)
            if label in seen:
                seen[label]["value"] = max(seen[label]["value"], weight)
                if raw not in seen[label]["raw"]:
                    seen[label]["raw"].append(raw)
            else:
                seen[label] = {"text": label, "value": weight, "raw": [raw]}

    return sorted(seen.values(), key=lambda d: (-d["value"], d["text"].lower()))


def main() -> None:
    src = Path(SOURCE_XLSX)
    if not src.exists():
        sys.exit(f"Source spreadsheet not found: {src.resolve()}")

    responses, sheet, column, submissions = load_responses(src)
    phrases = build_phrases(responses)
    source_text = "\n".join(responses)

    payload = {
        "id": "roundtable-2026-09-09",
        "label": "Roundtable, 9 September 2026",
        "occasion": "the roundtable on 9 September 2026",
        "responseCount": len(responses),
        "phrases": [{"text": p["text"], "value": p["value"]} for p in phrases],
        "sourceText": source_text,
        "provenance": {
            "file": SOURCE_XLSX,
            "sheet": sheet,
            "column": column,
            "submissionCount": submissions,
            "generated": date.today().isoformat(),
            "note": "Personal data (names, e-mail addresses, dietary requirements) "
                    "is excluded; only keyword terms are published.",
        },
    }

    OUTPUT_JS.parent.mkdir(exist_ok=True)
    OUTPUT_JS.write_text(
        "/* AUTO-GENERATED by build-dataset.py - do not edit by hand. */\n"
        "window.WORDCLOUD_PRESETS = [\n"
        + json.dumps(payload, indent=2, ensure_ascii=False)
        + "\n];\n",
        encoding="utf-8",
    )

    print(f"{len(responses)} responses -> {len(phrases)} phrases")
    for p in phrases:
        print(f"  {p['value']}  {p['text']}   <- {' | '.join(p['raw'])}")
    print(f"\nWrote {OUTPUT_JS}")


if __name__ == "__main__":
    main()
