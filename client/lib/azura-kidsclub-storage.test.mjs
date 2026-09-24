import sharp from "sharp";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inspectHomepageImage } from "./azura-homepage-media.mjs";
import { KIDS_ACTIVITY_IDS, KIDS_POOL_IDS, KIDS_ICON_IDS, kidsClubFile, kidsClubImages, readKidsClubContent, readKidsClubPageLocale, validateKidsClubContent } from "./azura-kidsclub-storage.mjs";
const root = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(root, "content/site-pages/kidsclub.json")));
const locales = ["tr", "en", "de", "ru"];
const group = s => Object.fromEntries(["subtitle", "title", "text"].map(k => [k, s[k]]));
async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "azura-kids-unit-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(dir, "content"), uploadsRoot: path.join(dir, "uploads") };
  await cp(path.join(root, "content/site-pages"), path.join(paths.contentRoot, "site-pages"), { recursive: true });
  await cp(path.join(root, "public/uploads/pages/kidsclub"), path.join(paths.uploadsRoot, "pages/kidsclub"), { recursive: true });
  return paths;
}
test("explicit errors for missing JSON, malformed JSON, missing/fake/symlink files and wrong real dimensions", async t => {
  const paths = await fixture(t), file = kidsClubFile(paths);
  await unlink(file); await assert.rejects(readKidsClubContent(paths));
  await writeFile(file, "{"); await assert.rejects(readKidsClubContent(paths));
  const bad = structuredClone(seed); bad.media.info.primary.width++;
  await writeFile(file, JSON.stringify(bad)); await assert.rejects(readKidsClubContent(paths), /ölçüler/);
  await writeFile(file, JSON.stringify(seed));
  const img = path.join(paths.uploadsRoot, seed.media.hero.image.slice(9));
  await writeFile(img, "fake"); await assert.rejects(readKidsClubContent(paths), /görseli/);
  await unlink(img); await assert.rejects(readKidsClubContent(paths), /görseli/);
  await symlink(path.join(root, "public", seed.media.hero.image), img); await assert.rejects(readKidsClubContent(paths), /görseli/);
});
test("seed never overwrites edited JSON or existing media", async t => {
  const paths = await fixture(t); await rm(paths.contentRoot, { recursive: true }); await rm(paths.uploadsRoot, { recursive: true });
  const run = () => promisify(execFile)(process.execPath, ["scripts/seed-persistent-kidsclub.mjs"], { cwd: root, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot } });
  await run(); const c = structuredClone(seed); c.translations.tr.hero.title = "  Edited beach  "; c.metadata = true;
  await writeFile(kidsClubFile(paths), JSON.stringify(c));
  const img = path.join(paths.uploadsRoot, seed.media.info.primary.image.slice(9));
  await writeFile(img, await sharp(await readFile(img)).webp({ quality: 80 }).toBuffer());
  const before = await readFile(img), json = await readFile(kidsClubFile(paths)); await run();
  assert.deepEqual(await readFile(img), before); assert.deepEqual(await readFile(kidsClubFile(paths)), json);
});
test("four languages preserve every visible string, whitespace and both carousel passes", async () => {
 for (const l of locales) {
  const s=JSON.parse(await readFile(path.join(root,`messages/${l}.json`))).KidsClub;
  const h=[1,2,3,4,1,2,3,4].map(i=>s.CarouselSection[`title${i}`]);
  assert.deepEqual(seed.translations[l],{hero:group(s),info:group(s.TwoImageSection),icons:Object.fromEntries(KIDS_ICON_IDS.map((id,i)=>[id,s[`iconsText${i+1}`]])),activities:{...group(s.CarouselSection),items:Object.fromEntries(KIDS_ACTIVITY_IDS.map((id,i)=>[id,{title:h[i],repeatTitle:h[i+5]??""}]))},pools:{...group(s.OtherOptions),cards:Object.fromEntries(KIDS_POOL_IDS.map((id,i)=>[id,Object.fromEntries(["subtitle","title","text"].map(k=>[k,s.OtherOptions[`${k}${i+1}`]]))]))},moments:{title:s.galleryTitle}});
  const data=await readKidsClubPageLocale(l,{contentRoot:path.join(root,"content"),uploadsRoot:path.join(root,"public/uploads")});
  assert.deepEqual(data.activities.map(r=>r.id),KIDS_ACTIVITY_IDS);
  assert.deepEqual([...data.activities.map(r=>r.title),...data.activities.map(r=>r.repeatTitle)],[...h,"",""]);
  for(const [i,r]of data.pools.entries()){assert.equal(r.id,KIDS_POOL_IDS[i]);assert.equal(r.title,s.OtherOptions[`title${i+1}`]);assert.equal(r.img.src,seed.media.pools[r.id].image);}
 }
});
test("14 media records, 11 byte-identical files, actual dimensions and stable ordering",async()=>{
 const sources=["kids4.webp","kids3.webp","kids4.webp",...['childactivite.jpg','ballpool.jpg','babyroom.jpg','gamerooms.jpg','childactivite-1.jpg'].map(f=>`submenu/${f}`),"kids7.jpg","child_pool.jpg","2149046677.jpg","kids3.webp","kids4.webp","kids5.webp"];
 const records=kidsClubImages(seed.media);assert.equal(records.length,14);assert.equal(new Set(records.map(r=>r.image)).size,11);
 for(const [i,r]of records.entries()){const bytes=await readFile(path.join(root,"public",r.image));assert.deepEqual(bytes,await readFile(path.join(root,"app/[locale]/kidsclub/images",sources[i])));const m=await inspectHomepageImage(bytes,r.image.endsWith('.webp')?'image/webp':'image/jpeg');assert.equal(m.width,r.width);assert.equal(m.height,r.height);}
 assert.equal(Object.hasOwn(seed.media.hero,"translations"),false);
 assert.deepEqual(seed.media.moments.images.map(r=>[r.id,r.order]),[1,2,3].map((n,i)=>[`kidsclub-moment-${n}`,i]));
});
test("strict languages, text limits, ids, orders, media scope and CSS/normal distinctions",()=>{
 for(const mutate of [c=>delete c.translations.ru,c=>c.translations.tr.hero.title=" ",c=>c.translations.en.info.text="x".repeat(4001),c=>c.translations.tr.activities.items.activity4.repeatTitle="\n",c=>c.media.hero.translations={},c=>delete c.media.info.primary.translations,c=>c.media.info.primary.image='/uploads/pages/about/hero.webp',c=>c.media.hero.image='/uploads/pages/kidsclub/../hero.webp',c=>c.media.activities.items.activity1.id='activity2',c=>c.media.pools.slide.order=2,c=>c.media.moments.images.reverse(),c=>c.media.hero.width=16000001,c=>c.translations.tr.restaurant={},c=>c.media.info.primary.translations.tr.alt='x'.repeat(301)]){const c=structuredClone(seed);mutate(c);assert.throws(()=>validateKidsClubContent(c));}
});
test("canonical revision ignores key order and root metadata; content revisions are not persisted", async t => {
 const { kidsClubPageRevision, readKidsClubPageContent, writeKidsClubPageContent } = await import('./azura-kidsclub-storage.mjs');
 const paths=await fixture(t);
 const first=await readKidsClubPageContent(paths);
 const reversed=Object.fromEntries(Object.entries(first.bundle).reverse());
 assert.equal(kidsClubPageRevision(reversed,first.media),first.revision);
 const rootContent=JSON.parse(await readFile(kidsClubFile(paths)));rootContent.extra={keep:true};await writeFile(kidsClubFile(paths),JSON.stringify(rootContent));
 assert.equal((await readKidsClubPageContent(paths)).revision,first.revision);
 const changed=structuredClone(first.bundle);changed.en.hero.title='  Updated  ';
 const saved=await writeKidsClubPageContent(changed,first.media,first.revision,paths);
 assert.notEqual(saved.revision,first.revision);
 const final=JSON.parse(await readFile(kidsClubFile(paths)));assert.deepEqual(final.extra,{keep:true});assert.equal(Object.hasOwn(final,'revision'),false);
});
