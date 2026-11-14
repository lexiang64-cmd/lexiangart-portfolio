import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { renderContent } from './content.js';
import { prepareContent } from './prepare-content.js';
import sharp from 'sharp';
const root = await mkdtemp(path.join(tmpdir(),'leo-content-'));
await mkdir(path.join(root,'content'));
const dist = path.join(root,'dist');
const base = {events:[],photography:[],art:[]};
async function render(data) {
  for (const [key,items] of Object.entries({...base,...data})) await writeFile(path.join(root,`content/${key}.json`),JSON.stringify(items));
  return renderContent(root,dist);
}
const event = {id:'review-only',title:'<script>test</script>',published:true,date:'2026-11-14',updatedAt:'2026-11-14',participants:0};
try {
  const empty = await render({});
  assert(empty.events.includes('Event reports will appear'));
  const filled = await render({events:[event,{...event,id:'older',date:'2026-01-01'},{...event,id:'draft',published:false}]});
  assert(filled.events.includes('&lt;script&gt;test&lt;/script&gt;'));
  assert(filled.events.includes('Participants:</strong> 0'));
  assert(!filled.events.includes('id="draft"'));
  assert(filled.events.indexOf('id="review-only"')<filled.events.indexOf('id="older"'));
  assert(filled.latest.includes('/birdwatching#review-only'));
  await assert.rejects(render({events:[{...event,species:['Unconfirmed bird']}]}),/confirmed/);
  await assert.rejects(render({events:[{...event,date:'2026-02-30'}]}),/invalid date/);
  await assert.rejects(render({events:[event,event]}),/duplicate/);
  await assert.rejects(render({art:[{...event,image:'assets/test.jpg',alt:'Test',links:[{url:'https://example.com/shop'}]}]}),/unsupported shop URL/);
  await assert.rejects(render({art:[{...event,image:'incoming/../private.jpg',alt:'Test'}]}),/Unsafe image/);
  await mkdir(path.join(root,'incoming/photography/test-session'),{recursive:true});
  await sharp({create:{width:20,height:30,channels:3,background:'red'}}).png().toFile(path.join(root,'incoming/photography/test-session/a.png'));
  await sharp({create:{width:30,height:20,channels:3,background:'blue'}}).png().toFile(path.join(root,'incoming/photography/test-session/b.png'));
  const gallery = await render({photography:[
    {id:'test-a',title:'Test A',published:true,image:'incoming/photography/test-session/a.png',alt:'Test A',themes:['Wetlands']},
    {id:'test-b',title:'Test B',published:true,image:'incoming/photography/test-session/b.png',alt:'Test B',themes:['Coastal']}
  ]});
  assert(gallery.photography.includes('<option value="Wetlands">'));
  assert(gallery.photography.includes('<option value="Coastal">'));
  const fullImages = [...gallery.photography.matchAll(/data-full="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(fullImages).size,2,'Concurrent images must have distinct filenames');
  for (const file of fullImages) { const image = await sharp(path.join(dist,file)).metadata(); assert(!image.exif); assert(image.width<=30); }
  assert.equal(await prepareContent(root,{folder:'incoming/photography/test-session'}),2);
  const prepared = JSON.parse(await readFile(path.join(root,'content/photography.json'),'utf8'));
  assert(prepared.every(x=>x.image.startsWith('assets/uploads/')));
  for (const record of prepared) {
    const metadata = await sharp(path.join(root,record.image)).metadata();
    assert(!metadata.exif);
    assert(metadata.width<=1600 && metadata.height<=1600);
  }
  // Reproduce Vercel's input: content and prepared assets, with no local originals.
  await rm(path.join(root,'incoming'),{recursive:true});
  assert.equal(await prepareContent(root),0);
  const remote = await renderContent(root,dist);
  assert(remote.photography.includes('Test A'));
  assert(remote.photography.includes('Test B'));
  assert(!remote.photography.includes('incoming/'));
  console.log('Portable image workflow passed: original-free remote build and repeat preparation.');
  console.log('Content behavior checks passed: drafts, empty values, date sorting, escaping, latest links, species confirmation, shop and image paths.');
} finally { await rm(root,{recursive:true,force:true}); }
