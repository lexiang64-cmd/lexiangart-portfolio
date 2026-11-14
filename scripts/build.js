import { renderContent } from './content.js';
import { cp, mkdir, rm, stat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const requiredEntries = [
  "index.html",
  "photography.html",
  "artwork.html",
  "birdwatching.html",
  "classes.html",
  "conservation.html",
  "recognition.html",
  "wechat.html",
  "about.html",
  "contact.html",
  "blog.html",
  "styles.css",
  "script.js",
  "assets",
  "robots.txt",
  "sitemap.xml"
];

async function assertExists(entry) {
  try {
    await stat(path.join(root, entry));
  } catch {
    throw new Error(`Missing required entry: ${entry}`);
  }
}

await Promise.all(requiredEntries.map(assertExists));
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of requiredEntries) {
  await cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
}

const slots = await renderContent(root, dist);
for (const page of requiredEntries.filter(x => x.endsWith('.html'))) {
  let html = await readFile(path.join(dist,page), 'utf8');
  for (const [name,body] of Object.entries(slots)) {
    html = html.replace(new RegExp(`<!-- CONTENT:${name} -->[\\s\\S]*?<!-- /CONTENT:${name} -->`, 'g'), body);
  }
  if (process.env.VERCEL_ENV === 'preview') html = html.replace('</head>', '<meta name="robots" content="noindex, nofollow" /></head>');
  await writeFile(path.join(dist,page),html);
}
console.log("Build complete: dist/");
