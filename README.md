# kameronyork.com — site source

RMarkdown source for [kameronyork.com](https://www.kameronyork.com), knitted
in RStudio and deployed via GitHub Pages.

## Structure

```
index.html               Homepage (hand-written static — see "Static pages")
blog/                    Blog posts
parables/                Parable articles
projects/
  conference/            General Conference analysis project
  movie-draft/           Box office draft competitions
  crossword/             Crossword leaderboard tooling
gospel-buddy/            Gospel Buddy extension pages
datasets/                Published JSON/CSV datasets
contact/                 Contact page (moved from /docs/contact/)
resume/                  Resume page
docs/contact/            Redirect stub only — keeps the old contact URL alive
_includes/               Shared partials (head, nav, footer, back bars)
  meta/                  Per-page Open Graph / Twitter tags, one file per page
_drafts/                 Work-in-progress, not linked or knitted
_archive/                Old backups and stray data files
assets/
  css/                   site.css (shared), articles.style.min.css, style.min.css
  js/                    Site scripts
  img/                   All images
  vendor/                Third-party libs (bootstrap, jquery, highlight, ...)
scripts/                 knit-all-files.R and data-fetch scripts
tools/chrome-extension/  Chrome extension source (not part of the website)
sitemap.xml, robots.txt, CNAME, .nojekyll
```

## How pages are put together

Every `.Rmd` pulls the same shared partials by their **live URL**:

```yaml
output:
  html_document:
    includes:
      in_header: "https://www.kameronyork.com/_includes/head-shared.html"
      before_body:
        - "https://www.kameronyork.com/_includes/nav.html"
        - "https://www.kameronyork.com/_includes/backbar-parables.html"
      after_body: "https://www.kameronyork.com/_includes/footer.html"
```

Absolute URLs mean paths resolve the same no matter how deep a page sits —
no `../` counting and no "file not found" when knitting.

**This replaced 49 near-identical header files** in `parables/headers/`,
`blog/headers/`, `gospel-buddy/headers/`, `projects/conference/headers/` and
`projects/movie-draft/headers/`. They were clones differing only in `<title>`
and Open Graph tags, and had drifted badly — several pages were serving Open
Graph tags copy-pasted from an unrelated article (see "What was fixed").

### Push before you knit

Includes are fetched over the network at knit time, so knitting uses
whatever is **currently live**, not your local copy:

1. Edit `_includes/*.html` or any asset.
2. **Commit and push. Wait for GitHub Pages to deploy.**
3. *Then* knit.

Knitting before pushing silently builds pages against the old partials.

`.nojekyll` at the repo root is what lets GitHub Pages serve the
underscore-prefixed `_includes/` folder. **Do not delete it** — without it
Jekyll strips `_`-prefixed directories and every include URL 404s.

## The navbar

`_includes/nav.html` is the one and only navbar. Edit it there and every
knitted page updates.

There is deliberately **no brand text on the left**. Bootstrap styles
`.navbar-brand` differently from `.nav-link` (larger, different weight), so a
label there looked mismatched against the rest of the bar. This matches the
mygospelbuddy.com nav, which is also links-only. "Home" is still the first
item in the link list on the right, so there is always a way back to the top
of the site.

## Section back bars

A slim bar under the navbar returns readers to the index of the section
they're in. Pages opt in by adding the relevant partial to `before_body:`:

| Partial | Returns to |
|---|---|
| `backbar-parables.html` | `/parables/` |
| `backbar-movie-draft.html` | `/projects/movie-draft/` |
| `backbar-projects.html` | `/projects/` |
| `backbar-blog.html` | `/blog/` |
| `backbar-conference.html` | the conference project |
| `backbar-gospel-buddy.html` | `/gospel-buddy/` |

Section index pages deliberately get the *parent* bar (or none) rather than
a link to themselves — e.g. `/projects/movie-draft/index.Rmd` links back to
`/projects/`. Styling lives in `.gb-backbar` in `assets/css/site.css`.

## Open Graph tags per page

Each page has its own metadata file in `_includes/meta/`, loaded through the
`in_header:` list in that page's YAML:

```yaml
      in_header:
        - "https://www.kameronyork.com/_includes/head-shared.html"
        - "https://www.kameronyork.com/_includes/meta/parables-sower.html"
```

The first file is the shared head (fonts, css, js) used by every page. The
second holds only this page's description, canonical link, Open Graph, and
Twitter card tags. To change how a page looks when shared in iMessage,
Twitter/X, Facebook, Slack, or Discord, edit its file in `_includes/meta/`
-- nothing else changes and no other page is affected.

Files are named after the page's route: `parables-sower.html`,
`projects-movie-draft-wise-family-2026-1.html`, `blog-e-reader-ocr.html`,
`home.html`, and so on.

### Why these are separate files and not YAML

An earlier version of this setup put the tags in a `header-includes:` block
inside each `.Rmd`, which would have been tidier. **That does not work in
this project's rmarkdown/pandoc version** -- the block rendered as nothing at
all and every page's link previews came out blank (verified with
opengraph.xyz: og:image, og:description, twitter:card and the meta
description were all missing).

