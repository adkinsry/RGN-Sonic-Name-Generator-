# Hedgehog OC Machine

Spin two reels and get a random Sonic-style fan character: **"(Name) the (Animal)"**, like *Todd the Pangolin* or *Nevaeh the Bobbit Worm*.

The whole app is one self-contained file, `index.html` (~135 KB). There's no build step and nothing to install. The fonts are embedded, so it works offline.

## Use it

- **On a computer:** double-click `index.html`.
- **On a phone:** open the file from the Files app or Google Drive. If you only see a static preview, choose "Open in Chrome" or "Open in Safari".
- **As a home-screen app:** put `index.html` on any static host (GitHub Pages, Netlify Drop), open it, then use "Add to Home Screen".

## What it does

1. **Make a Character** spins both reels for about 5 seconds, Price-is-Right style. The name reel stops at 4.3 s and the species reel at 5.0 s.
2. After 1.5 s of stillness, the name slams in with a ring burst, a ring chime, an act-clear fanfare, and pixel critters that hop around for about 10 s and then leave. Once everything settles the page stops animating, so it doesn't drain a phone battery while it sits open.
3. Tap the species to open its Wikipedia article, which has a photo. **Copy name** and **Share** (on phones) appear under the result. **Create Another** spins again.

Space bar spins on desktop and Esc closes the result. **SOUND: ON/OFF** mutes everything and remembers your choice.

## The word pools

| Reel | Pool | Entries | Odds |
|---|---|---|---|
| Name | Plain names (Todd, Brenda…) | 120 | 1/3 |
| Name | Newer names (Aiden, Jaxon…) | 100 | 1/3 |
| Name | Sega-style (Torque, Nimbus…) | 120 | 1/3 |
| Species | Unusual animals | 378 | 90% |
| Species | Pets and farm animals | 32 | 10% |

That makes 139,400 possible characters. Hedgehog, fox and echidna are left out (Flying Fox too, since it reads like a fox), and so are existing Sonic character names I know of. That second exclusion is from memory; the comics canon is not fully checked. A spot check on 2026-09-30 found Tumble, an IDW comics skunk, still in the list, and it was replaced.

The lists, the `WIKI` link overrides and the timing constants (`NAME_SPIN_MS`, `ANIMAL_SPIN_MS`, `HOLD_MS`) are all near the top of the script in `index.html`.

## Sound

No Sega audio ships with this page. The fanfare and ring chime are original chiptune sounds, synthesized in the browser with Web Audio.

**Use your own sound clips** lets you pick a jingle and a ring sound from your device. Clips are decoded in memory, never uploaded, and forgotten when the page closes. They are level-matched to the built-in sounds when loaded, and the picker shows the adjustment it applied.

Levels were measured by rendering offline, not set by ear:

| Sound | Peak | Loudness (RMS) |
|---|---|---|
| Wheel tick | 0.32 | −27 dBFS |
| Built-in ring chime | 0.14 | −30 dBFS |
| Built-in fanfare | 0.49 | −18 dBFS |
| Your jingle (after matching) | ≤ 0.95 | −18 dBFS |
| Your ring sound (after matching) | ≤ 0.95 | −26 dBFS |

## Checks

```sh
npm install                        # Playwright is pinned to 1.56.1 in package-lock.json
npx playwright install chromium    # downloads the browser build that version expects
npm test             # spins at 4 screen sizes (timing, reveal, link, copy, offline), then checks
                     # the loop stops, Space/Esc, mute memory and a custom clip
npm run check-wiki   # verifies every species links to a real, non-disambiguation Wikipedia article
```

Run `check-wiki` whenever you add or rename a species. Many animal names land on a disambiguation page ("Fisher", "Mara", "Turkey"); give those an entry in the `WIKI` map. The last full check, on 2026-09-30, found 0 missing articles and 0 disambiguation pages among 410 species.

## Not yet verified

- How it sounds. The tests run headless and can't listen.
- iOS Safari, phone Files-app viewers, and the Share sheet on a real device.
- Text outlines on Chrome older than 123, which lacks `paint-order` on HTML text. Text would look thinner there but stay readable.

## History

This started in the RoboList repo (closed PR adkinsry/RoboList#147) and was moved here with its commit history.
