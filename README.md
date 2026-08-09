# Ritika's Memory Arcade

A mobile-first, single-page birthday experience built with React, Vite, Tailwind CSS, and Framer Motion. It combines a wizarding-school-meets-scrapbook memory map, a relationship quiz, a birthday message, an elegant ad-free Happy Birthday instrumental, and a timed five-surprise finale.

The site also includes mobile-sized, metadata-stripped WebP photography, a custom favicon, and a 1200×630 social-sharing preview image. Original JPEG photographs are kept in a private backup outside the deployed project so the public site exposes only the optimized copies.

## Experience

1. Personalized magical Happy Birthday welcome screen with optional music
2. Seven-location relationship memory map with photographs and stories
3. Five-question multiple-choice quiz with affectionate hints
4. Birthday message unlocked after a perfect score
5. Five surprise tickets revealed in this order:
   - Harry Potter wand
   - The Shard
   - South Indian meal
   - Thames cruise
   - Warner Bros. Harry Potter Studio Tour

The wand and The Shard are both available immediately, one after the other. Revealing The Shard starts a one-hour wait before the South Indian meal, and every later reveal starts another one-hour wait before the following ticket. The opening stage, visited memories, partial quiz progress, quiz completion, revealed tickets, and exact unlock times are stored in the visitor's browser using `localStorage`. They survive page refreshes and closing and reopening the browser on the same device.

The flexible ticket labels `DATE TO BE REVEALED` and `SAILING SOON` are intentional final copy for now: they preserve the surprise until the bookings are ready. Replace them in `src/memoryData.js` when the real dates should be shown.

## Project structure

- `src/memoryData.js` — names, stories, quiz answers, ticket copy, image paths, and theme values
- `src/App.jsx` — experience logic, accessible dialogs, music controls, quiz, and timed reveals
- `src/index.css` — scrapbook layout, responsive styling, animation, and print styles
- `public/photos/` — optimized welcome and relationship photographs
- `public/surprises/` — optimized finale ticket images
- The music control plays `public/audio/happy-birthday-instrumental.mp3`, an elegant arrangement of the traditional Happy Birthday melody generated specifically for this site. It is ad-free, loops gently, loads only after a visitor taps Play, and does not open an external player.
- Regenerate the soundtrack with `python3 scripts/generate_wizarding_waltz.py public/audio/happy-birthday-instrumental.mp3` (requires `ffmpeg`).

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

The experience uses these browser storage keys:

- `memory-arcade-experience-progress-v1` — opening stage, visited memories, and partial quiz progress
- `memory-arcade-unlocked` — quiz completion
- `memory-arcade-surprise-progress-v1` — revealed ticket count and next unlock time

Within the website, the password-protected **Thanos reset** is the only control that clears progress. Clearing the browser's site data outside the website will also remove device-local progress. Because the website is entirely static, the timer is a playful client-side lock rather than a tamper-proof security control, and progress does not transfer automatically to another device or browser.

Before presenting the site, use the footer's **Thanos reset** button, enter the case-sensitive reset password `GV`, and confirm the warning. It clears quiz completion, visited memories, revealed surprise tickets, active countdowns, music playback, modal state, and the URL hash, then returns to the welcome screen and question one. Cancelling the warning or entering the wrong password preserves all progress.

The `GV` check is intentionally a client-side accident guard, not secure authentication. Because this is a static website, a determined visitor can inspect its bundled JavaScript or clear browser site data themselves.

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
