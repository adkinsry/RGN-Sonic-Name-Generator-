// Embeds the files in assets/ into index.html so the page stays one self-contained, offline file.
//   npm run embed-assets          (or: node tools/embed-assets.mjs <other project folder>)
// assets/sounds/<cue>.<mp3|wav|ogg|m4a>  replaces the built-in sound for that cue (names below).
// assets/fanart/*.<png|jpg|jpeg|webp|gif> are the intro's fan-art cards (up to 6 shown per visit).
// assets/fanart/credits.json (optional): { "file.png": { "caption": "...", "credit": "art by @..." } }
// Run it again after adding, renaming or deleting files; an empty folder removes those assets.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { extname, basename, join } from "node:path";

import { fileURLToPath } from "node:url";
const root = process.argv[2] || fileURLToPath(new URL("..", import.meta.url));
const htmlPath = join(root, "index.html");
const CUES = ["start", "type", "whoosh", "land", "ready", "press", "tick", "reelStop", "ring", "jingle"];
const SOUND_TYPES = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4" };
const IMAGE_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
const WARN_BYTES = 400 * 1024;

const list = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith(".")).sort() : []);
const dataUri = (file, type) => {
  const bytes = readFileSync(file);
  if (bytes.length > WARN_BYTES) console.warn(`  warning: ${basename(file)} is ${Math.round(bytes.length / 1024)} KB; consider shrinking it`);
  return `data:${type};base64,${bytes.toString("base64")}`;
};

const sounds = {};
for (const f of list(join(root, "assets/sounds"))) {
  const ext = extname(f).toLowerCase(), cue = basename(f, extname(f));
  if (!SOUND_TYPES[ext]) continue;
  if (!CUES.includes(cue)) { console.warn(`  skipped ${f}: not a cue name (${CUES.join(", ")})`); continue; }
  if (sounds[cue]) { console.warn(`  skipped ${f}: ${cue} already has a file`); continue; }
  sounds[cue] = dataUri(join(root, "assets/sounds", f), SOUND_TYPES[ext]);
}

const fanDir = join(root, "assets/fanart");
const credits = existsSync(join(fanDir, "credits.json")) ? JSON.parse(readFileSync(join(fanDir, "credits.json"), "utf8")) : {};
const fanart = [];
for (const f of list(fanDir)) {
  const type = IMAGE_TYPES[extname(f).toLowerCase()];
  if (!type) continue;
  const meta = credits[f] || {};
  fanart.push({ src: dataUri(join(fanDir, f), type), caption: meta.caption || "", credit: meta.credit || "" });
}
for (const f of Object.keys(credits)) if (!existsSync(join(fanDir, f))) console.warn(`  credits.json names ${f}, which is not in assets/fanart`);

// "<" and "*/" are escaped so no caption can close the script tag or the marker comment.
const json = JSON.stringify({ sounds, fanart }).replace(/</g, "\\u003c").replace(/\*\//g, "*\\/");
const html = readFileSync(htmlPath, "utf8");
const marker = /\/\*ASSETS\*\/[\s\S]*?\/\*\/ASSETS\*\//;
if (!marker.test(html)) throw new Error("index.html is missing the /*ASSETS*/ ... /*/ASSETS*/ markers");
writeFileSync(htmlPath, html.replace(marker, () => `/*ASSETS*/${json}/*/ASSETS*/`));
console.log(`embedded ${Object.keys(sounds).length} sound(s) [${Object.keys(sounds).join(", ") || "none"}] and ${fanart.length} fan-art image(s); index.html is now ${Math.round(readFileSync(htmlPath).length / 1024)} KB`);
