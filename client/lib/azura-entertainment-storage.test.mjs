import sharp from "sharp";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inspectHomepageImage } from "./azura-homepage-media.mjs";
import { ENTERTAINMENT_GRID_IDS, ENTERTAINMENT_GRID_LINKS, entertainmentFile, entertainmentImages, readEntertainmentContent, readEntertainmentPageLocale, validateEntertainmentContent } from "./azura-entertainment-storage.mjs";
const root = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(root, "content/site-pages/entertainment.json")));
const locales = ["tr", "en", "de", "ru"];
const group = s => Object.fromEntries(["subtitle", "title", "text"].map(k => [k, s[k]]));
async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "azura-entertainment-unit-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(dir, "content"), uploadsRoot: path.join(dir, "uploads") };
  await cp(path.join(root, "content/site-pages"), path.join(paths.contentRoot, "site-pages"), { recursive: true });
  await cp(path.join(root, "public/uploads/pages/entertainment"), path.join(paths.uploadsRoot, "pages/entertainment"), { recursive: true });
  return paths;
}
test("explicit errors for missing JSON, malformed JSON, missing/fake/symlink files and wrong real dimensions", async t => {
  const paths = await fixture(t), file = entertainmentFile(paths);
  await unlink(file); await assert.rejects(readEntertainmentContent(paths));
  await writeFile(file, "{"); await assert.rejects(readEntertainmentContent(paths));
  const bad = structuredClone(seed); bad.media.activities[0].width++;
  await writeFile(file, JSON.stringify(bad)); await assert.rejects(readEntertainmentContent(paths), /ölçüler/);
  await writeFile(file, JSON.stringify(seed));
  const img = path.join(paths.uploadsRoot, seed.media.hero.image.slice(9));
  await writeFile(img, "fake"); await assert.rejects(readEntertainmentContent(paths), /görseli/);
  await unlink(img); await assert.rejects(readEntertainmentContent(paths), /görseli/);
  await symlink(path.join(root, "public", seed.media.hero.image), img); await assert.rejects(readEntertainmentContent(paths), /görseli/);
});
test("seed never overwrites edited JSON or existing media", async t => {
  const paths = await fixture(t); await rm(paths.contentRoot, { recursive: true }); await rm(paths.uploadsRoot, { recursive: true });
  const run = () => promisify(execFile)(process.execPath, ["scripts/seed-persistent-entertainment.mjs"], { cwd: root, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot } });
  await run(); const c = structuredClone(seed); c.translations.tr.activities.title = "  Edited beach  ";
  await writeFile(entertainmentFile(paths), JSON.stringify(c));
  const img = path.join(paths.uploadsRoot, seed.media.activities[0].image.slice(9));
  await writeFile(img, await sharp(await readFile(img)).jpeg({ quality: 85 }).toBuffer());
  const before = await readFile(img), json = await readFile(entertainmentFile(paths)); await run();
  assert.deepEqual(await readFile(img), before); assert.deepEqual(await readFile(entertainmentFile(paths)), json);
});
test("four languages preserve user edits and stable text/media/category/link mapping",async()=>{
 const intentional=new Set(['title1','text1','title9','text9']);
 for(const l of locales){
  const old=JSON.parse(await readFile(path.join(root,`messages/${l}.json`))).Entertainment;
  assert.deepEqual(seed.translations[l].activities,Object.fromEntries(['subtitle','title','text','span1','span2','daytime','nighttime'].map(k=>[k,old[k]])));
  for(const [k,v]of Object.entries(seed.translations[l].gridSection))assert.equal(v,l==='en'&&intentional.has(k)?old.GridSection[k].trimStart():old.GridSection[k]);
  const d=await readEntertainmentPageLocale(l,{contentRoot:path.join(root,'content'),uploadsRoot:path.join(root,'public/uploads')});
  assert.deepEqual(d.activities.map(r=>r.id),['daytime','nighttime']);assert.deepEqual(d.cards.map(r=>r.id),ENTERTAINMENT_GRID_IDS);
  d.cards.forEach((r,i)=>{assert.equal(r.title,seed.translations[l].gridSection[`title${i+1}`]);assert.equal(r.description,seed.translations[l].gridSection[`text${i+1}`]);assert.equal(r.img.src,seed.media.gridSection[i].image);assert.equal(r.category,seed.translations[l].gridSection[[6,7].includes(i)?'nighttime':'daytime']);assert.equal(r.link,ENTERTAINMENT_GRID_LINKS[r.id]);});
 }
});
test("all 12 existing files match sources and real dimensions; duplicates remain intentionally",async()=>{
 const sources=['entertainment/images/ent_ban.jpg','entertainment/images/1.jpg','entertainment/images/2.jpg','entertainment/images/FITNESSCENTER.jpg','entertainment/images/kids3.jpg','entertainment/images/5042.jpg','gallery/images/entertainment/1.jpg','entertainment/images/kids4.jpg','entertainment/images/kids1.jpg','gallery/images/entertainment/2.jpg','entertainment/images/kids2.jpg','gallery/images/entertainment/2150407949.jpg'];
 const records=entertainmentImages(seed.media);assert.equal(records.length,12);const bytes=[];
 for(const [i,r]of records.entries()){const b=await readFile(path.join(root,'public',r.image));bytes.push(b.toString('base64'));assert.deepEqual(b,await readFile(path.join(root,'app/[locale]',sources[i])));const actual=await inspectHomepageImage(b,'image/jpeg');assert.equal(actual.width,r.width);assert.equal(actual.height,r.height);}
 assert.equal(new Set(bytes).size,10);assert.equal(Object.hasOwn(seed.media.hero,'translations'),false);
 assert.deepEqual(seed.media.gridSection.map(r=>[r.id,r.order]),ENTERTAINMENT_GRID_IDS.map((id,i)=>[id,i]));
});
test("exact schema rejects unknown/missing fields, invalid media scope, ids, order, types and limits",()=>{
 for(const mutate of [c=>delete c.translations.ru,c=>c.translations.fr=c.translations.tr,c=>c.translations.tr.activities.text='',c=>c.translations.en.gridSection.text1='x'.repeat(4001),c=>c.media.hero.translations={},c=>c.media.gridSection[0].image='/uploads/pages/bars/hero.jpg',c=>c.media.hero.image='/uploads/pages/entertainment/../hero.jpg',c=>c.media.activities[0].order=1,c=>c.media.gridSection[0].id='other',c=>c.media.gridSection.pop(),c=>c.media.hero.width=16000001,c=>delete c.media.activities[0].translations.en,c=>c.media.activities[0].translations.en.alt='x'.repeat(301),c=>c.translations.tr.gallery={}]){const c=structuredClone(seed);mutate(c);assert.throws(()=>validateEntertainmentContent(c));}
});
test("desktop links and existing mobile indicator behavior stay unchanged; inactive gallery stays inactive",async()=>{
 const s=await readFile(path.join(root,'app/[locale]/entertainment/components/EntertainmentTypesSection.jsx'),'utf8');assert.ok(s.includes("import Link from 'next/link'"));assert.equal((s.match(/<Link /g)||[]).length,1);assert.ok(s.includes('href={activity.link}'));assert.ok(s.includes('onClick={() => handleJump(i)}'));assert.ok(s.includes('emblaApi?.scrollTo?.(index)'));
 const p=await readFile(path.join(root,'app/[locale]/entertainment/page.js'),'utf8');assert.ok(!p.includes('ActivityBackgroundSection'));
});
test("seed reports existing old dimensions without overwriting user edits",async t=>{
 const paths=await fixture(t);const c=structuredClone(seed);c.translations.en.activities.title='User edited title';c.media.gridSection[3].width=698;c.media.gridSection[3].height=760;
 const file=entertainmentFile(paths);await writeFile(file,JSON.stringify(c));const before=await readFile(file);
 await assert.rejects(promisify(execFile)(process.execPath,['scripts/seed-persistent-entertainment.mjs'],{cwd:root,env:{...process.env,AZURA_CONTENT_ROOT:paths.contentRoot,AZURA_UPLOADS_ROOT:paths.uploadsRoot}}));
 assert.deepEqual(await readFile(file),before);
});

test("canonical revision ignores key order and root metadata; content revisions are not persisted", async t => {
 const { entertainmentPageRevision, readEntertainmentPageContent, writeEntertainmentPageContent } = await import('./azura-entertainment-storage.mjs');
 const paths=await fixture(t);
 const first=await readEntertainmentPageContent(paths);
 const reversed=Object.fromEntries(Object.entries(first.bundle).reverse());
 assert.equal(entertainmentPageRevision(reversed,first.media),first.revision);
 const rootContent=JSON.parse(await readFile(entertainmentFile(paths)));rootContent.extra={keep:true};await writeFile(entertainmentFile(paths),JSON.stringify(rootContent));
 assert.equal((await readEntertainmentPageContent(paths)).revision,first.revision);
 const changed=structuredClone(first.bundle);changed.en.activities.title='  Updated  ';
 const saved=await writeEntertainmentPageContent(changed,first.media,first.revision,paths);
 assert.notEqual(saved.revision,first.revision);
 const final=JSON.parse(await readFile(entertainmentFile(paths)));assert.deepEqual(final.extra,{keep:true});assert.equal(Object.hasOwn(final,'revision'),false);
});
