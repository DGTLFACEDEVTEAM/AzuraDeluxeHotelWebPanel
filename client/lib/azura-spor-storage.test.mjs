import { createHash } from "node:crypto";
import sharp from "sharp";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { LOCALES } from "./azura-homepage-storage.mjs";
import { inspectHomepageImage } from "./azura-homepage-media.mjs";
import { readSporContent, readSporPageLocale, sporFile, sporImages, validateSporContent, SPOR_GALLERY_IDS } from "./azura-spor-storage.mjs";

const appRoot = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(appRoot, "content/site-pages/spor.json")));
const sources = { "fitness-centre.jpg": "fitnessBanner.jpg", "group-fitness.jpg": "group_fit.jpg", "table-tennis.jpg": "table_ten.jpg", "dumbbells.jpg": "gallery_orta.jpg", "treadmills-4800x3200.jpg": "gallery_sag.jpg", "aqua-fitness.jpg": "aqua.jpg" };
const group = (s, n = "") => Object.fromEntries(["subtitle", "title", "text"].map(k => [k, s[k + n]]));
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "azura-spor-unit-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "uploads") };
  await cp(path.join(appRoot, "content/site-pages"), path.join(paths.contentRoot, "site-pages"), { recursive: true });
  await cp(path.join(appRoot, "public/uploads/pages/spor"), path.join(paths.uploadsRoot, "pages/spor"), { recursive: true });
  return paths;
}

test("four languages preserve every visible Sport value and whitespace; three gallery IDs, four list fields, no massage", async () => {
  for (const locale of LOCALES) {
    const { Sport: s } = JSON.parse(await readFile(path.join(appRoot, `messages/${locale}.json`)));
    const expected = { hero: group(s), info: { intro: group(s.InfoSection, "1"), sauna: group(s.InfoSection, "2"), wellness: { ...group(s.InfoSection, "3"), ...Object.fromEntries([1, 2, 3, 4].map(i => [`list${i}`, s.InfoSection[`list${i}`]])) } }, gallery: group(s.GallerySection), types: { fitness: group(s.SpaTypes, "2"), personalTrainer: { title: s.SpaTypes.title1, text: s.SpaTypes.text1 } } };
    assert.deepEqual(seed.translations[locale], expected);
    const localized = await readSporPageLocale(locale, { contentRoot: path.join(appRoot, "content"), uploadsRoot: path.join(appRoot, "public/uploads") });
    assert.deepEqual(localized.texts, expected);
    assert.deepEqual(localized.images.gallery.map(r => [r.id, r.order]), SPOR_GALLERY_IDS.map((id, i) => [id, i]));
  }
  assert.equal(Object.hasOwn(seed.media, "massage"), false);
});

test("eight media uses / five identical copies and one proportional resize; real dimensions and exact placement", async () => {
  const records = sporImages(seed.media);
  assert.equal(records.length, 8);
  assert.equal(new Set(records.map(r => r.image)).size, 6);
  assert.deepEqual(records.map(r => path.basename(r.image)), ["fitness-centre.jpg", "group-fitness.jpg", "fitness-centre.jpg", "table-tennis.jpg", "dumbbells.jpg", "treadmills-4800x3200.jpg", "aqua-fitness.jpg", "table-tennis.jpg"]);
  for (const r of records) {
    const bytes = await readFile(path.join(appRoot, "public", r.image));
    const original = await readFile(path.join(appRoot, "app/[locale]/spor/images", sources[path.basename(r.image)]));
    if (path.basename(r.image) === "treadmills-4800x3200.jpg") {
      assert.equal(createHash("sha256").update(original).digest("hex"), "43cf2a29dc125a3305f9ed4c1c870a7ae13cc41e78de05806e246b54b2b914a9");
      const metadata = await sharp(original).metadata();
      assert.equal(r.width, 4800); assert.equal(r.height, 3200);
      assert.equal(r.width / r.height, metadata.width / metadata.height);
      assert.notDeepEqual(bytes, original);
      assert.deepEqual(bytes, await sharp(original).rotate().resize({ width: 4800, height: 3200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 95, chromaSubsampling: "4:4:4" }).toBuffer());
    } else assert.deepEqual(bytes, original);
    const real = await inspectHomepageImage(bytes, "image/jpeg");
    assert.equal(r.width, real.width); assert.equal(r.height, real.height);
  }
});

