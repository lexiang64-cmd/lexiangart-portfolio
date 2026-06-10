import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "index.html",
  "artwork.html",
  "birdwatching.html",
  "classes.html",
  "conservation.html",
  "recognition.html",
  "about.html",
  "contact.html",
  "blog.html",
  "styles.css",
  "script.js",
  "robots.txt",
  "sitemap.xml",
  "package.json",
  "vercel.json"
];

const htmlPages = [
  "index.html",
  "artwork.html",
  "birdwatching.html",
  "classes.html",
  "conservation.html",
  "recognition.html",
  "about.html",
  "contact.html",
  "blog.html"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(file) {
  return JSON.parse(readFileSync(path.join(root, file), "utf8"));
}

function cleanUrlToFile(ref) {
  if (ref === "/") {
    return "index.html";
  }

  if (ref.startsWith("/") && !ref.includes(".")) {
    return `${ref.slice(1)}.html`;
  }

  return null;
}

function validatePage(rootDir, page) {
  const htmlPath = path.join(root, rootDir, page);
  assert(existsSync(htmlPath), `${rootDir}/${page} is missing`);

  const html = readFileSync(htmlPath, "utf8");
  const refs = [
    ...html.matchAll(/\s(?:href|src)="([^"]+)"/g)
  ].map((match) => match[1]);

  for (const ref of refs) {
    const cleanUrlFile = cleanUrlToFile(ref);

    if (cleanUrlFile) {
      assert(
        existsSync(path.join(root, rootDir, cleanUrlFile)),
        `${rootDir}/${cleanUrlFile} referenced by ${page} is missing`
      );
      continue;
    }

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
      `${rootDir}/${ref} referenced by ${page} is missing`
    );
  }

  assert(html.includes('href="styles.css"'), `${rootDir}/${page} must load styles.css`);
  assert(html.includes('src="script.js"'), `${rootDir}/${page} must load script.js`);
  assert(html.includes("<title>"), `${rootDir}/${page} must include a title`);
  assert(html.includes('name="description"'), `${rootDir}/${page} must include a meta description`);
  assert(html.includes('property="og:title"'), `${rootDir}/${page} must include an Open Graph title`);
  assert(html.includes('property="og:description"'), `${rootDir}/${page} must include an Open Graph description`);
  assert(html.includes('property="og:url"'), `${rootDir}/${page} must include an Open Graph URL`);
  assert(html.includes('property="og:image"'), `${rootDir}/${page} must include an Open Graph image`);
}

function validateRoot(rootDir) {
  for (const page of htmlPages) {
    validatePage(rootDir, page);
  }
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

const robotsTxt = readFileSync(path.join(root, "robots.txt"), "utf8");
const sitemapXml = readFileSync(path.join(root, "sitemap.xml"), "utf8");

assert(robotsTxt.includes("User-agent: *"), "robots.txt must allow crawlers");
assert(robotsTxt.includes("Allow: /"), "robots.txt must allow the site root");
assert(
  robotsTxt.includes("Sitemap: https://www.lexiangart.com/sitemap.xml"),
  "robots.txt must reference the production sitemap"
);
assert(
  sitemapXml.includes("<loc>https://www.lexiangart.com/</loc>"),
  "sitemap.xml must include the homepage"
);

for (const pathName of [
  "/artwork",
  "/birdwatching",
  "/classes",
  "/conservation",
  "/recognition",
  "/about",
  "/contact",
  "/blog"
]) {
  assert(
    sitemapXml.includes(`<loc>https://www.lexiangart.com${pathName}</loc>`),
    `sitemap.xml must include ${pathName}`
  );
}

validateRoot(".");
validateRoot("dist");

console.log("Validation complete: package, Vercel config, homepage, and asset paths are OK.");
