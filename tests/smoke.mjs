// Headless smoke test: walks the start screen and intro, spins once at several screen sizes and
// checks the reveal, then checks behaviour and embedded assets on a desktop-sized page.
//   npm install && npx playwright install chromium && npm test
import { chromium } from "playwright";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const page_url = new URL("../index.html", import.meta.url).href;
const sizes = [[320, 568], [390, 780], [740, 360], [1280, 800]];
let failed = 0;
const check = (ok, msg) => { if (!ok) { failed++; console.log("  FAIL " + msg); } };

// Card boxes before rotation, from the inline styles the page sets.
const cardBoxes = (p) => p.$$eval(".fan-card:not([hidden])", (els) => els.map((el) => {
  const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform);
  const w = parseFloat(el.style.width), h = parseFloat(el.style.height);
  return { l: +m[1], t: +m[2], r: +m[1] + w, b: +m[2] + h };
}));
const overlap = (a, b) => a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;

const browser = await chromium.launch();
const ctx = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
for (const [w, h] of sizes) {
  const p = await ctx.newPage();
  await p.setViewportSize({ width: w, height: h });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  // The page must work offline: abort anything that is not the file itself.
  const net = [];
  await p.route("**/*", (r) => { if (r.request().url().startsWith("file:")) return r.continue(); net.push(r.request().url()); return r.abort(); });
  await p.goto(page_url);

  // Start screen: an empty name is refused, and Space does not spin behind it.
  await p.click("#startForm button[type=submit]");
  check(await p.isVisible("#start") && (await p.textContent("#startErr")).length > 0, "empty name was accepted");
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press(" ");
  check(!(await p.$eval("#go", (e) => e.disabled)), "Space started a spin behind the start screen");

  // A name with markup must show as plain text.
  await p.fill("#nameInput", "<b>Zed</b>");
  const t0 = Date.now();
  await p.press("#nameInput", "Enter");
  await p.waitForSelector("#createBtn.show", { timeout: 9000 }).catch(() => {});
  const introMs = Date.now() - t0;
  await p.waitForTimeout(100);
  const intro = await p.evaluate(() => ({
    text: document.getElementById("introText").textContent,
    tags: document.querySelectorAll("#introText b").length,
    center: document.getElementById("introCenter").getBoundingClientRect().toJSON(),
    btnShown: document.getElementById("createBtn").classList.contains("show"),
  }));
  const boxes = await cardBoxes(p);
  const c = intro.center, keep = { l: c.left, t: c.top, r: c.right, b: c.bottom };
  const inView = boxes.every((b) => b.l >= 0 && b.t >= 0 && b.r <= w && b.b <= h);
  const apart = boxes.every((a, i) => boxes.every((b, j) => i === j || !overlap(a, b)));
  const clearOfText = boxes.every((b) => !overlap(b, keep));
  check(intro.btnShown, `Create My Character did not appear (${introMs} ms)`);
  check(introMs >= 2500 && introMs <= 5500, `intro took ${introMs} ms, expected ~3.5 s`);
  check(intro.text.startsWith("Hey <b>Zed</b>, let's see your best Sonic fan art!") && intro.tags === 0, `greeting reads "${intro.text}"`);
  check(boxes.length >= (Math.min(w, h) >= 390 ? 6 : 4), `only ${boxes.length} fan-art cards fit`);
  check(inView, "a fan-art card is off screen");
  check(apart, "fan-art cards overlap each other");
  check(clearOfText, "a fan-art card covers the greeting");

  const t1 = Date.now();
  await p.click("#createBtn");
  let revealAt = null;
  while (Date.now() - t1 < 9000) {
    if (!(await p.$eval("#reveal", (e) => e.hidden))) { revealAt = Date.now() - t1; break; }
    await p.waitForTimeout(50);
  }
  await p.waitForTimeout(1000); // let the name and species finish sliding in (0.18 s delay + 0.55 s)
  const r = await p.evaluate(() => {
    const a = document.getElementById("rvAnimal");
    const box = a.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return {
      name: document.getElementById("rvName").textContent, animal: a.textContent,
      href: a.href, target: a.target, linkTappable: hit === a || a.contains(hit), hitBy: hit && hit.outerHTML.slice(0, 80),
      goText: document.getElementById("go").textContent,
      introGone: document.getElementById("intro").hidden,
      scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
    };
  });
  await p.click("#copyBtn");
  const clip = await p.evaluate(() => navigator.clipboard.readText());

  console.log(`${w}x${h}: intro ${introMs} ms, ${boxes.length} cards; ${r.name} the ${r.animal} (reveal at ${revealAt} ms)`);
  check(revealAt !== null && revealAt >= 6300 && revealAt <= 7500, `reveal timing ${revealAt} ms, expected ~6500 (5.0 s spin + 1.5 s hold)`);
  check(r.introGone, "intro overlay still up after the spin");
  check(r.name && r.animal, "reveal text empty");
  check(r.href.startsWith("https://en.wikipedia.org/wiki/") && r.target === "_blank", `species link ${r.href}`);
  check(r.linkTappable, `species link is covered by ${r.hitBy}`);
  check(r.goText === "Create Another", `button reads "${r.goText}"`);
  check(r.scrollW <= r.innerW, `horizontal scroll: ${r.scrollW} > ${r.innerW}`);
  check(clip === `${r.name} the ${r.animal}`, `clipboard holds "${clip}"`);
  check(net.length === 0, `network requests: ${net.join(", ")}`);
  check(errors.length === 0, `page errors: ${errors.join("; ")}`);
  await p.close();
}

