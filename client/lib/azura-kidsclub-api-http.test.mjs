import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { kidsClubImages } from "./azura-kidsclub-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/kidsclub.json"), "utf8"));
const escapeHtml = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const urls = Object.fromEntries(["tr", "en", "de", "ru"].map(l => [l, `/${l}/kidsclub`]));
const locales = ["tr", "en", "de", "ru"];
const token = "azura-kidsclub-test-service-token-123456789";
const auth = { Authorization: `Bearer ${token}` };

async function startServer(port, paths) {
  const child = spawn(process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
      cwd: appRoot,
      env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot,
        AZURA_PANEL_SERVICE_TOKEN: token },
      stdio: ["ignore", "pipe", "pipe"],
    });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try {
      const response = await fetch(`${base}/uploads/pages/kidsclub/club-main.webp`);
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

test("production Kids Club API'leri, dört dil, paralel kayıt, medya ve kalıcılık", { timeout: 120000 }, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-kidsclub-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads") };
  const kidsFilePath = path.join(paths.contentRoot, "site-pages/kidsclub.json");
  const uploads = path.join(paths.uploadsRoot, "pages/kidsclub");
  await mkdir(path.dirname(kidsFilePath), { recursive: true });
  await mkdir(uploads, { recursive: true });
  await writeFile(kidsFilePath, JSON.stringify({ ...seed, futureMetadata: { kept: true } }));
  for (const name of await readdir(path.join(appRoot, "public/uploads/pages/kidsclub"))) {
    await copyFile(path.join(appRoot, "public/uploads/pages/kidsclub", name), path.join(uploads, name));
  }

  const port = 46000 + Math.floor(Math.random() * 10000);
  const started = await startServer(port, paths);
  let { child } = started;
  const { base, output } = started;
  t.after(() => stopServer(child));

  for (const record of kidsClubImages(seed.media)) {
    const response = await fetch(`${base}${record.image}`);
    assert.equal(response.status, 200, record.image);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),
      await readFile(path.join(uploads, path.basename(record.image))));
  }
  for (const locale of locales) {
    const response = await fetch(`${base}${urls[locale]}`);
    assert.equal(response.status, 200, `${locale}: ${output()}`);
    const html = await response.text();
    const values = seed.translations[locale];
    assert.ok(html.includes(escapeHtml(values.hero.title)), locale);
    assert.ok(html.includes(escapeHtml(values.activities.items.activity1.title)), locale);
    assert.ok(html.includes(escapeHtml(values.moments.title)), locale);
    assert.ok(html.includes(seed.media.hero.image), locale);
    assert.ok(html.includes(seed.media.info.primary.image), locale);
  }

  const pageUrl = `${base}/api/azura/kidsclub/page-content`;
  const imagesUrl = `${base}/api/azura/kidsclub/images`;
  assert.equal((await fetch(pageUrl)).status, 401);
  assert.equal((await fetch(pageUrl, { headers: { Authorization: "Bearer invalid" } })).status, 401);
  assert.equal((await fetch(pageUrl, { method: "PUT" })).status, 401);
  assert.equal((await fetch(imagesUrl)).status, 401);
  assert.equal((await fetch(imagesUrl, { method: "POST" })).status, 401);
  const get = await fetch(pageUrl, { headers: auth });
  assert.equal(get.status, 200);
  const snapshot = await get.json();
  const originalBytes = await readFile(kidsFilePath);
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
  assert.equal((await fetch(pageUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/json", "If-Match": `"${snapshot.revision}"` }, body: "x".repeat(128 * 1024 + 1) })).status, 413);
  const tooLong = structuredClone(snapshot.bundle);
  tooLong.tr.hero.title = "x".repeat(4001);
  assert.equal((await put(tooLong)).status, 400);
  const wrongDimension = structuredClone(snapshot.media);
  wrongDimension.hero.width++;
  assert.equal((await put(snapshot.bundle, wrongDimension)).status, 400);
  const duplicateOrder = structuredClone(snapshot.media);
  duplicateOrder.activities.items.activity2.order = 0;
  assert.equal((await put(snapshot.bundle, duplicateOrder)).status, 400);
  const wrongId = structuredClone(snapshot.media);
  wrongId.pools.slide.id = "injected";
  assert.equal((await put(snapshot.bundle, wrongId)).status, 400);
  const wrongMassage = structuredClone(snapshot.media);
  wrongMassage.massage = { images: [] };
  assert.equal((await put(snapshot.bundle, wrongMassage)).status, 400);
  const missingList = structuredClone(snapshot.bundle);
  delete missingList.tr.info.text;
  assert.equal((await put(missingList)).status, 400);
  const missingCard = structuredClone(snapshot.bundle);
  missingCard.en.massage = {};
  assert.equal((await put(missingCard)).status, 400);
  const traversal = structuredClone(snapshot.media);
  traversal.hero.image = "/uploads/pages/kidsclub/../rooms/deluxe-primary.png";
  assert.equal((await put(snapshot.bundle, traversal)).status, 400);
  const fake = structuredClone(snapshot.media);
  fake.hero.image = "/uploads/pages/kidsclub/fake.jpg";
  await writeFile(path.join(uploads, "fake.jpg"), "not a JPEG");
  assert.equal((await put(snapshot.bundle, fake)).status, 400);
  assert.deepEqual(await readFile(kidsFilePath), originalBytes);
  const extraList = structuredClone(snapshot.bundle);
  extraList.tr.info.list4 = "not allowed";
  assert.equal((await put(extraList)).status, 400);
  const otherPage = structuredClone(snapshot.media);
  otherPage.hero.image = "/uploads/pages/spawellness/club-main.webp";
  assert.equal((await put(snapshot.bundle, otherPage)).status, 400);
  assert.equal((await fetch(pageUrl, { method: "PUT", headers: { ...auth, "Content-Type": "application/json", "If-Match": `"${snapshot.revision}"` }, body: JSON.stringify({ bundle: snapshot.bundle }) })).status, 400);
  assert.deepEqual(await readFile(kidsFilePath), originalBytes);
  for (const mutate of [
    m => { m.hero.translations = seed.media.info.primary.translations; },
    m => { delete m.pools.slide.translations; },
    m => { m.pools.indoor.order = 0; },
    m => { delete m.activities.items.activity4; },
    m => { m.moments.images[1].id = "bad"; },
    m => { m.info.primary.translations.tr.alt = "x".repeat(301); },
  ]) { const m = structuredClone(snapshot.media); mutate(m); assert.equal((await put(snapshot.bundle, m)).status, 400); }
  for (const mutate of [
    b => { b.fr = b.tr; }, b => { b.en.icons.social = ""; },
    b => { b.tr.activities.items.activity1.repeatTitle = ""; },
    b => { b.tr.activities.items.activity4.title = ""; },
    b => { b.de.activities.items.activity5.repeatTitle = " "; },
  ]) { const b = structuredClone(snapshot.bundle); mutate(b); assert.equal((await put(b)).status, 400); }
  assert.deepEqual(await readFile(kidsFilePath), originalBytes);
  // Both exact empty fields are accepted for all four languages, without changing seed values.
  for (const l of locales) for (const id of ["activity4", "activity5"]) assert.equal(snapshot.bundle[l].activities.items[id].repeatTitle, "");
  assert.equal((await put(snapshot.bundle)).status, 200);
  const beforeConcurrent = await readFile(kidsFilePath);
  assert.equal((await fetch(pageUrl, { headers: auth }).then((response) => response.json())).revision,
    snapshot.revision);
  assert.deepEqual(await readFile(kidsFilePath), beforeConcurrent);

  const first = structuredClone(snapshot.bundle);
  const second = structuredClone(snapshot.bundle);
  first.tr.hero.title = "Concurrent first";
  second.tr.hero.title = "Concurrent second";
  const simultaneous = await Promise.all([put(first), put(second)]);
  assert.deepEqual(simultaneous.map((response) => response.status).sort(), [200, 409]);
  const afterConcurrent = await fetch(pageUrl, { headers: auth }).then((response) => response.json());
  assert.deepEqual(JSON.parse(await readFile(kidsFilePath)).futureMetadata, { kept: true });
  assert.equal(JSON.parse(await readFile(kidsFilePath)).pageKey, "kidsclub");

  await symlink(path.join(uploads, "club-main.webp"), path.join(uploads, "linked.webp"));
  const linked = structuredClone(afterConcurrent.media);
  linked.hero.image = "/uploads/pages/kidsclub/linked.webp";
  const beforeLinked = await readFile(kidsFilePath);
  assert.equal((await put(afterConcurrent.bundle, linked, afterConcurrent.revision)).status, 400);
  assert.deepEqual(await readFile(kidsFilePath), beforeLinked);
  const list = await fetch(imagesUrl, { headers: auth });
  assert.equal(list.status, 200);
  const listed = (await list.json()).images;
  assert.equal(listed.length, 11);
  assert.ok(!listed.some(r => r.image.endsWith("/treadmills.jpg")));
  for (const r of listed) { assert.equal((await fetch(`${base}${r.image}`)).status, 200); assert.equal(typeof r.modifiedAt, "string"); }
  assert.ok(listed.every((image) => image.image.startsWith("/uploads/pages/kidsclub/") &&
    Number.isInteger(image.width) && Number.isInteger(image.height)));
  assert.ok(!listed.some((image) => image.image.endsWith("linked.webp") || image.image.endsWith("fake.jpg")));
  const multipart = (bytes, type = "image/jpeg") => {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type }), "new.jpg");
    return form;
  };
  assert.equal((await fetch(imagesUrl, { method: "POST", headers: auth,
    body: multipart(Buffer.from("fake")) })).status, 415);
  assert.equal((await fetch(imagesUrl, { method: "POST", headers: auth,
    body: multipart(Buffer.alloc(8 * 1024 * 1024 + 1)) })).status, 413);
  const extraForm = multipart(Buffer.from("test")); extraForm.append("caption", "not allowed");
  assert.equal((await fetch(imagesUrl, { method: "POST", headers: auth, body: extraForm })).status, 400);
  const bytes = await readFile(path.join(uploads, "activity-1.jpg"));
  const beforeUpload = await readFile(kidsFilePath);
  const upload = await fetch(imagesUrl, { method: "POST", headers: auth, body: multipart(bytes) });
  assert.equal(upload.status, 201);
  assert.deepEqual(await readFile(kidsFilePath), beforeUpload);
  const uploaded = await upload.json();
  const afterUploadList = await fetch(imagesUrl, { headers: auth }).then(r => r.json());
  assert.equal(afterUploadList.images.length, 12);
  assert.ok(afterUploadList.images.some(r => r.image === uploaded.image));
  assert.match(uploaded.image, /^\/uploads\/pages\/kidsclub\/kidsclub-[a-f0-9-]+\.jpg$/);
  assert.deepEqual(Object.keys(uploaded).sort(), ["image", "mimeType", "size", "width", "height"].sort());
  assert.equal(uploaded.mimeType, "image/jpeg");
  assert.equal(uploaded.size, bytes.length);
  assert.equal(uploaded.width, 720);
  assert.equal(uploaded.height, 1080);
  assert.deepEqual((await fetch(pageUrl, { headers: auth }).then((response) => response.json())).media,
    afterConcurrent.media);
  assert.equal((await fetch(uploaded.image.startsWith("/") ? `${base}${uploaded.image}` : uploaded.image)).status, 200);

  const updated = structuredClone(afterConcurrent.bundle);
  for (const locale of locales) updated[locale].hero.title = `Azura kidsclub update ${locale}`;
  const updatedMedia = structuredClone(afterConcurrent.media);
  updatedMedia.pools.slide.image = uploaded.image;
  updatedMedia.pools.slide.width = uploaded.width;
  updatedMedia.pools.slide.height = uploaded.height;
  Object.assign(updatedMedia.hero, { image: uploaded.image, width: uploaded.width, height: uploaded.height });
  const savedResponse = await put(updated, updatedMedia, afterConcurrent.revision);
  assert.equal(savedResponse.status, 200);
  const saved = await savedResponse.json();
  assert.deepEqual(Object.keys(saved), ["bundle", "media", "revision"]);
  assert.deepEqual(saved.bundle, updated);
  assert.equal(saved.media.pools.slide.image, uploaded.image);
  assert.equal(saved.media.hero.image, uploaded.image);
  assert.equal(Object.hasOwn(saved.media.hero, "translations"), false);
  assert.deepEqual(saved.media.pools.slide.translations, seed.media.pools.slide.translations);
  assert.match(saved.revision, /^[a-f0-9]{64}$/);
  const beforeConflict = await readFile(kidsFilePath);
  assert.equal((await put(updated, updatedMedia, afterConcurrent.revision)).status, 409);
  assert.deepEqual(await readFile(kidsFilePath), beforeConflict);
  for (const locale of locales) {
    const response = await fetch(`${base}${urls[locale]}`);
    assert.equal(response.status, 200, locale);
    const html = await response.text();
    assert.ok(html.includes(`Azura kidsclub update ${locale}`), locale);
    assert.ok(html.replace(/%2f/gi, "/").includes(uploaded.image), locale);
    assert.ok(html.includes(`url(${uploaded.image})`), "CSS hero published");
  }

  await stopServer(child);
  ({ child } = await startServer(port, paths));
  for (const locale of locales) {
    const response = await fetch(`${base}${urls[locale]}`);
    assert.equal(response.status, 200, locale);
    assert.ok((await response.text()).includes(`Azura kidsclub update ${locale}`), locale);
  }
  const restored = await fetch(pageUrl, { headers: auth }).then(r => r.json());
  assert.deepEqual(restored, saved);
  const finalFile = JSON.parse(await readFile(kidsFilePath));
  assert.equal(finalFile.schemaVersion, 1); assert.equal(finalFile.pageKey, "kidsclub"); assert.equal(Object.hasOwn(finalFile, "revision"), false);
  assert.deepEqual(JSON.parse(await readFile(kidsFilePath)).futureMetadata, { kept: true });
});
