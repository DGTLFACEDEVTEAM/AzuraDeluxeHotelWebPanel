import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { sporImages } from "./azura-spor-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/spor.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const escapeHtml = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const leaves = value => typeof value === "string" ? [value] : Object.values(value).flatMap(leaves);
const visible = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");

async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try { if ((await fetch(`${base}/uploads/pages/spor/fitness-centre.jpg`)).status === 200) return { child, base, output: () => output }; }
    catch { /* server not ready */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill(); throw new Error(`Next hazır olmadı: ${output}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  await new Promise(resolve => {
    child.once("exit", resolve); child.kill();
    setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000).unref();
  });
}

test("production Spor: four languages, exact content/media order, no massage, live edits and restart; Spa/About regressions", { timeout: 180000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-spor-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads") };
  await mkdir(path.join(paths.contentRoot, "site-pages"), { recursive: true });
  for (const page of ["spor", "spawellness", "about"]) {
    await cp(path.join(appRoot, `content/site-pages/${page}.json`), path.join(paths.contentRoot, `site-pages/${page}.json`));
    await cp(path.join(appRoot, `public/uploads/pages/${page}`), path.join(paths.uploadsRoot, `pages/${page}`), { recursive: true });
  }
  const port = 46000 + Math.floor(Math.random() * 10000);
  const started = await startServer(port, paths);
  let { child } = started;
  const { base, output } = started;
  t.after(() => stopServer(child));
  for (const image of new Set(sporImages(seed.media).map(r => r.image))) {
    const response = await fetch(`${base}${image}`);
    assert.equal(response.status, 200, image);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(path.join(appRoot, "public", image)));
  }
  for (const locale of locales) {
    const response = await fetch(`${base}/${locale}/spor`);
    assert.equal(response.status, 200, output());
    const html = visible(await response.text());
    for (const text of leaves(seed.translations[locale])) assert.ok(html.includes(escapeHtml(text)), `${locale}: ${text}`);
    const { Sport: old } = JSON.parse(await readFile(path.join(appRoot, `messages/${locale}.json`)));
    assert.ok(!html.includes(escapeHtml(old.SpaTypes.subtitle1)), "formerly invisible subtitle stays invisible");
    const tags = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0].replace(/%2f/gi, "/")).filter(tag => tag.includes("/uploads/pages/spor/"));
    const m = seed.media;
    const expected = [m.info.sauna, m.info.wellness, ...m.gallery.images, m.types.fitness, m.types.personalTrainer];
    assert.equal(tags.length, 7);
    expected.forEach((record, i) => {
      assert.ok(tags[i].includes(record.image), `${locale} image ${i}`);
      assert.ok(tags[i].includes(`alt="${escapeHtml(record.translations[locale].alt)}"`));
      assert.ok(tags[i].includes(`width="${record.width}"`));
      assert.ok(tags[i].includes(`height="${record.height}"`));
    });
    assert.ok(html.includes(`url(${m.hero.image})`));
    assert.ok(!html.includes("spa-massage-") && !html.includes("/uploads/pages/spawellness/"));
    const pageSource = await readFile(path.join(appRoot, "app/[locale]/spor/page.js"), "utf8");
    assert.ok(!pageSource.includes("MassageCarousel"));
    for (const page of ["spawellness", "about"]) {
      const other = JSON.parse(await readFile(path.join(appRoot, `content/site-pages/${page}.json`)));
      const res = await fetch(`${base}/${locale}/${page}`); assert.equal(res.status, 200);
      const otherHtml = visible(await res.text());
      for (const text of leaves(other.translations[locale])) assert.ok(otherHtml.includes(escapeHtml(text)), `${page} ${locale}: ${text}`);
    }
  }
  const updated = structuredClone(seed);
  for (const locale of locales) updated.translations[locale].hero.title = `  Persistent Spor ${locale}  `;
  const selected = structuredClone(seed.media.types.fitness);
  selected.image = "/uploads/pages/spor/selected.jpg";
  await cp(path.join(paths.uploadsRoot, "pages/spor/aqua-fitness.jpg"), path.join(paths.uploadsRoot, "pages/spor/selected.jpg"));
  updated.media.hero = selected;
  const file = path.join(paths.contentRoot, "site-pages/spor.json");
  await writeFile(`${file}.tmp`, JSON.stringify(updated)); await rename(`${file}.tmp`, file);
  async function assertPublished() {
    for (const locale of locales) {
      const response = await fetch(`${base}/${locale}/spor`); assert.equal(response.status, 200);
      const html = visible(await response.text());
      assert.ok(html.includes(`  Persistent Spor ${locale}  `)); assert.ok(html.includes(selected.image));
    }
    assert.equal((await fetch(`${base}${selected.image}`)).status, 200);
  }
  await assertPublished();
  await stopServer(child); ({ child } = await startServer(port, paths));
  await assertPublished();
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), updated);
});
