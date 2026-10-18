# Hedgehog OC Machine

Spin two reels and get a random Sonic-style fan character: **"(Name) the (Animal)"**, like *Todd the Pangolin* or *Nevaeh the Bobbit Worm*.

The whole app is one self-contained file, `index.html` (~160 KB before you add your own art and sounds). There's no build step and nothing to install. The fonts are embedded, so it works offline.

## Use it

- **On a computer:** double-click `index.html`.
- **On a phone:** open the file from the Files app or Google Drive. If you only see a static preview, choose "Open in Chrome" or "Open in Safari".
- **As a home-screen app:** put `index.html` on any static host (GitHub Pages, Netlify Drop), open it, then use "Add to Home Screen".

## What it does

1. **Start screen:** tap **Press Start**, then type your name and press Enter (or **Let's Go!**). Phones play no sound until something is tapped, so Press Start is where sound is unlocked (with a click); the opening theme starts when the name goes in.
2. **Intro:** "Hey (Name), let's see your best Sonic fan art! Are you ready to meet your character?" types itself out while up to six fan-art cards spin out of the centre one at a time, growing, and land in free spots around the text; the next one leaves as the last one lands. It takes about 6.5 s; Enter, Space or a tap skips to the end. On short landscape phones only four cards fit.
3. **Create My Character** appears. Pressing it spins both reels for about 5 seconds, Price-is-Right style. The name reel stops at 4.3 s and the species reel at 5.0 s.
4. After 1.5 s of stillness, the name slams in with a ring burst, a ring chime, an act-clear fanfare, and pixel critters that hop around for about 10 s and then leave. Once everything settles the page stops animating, so it doesn't drain a phone battery while it sits open.
5. Tap the species to open its Wikipedia article, which has a photo. **Copy name** and **Share** (on phones) appear under the result. **Create Another** spins again, and **Next Player** goes back to the name card with a fresh score for the next person (the mode stays as it is).

Space bar spins on desktop and Esc closes the result. **SOUND: ON/OFF** mutes everything and remembers your choice.

The backdrop is an original drawing in the spirit of a 16-bit "green hill" stage: checkered loop, palm trees, water and mountains. No Sega artwork is used.

## After Dark mode

A party setting. On the name card, tap **After Dark 18+**; it asks (with a straight face) whether you are 18, and **...no** keeps Classic. The HUD button **AFTER DARK: ON/OFF** flips it at any time, including between spins. In After Dark:

- The sky goes night-purple and the buttons go pink.
- Names are prank names and worse (Mike Oxlong, Blue Balls McGee, Two-Pump Tony, Blast Processing Brad...).
- Every species is still a real animal; they are just the ones with unfortunate names (Booby, Great Tit, Slippery Dick, Sexy Shrimp...). The Wikipedia link still works, which is the joke. The 79 After Dark titles were checked against the MediaWiki API on 2026-10-15 (all but three, which only hit rate limits: Beaver, Booby and Cockatoo, whose articles are plainly named).
- The reveal adds a one-line bio ("Gotta go fast. In bed. Unfortunately."). The bio is included when you share, not when you copy the name.

It is crude and knows it: sex jokes, prank names and bios that admit they were generated for a party. Nothing targets a real person, and the canon Sonic cast is kept out of the dirty jokes.

## The freak spin

One spin in twenty, in either mode, is a freak: the screen goes to red alarm stripes with **FREAK INCOMING** and the `freak` sound, then the reels pair gross (real) animals with names that are gross themselves or wildly wrong for them, such as Pustule Pete, Princess Sparkle, Great-Aunt Mildred or Kevin from Accounts, with everything gold turned red. The reveal adds a bio ("Wikipedia has pictures. Please don't."), gives 666 points instead of 1000, and takes all your rings, because a freak counts as a hit. With the drowning countdown embedded as `freak`, the reels spin at full speed until the countdown's last few seconds, land as it runs out, and the reveal follows at once on the `freakReveal` sting. Open the page with `?freak` on the URL to force the next spin, for showing it off. The 65 freak species were checked against the MediaWiki API on 2026-10-15.

## Fan art for the intro

The page ships with six placeholder cards: original goofy critters drawn in code, not Sega characters. To show real fan art instead:

1. Put images in `assets/fanart/` (PNG, JPG, WebP or GIF; about 400 px wide keeps the page small). **Only use pieces you have the artist's permission to use.**
2. Optionally add `assets/fanart/credits.json` with a caption and credit per file: `{ "kevin.png": { "caption": "Kevin the Shrimp", "credit": "art by @someone" } }`. Add `"hero": true` to one piece to make it the finale: it is always shown, always last, lands big in the centre of the screen and holds for 2 s, then flashes across the background as **Create My Character** appears. It stays out of sight until then, including on the start screen.
3. Run `npm run embed-assets`. This copies the files into `index.html`, so the page stays a single offline file.

When any fan art is embedded, only those images are shown (six at random if there are more, the hero always among them) and the placeholders are not used.

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

Every built-in sound is an original chiptune sound synthesized in the browser with Web Audio. Files you embed yourself (below) are whatever you choose to add.

### Adding permanent sound effects

Put a file named after its cue in `assets/sounds/` (MP3, WAV, OGG or M4A), for example `assets/sounds/whoosh.mp3`, then run `npm run embed-assets`. The file is embedded in `index.html`, replaces that cue's built-in sound, and is level-matched to the loudness below when the page starts. Delete the file and run the command again to go back to the built-in sound.

| Cue | Plays when | Matched to |
|---|---|---|
| `start` | the name is entered (Enter or **Let's Go!**) | −22 dBFS |
| `type` | every other letter of the greeting types out | −34 dBFS |
| `whoosh` | each fan-art card launches | −28 dBFS |
| `land` | each card lands | −28 dBFS |
| `ready` | Create My Character appears | −20 dBFS |
| `press` | Press Start and Create My Character are pressed | −24 dBFS |
| `tick` | each item passes on the wheel | −27 dBFS |
| `reelStop` | each reel stops | −26 dBFS |
| `ring` | the ring burst on the reveal (7 times) | −26 dBFS |
| `jingle` | the act-clear fanfare on the reveal | −18 dBFS |
| `freak` | the "FREAK INCOMING" alarm; a clip longer than 4 s (the drowning countdown) sets the spin's length: the reels stop as it ends and the reveal follows at once | −20 dBFS |
| `freakReveal` | the freak reveal itself (the death sting), in place of the fanfare and ring burst | −18 dBFS |

To turn a cue off entirely, add an empty file named `<cue>.silent` (for example `assets/sounds/whoosh.silent`) and run `npm run embed-assets`. Short, dry clips work best for `type`, `tick` and `reelStop`; they play many times in a row. The `ring` cue normally fires seven times for a burst; a ring clip longer than 0.4 s plays once instead.

Levels of the original sounds were measured by rendering offline, not set by ear. The built-in sounds for the newer cues (`start`, `type`, `whoosh`, `land`, `ready`, `press`, `reelStop`) have not been measured yet; their gains were set conservatively below the fanfare.

| Sound | Peak | Loudness (RMS) |
|---|---|---|
| Wheel tick | 0.32 | −27 dBFS |
| Built-in ring chime | 0.14 | −30 dBFS |
| Built-in fanfare | 0.49 | −18 dBFS |
| An embedded clip (after matching) | ≤ 0.95 | the cue's target above |

## Checks

```sh
npm install                        # Playwright is pinned to 1.56.1 in package-lock.json
npx playwright install chromium    # downloads the browser build that version expects
npm test             # at 4 screen sizes: start screen, intro timing, card placement, spin, reveal,
                     # link, copy, offline; then the loop stops, intro skip, Space/Esc, mute memory,
                     # embedded sounds and fan art, and the hero card
npm run embed-assets # copies assets/sounds and assets/fanart into index.html
npm run check-wiki   # verifies every species links to a real, non-disambiguation Wikipedia article
```

Run `check-wiki` whenever you add or rename a species. Many animal names land on a disambiguation page ("Fisher", "Mara", "Turkey"); give those an entry in the `WIKI` map. The last full check, on 2026-09-30, found 0 missing articles and 0 disambiguation pages among 410 species.

## Not yet verified

- How it sounds. The tests run headless and can't listen. The newer built-in cues are not level-measured.
- The intro and backdrop on a real phone; layout was checked in headless Chromium at 320×568, 390×780, 740×360 and 1280×800.
- iOS Safari, phone Files-app viewers, and the Share sheet on a real device.
- Text outlines on Chrome older than 123, which lacks `paint-order` on HTML text. Text would look thinner there but stay readable.

## History

This started in the RoboList repo (closed PR adkinsry/RoboList#147) and was moved here with its commit history.

## License

The code and word lists are released into the public domain under [the Unlicense](LICENSE).

The three fonts embedded in `index.html` (Titan One, Nunito, Press Start 2P) are not covered by that dedication. They stay under the [SIL Open Font License 1.1](https://openfontlicense.org/), which allows embedding and redistribution. Sonic the Hedgehog is a Sega trademark, and this fan project isn't affiliated with Sega.
