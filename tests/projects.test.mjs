import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadProjects, renderProjects, browserProjects } from '../scripts/projects.mjs';

async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archisfera-projects-'));
  await mkdir(path.join(root, 'content/projects'), { recursive: true });
  await mkdir(path.join(root, 'assets/portfolio'), { recursive: true });
  await writeFile(path.join(root, 'assets/portfolio/photo.webp'), 'fixture');
  const save = (name, values = {}) => writeFile(path.join(root, 'content/projects', name+'.json'), JSON.stringify({
    title: 'Dom testowy', location: 'Łódź', area: 123.5, status: 'Zrealizowany',
    images: ['/assets/portfolio/photo.webp'], published: true, ...values,
  }));
  try { await run(root, save); } finally { await rm(root, { recursive: true, force: true }); }
}

test('CMS create, edit, reorder, unpublish and delete flow preserves stable links', async () => fixture(async (root, save) => {
  await save('first', { id: 4, order: 20 });
  await save('second', { order: 10 });
  let projects = await loadProjects(root);
  const newId = projects[0].id;
  assert.equal(projects[1].id, 4);
  assert.equal(projects[0].images[0], 'assets/portfolio/photo.webp');
  await save('second', { title: 'Nowa nazwa', order: 30, area: '123,50' });
  projects = await loadProjects(root);
  assert.equal(projects[0].id, 4);
  assert.equal(projects[1].id, newId);
  assert.equal(projects[1].title, 'Nowa nazwa');
  assert.equal(projects[1].area, 123.5);
  await save('first', { id: 4, published: false });
  assert.equal((await loadProjects(root)).length, 1);
  await unlink(path.join(root, 'content/projects/second.json'));
  assert.deepEqual(await loadProjects(root), []);
}));

test('unsafe image paths, missing files, duplicate ids and invalid area stop publication', async () => fixture(async (root, save) => {
  await save('one', { images: ['assets/portfolio/../../secret.jpg'] });
  await assert.rejects(loadProjects(root), /ścieżka/);
  await save('one', { images: ['assets/portfolio/missing.jpg'] });
  await assert.rejects(loadProjects(root), /ENOENT/);
  await save('one', { area: 0 });
  await assert.rejects(loadProjects(root), /powierzchnię/);
  await save('one', { id: 4 });
  await save('two', { id: 4 });
  await assert.rejects(loadProjects(root), /powtórzony/);
}));

test('rendering updates both pages, featured selection and counts with HTML-safe user content', async () => fixture(async (root, save) => {
  for (let i=1; i<=6; i++) await save('item'+i, { id: i, featured: i > 1, order: i });
  await save('item1', { id: 1, title: '<img onerror=alert(1)> $&', description: '<script>alert(1)</script>', order: 1 });
  const projects = await loadProjects(root);
  const template = '<section class="project-list wrap">old</section><div id="featured-projects" class="featured-projects">old</div><div class="featured-controls"></div>';
  const html = renderProjects(template, projects);
  assert.equal((html.match(/class="portfolio-project"/g)||[]).length, 6);
  assert.equal((html.match(/class="project-card"/g)||[]).length, 4);
  assert(html.includes('&lt;img onerror=alert(1)&gt; $&'));
  assert(!html.includes('<script>'));
  assert(html.includes('id="projekt-01"'));
  assert(html.includes('projekty/#projekt-02'));
  assert(!html.includes('projekty/#projekt-06'));
  assert(!browserProjects(projects).includes('<img'));
}));
