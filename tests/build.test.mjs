import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, unlink, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
sharp.cache(false);

test('publishing a CMS edit updates HTML, gallery, SEO and compressed uploads together', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const temp = await mkdtemp(path.join(os.tmpdir(), 'archisfera-build-'));
  try {
    for (const file of ['content', 'assets', 'admin', 'index.html', 'projekty', 'oferta', 'kontakt', 'styles.css', 'subpages.css', 'motion.css', 'app.js', 'motion.js', 'theme.js', 'portfolio.js', 'CNAME']) {
      await cp(path.join(root, file), path.join(temp, file), { recursive: true });
    }
    const projectPath = path.join(temp, 'content/projects/project-04.json');
    const existing = JSON.parse(await readFile(projectPath, 'utf8'));
    existing.published = false;
    await writeFile(projectPath, JSON.stringify(existing));
    await unlink(path.join(temp, 'content/projects/project-08.json'));
    await sharp({ create: { width: 3000, height: 1800, channels: 3, background: '#ddd' } }).jpeg().toFile(path.join(temp, 'assets/portfolio/cms-upload.jpg'));
    await writeFile(path.join(temp, 'content/projects/new-realization.json'), JSON.stringify({
      title: 'Nowa realizacja z panelu', shortTitle: 'Nowy dom', location: 'Janów',
      area: 220, status: 'W realizacji', description: 'Opis zapisany w panelu.',
      images: ['/assets/portfolio/cms-upload.jpg'], order: 0, featured: true, published: true,
    }));
    execFileSync(process.execPath, [path.join(root, 'build.mjs')], { cwd: temp, stdio: 'pipe' });
    const html = await readFile(path.join(temp, 'dist/projekty/index.html'), 'utf8');
    const home = await readFile(path.join(temp, 'dist/index.html'), 'utf8');
    const data = await readFile(path.join(temp, 'dist/portfolio.js'), 'utf8');
    assert.equal((html.match(/class="portfolio-project"/g) || []).length, 9);
    assert(!html.includes('id="projekt-04"'));
    assert(!html.includes('id="projekt-08"'));
    assert(home.includes('<h3>Nowy dom</h3>'));
    assert(home.includes('assets/portfolio/generated/'));
    assert(html.includes('Opis zapisany w panelu.'));
    assert(data.includes('Nowa realizacja z panelu'));
    const sitemap = await readFile(path.join(temp, 'dist/sitemap.xml'), 'utf8');
    assert(sitemap.includes('/assets/portfolio/generated/'));
    const generated = /assets\/portfolio\/generated\/[a-f0-9]+\.webp/.exec(home)[0];
    const meta = await sharp(path.join(temp, 'dist', generated)).metadata();
    assert.equal(meta.width, 2200);
    assert.equal(meta.format, 'webp');
    await access(path.join(temp, 'dist/admin/index.html'));
    await assert.rejects(access(path.join(temp, 'dist/content/projects')));
  } finally {
    assert(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep + 'archisfera-build-'));
    await rm(temp, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  }
});