Loading the tags with the `metathis` package in an R chunk was also tried and
does not work here either -- with `include=FALSE` the tags never render, and
without it the raw HTML gets dumped into the page body instead of the
`<head>`.

Passing them as an include file is the mechanism that has always worked on
this site: it is how the movie drafts and the e-reader OCR post had working
previews before the reorg.

## Why `.gb-fullbleed`

rmarkdown puts `before_body` content *inside* its max-width
`main-container`, so the nav and back bar would stop short of the window
edges. The old headers got full width by accident — each was a complete
`<!DOCTYPE><html><head>...<body>` document injected into `<head>`, so the
browser abandoned `<head>`, opened `<body>` early, and dropped the nav
outside the container. Right look, invalid markup.

`.gb-fullbleed` reproduces that width from valid markup with `100vw` plus
negative margins. **Keep this class on the `<header>` in `nav.html` and on
the back bars** — removing it re-breaks the layout.

## Static pages

These are hand-written HTML, not knitted from `.Rmd`, so their navs are
**inlined** rather than pulled from `_includes/nav.html`:

- `index.html` (homepage — keeps its dark hero nav over the banner image)
- `parables/index.html`, `projects/index.html`, `blog/index.html`
- `projects/conference/index.html`, `resume/index.html`, `hans-certificate.html`

Their nav links and Home brand have been brought in line with the shared
nav. **If you change `_includes/nav.html`, mirror it in these files.**
Converting them to `.Rmd` would put them on the shared nav, but their
full-width hero sections would need re-testing inside `main-container`.

## Re-knitting

```r
source("scripts/knit-all-files.R")
```

## What was fixed in the reorg

- 49 duplicate header files removed; nav/head/footer now single-source.
- Open Graph tags corrected on pages serving another article's metadata:
  contact, `projects/skyscrapers`, `blog/quotes`, `blog/quote-collecting`,
  `datasets/info/conference-talks`, `randomstring`.
- Broken image references fixed: `HeaderImage.png` -> `header-image.png`,
  `blue-marker.png` -> `marker-blue.png` (and red/yellow).
- Host names normalized — the site was mixing `kameronyork.com`,
  `www.kameronyork.com`, `kameronyork.github.io`, and
  `raw.githubusercontent.com` for the same files.
- CRLF line endings normalized to LF.
- `docs/knit-all-files.R` rewritten (it pointed at a hardcoded Windows path).
- Contact moved `/docs/contact/` -> `/contact/` with a redirect stub behind it.

## Known open items

- `parables/hidden-treasure-pearl.rmd` outputs to `hidden-treasure-pearl.html`
  but its canonical/OG URL historically pointed at `/parables/pearl.html`.
  Confirm which URL you actually publish and align them.
- `_drafts/` holds `test.rmd`, `randomstring.Rmd`, and
  `ministering-districts.Rmd`. Delete or promote them when you decide.
- **All `.html` files are stale build output** until you re-knit.
