#!/usr/bin/env python3
"""Pull the invitation flyer's own artwork out of the PDF and into assets/.

The page is styled to match the official invitation, and the icons on it are
not redrawn approximations — they are the flyer's embedded images, copied
byte-for-byte out of the file. This script is what does the copying, so the
provenance of everything in assets/ is one command rather than a story.

    python extract-flyer-assets.py

Needs pypdf and Pillow:

    pip install pypdf pillow

The flyer embeds four images on its single page. Three are the small icons
heading the When / Where / Who columns; the fourth is the large orange shard
graphic behind the headline. Their internal names are stable for this file,
and the script fails loudly rather than guessing if a name is missing — a new
version of the flyer should be checked by eye, not silently half-extracted.
"""

import io
import os
import sys

try:
    import pypdf
    from PIL import Image
except ImportError as exc:  # pragma: no cover - operator feedback only
    sys.exit(f"missing dependency: {exc}. Run: pip install pypdf pillow")

FLYER = "CS-2775_Flyer_Roundtable agenda_1_F.pdf"
OUT_DIR = "assets"

# Embedded image name -> file we write. The icons keep the flyer's own
# ink-and-orange artwork and its transparent ground, untouched: styles.css
# stamps each one on a cream tile so it stays legible in dark mode.
ICONS = {
    "X21.png": "icon-when.png",    # calendar,        heads "When"
    "X19.png": "icon-where.png",   # globe,           heads "Where"
    "X17.png": "icon-who.png",     # speech bubbles,  heads "Who"
}

SHARD = "X4.jpg"                   # the orange shard graphic, 2833 x 2126

# One large copy for the page's faint corner bleed, and one tight centre crop
# of the starburst for the brand chip that stands in for a logo in the top bar.
BLEED_MAX = 1400
BLEED_QUALITY = 78
CHIP_CROP = 640                    # pixels of the original, centred
CHIP_SIZE = 96                     # what we write, ~3.7x the 26px it is shown at


def main():
    if not os.path.exists(FLYER):
        sys.exit(f"cannot find {FLYER} in the current directory")

    os.makedirs(OUT_DIR, exist_ok=True)

    page = pypdf.PdfReader(FLYER).pages[0]
    embedded = {img.name: img.data for img in page.images}

    missing = [n for n in list(ICONS) + [SHARD] if n not in embedded]
    if missing:
        sys.exit(
            "the flyer no longer contains " + ", ".join(missing) + ".\n"
            "It has probably been re-exported. Check the embedded images by eye "
            "and update ICONS / SHARD at the top of this script."
        )

    for name, out in ICONS.items():
        icon = Image.open(io.BytesIO(embedded[name])).convert("RGBA")
        path = os.path.join(OUT_DIR, out)
        icon.save(path, optimize=True)
        print(f"{path:34} {icon.size[0]}x{icon.size[1]}  (from {name})")

    shard = Image.open(io.BytesIO(embedded[SHARD])).convert("RGB")
    width, height = shard.size

    bleed = shard.copy()
    bleed.thumbnail((BLEED_MAX, BLEED_MAX), Image.LANCZOS)
    bleed_path = os.path.join(OUT_DIR, "vortex.jpg")
    bleed.save(bleed_path, quality=BLEED_QUALITY, optimize=True, progressive=True)
    print(f"{bleed_path:34} {bleed.size[0]}x{bleed.size[1]}  (from {SHARD})")

    half = CHIP_CROP // 2
    box = (width // 2 - half, height // 2 - half, width // 2 + half, height // 2 + half)
    chip = shard.crop(box).resize((CHIP_SIZE, CHIP_SIZE), Image.LANCZOS)
    chip_path = os.path.join(OUT_DIR, "vortex-mark.png")
    chip.save(chip_path, optimize=True)
    print(f"{chip_path:34} {CHIP_SIZE}x{CHIP_SIZE}  (centre crop of {SHARD})")


if __name__ == "__main__":
    main()