// Enter a name and skip the intro with a second Enter, then open the machine.
async function enterMachine(p, name = "Pat") {
  await p.fill("#nameInput", name);
  await p.press("#nameInput", "Enter");
  await p.waitForTimeout(150);
  await p.keyboard.press("Enter");
  await p.waitForSelector("#createBtn.show", { timeout: 1500 });
  await p.click("#createBtn");
}

// Behaviour checks on one desktop-sized page.
{
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 1280, height: 800 });
  await p.addInitScript(() => {
    window.__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (f) => { window.__raf++; return raf(f); };
  });
  await p.goto(page_url);
  const revealShown = () => p.$eval("#reveal", (e) => !e.hidden);
  const waitReveal = async () => { for (let i = 0; i < 180 && !(await revealShown()); i++) await p.waitForTimeout(50); return revealShown(); };
  const framesIn = async (ms) => { const a = await p.evaluate(() => window.__raf); await p.waitForTimeout(ms); return (await p.evaluate(() => window.__raf)) - a; };

  // Enter during the intro skips straight to the button (checked inside enterMachine).
  await enterMachine(p);
  check(await waitReveal(), "first reveal did not appear");

  // The animation loop must stop once the reveal's rings and critters are gone: ~12 s of
  // animation time. Headless Chromium throttles to ~10-20 fps and dt is capped at 50 ms,
  // so that can take longer in wall time here; poll up to 40 s.
  const t1 = Date.now();
  let idleFrames = -1;
  while (Date.now() - t1 < 40000 && (idleFrames = await framesIn(1000)) !== 0);
  console.log(`behaviour: animation loop ${idleFrames === 0 ? `stopped within ${Math.round((Date.now() - t1) / 1000)} s` : "never stopped"} after the reveal`);
  check(idleFrames === 0, `animation loop still running 40 s after the reveal (${idleFrames} frames/s)`);

  // Space on the page spins again; Esc dismisses the reveal.
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press(" ");
  check(await p.$eval("#go", (e) => e.disabled), "Space did not start a spin");
  check(await waitReveal(), "second reveal did not appear");
  await p.keyboard.press("Escape");
  check(!(await revealShown()), "Esc did not dismiss the reveal");
  check(await p.$eval("#rvHint", (e) => e.textContent.startsWith("click")), "desktop hint should say click");

  // Mute survives a reload.
  await p.click("#mute");
  await p.reload();
  check((await p.textContent("#mute")) === "SOUND: OFF", "mute setting was not remembered");
  await p.click("#mute");
  await enterMachine(p);

  // A picked clip is decoded and level-matched. 0.25 s of 440 Hz, 16-bit mono WAV.
  await p.waitForTimeout(400);
  await p.click("#clipsOpen");
  await p.setInputFiles("#ringFile", { name: "beep.wav", mimeType: "audio/wav", buffer: beepWav() });
  await p.waitForFunction(() => document.getElementById("soundStatus").textContent !== "", null, { timeout: 5000 }).catch(() => {});
  const status = await p.textContent("#soundStatus");
  check(/Ring sound: using "beep\.wav"/.test(status), `clip status reads "${status}"`);
  check((await p.textContent("#clipsOpen")).includes("1 in use"), "clip button does not show 1 in use");
  await p.close();
}

// Embedded assets: run the embed tool on a scratch copy and check the page uses them.
{
  const dir = mkdtempSync(join(tmpdir(), "ocgen-"));
  try {
    copyFileSync(fileURLToPath(page_url), join(dir, "index.html"));
    mkdirSync(join(dir, "assets/sounds"), { recursive: true });
    mkdirSync(join(dir, "assets/fanart"), { recursive: true });
    writeFileSync(join(dir, "assets/sounds/start.wav"), beepWav());
    writeFileSync(join(dir, "assets/sounds/whoosh.wav"), beepWav());
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    for (const f of ["a.png", "b.png", "c.png"]) writeFileSync(join(dir, "assets/fanart", f), png);
    writeFileSync(join(dir, "assets/fanart/credits.json"), JSON.stringify({ "a.png": { caption: "Spiky </script> Steve */", credit: "art by @tester" } }));
    execFileSync(process.execPath, [fileURLToPath(new URL("../tools/embed-assets.mjs", import.meta.url)), dir], { stdio: "pipe" });

    const p = await ctx.newPage();
    await p.setViewportSize({ width: 1280, height: 800 });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(pathToFileURL(join(dir, "index.html")).href);
    await p.fill("#nameInput", "Pat");
    await p.press("#nameInput", "Enter");
    await p.waitForFunction(() => document.documentElement.dataset.sfx !== undefined, null, { timeout: 5000 }).catch(() => {});
    const got = await p.evaluate(() => ({
      sfx: document.documentElement.dataset.sfx,
      imgs: document.querySelectorAll(".fan-card img").length,
      svgs: document.querySelectorAll(".fan-card svg").length,
      caps: [...document.querySelectorAll(".fan-card figcaption")].map((f) => f.textContent),
    }));
    console.log(`embedded: sounds [${got.sfx}], ${got.imgs} image card(s), captions ${JSON.stringify(got.caps)}`);
    check(got.sfx === "start whoosh", `embedded sounds decoded: "${got.sfx}"`);
    check(got.imgs === 3 && got.svgs === 0, `expected 3 embedded fan-art cards and no placeholders, got ${got.imgs} + ${got.svgs}`);
    check(got.caps.includes("Spiky </script> Steve */art by @tester"), "caption/credit with markup did not survive embedding");
    check(errors.length === 0, `page errors with embedded assets: ${errors.join("; ")}`);
    await p.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

await browser.close();
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exitCode = failed ? 1 : 0;

function beepWav() {
  const rate = 8000, n = rate / 4, wav = Buffer.alloc(44 + n * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(16000 * Math.sin(2 * Math.PI * 440 * i / rate)), 44 + i * 2);
  return wav;
}
