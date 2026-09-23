import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { beachPoolsImages } from "./azura-beachpools-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/beachpools.json"), "utf8"));
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
    try { if ((await fetch(`${base}/uploads/pages/beachpools/hero.webp`)).status === 200) return { child, base, output: () => output }; }
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

const urls = { tr: "/tr/plaj-havuz", en: "/en/beach-pool", de: "/de/strand-pool", ru: "/ru/plaj-basseyn" };
test("production beach: four languages, stable hover pairs/video, persistent updates/restart and shared component regressions", { timeout: 180000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-beach-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads") };
  await mkdir(path.join(paths.contentRoot, "site-pages"), { recursive: true });
  for (const page of ["beachpools", "restaurants", "spawellness", "about"]) {
    await cp(path.join(appRoot, `content/site-pages/${page}.json`), path.join(paths.contentRoot, `site-pages/${page}.json`));
    await cp(path.join(appRoot, `public/uploads/pages/${page}`), path.join(paths.uploadsRoot, `pages/${page}`), { recursive: true });
  }
  const port = 46000 + Math.floor(Math.random() * 10000);
  const started = await startServer(port, paths); let { child } = started; const { base, output } = started;
  t.after(() => stopServer(child));
  for (const image of new Set(beachPoolsImages(seed.media).map(r => r.image))) {
    const response = await fetch(`${base}${image}`); assert.equal(response.status, 200, image);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(path.join(appRoot, "public", image)));
  }
  assert.equal((await fetch(`${base}/videos/azuramob2.mp4`)).status, 200);
  for (const locale of locales) {
    const response = await fetch(`${base}${urls[locale]}`); assert.equal(response.status, 200, output());
    const html = visible(await response.text());
    for (const text of leaves(seed.translations[locale])) assert.ok(html.includes(escapeHtml(text)), `${locale}: ${text}`);
    const m = seed.media;
    const tags = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0].replace(/%2f/gi, "/")).filter(tag => tag.includes("/uploads/pages/beachpools/"));
    const activities = Object.values(m.activities), pools = Object.values(m.pools);
    const expected = [m.info.secondary,m.info.primary,...activities,...activities,...pools.map(r=>r.image),...pools.map(r=>r.image)];
    assert.equal(tags.length, expected.length);
    expected.forEach((r,i)=>{assert.ok(tags[i].includes(r.image), `${locale} image ${i}`);assert.ok(tags[i].includes(`alt="${escapeHtml(r.translations[locale].alt)}"`));});
    for (const r of pools) assert.ok(html.includes(`url(${r.hover.image})`));
    const video = html.match(/<video[^>]*>[\s\S]*?<\/video>/)?.[0];
    assert.ok(video); for (const text of ["autoPlay", "loop", "muted", "playsInline", "/videos/azuramob2.mp4"]) assert.ok(video.toLowerCase().includes(text.toLowerCase()));
    for (const page of ["restaurants", "about", "spawellness"]) {
      const res = await fetch(`${base}/${locale}/${page}`); assert.equal(res.status, 200);
      const other = JSON.parse(await readFile(path.join(appRoot, `content/site-pages/${page}.json`)));
      assert.ok(visible(await res.text()).includes(escapeHtml(other.translations[locale].hero.title)));
    }
  }
  const changed = structuredClone(seed);
  for (const l of locales) changed.translations[l].hero.title = `  Persistent beach ${l}  `;
  const selected = changed.media.info.primary;
  selected.image = "/uploads/pages/beachpools/selected.jpg";
  await cp(path.join(paths.uploadsRoot,"pages/beachpools/info-primary.jpg"),path.join(paths.uploadsRoot,"pages/beachpools/selected.jpg"));
  const file = path.join(paths.contentRoot, "site-pages/beachpools.json");
  await writeFile(`${file}.tmp`, JSON.stringify(changed)); await rename(`${file}.tmp`, file);
  async function published() {
    for (const l of locales) {const res=await fetch(`${base}${urls[l]}`);assert.equal(res.status,200);const html=visible(await res.text());assert.ok(html.includes(`  Persistent beach ${l}  `));assert.ok(html.replace(/%2f/gi,"/").includes(selected.image));}
    assert.equal((await fetch(`${base}${selected.image}`)).status,200);
  }
  await published(); await stopServer(child); ({child}=await startServer(port,paths)); await published();
  assert.deepEqual(JSON.parse(await readFile(file)),changed);
});
