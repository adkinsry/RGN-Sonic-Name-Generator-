// Headless smoke test: spins once at several screen sizes and checks the reveal.
//   npm install && npx playwright install chromium && npm test
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const page_url = new URL("../index.html", import.meta.url).href;
const sizes = [[320, 568], [390, 780], [740, 360], [1280, 800]];
let failed = 0;
const check = (ok, msg) => { if (!ok) { failed++; console.log("  FAIL " + msg); } };

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

  const t0 = Date.now();
  await p.click("#go");
  let revealAt = null;
  while (Date.now() - t0 < 9000) {
    if (!(await p.$eval("#reveal", (e) => e.hidden))) { revealAt = Date.now() - t0; break; }
    await p.waitForTimeout(50);
  }
  await p.waitForTimeout(1000); // let the name and species finish sliding in (0.18 s delay + 0.55 s)
  const r = await p.evaluate(() => {
    const a = document.getElementById("rvAnimal");
    const box = a.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return {
      name: document.getElementById("rvName").textContent, animal: a.textContent,
      href: a.href, target: a.target, linkTappable: hit === a || a.contains(hit),
      goText: document.getElementById("go").textContent,
      scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
    };
  });
  await p.click("#copyBtn");
  const clip = await p.evaluate(() => navigator.clipboard.readText());

  console.log(`${w}x${h}: ${r.name} the ${r.animal} (reveal at ${revealAt} ms)`);
  check(revealAt !== null && revealAt >= 6300 && revealAt <= 7500, `reveal timing ${revealAt} ms, expected ~6500 (5.0 s spin + 1.5 s hold)`);
  check(r.name && r.animal, "reveal text empty");
  check(r.href.startsWith("https://en.wikipedia.org/wiki/") && r.target === "_blank", `species link ${r.href}`);
  check(r.linkTappable, "species link is covered by another element");
  check(r.goText === "Create Another", `button reads "${r.goText}"`);
  check(r.scrollW <= r.innerW, `horizontal scroll: ${r.scrollW} > ${r.innerW}`);
  check(clip === `${r.name} the ${r.animal}`, `clipboard holds "${clip}"`);
  check(net.length === 0, `network requests: ${net.join(", ")}`);
  check(errors.length === 0, `page errors: ${errors.join("; ")}`);
  await p.close();
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

  // The animation loop must stop once the reveal's rings and critters are gone: ~12 s of
  // animation time. Headless Chromium throttles to ~10-20 fps and dt is capped at 50 ms,
  // so that can take longer in wall time here; poll up to 40 s.
  await p.click("#go");
  check(await waitReveal(), "first reveal did not appear");
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

  // A picked clip is decoded and level-matched. 0.25 s of 440 Hz, 16-bit mono WAV.
  const rate = 8000, n = rate / 4, wav = Buffer.alloc(44 + n * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(16000 * Math.sin(2 * Math.PI * 440 * i / rate)), 44 + i * 2);
  await p.click("#clipsOpen");
  await p.setInputFiles("#ringFile", { name: "beep.wav", mimeType: "audio/wav", buffer: wav });
  await p.waitForFunction(() => document.getElementById("soundStatus").textContent !== "", null, { timeout: 5000 }).catch(() => {});
  const status = await p.textContent("#soundStatus");
  check(/Ring sound: using "beep\.wav"/.test(status), `clip status reads "${status}"`);
  check((await p.textContent("#clipsOpen")).includes("1 in use"), "clip button does not show 1 in use");
  await p.close();
}

await browser.close();
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exitCode = failed ? 1 : 0;
