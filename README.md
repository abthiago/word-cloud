# Roundtable word cloud

A free, self-hosted page that shows the keywords participants submitted ahead of
the Elsevier roundtable on 9 September 2026. It runs entirely in the browser —
no server, no build step, no account, nothing to pay for.

**Live page:** https://abthiago.github.io/word-cloud/

Three views of the same answers, switchable in the top right:

| View | What it shows | Direct link |
| --- | --- | --- |
| Phrases | Each answer kept as the participant phrased it, so `Knowledge Management` stays one term | [`?view=phrases`](https://abthiago.github.io/word-cloud/?view=phrases) |
| Single words | Answers broken into individual words, stop words removed | [`?view=words`](https://abthiago.github.io/word-cloud/?view=words) |
| Motion | The phrases view, animated — for playing on screen while the room fills up | [`?view=motion`](https://abthiago.github.io/word-cloud/?view=motion) |

`Save PNG` exports the cloud at 2× for a slide or a print. It always exports
on white in the light-mode colours and with every term at its resting
position, so the file is the same picture whether you took it in dark mode or
part-way through the animation.

## The Motion view

Motion reuses the phrases layout and animates it, rather than placing terms on
the fly — so nothing overlaps and no term is dropped, which is the usual
failure of an animated word cloud. Three things move at once:

- **Entrance** — terms fade and grow into place, staggered, so the room watches
  the cloud assemble instead of arriving at a wall of type.
- **Drift** — a slow per-term wander. Small terms roam further than large ones,
  which is what stops the whole plate looking like jelly.
- **Spotlight** — attention travels through the terms, largest first, lifting
  one and settling the rest. It loops seamlessly, so it reads like a GIF
  without being one.

Colour never changes during the animation. Colour is the frequency encoding
here, so borrowing it for emphasis would say something untrue about the data.

A **Pause** button appears under the plate whenever Motion is running. If your
system is set to *reduce motion*, the cloud is held still and says so — the
constants that drive the animation are in the `MOTION` block at the top of the
motion section in [`app.js`](app.js) if you want it faster or calmer.

## Dark mode

The button between the view switch and **Build** in the top right toggles dark
mode. On a first visit the page follows your operating system, and it keeps
following it if you change that setting while the page is open; once you use
the button, your choice is remembered in this browser and the system setting is
ignored.

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
   who submitted the form gave keywords.
2. Splits each answer on commas, semicolons, periods, slashes and newlines,
   because that is how participants separated their terms.
3. Applies a small set of **editorial rewrites**, all listed in the `REWRITES`
   dictionary at the top of the script. Two people answered in sentences rather
   than terms, and two phrases were too long to read at display size, so:
   `How can Elsevier AI support us` → `Elsevier AI Support`,
   `AI in Literature search and analysis` → `AI in Literature Search`,
   `Scaling up projects faster` → `Scaling Up Projects`, and
   `cost efficient` → `Cost Efficiency`.
4. **Weights** each phrase by its most-mentioned content word across the whole
   set of answers. `AI` was raised by two participants three times over, so the
   three phrases containing it carry weight 3; `Data` appears twice, so `Data`
   and `Data Harmonization` carry weight 2; everything else carries weight 1.
   This is why three AI phrases dominate the cloud — it reflects how often the
   theme came up, not an editorial choice.

Colour encodes the same weighting rather than decorating it: orange for the
theme raised most often, near-black for themes raised more than once, grey for
those raised once, and blue for terms added by hand.

## Sources

- **Participant keywords:** Microsoft Forms export
  `Round table participants 24 08 2026.xlsx`, sheet `Sheet1`, column
  `Keywords – what's on your mind? (The purpose of this is to create a relevant
  word cloud)`. Seven submissions, six containing keywords. Extracted
  2026-09-08 by `build-dataset.py`.
- The spreadsheet itself is **not in this repository** and is not published. It
  lives only in the account manager's OneDrive.

### Why the spreadsheet is not committed

GitHub Pages is free only for public repositories, so everything committed here
is world-readable. The registration export contains participant names, work
e-mail addresses, job titles and dietary requirements, which must not be
published. `.gitignore` therefore excludes `*.xlsx`, `*.xls` and `*.csv`, and
only the anonymised keyword terms in `data/presets.js` are committed.

If you clone this repository and want to regenerate the dataset, you need your
own copy of the spreadsheet placed next to `build-dataset.py`.

## Hosting it yourself

The page is three static files plus a data folder, so any static host works.
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
| `app.js` | Term processing, the three views, the motion engine, theming, colour weighting, PNG export |
| `data/presets.js` | Generated dataset — do not edit by hand |
| `data/manual-terms.js` | Hand-edited extra terms — safe to edit, never regenerated |
| `build-dataset.py` | Turns the spreadsheet into `data/presets.js` |

[d3](https://d3js.org/) and
[d3-cloud](https://github.com/jasondavies/d3-cloud) load from jsDelivr;
IBM Plex Sans loads from Google Fonts. Nothing else is fetched, and nothing
leaves the browser.
