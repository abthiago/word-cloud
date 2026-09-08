# Roundtable word cloud

A free, self-hosted page that shows the keywords participants submitted ahead of
**Elsevier roundtable: The reality of AI in the lab**, 9 September 2026. It runs
entirely in the browser — no server, no build step, no account, nothing to pay
for.

**Live page:** https://abthiago.github.io/word-cloud/

Two views of the same answers, switchable in the top right:

| View | What it shows | Direct link |
| --- | --- | --- |
| Phrases | Each answer kept as the participant phrased it, so `Knowledge Management` stays one term | [`?view=phrases`](https://abthiago.github.io/word-cloud/?view=phrases) |
| Single words | Answers broken into individual words, stop words removed | [`?view=words`](https://abthiago.github.io/word-cloud/?view=words) |

There was a third, animated *Motion* view. It has been removed: it did not work
reliably in the room, and a broken control on a page that goes on a projector is
worse than no control. The engine and its `?view=motion` link are gone rather
than hidden, so there is no dead code left behind.

## Full screen

The icon in the top-right corner of the plate — or the <kbd>F</kbd> key — puts
the cloud on the whole screen with nothing else on it: no top bar, no caption,
no buttons. <kbd>Esc</kbd> or the same icon brings it back.

The cloud is laid out again at the new size rather than scaled up. Scaling a
1180px layout to a 1920px screen would keep the same gaps and the same type
relationships, just larger and softer; re-running the layout repacks the terms
and re-quotes the type for the screen, which is the point of doing this on a
projector at all. `MAX_UPSCALE` in [`app.js`](app.js) caps how far the type is
allowed to grow.

## Saving a PNG

`Save PNG` exports the cloud at 2× for a slide or a print. It always exports
on white in the light-mode colours and with every term at its resting
position, so the file is the same picture whether you took it in dark mode or
light.

## The look comes from the printed invitation

The page is styled to match the official invitation flyer,
`CS-2775_Flyer_Roundtable agenda_1_F.pdf`. Nothing was approximated by eye: the
colours were read out of the PDF's own drawing operators, and the icons are the
flyer's own artwork, extracted from the file rather than redrawn.

The flyer itself is **not committed** — see
[Why the flyer is not committed](#why-the-flyer-is-not-committed). The artwork
extracted from it is, in `assets/`.

| From the flyer | Where it is used |
| --- | --- |
| Ground cream `#F7F4EF` | the page behind the plate — `--field` |
| Card cream `#EEE7D7` | the When / Where / Who tiles — `--card` |
| Ink `#1E1E1E` | body text, and terms raised more than once — `--ink` |
| Orange `#FF551D` | the accent, and terms raised most often — `--orange` |
| Blue `#2354FF` | links, and terms added by hand — `--blue` |
| Calendar, globe and speech-bubble icons | `assets/icon-when.png`, `assets/icon-where.png`, `assets/icon-who.png` |
| Orange shard graphic | `assets/vortex-mark.png` (the brand chip in the top bar), `assets/favicon.png` (the tab icon) and `assets/vortex.jpg` (the faint corner bleed) |
| Tiempos Text headline, roman + italic | the top-bar headline, with *in the lab* italic exactly as the flyer sets it |
| National 2 body | the interface type |

Neither Elsevier face is licensed for the open web, so **Source Serif 4** stands
in for Tiempos Text and **IBM Plex Sans** for National 2 — the closest free
matches in structure and weight. Both load from Google Fonts.

The three icons come out of the PDF as ink-and-orange PNGs on a transparent
ground, which is why each one is stamped on its own cream tile: the tile keeps
the artwork legible in dark mode without touching the artwork itself.

To pull the assets out of the flyer again — after a new version of it, say —
put your copy of the PDF next to the script and run:

```
python extract-flyer-assets.py
```

It fails loudly rather than half-extracting if the flyer has been re-exported
and its embedded images have been renamed.

## When / Where / Who

The three facts above the plate are the flyer's own three cards, in the flyer's
own order, with the flyer's own icons: **Wednesday 9 September 2026**,
**Elsevier office, Amsterdam Sloterdijk**, **Senior R&D digitization leaders**.
They sit above the cloud because anyone arriving on the link needs to know what
the cloud is for before they read it, and they are outside the element that goes
full screen, so the projected cloud never carries them.

To change them, edit the `<ul class="facts">` block in
[`index.html`](index.html) — they are plain markup, not data.

## Dark mode

Light is the default, and it stays the default whatever your operating system
is set to: this page is shown on a projector and in a room, where the light
plate is the one that reads. Dark is opt-in — the button between the view
switch and **Build** in the top right turns it on, and that choice is then
remembered in this browser until you turn it off again.

Both themes are one design, not two. Every colour in
[`styles.css`](styles.css) is a custom property, and the `[data-theme="dark"]`
block at the end of that file re-points them — no layout, type or spacing
differs. The term colours are re-pointed twice, once there for the legend
swatches and once in `PALETTE` in [`app.js`](app.js) for the cloud itself, so
those two have to be kept in step. Exported PNGs are unaffected: they are
always light on white.

## Where the Build panel lives

**Build** is the button at the top right of the page, next to the dark-mode
toggle. It opens the panel that holds the source picker, the paste-your-own-text
box, the file dropzone and the stop-word list. Nothing else opens it, and there
is no URL for it.

In the code:

| Thing | Where |
| --- | --- |
| The button | `<button class="icon-btn" id="drawer-open">` in [`index.html`](index.html), inside `.topbar-tools` |
| The panel it opens | `<aside class="drawer" id="drawer">` in [`index.html`](index.html), just before the scripts |
| Open / close behaviour | `openDrawer()` and `closeDrawer()` in [`app.js`](app.js) |
| Styling | the `DRAWER` section of [`styles.css`](styles.css) |

## Adding your own terms

There are two ways, depending on whether you want the term published for
everyone or just visible to you.

**Published for everyone — edit one file.** Open
[`data/manual-terms.js`](data/manual-terms.js) and type your terms between the
backticks. Nothing else in the repository needs to change, and the build script
never overwrites this file.

```js
window.WORDCLOUD_MANUAL_TERMS = `
  # Added after the pre-call on 12 September
  Regulatory Compliance | 3
  Lab Automation
  Data Governance | 2
`;
```

One term per line. Add `| 2` or `| 3` after a term to draw it larger. Lines
starting with `#` are ignored, so use them for notes. Commit, push, and the live
page picks the terms up within a minute.

**Just for you — use the page.** Choose **Add a term** under the cloud, type the
terms the same way, and select **Add to the cloud**. They are saved in your
browser only. When you decide you want them published, choose **Copy for the
repo** and paste the result over the block in `data/manual-terms.js`.

Terms added by hand are drawn in Elsevier blue, so it stays obvious which terms
came from participants and which did not.

## How the terms are derived

The caption under the figure names the source rather than itemising it —
*Source: Poll, "Keywords – what's on your mind?"* — because that is what the
room needs to know: these are their own words, taken from the question they
were asked. The full provenance is the section below.

`build-dataset.py` reads the registration spreadsheet and writes
`data/presets.js`. Re-run it whenever new responses come in:

```
python build-dataset.py
```

It needs `openpyxl` (`pip install openpyxl`) and the spreadsheet sitting next to
it. The script prints every phrase it produced along with the raw answer it came
from, so the output can be checked by eye.

The steps it takes:

1. Reads the keywords column and skips blank answers. Six of the seven people
   who submitted the form gave keywords, and one of those six is set aside (see
   step 2), leaving five answers in the cloud.
2. **Excludes** any answer listed in the `EXCLUDED_RESPONSES` set at the top of
   the script. One respondent used the keyword box to ask the panel questions —
   *"How can Elsevier AI support us? / Easy access?"* — rather than to name
   terms, and made the same point properly in their answer to the challenge
   question. That belongs in the discussion, not in the cloud. The exclusion
   happens before anything is counted, so the answer influences no other
   phrase's weight either.
3. Splits each answer on commas, semicolons, periods, slashes and newlines,
   because that is how participants separated their terms.
4. Applies a small set of **editorial rewrites**, all listed in the `REWRITES`
   dictionary at the top of the script. One person answered in a sentence rather
   than terms, and two phrases were too long to read at display size, so:
   `AI in Literature search and analysis` → `AI in Literature Search`,
   `Scaling up projects faster` → `Scaling Up Projects`, and
   `cost efficient` → `Cost Efficiency`.
5. **Weights** each phrase by its most-mentioned content word across the whole
   set of answers. `AI`, `Data` and `Innovation` were each raised twice, so the
   five phrases containing them carry weight 2; everything else carries weight
   1. This is why those five lead the cloud — it reflects how often the theme
   came up, not an editorial choice.

Colour encodes the same weighting rather than decorating it: orange for the
themes raised most often, grey for those raised once, and blue for terms added
by hand. A third tone, near-black, appears whenever the answers produce three or
more weight levels.

## Sources

- **Design, icons, typography and the When / Where / Who details:** the official
  invitation flyer `CS-2775_Flyer_Roundtable agenda_1_F.pdf`. Produced in Canva,
  authored 2026-07-24, `/Title` *CS-2775_Flyer_Roundtable agenda*, one page. The
  icons in `assets/` are that file's embedded images `X21` (calendar), `X19`
  (globe) and `X17` (speech bubbles), extracted unaltered by
  `extract-flyer-assets.py`; `assets/vortex.jpg` and `assets/vortex-mark.png`
  are downscales and centre crops of its embedded image `X4`; the palette
  values are the file's own fill colours. The PDF is **not committed** — it
  lives only in the account manager's OneDrive, next to `build-dataset.py`.
- **RSVP form linked from the flyer and cited in the page caption:**
  https://forms.office.com/r/PS1rWkLcVF
- **Participant keywords:** Microsoft Forms export
  `Round table participants 24 08 2026.xlsx`, sheet `Sheet1`, column
  `Keywords – what's on your mind? (The purpose of this is to create a relevant
  word cloud)`. Seven submissions, six containing keywords, of which five are
  used — one answer asked the panel questions instead of naming terms and is
  excluded via `EXCLUDED_RESPONSES`. Extracted
  2026-09-08 by `build-dataset.py`.
- The spreadsheet itself is **not in this repository** and is not published. It
  lives only in the account manager's OneDrive.

### Why the flyer is not committed

The flyer is marked *"Closed-door and confidential. No marketing output, no
attribution."* — publishing it in a world-readable repository would not honour
that. Its sign-up button is also an Outlook safelink with an Elsevier
colleague's e-mail address baked into the query string, which should not be
indexed either. `.gitignore` therefore excludes it.

What is published from it is the artwork in `assets/` and the values in the
table above — no confidential text, and no addresses. The clean RSVP link cited
in the page caption, https://forms.office.com/r/PS1rWkLcVF, is the same form
without the safelink wrapper.

### Why the spreadsheet is not committed

GitHub Pages is free only for public repositories, so everything committed here
is world-readable. The registration export contains participant names, work
e-mail addresses, job titles and dietary requirements, which must not be
published. `.gitignore` therefore excludes `*.xlsx`, `*.xls` and `*.csv`, and
only the anonymised keyword terms in `data/presets.js` are committed.

If you clone this repository and want to regenerate the dataset, you need your
own copy of the spreadsheet placed next to `build-dataset.py`.

## Hosting it yourself

The page is three static files plus a data folder and an assets folder, so any
static host works.
For GitHub Pages: in the repository, open **Settings → Pages**, set **Source**
to *Deploy from a branch*, pick the default branch and the `/ (root)` folder,
and save. The page is live at `https://<user>.github.io/<repo>/` within a minute
or two.

To run it locally:

```
python -m http.server 8000
```

Then open http://127.0.0.1:8000/. Opening `index.html` straight off disk works
too.

## What is in here

| File | Purpose |
| --- | --- |
| `index.html` | The page |
| `styles.css` | All styling. Elsevier palette and type scale are the custom properties at the top; the dark theme re-points them at the bottom |
| `app.js` | Term processing, the two views, theming, colour weighting, PNG export |
| `data/presets.js` | Generated dataset — do not edit by hand |
| `data/manual-terms.js` | Hand-edited extra terms — safe to edit, never regenerated |
| `build-dataset.py` | Turns the spreadsheet into `data/presets.js` |
| `extract-flyer-assets.py` | Pulls the icons and the shard graphic out of the invitation PDF into `assets/` |
| `assets/` | The six images taken from the invitation, favicon included — generated, do not edit by hand |
| `CS-2775_Flyer_Roundtable agenda_1_F.pdf` | The official invitation: the source of the palette, the type, the icons and the three facts |

[d3](https://d3js.org/) and
[d3-cloud](https://github.com/jasondavies/d3-cloud) load from jsDelivr;
IBM Plex Sans and Source Serif 4 load from Google Fonts. Nothing else is
fetched, and nothing leaves the browser.