test("strict language, text, shape, scope, dimensions, collection identity/order validation", () => {
  for (const mutate of [
    c => { delete c.translations.ru; }, c => { c.translations.tr.hero.title = " "; },
    c => { c.translations.en.hero.text = "a".repeat(4001); }, c => { c.translations.de.hero.title = "bad\ntext"; },
    c => { c.translations.tr.massage = {}; }, c => { c.media.massage = {}; },
    c => { c.translations.tr.info.wellness.list5 = "extra"; },
    c => { c.media.hero.image = "/uploads/pages/spawellness/hero.webp"; },
    c => { c.media.hero.image = "/uploads/pages/spor/../escape.jpg"; },
    c => { c.media.hero.translations.ru.alt = "a".repeat(301); },
    c => { c.media.hero.width = 0; },
    c => { c.media.gallery.images[2].width = 5472; c.media.gallery.images[2].height = 3648; }, c => { c.media.gallery.images.pop(); },
    c => { c.media.gallery.images[1].id = "spor-gallery-1"; },
    c => { c.media.gallery.images[1].order = 0; },
    c => { c.translations.tr.types.personalTrainer.subtitle = "previously invisible"; },
  ]) { const c = structuredClone(seed); mutate(c); assert.throws(() => validateSporContent(c)); }
});

test("missing/broken JSON and missing, fake, symlink, wrong dimension/type images fail explicitly", async t => {
  const paths = await fixture(t);
  const file = sporFile(paths), image = path.join(paths.uploadsRoot, seed.media.hero.image.slice(9));
  await writeFile(file, "{"); await assert.rejects(readSporContent(paths), /okunamadı/);
  await unlink(file); await assert.rejects(readSporContent(paths), /okunamadı/);
  const c = structuredClone(seed); c.media.hero.width++;
  await writeFile(file, JSON.stringify(c)); await assert.rejects(readSporContent(paths), /ölçüler/);
  await writeFile(file, JSON.stringify(seed));
  const bytes = await readFile(image);
  await writeFile(image, "not an image"); await assert.rejects(readSporContent(paths), /görseli/);
  await unlink(image); await assert.rejects(readSporContent(paths), /görseli/);
  await symlink(path.join(appRoot, "public", seed.media.hero.image), image); await assert.rejects(readSporContent(paths), /görseli/);
  await unlink(image); await writeFile(image, bytes);
  const renamed = structuredClone(seed); renamed.media.hero.image = "/uploads/pages/spor/disguised.png";
  await writeFile(path.join(paths.uploadsRoot, "pages/spor/disguised.png"), bytes);
  await writeFile(file, JSON.stringify(renamed)); await assert.rejects(readSporContent(paths), /görseli/);
  await assert.rejects(readSporPageLocale("fr", paths), /dili/);
});

test("seed is repeatable and preserves existing JSON and image bytes", async t => {
  const paths = await fixture(t);
  await rm(paths.contentRoot, { recursive: true }); await rm(paths.uploadsRoot, { recursive: true });
  const run = () => promisify(execFile)(process.execPath, ["scripts/seed-persistent-spor.mjs"], { cwd: appRoot, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot } });
  await run();
  const edited = structuredClone(seed); edited.translations.tr.hero.title = "  Persistent Spor  "; edited.owner = "preserve";
  const image = path.join(paths.uploadsRoot, "pages/spor/dumbbells.jpg");
  const before = await readFile(image);
  await writeFile(image, Buffer.concat([before, Buffer.from("preserve-existing-file")]));
  await writeFile(sporFile(paths), JSON.stringify(edited));
  const jsonBytes = await readFile(sporFile(paths)), imageBytes = await readFile(image);
  await run();
  assert.deepEqual(await readFile(sporFile(paths)), jsonBytes); assert.deepEqual(await readFile(image), imageBytes);
});

test("canonical revisions exclude root metadata; queued writes preserve roots and recover after conflict", async t => {
  const { sporPageRevision, readSporPageContent, writeSporPageContent } = await import("./azura-spor-storage.mjs");
  const paths = await fixture(t);
  const original = { ...seed, metadata: { preserved: true } };
  await writeFile(sporFile(paths), JSON.stringify(original));
  const snapshot = await readSporPageContent(paths);
  const reverseKeys = value => Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).reverse().map(([key, val]) => [key, reverseKeys(val)])) : value;
  assert.equal(sporPageRevision(reverseKeys(snapshot.bundle), reverseKeys(snapshot.media)), snapshot.revision);
  const bundles = ["first", "second"].map(title => {
    const b = structuredClone(snapshot.bundle); b.tr.hero.title = title; return b;
  });
  const result = await Promise.allSettled(bundles.map(b => writeSporPageContent(b, snapshot.media, snapshot.revision, paths)));
  assert.equal(result.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(result.find(r => r.status === "rejected").reason.status, 409);
  const current = await readSporPageContent(paths);
  const beforeConflict = await readFile(sporFile(paths));
  await assert.rejects(writeSporPageContent(snapshot.bundle, snapshot.media, snapshot.revision, paths), e => e.status === 409);
  assert.deepEqual(await readFile(sporFile(paths)), beforeConflict);
  await writeSporPageContent(snapshot.bundle, snapshot.media, current.revision, paths);
  assert.deepEqual(JSON.parse(await readFile(sporFile(paths))), original);
});
