# Ritika's Memory Arcade

A mobile-first, single-page birthday experience built with React, Vite, Tailwind CSS, and Framer Motion. It combines a scrapbook-style memory map, a relationship quiz, a birthday message, instrumental music, and a timed five-surprise finale.

The site also includes mobile-sized, metadata-stripped WebP photography, a custom favicon, and a 1200×630 social-sharing preview image. Original JPEG photographs are kept in a private backup outside the deployed project so the public site exposes only the optimized copies.

## Experience

1. Personalized Happy Birthday welcome screen with optional music
2. Seven-location relationship memory map with photographs and stories
3. Five-question multiple-choice quiz with affectionate hints
4. Birthday message unlocked after a perfect score
5. Five surprise tickets revealed in this order:
   - Harry Potter wand
   - The Shard
   - South Indian meal
   - Thames cruise
   - Warner Bros. Harry Potter Studio Tour

The first surprise is available immediately. Revealing each ticket starts a one-hour wait before the next one can be opened. Progress and unlock times are stored in the visitor's browser using `localStorage` and survive page refreshes.

The flexible ticket labels `DATE TO BE REVEALED` and `SAILING SOON` are intentional final copy for now: they preserve the surprise until the bookings are ready. Replace them in `src/memoryData.js` when the real dates should be shown.

## Project structure

- `src/memoryData.js` — names, stories, quiz answers, ticket copy, image paths, and theme values
- `src/App.jsx` — experience logic, accessible dialogs, music controls, quiz, and timed reveals
- `src/index.css` — scrapbook layout, responsive styling, animation, and print styles
- `public/photos/` — optimized welcome and relationship photographs
- `public/surprises/` — optimized finale ticket images
- `public/audio/` — local instrumental Happy Birthday track
- `scripts/generate_birthday_song.py` — reproducible backing-track generator

## Run locally

Requires a current Node.js LTS release.

```bash
npm install
npm run dev
```

All direct dependencies are pinned to exact versions in `package.json`, and `package-lock.json` is committed for reproducible installs. Prefer `npm ci` in deployment and CI environments.

Open the local address printed by Vite, normally `http://localhost:5173`.

## Verify

```bash
npm test
npm run build
npm run preview
```

The production build is written to `dist/`.

## Personalization

Most editable content lives in `src/memoryData.js`. Quiz answer indexes are zero-based: `0` is the first option, `1` the second, and `2` the third.

The finale timer uses these browser storage keys:

- `memory-arcade-unlocked` — quiz completion
- `memory-arcade-surprise-progress-v1` — revealed ticket count and next unlock time

Clearing browser site data resets the experience. Because the website is entirely static, the timer is a playful client-side lock rather than a tamper-proof security control.

Before presenting the site, use the footer's **Thanos reset** button and confirm the warning. It clears quiz completion, visited memories, revealed surprise tickets, the one-hour countdown, music playback, modal state, and the URL hash, then returns to the welcome screen and question one. Cancelling the warning preserves all progress.

## Deployment

The website has no backend and can be deployed to any static host.

### Vercel or Netlify

Connect the GitHub repository and use:

- Build command: `npm run build`
- Output directory: `dist`

### GitHub Pages

The included `.github/workflows/deploy-pages.yml` workflow builds and deploys the site automatically whenever `main` is updated. It supplies `/Birthday-bash/` as Vite's production base path while local and Sites builds continue to use `/`.

After GitHub Pages is enabled with **GitHub Actions** as its source, the live URL is:

`https://gopinathvarad.github.io/Birthday-bash/`

### OpenAI Sites

The production build also creates the lightweight Cloudflare Worker entry point required by Sites. Hosting metadata lives in `.openai/hosting.json`; do not replace its `project_id` after the first deployment.

## Privacy

The page includes `noindex`, `nofollow`, and `noarchive` metadata, but anyone with the deployed URL can still view its content. Prefer a private source repository where possible. Avoid publishing addresses, booking references, private itinerary details, or photographs without permission.

## Credits

Made for Ritika by Gopinath Varadarajan.
