import sharp from "sharp";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inspectHomepageImage } from "./azura-homepage-media.mjs";
import { BAR_IDS, BAR_LINKS, barsFile, barsImages, readBarsContent, readBarsPageLocale, validateBarsContent } from "./azura-bars-storage.mjs";
const root = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(await readFile(path.join(root, "content/site-pages/bars.json")));
const locales = ["tr", "en", "de", "ru"];
const group = s => Object.fromEntries(["subtitle", "title", "text"].map(k => [k, s[k]]));
async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "azura-bars-unit-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const paths = { contentRoot: path.join(dir, "content"), uploadsRoot: path.join(dir, "uploads") };
  await cp(path.join(root, "content/site-pages"), path.join(paths.contentRoot, "site-pages"), { recursive: true });
  await cp(path.join(root, "public/uploads/pages/bars"), path.join(paths.uploadsRoot, "pages/bars"), { recursive: true });
  return paths;
}
test("explicit errors for missing JSON, malformed JSON, missing/fake/symlink files and wrong real dimensions", async t => {
  const paths = await fixture(t), file = barsFile(paths);
  await unlink(file); await assert.rejects(readBarsContent(paths));
  await writeFile(file, "{"); await assert.rejects(readBarsContent(paths));
  const bad = structuredClone(seed); bad.media.culinaryInfo.primary.width++;
  await writeFile(file, JSON.stringify(bad)); await assert.rejects(readBarsContent(paths), /ölçüler/);
  await writeFile(file, JSON.stringify(seed));
  const img = path.join(paths.uploadsRoot, seed.media.hero.image.slice(9));
  await writeFile(img, "fake"); await assert.rejects(readBarsContent(paths), /görseli/);
  await unlink(img); await assert.rejects(readBarsContent(paths), /görseli/);
  await symlink(path.join(root, "public", seed.media.hero.image), img); await assert.rejects(readBarsContent(paths), /görseli/);
});
test("seed never overwrites edited JSON or existing media", async t => {
  const paths = await fixture(t); await rm(paths.contentRoot, { recursive: true }); await rm(paths.uploadsRoot, { recursive: true });
  const run = () => promisify(execFile)(process.execPath, ["scripts/seed-persistent-bars.mjs"], { cwd: root, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot } });
  await run(); const c = structuredClone(seed); c.translations.tr.hero.title = "  Edited beach  "; c.metadata = true;
  await writeFile(barsFile(paths), JSON.stringify(c));
  const img = path.join(paths.uploadsRoot, seed.media.culinaryInfo.primary.image.slice(9));
  await writeFile(img, await sharp(await readFile(img)).png({ compressionLevel: 9 }).toBuffer());
  const before = await readFile(img), json = await readFile(barsFile(paths)); await run();
  assert.deepEqual(await readFile(img), before); assert.deepEqual(await readFile(barsFile(paths)), json);
});
test("all four locales preserve visible text and whitespace, card order and legacy destinations",async()=>{
 for(const l of locales){
  const t=JSON.parse(await readFile(path.join(root,`messages/${l}.json`))).Bars;
  const expected={hero:group(t),culinaryInfo:group(t.TwoImageSection),featureBackgrounds:{bars:group(t.BackgroundSection)},bars:{...group(t.Carousel),cards:Object.fromEntries(BAR_IDS.map((id,i)=>[id,Object.fromEntries(['subtitle','title','text'].map(k=>[k,t.Carousel[`${k}${i+1}`]]))]))},discover:group(t.BackgroundSection2)};
  assert.deepEqual(seed.translations[l],expected);
  const data=await readBarsPageLocale(l,{contentRoot:path.join(root,'content'),uploadsRoot:path.join(root,'public/uploads')});
  assert.deepEqual(data.cards.map(r=>r.id),['lobbyPiano','chacha','pier','lyricSnack']);
  assert.deepEqual(data.cards.map(r=>r.link),['/bars/lobby-piano-bar','/bars/chacha-pool-bar','/bars/pier-bar','/bars/pier-bar']);
  data.cards.forEach((r,i)=>{assert.equal(r.title,t.Carousel[`title${i+1}`]);assert.equal(r.img.src,seed.media.bars[r.id].image);assert.equal(r.img.alt,r.title);assert.equal(r.link,BAR_LINKS[r.id]);});
 }
});
test("nine images preserve source bytes, dimensions, stable ids and three CSS records",async()=>{
 const sources=['bars/images/Banner.jpg','bars/images/blok2.png','bars/images/blok22.png','bars/images/POOL.png','bars/images/PIANOBAR.png','bars/images/Chacha.png','bars/images/Pierbar.png','bars/images/discobar.png','restaurants/orchestrarestaurant/images/orchestra3.jpg'];
 const records=barsImages(seed.media);assert.equal(records.length,9);assert.equal(new Set(records.map(r=>r.image)).size,9);
 for(const [i,r]of records.entries()){const bytes=await readFile(path.join(root,'public',r.image));assert.deepEqual(bytes,await readFile(path.join(root,'app/[locale]',sources[i])));const m=await inspectHomepageImage(bytes,r.image.endsWith('.png')?'image/png':'image/jpeg');assert.equal(m.width,r.width);assert.equal(m.height,r.height);assert.equal(Object.hasOwn(r,'translations'),![0,3,8].includes(i));}
 BAR_IDS.forEach((id,i)=>{assert.equal(seed.media.bars[id].id,id);assert.equal(seed.media.bars[id].order,i);});
});
test("rejects invalid locales, fields, limits, paths, dimensions and card identities",()=>{
 for(const mutate of [c=>delete c.translations.ru,c=>c.translations.fr=c.translations.tr,c=>c.translations.tr.hero.title='',c=>c.translations.en.hero.text='x'.repeat(4001),c=>c.translations.tr.cafes={},c=>c.media.hero.translations={},c=>delete c.media.culinaryInfo.primary.translations,c=>c.media.culinaryInfo.primary.image='/uploads/pages/restaurants/hero.jpg',c=>c.media.hero.image='/uploads/pages/bars/../hero.jpg',c=>c.media.bars.pier.order=0,c=>c.media.bars.chacha.id='pier',c=>delete c.media.bars.lyricSnack,c=>c.media.hero.width=16000001,c=>c.media.bars.pier.translations.en.alt='x'.repeat(301)]){const c=structuredClone(seed);mutate(c);assert.throws(()=>validateBarsContent(c));}
});
test("hidden links, existing indicator bug and backward-compatible image alt fallback remain explicit",async()=>{
 const carousel=await readFile(path.join(root,'app/[locale]/bars/components/OtherOptions4.jsx'),'utf8');assert.ok(carousel.includes('alt={room.img.alt ?? room.title}'));assert.ok(carousel.includes('onClick={() => handleJump(i)}'));assert.ok(!carousel.includes('<Link'));
 for(const f of ['rooms/subroomComponent/components/BackgroundSection.jsx','restaurants/components/DiscoverBackground.jsx']){const source=await readFile(path.join(root,'app/[locale]',f),'utf8');assert.ok(source.includes('{/* <Link'));}
});
test("shared OtherOptions4 preserves legacy title alt and accepts localized media alt",async()=>{
 const {createRequire}=await import('node:module');const vm=await import('node:vm');const require=createRequire(import.meta.url);
 const {transform}=require('next/dist/build/swc');const source=await readFile(path.join(root,'app/[locale]/bars/components/OtherOptions4.jsx'),'utf8');
 const output=await transform(source,{filename:'OtherOptions4.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}});
 const React={createElement:(type,props,...children)=>({type,props:props??{},children}),useCallback:fn=>fn,useEffect:()=>{},useState:()=>[0,()=>{}]};
 const context={exports:{},require:id=>id==='react'?React:id==='embla-carousel-react'?()=>[()=>{},undefined]:id==='next/image'?(props)=>React.createElement('img',props):{}};
 vm.runInNewContext(output.code,context);
 const images=[{id:'legacy',title:'Legacy title',img:{src:'old.png',width:10,height:20}},{id:'managed',title:'Card title',img:{src:'new.png',width:10,height:20,alt:'Localized alt'}}];
 const tree=context.exports.default({images});const found=[];
 function walk(n){if(Array.isArray(n))return n.forEach(walk);if(!n||typeof n!=='object')return;if(typeof n.type==='function')return walk(n.type(n.props));if(n.type==='img')found.push(n.props);walk(n.children);}
 walk(tree);assert.deepEqual(found.map(p=>p.alt),['Legacy title','Localized alt']);assert.deepEqual(found.map(p=>p.src),images.map(r=>r.img));
});

test("canonical revision ignores key order and root metadata; content revisions are not persisted", async t => {
 const { barsPageRevision, readBarsPageContent, writeBarsPageContent } = await import('./azura-bars-storage.mjs');
 const paths=await fixture(t);
 const first=await readBarsPageContent(paths);
 const reversed=Object.fromEntries(Object.entries(first.bundle).reverse());
 assert.equal(barsPageRevision(reversed,first.media),first.revision);
 const rootContent=JSON.parse(await readFile(barsFile(paths)));rootContent.extra={keep:true};await writeFile(barsFile(paths),JSON.stringify(rootContent));
 assert.equal((await readBarsPageContent(paths)).revision,first.revision);
 const changed=structuredClone(first.bundle);changed.en.hero.title='  Updated  ';
 const saved=await writeBarsPageContent(changed,first.media,first.revision,paths);
 assert.notEqual(saved.revision,first.revision);
 const final=JSON.parse(await readFile(barsFile(paths)));assert.deepEqual(final.extra,{keep:true});assert.equal(Object.hasOwn(final,'revision'),false);
});
