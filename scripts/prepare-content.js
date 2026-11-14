import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
export const hash = buffer => createHash('sha256').update(buffer).digest('hex');
export const collections = ['events','photography','art'];
export function validateFolder(folder) {
  if (typeof folder !== 'string' || folder.includes('\\') || folder.split('/').some(x => !x || x === '.' || x === '..')) throw Error('Specify one exact incoming subfolder with --folder.');
  const [base,kind,...parts] = folder.split('/');
  if (base !== 'incoming' || !collections.includes(kind) || parts.length !== 1) throw Error('Select one direct subfolder: incoming/events/YYYY-MM-DD_地点, incoming/photography/日期或地点或专题, incoming/art/作品名称.');
  if (kind === 'events') {
    const match = /^(\d{4}-\d{2}-\d{2})_(.+)$/.exec(parts[0]);
    if (!match || Number.isNaN(Date.parse(match[1])) || new Date(match[1]).toISOString().slice(0,10) !== match[1]) throw Error('Event folder must use a real YYYY-MM-DD_地点.');
  }
  return folder;
}
export function references(records, collection) {
  return records.flatMap(record => [
    ...(record.image ? [{holder:record,collection,id:record.id,slot:'image'}] : []),
    ...(record.photos || []).map((photo,index)=>({holder:photo,collection,id:record.id,slot:`photos/${index}`}))
  ]);
}
const usageOf = ref => ({collection:ref.collection,id:ref.id,slot:ref.slot});
const keyOf = use => JSON.stringify([use.collection,use.id,use.slot]);
export async function loadRegistry(root) {
  try {
    const registry = JSON.parse(await readFile(path.join(root,'content/media-registry.json'),'utf8'));
    if (registry.version !== 1 || !Array.isArray(registry.images)) throw Error('Invalid media registry');
    return registry;
  } catch (error) {
    if (error.code === 'ENOENT') return {version:1,images:[]};
    throw error;
  }
}
const normalized = input => sharp(input).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();

// Only explicitly referenced images in the selected folder are read. No directory scan/import.
export async function prepareContent(root, {folder, reuseExisting = false} = {}) {
  if (folder !== undefined) validateFolder(folder);
  const documents = [];
  const refs = [];
  for (const name of collections) {
    const filename = path.join(root,`content/${name}.json`);
    const original = await readFile(filename,'utf8');
    const records = JSON.parse(original);
    if (!Array.isArray(records)) throw Error(`${name} must be an array`);
    documents.push({filename,original,records});
    refs.push(...references(records,name));
  }
  const pending = refs.filter(ref=>ref.holder.image?.startsWith('incoming/'));
  if (!pending.length) return 0; // Builds of prepared content never require originals.
  if (!folder) throw Error('Local originals require an explicitly approved subfolder: npm run prepare-content -- --folder incoming/.../子文件夹');
  for (const ref of pending) {
    if (!ref.holder.image.startsWith(folder+'/')) throw Error(`Outside selected folder: ${ref.holder.image}. No files or records changed.`);
    if (folder.split('/')[1] !== ref.collection) throw Error(`Folder does not match collection: ${ref.collection}`);
  }
  const registry = await loadRegistry(root);
  // Index already published legacy assets to also catch re-imports of old website images.
  for (const ref of refs.filter(ref=>ref.holder.image?.startsWith('assets/'))) {
    const source = ref.holder.image;
    if (source.split('/').includes('..')) throw Error(`Unsafe asset path: ${source}`);
    let entry = registry.images.find(x=>x.asset===source);
    if (!entry) {
      const buffer = await readFile(path.join(root,source));
      entry = {originalSha256:hash(buffer),webSha256:hash(await normalized(buffer)),asset:source,assetSha256:hash(buffer),sources:[],usages:[],legacy:true};
      registry.images.push(entry);
    }
    const usage = usageOf(ref);
    if (!entry.usages.some(x=>keyOf(x)===keyOf(usage))) entry.usages.push(usage);
  }
  const selected = await realpath(path.join(root,folder));
  const incoming = await realpath(path.join(root,'incoming'));
  if (!selected.startsWith(incoming+path.sep)) throw Error('Selected folder escapes incoming');
  const outputs = new Map();
  const seen = new Map();
  for (const ref of pending) {
    const source = ref.holder.image;
    if (source.split('/').includes('..') || !/\.(jpe?g|png|webp)$/i.test(source)) throw Error(`Unsupported incoming image: ${source}`);
    let input;
    try { input = await realpath(path.join(root,source)); }
    catch { throw Error(`Missing local original: ${source}. Prepare locally and commit data, registry and assets/uploads before pushing.`); }
    if (!input.startsWith(selected+path.sep)) throw Error(`Image escapes selected folder: ${source}`);
    const bytes = await readFile(input);
    const originalSha256 = hash(bytes);
    let prepared = seen.get(originalSha256);
    if (!prepared) {
      const buffer = await normalized(bytes);
      prepared = {buffer,webSha256:hash(buffer)};
      seen.set(originalSha256,prepared);
    }
    let entry = registry.images.find(x=>x.originalSha256===originalSha256 || x.webSha256===prepared.webSha256);
    const usage = usageOf(ref);
    if (entry) {
      if (!entry.usages.some(x=>keyOf(x)===keyOf(usage)) && !reuseExisting) throw Error(`Already processed image: ${source} (${entry.asset}). Do not add a duplicate record. Reuse requires explicit owner approval and --reuse-existing.`);
      const existing = await readFile(path.join(root,entry.asset)).catch(()=>outputs.get(entry.asset));
      if (!existing || hash(existing)!==entry.assetSha256) throw Error(`Prepared asset missing or changed: ${entry.asset}`);
    } else {
      const asset = `assets/uploads/${prepared.webSha256}.webp`;
      entry = {originalSha256,webSha256:prepared.webSha256,asset,assetSha256:prepared.webSha256,processedAt:new Date().toISOString(),sources:[],usages:[]};
      registry.images.push(entry);
      outputs.set(asset,prepared.buffer);
    }
    if (!entry.sources.some(x=>x.path===source && x.sha256===originalSha256)) entry.sources.push({path:source,sha256:originalSha256});
    if (!entry.usages.some(x=>keyOf(x)===keyOf(usage))) entry.usages.push(usage);
    ref.holder.image = entry.asset;
  }
  // Fail scope/duplicate checks before writing output or rewriting any data. Originals are never written.
  if (outputs.size) await mkdir(path.join(root,'assets/uploads'),{recursive:true});
  for (const [asset,buffer] of outputs) await writeFile(path.join(root,asset),buffer,{flag:'wx'}).catch(async error=>{
    if (error.code!=='EEXIST' || hash(await readFile(path.join(root,asset)))!==hash(buffer)) throw error;
  });
  await writeFile(path.join(root,'content/media-registry.json'),JSON.stringify(registry,null,2)+'\n');
  for (const doc of documents) {
    const updated = JSON.stringify(doc.records,null,2)+'\n';
    if (updated!==doc.original) await writeFile(doc.filename,updated);
  }
  return seen.size;
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let folder;
  let reuseExisting = false;
  for (let i=0;i<args.length;i++) {
    if (args[i]==='--folder' && args[i+1]) folder=args[++i];
    else if (args[i]==='--reuse-existing') reuseExisting=true;
    else throw Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  console.log(`Prepared ${await prepareContent(root,{folder,reuseExisting})} selected image(s). Commit content JSON, media-registry.json and assets/uploads together. Originals untouched.`);
}
