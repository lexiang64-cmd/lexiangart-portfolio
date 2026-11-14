import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Prepare portable web images locally; remote builds never need incoming originals.
export async function prepareContent(root) {
  const documents = [];
  const cache = new Map();
  async function prepare(source) {
    if (typeof source !== 'string' || !source.startsWith('incoming/')) return source;
    if (cache.has(source)) return cache.get(source);
    if (source.split('/').includes('..') || !/\.(jpe?g|png|webp)$/i.test(source)) throw Error(`Unsupported incoming image: ${source}`);
    let input;
    try { input = await realpath(path.join(root, source)); }
    catch { throw Error(`Missing local original: ${source}. Run npm run prepare-content locally, then commit content JSON and assets/uploads before pushing.`); }
    const incoming = await realpath(path.join(root, 'incoming'));
    if (!input.startsWith(incoming + path.sep)) throw Error(`Image must remain inside incoming: ${source}`);
    const buffer = await sharp(input).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
    const digest = createHash('sha256').update(buffer).digest('hex');
    const target = `assets/uploads/${digest}.webp`;
    await mkdir(path.join(root, 'assets/uploads'), {recursive:true});
    await writeFile(path.join(root, target), buffer);
    cache.set(source, target);
    return target;
  }
  // Read all data first and only rewrite data after every original is processed.
  for (const name of ['events','photography','art']) {
    const filename = path.join(root, `content/${name}.json`);
    const original = await readFile(filename,'utf8');
    const records = JSON.parse(original);
    if (!Array.isArray(records)) throw Error(`${name} must be an array`);
    for (const record of records) {
      if (record.image) record.image = await prepare(record.image);
      for (const photo of record.photos || []) photo.image = await prepare(photo.image);
    }
    const updated = JSON.stringify(records,null,2)+'\n';
    documents.push({filename, original, updated});
  }
  for (const document of documents) {
    if (document.updated !== document.original) await writeFile(document.filename, document.updated);
  }
  return cache.size;
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Prepared ${await prepareContent(root)} local image(s); commit content/*.json and assets/uploads/ together.`);
}
