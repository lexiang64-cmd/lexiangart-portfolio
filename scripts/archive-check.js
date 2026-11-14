import { readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { hash, collections, loadRegistry, validateFolder, references } from './prepare-content.js';
const run = promisify(execFile);
async function git(root,args,binary=false) {
  return (await run('git',args,{cwd:root,encoding:binary?'buffer':'utf8',maxBuffer:64*1024*1024})).stdout;
}
// Read-only verification: no fetch, move, delete, or archive operation.
export async function checkArchive(root,{folder,branch}={}) {
  validateFolder(folder);
  branch ||= (await git(root,['branch','--show-current'])).trim();
  if (!branch || branch.startsWith('-') || /[\s:~^?*\[\\]/.test(branch)) throw Error('Specify a valid pushed branch');
  const remote = (await git(root,['ls-remote','--exit-code','origin',`refs/heads/${branch}`])).trim().split(/\s/)[0];
  if (!/^[a-f0-9]{40,64}$/.test(remote)) throw Error('Cannot verify the remote branch');
  const registry = await loadRegistry(root);
  const remoteRegistry = JSON.parse(await git(root,['show',`${remote}:content/media-registry.json`]));
  const content = [];
  for (const name of collections) {
    const file = `content/${name}.json`;
    const local = await readFile(path.join(root,file));
    const pushed = await git(root,['show',`${remote}:${file}`],true);
    if (!local.equals(pushed)) throw Error(`${file} differs from GitHub. Commit and push current content before archiving.`);
    content.push(...references(JSON.parse(local),name));
  }
  const selected = await realpath(path.join(root,folder));
  const incoming = await realpath(path.join(root,'incoming'));
  if (!selected.startsWith(incoming+path.sep)) throw Error('Selected folder escapes incoming');
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory,{withFileTypes:true})) {
      if (['.DS_Store','.gitkeep'].includes(entry.name)) continue;
      const file = path.join(directory,entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) files.push(file);
      else throw Error(`Unsupported symlink or special file: ${file}`);
    }
  }
  await walk(selected);
  const verified = [];
  for (const file of files) {
    const originalSha256 = hash(await readFile(file));
    const entry = registry.images.find(x=>x.originalSha256===originalSha256 || x.sources.some(s=>s.sha256===originalSha256));
    if (!entry) throw Error(`Unprocessed file: ${path.relative(root,file)}. Do not archive the whole folder yet.`);
    if (!entry.asset.startsWith('assets/') || entry.asset.split('/').includes('..')) throw Error('Invalid registry asset');
    const remoteEntry = remoteRegistry.images.find(x=>x.asset===entry.asset && x.assetSha256===entry.assetSha256 && (x.originalSha256===originalSha256 || x.sources.some(s=>s.sha256===originalSha256)));
    if (!remoteEntry) throw Error(`Processing record is not on GitHub: ${entry.asset}`);
    if (!content.some(x=>x.holder.image===entry.asset)) throw Error(`Image is no longer referenced by content: ${entry.asset}`);
    if (hash(await readFile(path.join(root,entry.asset)))!==entry.assetSha256) throw Error(`Local prepared asset changed: ${entry.asset}`);
    if (hash(await git(root,['show',`${remote}:${entry.asset}`],true))!==entry.assetSha256) throw Error(`GitHub asset does not match: ${entry.asset}`);
    verified.push({source:path.relative(root,file),asset:entry.asset,originalSha256});
  }
  return {safeToArchive:files.length>0,branch,remoteCommit:remote,verified,notice:'No originals moved, deleted or overwritten. Archiving still requires explicit owner approval. Verify the corresponding Preview succeeded and keep a backup.'};
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2); const options={};
  for (let i=0;i<args.length;i++) {
    if (args[i]==='--folder' && args[i+1]) options.folder=args[++i];
    else if (args[i]==='--branch' && args[i+1]) options.branch=args[++i];
    else throw Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  try { console.log(JSON.stringify(await checkArchive(root,options),null,2)); }
  catch(error) { console.error(`Archive check blocked: ${error.message}. If the remote commit is unavailable locally, fetch origin first. Originals untouched.`); process.exitCode=1; }
}
