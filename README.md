# deshaunwalker.art

An interactive three-dimensional portfolio for the painter **Deshaun Walker**.

Live site: [deshaunwalker.art](https://deshaunwalker.art)

---

## About the project

Most artist sites are flat catalogs — a JPEG, a caption, a price. This one is built to feel closer to standing in front of the work.

Each painting in the collection has been photogrammetrically reconstructed as a three-dimensional canvas, rendered in real time in the browser through WebGL. Visitors can rotate the work, examine the impasto and edges, place the piece on their own wall in augmented reality, or fall back to a clean two-dimensional view. The interface itself is an exercise in restraint: an iOS-26-inspired *Liquid Glass* surface that frames the work without competing with it.

The result is a portfolio that doubles as a gallery — viewable on a phone, a laptop, or, through AR, on the visitor's actual wall.

---

## Featured highlights

- **Real-time 3D carousel** on the landing page — eight signature works rotate in a hover-responsive carousel rendered with Three.js.
- **3D works grid** on the *Works* page — the full catalog presented as a grid of live, individually controllable canvases.
- **AR placement** — every painting page offers a *View in AR* action that launches WebXR, Scene Viewer (Android), or Quick Look (iOS) so visitors can hang the piece on their own wall before they ever consider buying.
- **2D fallback** — a high-resolution photographic view of each painting, presented in a glass modal for visitors who simply want to see the image.
- **Spinning logo, ambient radio, downloadable CV** — small details that make the site feel inhabited rather than generic.
- **Liquid Glass UI** — translucent panels with backdrop blur, layered specular highlights, and hairline borders, applied consistently across navigation, content panels, and modal surfaces.
- **Aggressive asset preloading and texture deduplication** — paintings share a single canonical canvas texture, and critical model assets are preloaded in parallel during HTML parse so the gallery is interactive almost immediately.

---

## The collection

| # | Title | Medium |
|---|-------|--------|
| 1 | Unrequited Love | Acrylic with pastel on canvas, 40 × 30 in |
| 2 | Self-Portrait | Acrylic with pastel on canvas, 20 × 20 in |
| 3 | Starry Knight | Acrylic with pastel on canvas, 24 × 30 in |
| 4 | Death of Self | Acrylic with pastel on canvas, 40 × 40 in |
| 5 | Eternal Youth | Acrylic with pastel on canvas, 36 × 36 in |
| 6 | Faith | Acrylic with pastel on canvas, 40 × 30 in |
| 7 | Feeling Bloom | Acrylic with pastel on canvas, 20 × 16 in |
| 8 | Goodbye | Acrylic with pastel on canvas, 20 × 16 in |
| 9 | Hell | Acrylic with pastel on canvas, 30 × 40 in |
| 10 | Perseverance | Acrylic with pastel on canvas, 16 × 20 in |
| 11 | Reflection | Acrylic with pastel on canvas, 24 × 30 in |
| 12 | Rejoice! He Will Provide | Acrylic with pastel on canvas, 24 × 30 in |

---

## Technology

Built as a static site, intentionally — fast, durable, and dependency-light.

- **Three.js (r129)** — WebGL scenes for the carousel, the works grid, and every painting page
- **GLTFLoader** — `.gltf` + `.bin` + texture pipeline for the painting models
- **`<model-viewer>` 3.5.0** — augmented-reality presentation across WebXR, Scene Viewer, and Quick Look
- **Jekyll / GitHub Pages** — pretty permalinks (`/about/`, `/catalog/`, `/contact/`) and zero-config hosting
- **Formspree** — server-less contact form handling
- **Vanilla CSS** — no framework, no build step; the *Liquid Glass* panels are hand-tuned with `backdrop-filter`, gradient layering, and inset specular highlights

No bundler, no transpiler, no node_modules. The site is the source.

---

## Repository layout

```
.
├── index.html              # Landing page — 3D carousel of featured works
├── about.html              # Artist bio + interactive 3D portrait
├── catalog.html            # Full works grid
├── contact.html            # Glass-paneled contact form (Formspree)
├── catalog/
│   └── 1.html … 14.html    # Individual painting pages w/ 3D + AR + 2D
├── models/
│   ├── _shared/            # Deduplicated canvas textures
│   ├── logo.v2.glb         # Spinning home-link logo
│   ├── Heavenly_Guardians_*.glb   # About-page hero model
│   └── painting_*/         # Per-painting GLTF + bin + textures
├── assets/                 # Favicons, video background, CD/CV imagery, CV PDF
├── music/                  # Ambient radio playlist (mp3)
├── CNAME                   # deshaunwalker.art
└── README.md
```

---

## Running locally

The site is plain HTML — most pages will open with a double-click — but the navigation uses Jekyll permalinks (`/about/`, `/catalog/`, `/contact/`), so to exercise those locally you'll want a Jekyll server:

```bash
bundle exec jekyll serve
# → http://127.0.0.1:4000
```

Or, for a quick non-permalinked preview, any static file server will do:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

---

## Deployment

The repository is deployed by GitHub Pages. The `CNAME` file points the apex domain *deshaunwalker.art* at the Pages build; pushing to `main` is the entire deploy process.

---

## Credits

Paintings, photography, and concept by **Deshaun Walker**.
Site engineered with care by his collaborators.
