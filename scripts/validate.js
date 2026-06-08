import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "index.html",
  "styles.css",
  "script.js",
  "package.json",
  "vercel.json"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(file) {
  return JSON.parse(readFileSync(path.join(root, file), "utf8"));
}

function validateRoot(rootDir) {
  const htmlPath = path.join(root, rootDir, "index.html");
  assert(existsSync(htmlPath), `${rootDir}/index.html is missing`);

  const html = readFileSync(htmlPath, "utf8");
  const refs = [
    ...html.matchAll(/\s(?:href|src)="([^"]+)"/g)
  ].map((match) => match[1]);

  for (const ref of refs) {
    if (
      ref.startsWith("#") ||
      ref.startsWith("mailto:") ||
      ref.startsWith("http://") ||
      ref.startsWith("https://")
    ) {
      continue;
    }

    assert(
      existsSync(path.join(root, rootDir, ref)),
      `${rootDir}/${ref} referenced by index.html is missing`
    );
  }

  assert(html.includes('href="styles.css"'), `${rootDir}/index.html must load styles.css`);
  assert(html.includes('src="script.js"'), `${rootDir}/index.html must load script.js`);
}

for (const file of requiredFiles) {
  assert(existsSync(path.join(root, file)), `${file} is missing`);
}

const packageJson = readJson("package.json");
const vercelJson = readJson("vercel.json");

assert(packageJson.scripts?.build === "node scripts/build.js", "package.json build script is incorrect");
assert(packageJson.scripts?.dev === "node scripts/dev-server.js", "package.json dev script is incorrect");
assert(vercelJson.buildCommand === "npm run build", "vercel.json buildCommand is incorrect");
assert(vercelJson.outputDirectory === "dist", "vercel.json outputDirectory must be dist");

validateRoot(".");
validateRoot("dist");

console.log("Validation complete: package, Vercel config, homepage, and asset paths are OK.");
