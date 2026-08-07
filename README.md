# Ritika's Memory Arcade

A mobile-first, single-page birthday experience built with React, Vite, Tailwind CSS, and Framer Motion. It combines a scrapbook-style memory map, a relationship quiz, a birthday message, instrumental music, and a timed five-surprise finale.

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

## Project structure

- `src/memoryData.js` — names, stories, quiz answers, ticket copy, image paths, and theme values
- `src/App.jsx` — experience logic, accessible dialogs, music controls, quiz, and timed reveals
- `src/index.css` — scrapbook layout, responsive styling, animation, and print styles
- `public/photos/` — welcome and relationship photographs
- `public/surprises/` — five finale ticket images
- `public/audio/` — local instrumental Happy Birthday track
- `scripts/generate_birthday_song.py` — reproducible backing-track generator

## Run locally

Requires a current Node.js LTS release.

```bash
npm install
npm run dev
```

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

## Deployment

The website has no backend and can be deployed to any static host.

### Vercel or Netlify

Connect the GitHub repository and use:

- Build command: `npm run build`
- Output directory: `dist`

### GitHub Pages

For a project site hosted at `https://USERNAME.github.io/REPOSITORY/`, configure Vite's `base` option and update root-relative public asset paths before deploying. A root-domain deployment does not require that repository prefix.

## Privacy

The page includes `noindex`, `nofollow`, and `noarchive` metadata, but anyone with the deployed URL can still view its content. Prefer a private source repository where possible. Avoid publishing addresses, booking references, private itinerary details, or photographs without permission.

## Credits

Made for Ritika by Gopinath Varadarajan.
