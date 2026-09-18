import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdtemp, mkdir, cp, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import React from 'react';
import { aboutFile, aboutImages, readAboutContent, readAboutPageLocale, validateAboutContent } from './azura-about-storage.mjs';
const run = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const seed = JSON.parse(await readFile(path.join(root,'content/site-pages/about.json'),'utf8'));
const locales = ['tr','en','de','ru'];
const originals = ['banner.jpg','PANORAMIC.jpg','gal_orta.jpg','Gal_sag.jpg','gal_son.jpg','gal_sol.jpg','1.jpg','2.jpg'];
async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(),'azura-about-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const paths = {contentRoot:path.join(dir,'content'),uploadsRoot:path.join(dir,'uploads')};
  await mkdir(path.join(paths.contentRoot,'site-pages'),{recursive:true});
  await cp(path.join(root,'public/uploads/pages/about'),path.join(paths.uploadsRoot,'pages/about'),{recursive:true});
  await writeFile(aboutFile(paths),JSON.stringify(seed));
  return paths;
}
function expected(a) {
  const m=a.MissinonVision;
  return {hero:{subtitle:a.subtitle,title:a.title},location:a.InfoSection,missionVision:{subtitle:m.subtitle,title:m.title,text:m.text,
    mission:{subtitle:m.clubsubtitle1,title:m.clubtitle1,text:m.text},vision:{subtitle:m.clubsubtitle1,title:m.clubtitle1,text:m.clubtext2}}};
}
test('dört dilin gerçekten gösterilen metinleri boşluklarıyla korunur; kullanılmayan alanlar eklenmez',async(t)=>{
  const paths=await fixture(t);
  for(const locale of locales) {
    const old=JSON.parse(await readFile(path.join(root,`messages/${locale}.json`),'utf8')).About;
    assert.deepEqual(seed.translations[locale],expected(old));
    assert.deepEqual((await readAboutPageLocale(locale,paths)).texts,expected(old));
  }
  assert.equal(seed.media.discoveryCarousel,undefined);
  assert.equal(seed.media.missionVision.document,undefined);
});
test('sekiz görselin kaynak baytları, sırası ve gerçek ölçüleri doğrulanır',async(t)=>{
  const paths=await fixture(t);
  const content=await readAboutContent(paths);
  for(const [i,record] of aboutImages(content.media).entries()) {
    assert.deepEqual(await readFile(path.join(root,'app/[locale]/about/images',originals[i])),
      await readFile(path.join(root,'public',record.image)));
  }
  assert.deepEqual(content.media.moments.images.map(r=>r.order),[0,1,2,3]);
});
test('eksik dil/alan, bozuk JSON, yol taşması, eksik/sahte/symlink görsel ve yanlış ölçü açık hata verir',async(t)=>{
  const paths=await fixture(t);
  const missing=structuredClone(seed); delete missing.translations.ru;
  assert.throws(()=>validateAboutContent(missing));
  const field=structuredClone(seed); delete field.translations.tr.location.buttonText;
  assert.throws(()=>validateAboutContent(field));
  const traversal=structuredClone(seed); traversal.media.hero.image='/uploads/pages/about/../rooms/x.jpg';
  assert.throws(()=>validateAboutContent(traversal));
  for(const mutate of [s=>s.media.hero.width++,s=>s.media.hero.image='/uploads/pages/about/absent.jpg']) {
    const invalid=structuredClone(seed);mutate(invalid);await writeFile(aboutFile(paths),JSON.stringify(invalid));
    await assert.rejects(readAboutContent(paths),/About görseli/);
  }
  const target=path.join(paths.uploadsRoot,'pages/about/hero.jpg');
  await writeFile(aboutFile(paths),JSON.stringify(seed));await writeFile(target,'fake');
  await assert.rejects(readAboutContent(paths),/About görseli/);
  await rm(target); await symlink(path.join(root,'public/uploads/pages/about/hero.jpg'),target);
  await assert.rejects(readAboutContent(paths),/About görseli/);
  await writeFile(aboutFile(paths),'{');await assert.rejects(readAboutContent(paths),/about verisi okunamadı/);
  await rm(aboutFile(paths));await assert.rejects(readAboutContent(paths),/about verisi okunamadı/);
});
test('seed ilk kurulumu yapar; ikinci çalıştırma özel içeriği veya görseli ezmez',async(t)=>{
  const paths=await fixture(t);await rm(aboutFile(paths));
  const env={...process.env,AZURA_CONTENT_ROOT:paths.contentRoot,AZURA_UPLOADS_ROOT:paths.uploadsRoot};
  await run(process.execPath,['scripts/seed-persistent-about.mjs'],{cwd:root,env});
  const custom=structuredClone(seed);custom.translations.tr.hero.title='Kalıcı başlık';
  custom.media.hero.width=seed.media.location.width;custom.media.hero.height=seed.media.location.height;
  const replacement=await readFile(path.join(paths.uploadsRoot,'pages/about/location.jpg'));
  await writeFile(path.join(paths.uploadsRoot,'pages/about/hero.jpg'),replacement);
  await writeFile(aboutFile(paths),JSON.stringify(custom));
  const before=await readFile(aboutFile(paths));
  await run(process.execPath,['scripts/seed-persistent-about.mjs'],{cwd:root,env});
  assert.deepEqual(await readFile(aboutFile(paths)),before);
  assert.deepEqual(await readFile(path.join(paths.uploadsRoot,'pages/about/hero.jpg')),replacement);
});
const require=createRequire(import.meta.url);
async function compile(source) {
  const {code}=await require('next/dist/build/swc').transform(source,{filename:'component.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}});
  const mod={exports:{}};
  const mocked=(name)=>name==='next/image' ? (props)=>React.createElement('img',{src:props.src.src,width:props.width,height:props.height,className:props.className}) : name==='@/i18n/navigation' ? {Link:'a'} : name==='embla-carousel-react' ? ()=>[null,null] : require(name);
  new Function('require','module','exports',code)(mocked,mod,mod.exports);
  return mod.exports.default;
}
test('eski slides eksikliği gerçek TypeError üretir; aktif sayfadan onaylı çağrı çıkarılmıştır',async()=>{
  const Slider=await compile(await readFile(path.join(root,'app/[locale]/HomePage/Components/Slider/Slider1.jsx'),'utf8'));
  assert.throws(()=>Slider({options:{loop:true}}),TypeError);
  const page=await readFile(path.join(root,'app/[locale]/about/page.js'),'utf8');
  assert.ok(!page.includes('<EmblaCarousel'));
});

test('kanonik revision, paralel kayıt, başarısız kuyruk sonrası kayıt ve kök metadata korunur',async(t)=>{
  const {readAboutPageContent,writeAboutPageContent,aboutPageRevision}=await import('./azura-about-storage.mjs');
  const paths=await fixture(t);
  await writeFile(aboutFile(paths),JSON.stringify({...seed,customMetadata:{keep:true}}));
  const initial=await readAboutPageContent(paths);
  assert.match(initial.revision,/^[a-f0-9]{64}$/);
  const reordered=Object.fromEntries(Object.entries(initial.bundle).reverse());
  assert.equal(aboutPageRevision(reordered,initial.media),initial.revision);
  const first=structuredClone(initial.bundle),second=structuredClone(initial.bundle);
  first.tr.hero.title='İlk';second.tr.hero.title='İkinci';
  const results=await Promise.allSettled([
    writeAboutPageContent(first,initial.media,initial.revision,paths),
    writeAboutPageContent(second,initial.media,initial.revision,paths),
  ]);
  assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.status,409);
  const before=await readFile(aboutFile(paths));
  await assert.rejects(writeAboutPageContent(second,initial.media,initial.revision,paths),e=>e.status===409);
  assert.deepEqual(await readFile(aboutFile(paths)),before);
  const current=await readAboutPageContent(paths);
  await writeAboutPageContent(second,current.media,current.revision,paths);
  const saved=JSON.parse(await readFile(aboutFile(paths),'utf8'));
  assert.deepEqual(saved.customMetadata,{keep:true});assert.equal(saved.pageKey,'about');assert.equal(saved.schemaVersion,1);
  assert.ok(!Object.hasOwn(saved,'revision'));
});
