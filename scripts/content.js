import { readFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
export const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function renderContent(root, dist) {
  const data = {};
  const ids = new Set();
  const dateOK = value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
  for (const type of ['events','photography','art']) {
    const items = JSON.parse(await readFile(path.join(root,`content/${type}.json`),'utf8'));
    if (!Array.isArray(items)) throw Error(`${type} must be an array`);
    data[type] = items.filter(item => item.published === true);
    for (const item of data[type]) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || ids.has(item.id)) throw Error(`Invalid or duplicate ID: ${item.id}`);
      ids.add(item.id);
      if (!item.title?.trim()) throw Error(`${item.id}: title required`);
      for (const field of ['date','updatedAt']) if (!dateOK(item[field])) throw Error(`${item.id}: invalid ${field}`);
      if ((item.englishName || item.scientificName || item.species?.length) && item.speciesConfirmed !== true) throw Error(`${item.id}: species must be confirmed by owner`);
      if (item.participants != null && (!Number.isInteger(item.participants) || item.participants < 0)) throw Error(`${item.id}: invalid participant count`);
      if (type !== 'events' && (!item.image || !item.alt?.trim())) throw Error(`${item.id}: image and alt required`);
      for (const link of item.links || []) {
        const url = new URL(link.url);
        if (url.protocol !== 'https:' || !['redbubble.com','etsy.com'].some(h => url.hostname === h || url.hostname.endsWith('.'+h))) throw Error(`${item.id}: unsupported shop URL`);
      }
    }
  }
  const imageCache = new Map();
  async function picture(source, alt) {
    if (!source || !alt) throw Error('Images need a source and alt text');
    if (!imageCache.has(source)) {
      if (!/^(assets|incoming)\/[a-zA-Z0-9_ .\/-]+\.(jpe?g|png|webp)$/i.test(source) || source.split('/').includes('..')) throw Error(`Unsafe image: ${source}`);
      const input = path.join(root,source); await stat(input);
      const filename = `image-${createHash("sha256").update(source).digest("hex").slice(0,16)}`;
      const out = path.join(dist,'assets/optimized'); await mkdir(out,{recursive:true});
      const widths = [];
      for (const width of [480,1600]) {
        const info = await sharp(input).rotate().resize({width,withoutEnlargement:true}).webp({quality:82}).toFile(path.join(out,`${filename}-${width}.webp`));
        widths.push(info);
      }
      imageCache.set(source,{base:`assets/optimized/${filename}`,small:widths[0],large:widths[1]});
    }
    const {base,small,large} = imageCache.get(source);
    return `<img src="${base}-480.webp" srcset="${base}-480.webp ${small.width}w, ${base}-1600.webp ${large.width}w" sizes="(max-width: 650px) 100vw, 33vw" width="${small.width}" height="${small.height}" loading="lazy" decoding="async" alt="${escape(alt)}" data-full="${base}-1600.webp" tabindex="0" role="button" aria-label="Enlarge: ${escape(alt)}" />`;
  }
  const metadata = (label,value) => value !== '' && value != null ? `<p><strong>${label}:</strong> ${escape(value)}</p>` : '';
  async function card(item, type) {
    const filters = type === 'photography' ? [item.englishName,...(item.themes || [])].filter(Boolean) : [];
    let inner = item.image ? await picture(item.image,item.alt) : '';
    inner += `<div class="work-info"><span>${escape(type === 'photography' ? 'Photography' : item.category || 'Birding event')}</span><h3>${escape(item.title)}</h3>`;
    inner += metadata('Date',item.date)+metadata('Location',item.location);
    if (type === 'events') inner += metadata('Route',item.route)+metadata('Organizer',item.organizer)+metadata('Main birds',item.species?.join(', '))+metadata('Participants',item.participants);
    if (type === 'photography') inner += metadata('Bird',item.englishName)+metadata('Scientific name',item.scientificName);
    inner += item.description ? `<p>${escape(item.description)}</p>` : '';
    inner += item.summary ? `<p>${escape(item.summary)}</p>` : '';
    for (const link of item.links || []) inner += `<p><a href="${escape(link.url)}" target="_blank" rel="noopener noreferrer">${new URL(link.url).hostname.includes('redbubble')?'Shop on Redbubble':'Shop on Etsy'}</a></p>`;
    inner += '</div>';
    for (const photo of item.photos || []) inner += await picture(photo.image,photo.alt);
    return `<article class="work-card" id="${escape(item.id)}" data-category="${escape(item.category || '')}" data-photo-tags="${escape(JSON.stringify(filters))}">${inner}</article>`;
  }
  const art = await Promise.all(data.art.map(x=>card(x,'art')));
  const photos = await Promise.all(data.photography.map(x=>card(x,'photography')));
  const events = await Promise.all([...data.events].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(x=>card(x,'events')));
  const section = (title,body) => `<section class="section"><h2>${title}</h2>${body}</section>`;
  const grid = cards => `<div class="work-grid">${cards.join('\n')}</div>`;
  const choices = [...new Set(data.photography.flatMap(x=>[x.englishName,...(x.themes || [])]).filter(Boolean))].sort();
  const selector = `<label class="collection-filter">Filter by bird or theme <select id="photo-filter"><option value="">All photographs</option>${choices.map(v=>`<option value="${escape(v)}">${escape(v)}</option>`).join('')}</select></label>`;
  const latest = Object.entries(data).flatMap(([type,items])=>items.filter(x=>x.updatedAt).map(x=>({...x,type}))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,6);
  const latestHTML = latest.length ? `<ul class="updates-list">${latest.map(x=>`<li><time datetime="${x.updatedAt}">${x.updatedAt}</time> <a href="/${{events:'birdwatching',photography:'photography',art:'artwork'}[x.type]}#${x.id}">${escape(x.title)}</a></li>`).join('')}</ul>` : '<p>New field notes, photographs, and artwork will appear here as they are added.</p>';
  return {
    portfolio: grid([...art,...photos])+ '<p><a href="/photography">Explore Wildlife Photography</a> · <a href="https://leoxiang.redbubble.com" target="_blank" rel="noopener noreferrer">Visit Leo’s Redbubble shop</a></p>',
    events: section('Birding Events',events.length?grid(events):'<p>Event reports will appear here after they are added. <a href="/contact">Contact Leo about upcoming walks.</a></p>'),
    photography: section('The collection',selector+grid(photos)+'<p id="photo-empty" hidden>No photographs match this filter.</p>'),
    latest: section('Latest Updates',latestHTML)
  };
}
