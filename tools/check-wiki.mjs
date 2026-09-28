// Verifies that every species on the reel links to a real, non-disambiguation
// Wikipedia article. Run after adding or renaming species:
//   node tools/check-wiki.mjs
// Uses the MediaWiki API (action=query, redirects, ppprop=disambiguation), 50 titles per request.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const grab = (name) => {
  const m = new RegExp(`const ${name} = (\\[[^\\]]*\\]|\\{[^}]*\\})`).exec(src);
  if (!m) throw new Error(`could not find const ${name} in index.html`);
  return JSON.parse(m[1]);
};
const animals = [...grab("ANIMALS_ODD"), ...grab("ANIMALS_COMMON")];
const WIKI = grab("WIKI");
// Must match wikiUrl() in index.html.
const title = (n) => WIKI[n] || n[0].toUpperCase() + n.slice(1).toLowerCase();

const dups = animals.filter((a, i) => animals.indexOf(a) !== i);
if (dups.length) { console.error("duplicate species:", dups); process.exitCode = 1; }

const UA = "HedgehogOCMachine/1.0 (species link check)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const problems = [];
for (let i = 0; i < animals.length; i += 50) {
  const batch = animals.slice(i, i + 50);
  const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=disambiguation&titles="
    + encodeURIComponent(batch.map(title).join("|"));
  let q = null;
  for (let attempt = 0; attempt < 5 && !q; attempt++) {
    const text = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
    try { q = JSON.parse(text).query; } catch { await sleep(4000 * (attempt + 1)); } // rate-limited
  }
  if (!q) { console.error(`gave up on batch starting at ${i}`); process.exitCode = 1; continue; }
  const norm = Object.fromEntries((q.normalized || []).map((x) => [x.from, x.to]));
  const redir = Object.fromEntries((q.redirects || []).map((x) => [x.from, x.to]));
  const pages = Object.values(q.pages);
  for (const name of batch) {
    let t = norm[title(name)] || title(name);
    t = redir[t] || t;
    const pg = pages.find((p) => p.title === t);
    if (!pg || pg.missing !== undefined) problems.push(`${name} -> "${title(name)}": no such article`);
    else if (pg.pageprops && "disambiguation" in pg.pageprops) problems.push(`${name} -> "${title(name)}": disambiguation page; add a WIKI override`);
  }
  await sleep(2500);
}
console.log(`${animals.length} species checked, ${problems.length} problem(s)`);
problems.forEach((p) => console.log("  " + p));
if (problems.length) process.exitCode = 1;
