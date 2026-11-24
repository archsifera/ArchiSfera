import { readFile, readdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const projectAnchor = p => `projekt-${String(p.id).padStart(2, '0')}`;
const plain = (v, max = 500) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
function imagePath(value) {
  const normalized = typeof value === 'string' ? value.replace(/^\//, '') : '';
  if (!/^assets\/portfolio\/[a-zA-Z0-9_/-]+\.(webp|png|jpe?g|avif)$/i.test(normalized) || normalized.includes('..')) {
    throw new Error(`Nieprawidłowa ścieżka zdjęcia: ${value}`);
  }
  return normalized;
}

export async function loadProjects(root) {
  const folder = path.join(root, 'content/projects');
  const names = (await readdir(folder)).filter(f => f.endsWith('.json')).sort();
  const all = [];
  const ids = new Set();
  for (const name of names) {
    const p = JSON.parse(await readFile(path.join(folder, name), 'utf8'));
    if (p.published === false) continue;
    const id = p.id || Number.parseInt(createHash('sha256').update(name).digest('hex').slice(0, 12), 16);
    if (!Number.isSafeInteger(id) || id < 1 || ids.has(id)) throw new Error(`${name}: nieprawidłowy lub powtórzony identyfikator`);
    ids.add(id);
    for (const key of ['title', 'location', 'status']) if (!plain(p[key])) throw new Error(`${name}: uzupełnij pole ${key}`);
    if (!Number.isFinite(p.area) || p.area <= 0) throw new Error(`${name}: podaj powierzchnię większą od zera`);
    if (!Array.isArray(p.images) || !p.images.length || p.images.length > 40) throw new Error(`${name}: galeria musi zawierać od 1 do 40 zdjęć`);
    const images = [...new Set(p.images.map(imagePath))];
    const cover = p.cover ? imagePath(p.cover) : images[0];
    if (!images.includes(cover)) images.unshift(cover);
    for (const img of images) await access(path.join(root, img));
    const splitTitleMatches = p.titleMain && p.titleLocation &&
      `${p.titleMain} ${p.titleLocation}`.replace(/\s+/g, ' ').trim() === p.title.replace(/\s+/g, ' ').trim();
    all.push({
      ...p, id, images, cover,
      description: typeof p.description === 'string' ? p.description.slice(0, 10000) : '',
      titleMain: splitTitleMatches ? p.titleMain : p.title,
      titleLocation: splitTitleMatches ? p.titleLocation : '',
      shortTitle: p.shortTitle || p.title,
      order: Number.isFinite(p.order) ? p.order : 1000,
    });
  }
  return all.sort((a, b) => a.order - b.order || a.id - b.id);
}

export function renderProjects(html, projects, sizes = new Map()) {
  const e = escapeHtml;
  const image = (p, alt) => {
    const dimensions = sizes.get(p.cover) || { width: 2200, height: 1467 };
    return `<img src="${e(p.cover)}" alt="${e(alt)}" width="${dimensions.width}" height="${dimensions.height}" loading="lazy" />`;
  };
  const area = p => `${p.area.toLocaleString('pl-PL')} m²`;
  const title = p => p.titleLocation ? `${e(p.titleMain)} <span class="project-title-location">${e(p.titleLocation)}</span>` : e(p.title);
  if (html.includes('class="project-list wrap"')) {
    const list = projects.map((p, i) => `<article class="portfolio-project" id="${projectAnchor(p)}">
      <div class="portfolio-project-top"><span class="eyebrow">${String(i+1).padStart(2,'0')} / ${e(p.location)}</span><button class="text-link" type="button" data-project-id="${p.id}">Zobacz projekt <span>(${p.images.length})</span></button></div>
      <button class="portfolio-image" type="button" data-project-id="${p.id}" aria-label="${e('Otwórz galerię — '+p.title)}">${image(p, p.title + '. Wizualizacja projektu.')}</button>
      <div class="portfolio-project-info"><div><h2>${title(p)}</h2>${p.description && p.description !== p.title+'.' ? `<p class="project-summary">${e(p.description)}</p>` : ''}</div><div class="project-facts"><p>${e(p.status)}</p><strong>${area(p)}</strong><span>Powierzchnia użytkowa${p.perBuilding ? ' pojedynczego budynku' : ''}</span></div></div>
    </article>`).join('\n');
    html = html.replace(/(<section class="project-list wrap"[^>]*>)[\s\S]*?<\/section>/, (_, start) => `${start}\n${list}\n</section>`);
    html = html.replace(/Portfolio \/ \d+ projektów/, `Portfolio / ${projects.length} ${projects.length === 1 ? 'projekt' : projects.length < 5 ? 'projekty' : 'projektów'}`);
  }
  if (html.includes('id="featured-projects"')) {
    const chosen = projects.filter(p => p.featured);
    const featured = (chosen.length ? chosen : projects).slice(0,4);
    const cards = featured.map((p,i) => `<a class="project-card" href="projekty/#${projectAnchor(p)}">${image(p, p.title + '. Wizualizacja projektu.')}<span class="project-number">${String(i+1).padStart(2,'0')}</span><div class="project-caption"><h3>${e(p.shortTitle)}</h3><p>${e(p.location)}</p></div><div class="project-card-meta"><span>${e(p.status)}</span><span>${area(p)}</span></div></a>`).join('\n');
    html = html.replace(/<div id="featured-projects" class="featured-projects">[\s\S]*?<\/div>\s*(?=<div class="featured-controls)/, () => `<div id="featured-projects" class="featured-projects">\n${cards}\n</div>\n`);
    html = html.replace(/(<span id="featured-counter"[^>]*>)[^<]*/, `$1${featured.length ? '01' : '00'} / ${String(featured.length).padStart(2,'0')}`);
  }
  return html;
}

export function browserProjects(projects) {
  return '/* Generated from content/projects. Edit projects in the administration panel. */\nwindow.archisferaProjects = '+JSON.stringify(projects, null, 2).replaceAll('<','\\u003c')+';\n';
}
