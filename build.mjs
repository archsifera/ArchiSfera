import { mkdir, cp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { site, pages, redirects } from "./site.config.mjs";
import {
  applySeo,
  projectsFrom,
  versionsFrom,
  sitemapFor,
  robotsFor,
  apacheConfig,
  redirectPage,
  notFoundPage,
} from "./scripts/seo.mjs";
const root = process.cwd();
const pagesBuild = process.argv.includes("--pages");
const cname = await readFile(path.join(root, "CNAME"), "utf8").catch((error) => {
  if (error.code === "ENOENT") return "";
  throw error;
});
if (cname && cname.trim() !== new URL(site.origin).hostname)
  throw new Error("CNAME differs from configured domain");
const production = !process.argv.includes("--preview") && (!pagesBuild || Boolean(cname));
const repository = process.env.GITHUB_REPOSITORY || "";
if (pagesBuild && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))
  throw new Error("GITHUB_REPOSITORY must identify the Pages repository");
const repositoryName = repository.split("/")[1];
const pagesBase =
  pagesBuild && !production && !repositoryName.endsWith(".github.io") ? `/${repositoryName}/` : "/";
const dist = path.resolve(root, process.argv.includes("--preview") ? "dist-preview" : "dist");
if (path.dirname(dist) !== root || !["dist", "dist-preview"].includes(path.basename(dist)))
  throw new Error("Invalid build directory");
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const projects = await projectsFrom(root),
  versions = await versionsFrom(root);
const files = ["styles.css", "subpages.css", "motion.css", "app.js", "motion.js", "theme.js", "portfolio.js"];
const texts = [];
for (const page of pages) {
  let html = applySeo(
    await readFile(path.join(root, page.file), "utf8"),
    page,
    projects,
    versions,
    production,
  );
  if (pagesBuild && !production) {
    const base = `<base href="${pagesBase}" />`;
    html = /<base\b/i.test(html)
      ? html.replace(/<base\b[^>]*>/i, base)
      : html.replace("<head>", "<head>\n    " + base);
  }
  await mkdir(path.dirname(path.join(dist, page.file)), { recursive: true });
  await writeFile(path.join(dist, page.file), html);
  texts.push(html);
}
for (const file of files) {
  await cp(path.join(root, file), path.join(dist, file));
  texts.push(await readFile(path.join(root, file), "utf8"));
}
// Export referenced assets; archived concepts and review screenshots stay out of production.
const assets = new Set(
  texts.flatMap((text) =>
    [...text.matchAll(/assets\/[A-Za-z0-9_./%-]+\.(?:avif|webp|png|jpe?g|svg|ttf|woff2?)/gi)].map(
      (match) => match[0],
    ),
  ),
);
for (const asset of assets) {
  const source = path.resolve(root, asset);
  if (!source.startsWith(path.join(root, "assets") + path.sep)) throw new Error("Invalid asset path");
  await mkdir(path.dirname(path.join(dist, asset)), { recursive: true });
  await cp(source, path.join(dist, asset));
}
await cp(path.join(root, "assets/fonts/OFL.txt"), path.join(dist, "assets/fonts/OFL.txt"));
await writeFile(path.join(dist, "robots.txt"), robotsFor());
await writeFile(path.join(dist, "sitemap.xml"), sitemapFor(projects));
await writeFile(path.join(dist, "404.html"), notFoundPage().replace(/href="\//g, `href="${pagesBase}`));
if (production) {
  if (pagesBuild && cname) await writeFile(path.join(dist, "CNAME"), cname.trim() + "\n");
  await writeFile(path.join(dist, ".htaccess"), apacheConfig());
  await writeFile(
    path.join(dist, "redirects.json"),
    JSON.stringify(
      redirects.map(({ from, to }) => ({ from, to: new URL(to, site.origin).href, status: 301 })),
      null,
      2,
    ),
  );
  for (const { from, to } of redirects) {
    const folder = path.join(dist, from.slice(1));
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, "index.html"), redirectPage(to));
  }
}
console.log(
  `Built ${production ? "production" : "preview"} website in ${path.basename(dist)}/ — ${pages.length} pages, ${projects.length} projects, ${assets.size} referenced assets; canonical origin ${site.origin}`,
);
