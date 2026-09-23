import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inspectHomepageImage } from "./azura-homepage-media.mjs";
import { BEACH_ACTIVITY_IDS, BEACH_POOL_IDS, beachPoolsFile, beachPoolsImages, readBeachPoolsContent, readBeachPoolsPageLocale, validateBeachPoolsContent } from "./azura-beachpools-storage.mjs";
const root = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(root, "content/site-pages/beachpools.json")));
const locales = ["tr", "en", "de", "ru"];
const group = s => Object.fromEntries(["subtitle", "title", "text"].map(k => [k, s[k]]));
async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "azura-beach-unit-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(dir, "content"), uploadsRoot: path.join(dir, "uploads") };
  await cp(path.join(root, "content/site-pages"), path.join(paths.contentRoot, "site-pages"), { recursive: true });
  await cp(path.join(root, "public/uploads/pages/beachpools"), path.join(paths.uploadsRoot, "pages/beachpools"), { recursive: true });
  return paths;
}
test("four languages: exact visible text/whitespace and stable text/image/hover joins", async () => {
  for (const l of locales) {
    const s = JSON.parse(await readFile(path.join(root, `messages/${l}.json`))).BeachPools;
    const expected = { hero: group(s), info: s.TwoImageSection, activities: { ...group(s.BeachCarousel), cards: Object.fromEntries(BEACH_ACTIVITY_IDS.map((id, i) => [id, { title: s.BeachCarousel[`title${i+1}`], span: s.BeachCarousel[`span${i+1}`] }])) }, video: group(s.BeachGif), pools: { ...group(s.PoolSection), cards: Object.fromEntries(BEACH_POOL_IDS.map((id, i) => [id, { subtitle: s.PoolSection[`subtitle${i+1}`], title: s.PoolSection[`title${i+1}`], text: s.PoolSection[`text${i+1}`], outdoor: s.PoolSection.outdoor, area: s.PoolSection[`area${i+1}`], depth: s.PoolSection[`depth${i+1}`] }])) } };
    assert.deepEqual(seed.translations[l], expected);
    const data = await readBeachPoolsPageLocale(l, { contentRoot: path.join(root, "content"), uploadsRoot: path.join(root, "public/uploads") });
    assert.deepEqual(data.slides.map(r => r.id), BEACH_ACTIVITY_IDS);
    data.poolItems.forEach((r, i) => {
      const id = BEACH_POOL_IDS[i]; assert.equal(r.id, id); assert.equal(r.title, expected.pools.cards[id].title);
      assert.equal(r.src.src, seed.media.pools[id].image.image); assert.equal(r.hoverSrc.src, seed.media.pools[id].hover.image);
    });
  }
});
test("17 media uses, 16 unique byte-identical files, original order and actual dimensions", async () => {
  const originals = ["beachpools/Images/banner.webp", "HomePage/Components/Images/blok2.jpg", "HomePage/Components/Images/blok1.jpg",
    ...[248,247,249,250].map(i => `beachpools/Images/Slide/Group427319${i}.jpg`),
    ...[4,1,5,3,2].flatMap((n, i) => [`beachpools/Images/hoversız/beach${n}.jpg`, `beachpools/Images/hover/beach${[3,2,5,4,1][i]}.jpg`])];
  const records = beachPoolsImages(seed.media); assert.equal(records.length, 17); assert.equal(new Set(records.map(r => r.image)).size, 16);
  for (const [i,r] of records.entries()) {
    const bytes = await readFile(path.join(root, "public", r.image));
    assert.deepEqual(bytes, await readFile(path.join(root, "app/[locale]", originals[i])));
    const info = await inspectHomepageImage(bytes, r.image.endsWith("webp") ? "image/webp" : "image/jpeg");
    assert.equal(r.width, info.width); assert.equal(r.height, info.height);
  }
  assert.equal(Object.hasOwn(seed.media.hero.desktopBackground, "translations"), false);
  assert.equal(Object.hasOwn(seed.media.pools.main.hover, "translations"), false);
});
test("strict fields, locale, path, dimensions, identity and order validation", () => {
  for (const mutate of [c => { delete c.translations.ru; }, c => { c.translations.tr.info.list4 = "extra"; },
    c => { c.translations.en.hero.title = " "; }, c => { c.translations.de.hero.text = "x".repeat(4001); },
    c => { c.media.hero.desktopBackground.image = "/uploads/pages/spor/fitness-centre.jpg"; },
    c => { c.media.info.primary.image = "/uploads/pages/beachpools/../evil.jpg"; },
    c => { c.media.activities.activity1.id = "activity2"; }, c => { c.media.pools.main.order = 2; },
    c => { delete c.media.pools.indoorKids; }, c => { c.media.info.primary.width = 16000001; },
    c => { c.media.info.primary.translations.ru.alt = "x".repeat(301); },
    c => { c.media.video = { image: "/videos/azuramob2.mp4" }; },
  ]) { const c = structuredClone(seed); mutate(c); assert.throws(() => validateBeachPoolsContent(c)); }
});
test("explicit errors for missing JSON, malformed JSON, missing/fake/symlink files and wrong real dimensions", async t => {
  const paths = await fixture(t), file = beachPoolsFile(paths);
  await unlink(file); await assert.rejects(readBeachPoolsContent(paths));
  await writeFile(file, "{"); await assert.rejects(readBeachPoolsContent(paths));
  const bad = structuredClone(seed); bad.media.info.primary.width++;
  await writeFile(file, JSON.stringify(bad)); await assert.rejects(readBeachPoolsContent(paths), /ölçüler/);
  await writeFile(file, JSON.stringify(seed));
  const img = path.join(paths.uploadsRoot, seed.media.hero.desktopBackground.image.slice(9));
  await writeFile(img, "fake"); await assert.rejects(readBeachPoolsContent(paths), /görseli/);
  await unlink(img); await assert.rejects(readBeachPoolsContent(paths), /görseli/);
  await symlink(path.join(root, "public", seed.media.hero.desktopBackground.image), img); await assert.rejects(readBeachPoolsContent(paths), /görseli/);
});
test("seed never overwrites edited JSON or existing media", async t => {
  const paths = await fixture(t); await rm(paths.contentRoot, { recursive: true }); await rm(paths.uploadsRoot, { recursive: true });
  const run = () => promisify(execFile)(process.execPath, ["scripts/seed-persistent-beachpools.mjs"], { cwd: root, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot } });
  await run(); const c = structuredClone(seed); c.translations.tr.hero.title = "  Edited beach  "; c.metadata = true;
  await writeFile(beachPoolsFile(paths), JSON.stringify(c));
  const img = path.join(paths.uploadsRoot, seed.media.info.primary.image.slice(9));
  await writeFile(img, Buffer.concat([await readFile(img), Buffer.from("keep")]));
  const before = await readFile(img), json = await readFile(beachPoolsFile(paths)); await run();
  assert.deepEqual(await readFile(img), before); assert.deepEqual(await readFile(beachPoolsFile(paths)), json);
});
test("fixed video source, playback, hidden links and existing mobile behavior stay unchanged", async () => {
  const component = await readFile(path.join(root, "app/[locale]/beachpools/Components/Beach4.jsx"), "utf8");
  for (const text of ['src="/videos/azuramob2.mp4"', 'type="video/mp4"', "autoPlay", "loop", "muted", "playsInline", 'className="absolute top-0 left-0 w-full h-full object-cover object-center"', "Tarayıcınız bu videoyu desteklemiyor."]) assert.ok(component.includes(text));
  assert.ok(!JSON.stringify(seed).includes(".mp4"));
  const page = await readFile(path.join(root, "app/[locale]/beachpools/page.js"), "utf8"); assert.ok(page.includes("showLink={false}"));
});
