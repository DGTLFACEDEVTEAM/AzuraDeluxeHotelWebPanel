import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spaWellnessImages } from "./azura-spawellness-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/spawellness.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const escapeHtml = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const leaves = value => typeof value === "string" ? [value] : Object.values(value).flatMap(leaves);

async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try { if ((await fetch(`${base}/uploads/pages/spawellness/hero.webp`)).status === 200) return { child, base, output: () => output }; }
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

test("production Spa: dört dil, tüm metinler, galeri/kart sırası, kalıcı görseller ve restart; About/Sport regresyonu", { timeout: 120000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-spa-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads") };
  await mkdir(path.join(paths.contentRoot, "site-pages"), { recursive: true });
  for (const page of ["spawellness", "about", "spor"]) {
    await cp(path.join(appRoot, `content/site-pages/${page}.json`), path.join(paths.contentRoot, `site-pages/${page}.json`));
    await cp(path.join(appRoot, `public/uploads/pages/${page}`), path.join(paths.uploadsRoot, `pages/${page}`), { recursive: true });
  }
  const port = 46000 + Math.floor(Math.random() * 10000);
  const started = await startServer(port, paths);
  let { child } = started;
  const { base, output } = started;
  t.after(() => stopServer(child));

  for (const image of new Set(spaWellnessImages(seed.media).map(r => r.image))) {
    const response = await fetch(`${base}${image}`);
    assert.equal(response.status, 200, image);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(path.join(appRoot, "public", image)));
  }
  const aboutSeed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/about.json"), "utf8"));
  for (const locale of locales) {
    const response = await fetch(`${base}/${locale}/spawellness`);
    assert.equal(response.status, 200, output());
    const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    for (const text of leaves(seed.translations[locale])) assert.ok(html.includes(escapeHtml(text)), `${locale}: ${text}`);
    const imageTags = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0].replace(/%2f/gi, "/"));
    const spaTags = imageTags.filter(tag => tag.includes("/uploads/pages/spawellness/"));
    const media = seed.media;
    const expected = [media.info.sauna, media.info.wellness, ...media.gallery.images,
      ...media.massage.images, ...media.massage.images, media.types.indoor, media.types.turkishBath];
    assert.equal(spaTags.length, expected.length);
    expected.forEach((record, i) => {
      assert.ok(spaTags[i].includes(record.image), `media order ${locale} ${i}`);
      assert.ok(spaTags[i].includes(`alt="${escapeHtml(record.translations[locale].alt)}"`), `alt ${locale} ${i}`);
    });
    for (const record of media.massage.images) {
      const caption = escapeHtml(seed.translations[locale].massage.cards[record.id].title);
      const decoded = html.replace(/%2f/gi, "/");
      const pos = decoded.indexOf(record.image, decoded.indexOf("<img"));
      // The heading follows its own image, before the next card image.
      assert.ok(decoded.slice(pos, decoded.indexOf("<img", pos)).includes(caption), record.id);
    }
    const about = await fetch(`${base}/${locale}/about`);
    assert.equal(about.status, 200);
    const aboutHtml = await about.text();
    for (const text of leaves(aboutSeed.translations[locale])) assert.ok(aboutHtml.includes(escapeHtml(text)), `About: ${text}`);
    assert.ok(aboutHtml.includes(aboutSeed.media.location.image));
    assert.equal((await fetch(`${base}/${locale}/spor`)).status, 200);
  }

  const updated = structuredClone(seed);
  for (const locale of locales) {
    updated.translations[locale].hero.title = `Persistent Spa ${locale}`;
    updated.translations[locale].massage.cards["spa-massage-aromatic"].title = `Persistent massage ${locale}`;
  }
  // A fresh persistent filename also exercises the read-only media route, not public build assets.
  const selected = structuredClone(seed.media.types.indoor);
  selected.image = "/uploads/pages/spawellness/selected.webp";
  await cp(path.join(paths.uploadsRoot, "pages/spawellness/indoor.webp"), path.join(paths.uploadsRoot, "pages/spawellness/selected.webp"));
  updated.media.hero = selected;
  const file = path.join(paths.contentRoot, "site-pages/spawellness.json");
  await writeFile(`${file}.tmp`, JSON.stringify(updated)); await rename(`${file}.tmp`, file);
  async function assertPublished() {
    for (const locale of locales) {
      const response = await fetch(`${base}/${locale}/spawellness`); assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(`Persistent Spa ${locale}`));
      assert.ok(html.includes(`Persistent massage ${locale}`));
      assert.ok(html.includes(selected.image));
    }
    assert.equal((await fetch(`${base}${selected.image}`)).status, 200);
  }
  await assertPublished();
  await stopServer(child); ({ child } = await startServer(port, paths));
  await assertPublished();
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), updated);
});
