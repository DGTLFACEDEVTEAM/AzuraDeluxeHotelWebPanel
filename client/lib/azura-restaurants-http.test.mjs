import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { restaurantsImages } from "./azura-restaurants-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/restaurants.json"), "utf8"));
const locales = ["tr", "en", "de", "ru"];
const token = "azura-restaurants-test-service-token-123456789";
const auth = { Authorization: `Bearer ${token}` };

async function startServer(port, paths) {
  const child = spawn(process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
      cwd: appRoot,
      env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot,
        AZURA_PANEL_SERVICE_TOKEN: token },
      stdio: ["ignore", "pipe", "pipe"],
    });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try {
      const response = await fetch(`${base}/uploads/pages/restaurants/hero-banner.jpg`);
      if (response.status === 200) return { child, base, output: () => output };
    } catch { /* server not ready */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error(`Next zamanında hazır olmadı: ${output}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill();
    setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000).unref();
  });
}

test("production restoran API'leri, dört dil, paralel kayıt, medya ve kalıcılık", { timeout: 120000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-restaurants-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads") };
  const restaurantFile = path.join(paths.contentRoot, "site-pages/restaurants.json");
  const uploads = path.join(paths.uploadsRoot, "pages/restaurants");
  await mkdir(path.dirname(restaurantFile), { recursive: true });
  await mkdir(uploads, { recursive: true });
  await writeFile(restaurantFile, JSON.stringify({ ...seed, futureMetadata: { kept: true } }));
  for (const name of await readdir(path.join(appRoot, "public/uploads/pages/restaurants"))) {
    await copyFile(path.join(appRoot, "public/uploads/pages/restaurants", name), path.join(uploads, name));
  }

  const port = 46000 + Math.floor(Math.random() * 10000);
  const started = await startServer(port, paths);
  let { child } = started;
  const { base, output } = started;
  t.after(() => stopServer(child));

  for (const record of restaurantsImages(seed.media)) {
    const response = await fetch(`${base}${record.image}`);
    assert.equal(response.status, 200, record.image);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),
      await readFile(path.join(uploads, path.basename(record.image))));
  }
  for (const locale of locales) {
    const response = await fetch(`${base}/${locale}/restaurants`);
    assert.equal(response.status, 200, `${locale}: ${output()}`);
    const html = await response.text();
    const values = seed.translations[locale];
    assert.ok(html.includes(values.hero.title), locale);
    assert.ok(html.includes(values.alacarteCarousel.cards.bellaAzura.title), locale);
    assert.ok(html.includes(values.dessertsCarousel.cards.lyric.title), locale);
    assert.ok(html.includes(seed.media.hero.image), locale);
    assert.ok(html.includes(seed.media.discover.image), locale);
  }

  const pageUrl = `${base}/api/azura/restaurants/page-content`;
  const imagesUrl = `${base}/api/azura/restaurants/images`;
  assert.equal((await fetch(pageUrl)).status, 401);
  assert.equal((await fetch(pageUrl, { headers: { Authorization: "Bearer invalid" } })).status, 401);
  assert.equal((await fetch(imagesUrl)).status, 401);
  assert.equal((await fetch(imagesUrl, { method: "POST" })).status, 401);
  const get = await fetch(pageUrl, { headers: auth });
  assert.equal(get.status, 200);
  const snapshot = await get.json();
  assert.deepEqual(Object.keys(snapshot), ["bundle", "media", "revision"]);
  assert.deepEqual(snapshot.bundle, seed.translations);
  assert.deepEqual(snapshot.media, seed.media);
  assert.match(snapshot.revision, /^[a-f0-9]{64}$/);
  const put = (bundle, media = snapshot.media, revision = snapshot.revision, headers = {}) => fetch(pageUrl, {
    method: "PUT", headers: { ...auth, "Content-Type": "application/json",
      "If-Match": `"${revision}"`, ...headers },
    body: JSON.stringify({ bundle, media }),
  });
  assert.equal((await fetch(pageUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ bundle: snapshot.bundle, media: snapshot.media }) })).status, 428);
  assert.equal((await put(snapshot.bundle, snapshot.media, snapshot.revision, { "If-Match": "bad" })).status, 400);
  assert.equal((await put(snapshot.bundle, snapshot.media, snapshot.revision,
    { "Content-Type": "text/plain" })).status, 415);
  assert.equal((await fetch(pageUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/json",
    "If-Match": `"${snapshot.revision}"` }, body: "{" })).status, 400);
  assert.equal((await fetch(pageUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/json",
    "If-Match": `"${snapshot.revision}"` },
  body: JSON.stringify({ bundle: snapshot.bundle, media: snapshot.media, pageKey: "changed" }) })).status, 400);
  const missingLocale = structuredClone(snapshot.bundle);
  delete missingLocale.ru;
  assert.equal((await put(missingLocale)).status, 400);
  const tooLong = structuredClone(snapshot.bundle);
  tooLong.tr.hero.title = "x".repeat(4001);
  assert.equal((await put(tooLong)).status, 400);
  const wrongDimension = structuredClone(snapshot.media);
  wrongDimension.hero.width++;
  assert.equal((await put(snapshot.bundle, wrongDimension)).status, 400);
  const traversal = structuredClone(snapshot.media);
  traversal.hero.image = "/uploads/pages/restaurants/../rooms/deluxe-primary.png";
  assert.equal((await put(snapshot.bundle, traversal)).status, 400);
  const fake = structuredClone(snapshot.media);
  fake.hero.image = "/uploads/pages/restaurants/fake.jpg";
  await writeFile(path.join(uploads, "fake.jpg"), "not a JPEG");
  assert.equal((await put(snapshot.bundle, fake)).status, 400);
  const beforeConcurrent = await readFile(restaurantFile);
  assert.equal((await fetch(pageUrl, { headers: auth }).then((response) => response.json())).revision,
    snapshot.revision);
  assert.deepEqual(await readFile(restaurantFile), beforeConcurrent);

  const first = structuredClone(snapshot.bundle);
  const second = structuredClone(snapshot.bundle);
  first.tr.hero.title = "Concurrent first";
  second.tr.hero.title = "Concurrent second";
  const simultaneous = await Promise.all([put(first), put(second)]);
  assert.deepEqual(simultaneous.map((response) => response.status).sort(), [200, 409]);
  const afterConcurrent = await fetch(pageUrl, { headers: auth }).then((response) => response.json());
  assert.deepEqual(JSON.parse(await readFile(restaurantFile)).futureMetadata, { kept: true });
  assert.equal(JSON.parse(await readFile(restaurantFile)).pageKey, "restaurants");

  await symlink(path.join(uploads, "hero-banner.jpg"), path.join(uploads, "linked.jpg"));
  const list = await fetch(imagesUrl, { headers: auth });
  assert.equal(list.status, 200);
  const listed = (await list.json()).images;
  assert.equal(listed.length, 13);
  assert.ok(listed.every((image) => image.image.startsWith("/uploads/pages/restaurants/") &&
    Number.isInteger(image.width) && Number.isInteger(image.height)));
  assert.ok(!listed.some((image) => image.image.endsWith("linked.jpg") || image.image.endsWith("fake.jpg")));
  const multipart = (bytes, type = "image/jpeg") => {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type }), "new.jpg");
    return form;
  };
  assert.equal((await fetch(imagesUrl, { method: "POST", headers: auth,
    body: multipart(Buffer.from("fake")) })).status, 415);
  assert.equal((await fetch(imagesUrl, { method: "POST", headers: auth,
    body: multipart(Buffer.alloc(8 * 1024 * 1024 + 1)) })).status, 413);
  const bytes = await readFile(path.join(uploads, "intro-secondary.jpg"));
  const upload = await fetch(imagesUrl, { method: "POST", headers: auth, body: multipart(bytes) });
  assert.equal(upload.status, 201);
  const uploaded = await upload.json();
  assert.match(uploaded.image, /^\/uploads\/pages\/restaurants\/restaurants-[a-f0-9-]+\.jpg$/);
  assert.equal(uploaded.mimeType, "image/jpeg");
  assert.equal(uploaded.size, bytes.length);
  assert.equal(uploaded.width, 300);
  assert.equal(uploaded.height, 450);
  assert.deepEqual((await fetch(pageUrl, { headers: auth }).then((response) => response.json())).media,
    afterConcurrent.media);
  assert.equal((await fetch(uploaded.image.startsWith("/") ? `${base}${uploaded.image}` : uploaded.image)).status, 200);

  const updated = structuredClone(afterConcurrent.bundle);
  for (const locale of locales) updated[locale].hero.title = `Azura restaurant update ${locale}`;
  const updatedMedia = structuredClone(afterConcurrent.media);
  updatedMedia.intro.secondary.image = uploaded.image;
  updatedMedia.intro.secondary.width = uploaded.width;
  updatedMedia.intro.secondary.height = uploaded.height;
  const savedResponse = await put(updated, updatedMedia, afterConcurrent.revision);
  assert.equal(savedResponse.status, 200);
  const saved = await savedResponse.json();
  assert.deepEqual(Object.keys(saved), ["bundle", "media", "revision"]);
  assert.deepEqual(saved.bundle, updated);
  assert.equal(saved.media.intro.secondary.image, uploaded.image);
  assert.match(saved.revision, /^[a-f0-9]{64}$/);
  assert.equal((await put(updated, updatedMedia, afterConcurrent.revision)).status, 409);
  for (const locale of locales) {
    const response = await fetch(`${base}/${locale}/restaurants`);
    assert.equal(response.status, 200, locale);
    const html = await response.text();
    assert.ok(html.includes(`Azura restaurant update ${locale}`), locale);
    assert.ok(html.includes(uploaded.image), locale);
  }

  await stopServer(child);
  ({ child } = await startServer(port, paths));
  for (const locale of locales) {
    const response = await fetch(`${base}/${locale}/restaurants`);
    assert.equal(response.status, 200, locale);
    assert.ok((await response.text()).includes(`Azura restaurant update ${locale}`), locale);
  }
  assert.deepEqual(JSON.parse(await readFile(restaurantFile)).futureMetadata, { kept: true });
});
