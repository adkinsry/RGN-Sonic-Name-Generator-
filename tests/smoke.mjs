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
await browser.close();
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exitCode = failed ? 1 : 0;
