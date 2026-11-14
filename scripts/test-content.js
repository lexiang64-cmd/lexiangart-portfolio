import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { renderContent } from './content.js';
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
  console.log('Content behavior checks passed: drafts, empty values, date sorting, escaping, latest links, species confirmation, shop and image paths.');
} finally { await rm(root,{recursive:true,force:true}); }
