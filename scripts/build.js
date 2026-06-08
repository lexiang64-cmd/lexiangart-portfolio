import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const requiredEntries = ["index.html", "styles.css", "script.js", "assets"];

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

console.log("Build complete: dist/");
