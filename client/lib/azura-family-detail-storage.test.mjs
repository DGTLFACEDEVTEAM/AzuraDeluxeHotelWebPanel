import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,writeFile,mkdtemp,rm,symlink} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {createTranslator} from 'use-intl/core';
import {ROOM_FEATURE_IDS,readRoomDetailLocale,readRoomDetailContent,validateRoomDetailContent,roomDetailImages,roomDetailApiConfig,readRoomDetailPageContent,writeRoomDetailPageContent} from './azura-room-detail-storage.mjs';
const root=path.resolve(import.meta.dirname,'..');const run=promisify(execFile);const seed=JSON.parse(await readFile(path.join(root,'content/site-pages/familyroom.json')));
const locales=['tr','en','de','ru'];
async function fixture(t){const tmp=await mkdtemp(path.join(os.tmpdir(),'azura-family-'));t.after(()=>rm(tmp,{recursive:true,force:true}));const paths={contentRoot:path.join(tmp,'content'),uploadsRoot:path.join(tmp,'uploads')};const env={...process.env,AZURA_CONTENT_ROOT:paths.contentRoot,AZURA_UPLOADS_ROOT:paths.uploadsRoot};await run(process.execPath,['scripts/seed-persistent-room-details.mjs','family'],{cwd:root,env});return {paths,env,file:path.join(paths.contentRoot,'site-pages/familyroom.json')};}

test('Family dört dil: mevcut görünen metinler, boşluklar, 11 ikon ve eksik Almanca anahtar davranışı',async t=>{
 const {paths}=await fixture(t);
 for(const locale of locales){const all=JSON.parse(await readFile(path.join(root,`messages/${locale}.json`)));const m=all.FamilyRoom,f=m.RoomFeatures,o=m.OtherOptions,shared=all.DeluxeRoom.OtherOptions;const actual=(await readRoomDetailLocale('family',locale,paths)).texts;
 assert.deepEqual([actual.subtitle,actual.title,actual.text1,actual.text2,actual.text3],[m.subtitle,m.title,m.span1,m.span2,m.span3]);
 const translate=createTranslator({locale,messages:all,namespace:'FamilyRoom.RoomFeatures',onError:()=>{}});
 assert.deepEqual(actual.RoomInfo,{subtitle:f.subtitle,title:f.title,text:f.text,title2:f.subtitle2,title3:f.subtitle3,text2:f.text2,amenities:{doubleBed:f.span1,singleBed:f.span2,sofa:f.sofa},features:Object.fromEntries(ROOM_FEATURE_IDS.map((id,i)=>[id,translate(`feature${i+1}`)]))});
 assert.deepEqual(actual.BackgroundSection,Object.fromEntries(['subtitle','title','text','list1','list2'].map(k=>[k,m.BackgroundSection[k]])));
 for(const [i,id] of ['land','sea'].entries())assert.deepEqual(actual.RoomTour[id],{subtitle:m.RoomTour[`span${i?'2':''}`],title:m.RoomTour[`title${i?'2':''}`],text:m.RoomTour[`text${i?'2':''}`]});
 assert.deepEqual([actual.OtherOptions.span,actual.OtherOptions.title,actual.OtherOptions.buttonText],[shared.subtitle,shared.title,shared.buttonText]);
 for(const [i,id] of ['deluxe','fantasy'].entries())assert.deepEqual(actual.OtherOptions.cards[id],{subtitle:o.subtitle,title:o[`title${i+1}`],m:o[`area${i+1}`],capacity:o[`person${i+1}`],text:o[`text${i+1}`]});
 }
});
test('Family 16 medya / 14 dosya: bayt, gerçek ölçü, 12 galeri, iki tur ve öneri eşleşmesi',async t=>{
 const {paths}=await fixture(t);const records=roomDetailImages(seed.media);assert.equal(records.length,16);assert.equal(new Set(records.map(r=>r.image)).size,14);
 for(const r of records){const filename=path.basename(r.image);const source=r.image.includes('/familyroom/')?`app/[locale]/rooms/familyroom/images/${filename}`:`app/[locale]/rooms/${filename.startsWith('deluxe')?'deluxeroom/images/deluxe4.jpg':'fantasyroom/images/fantasy4.jpg'}`;const bytes=await readFile(path.join(root,source));assert.deepEqual(await readFile(path.join(root,'public',r.image)),bytes);const meta=await sharp(bytes).metadata();assert.deepEqual([r.width,r.height],[meta.width,meta.height]);}
 assert.deepEqual(seed.media.gallery.images.map(r=>[r.id,r.order]),Array.from({length:12},(_,i)=>[`family-gallery-${i+1}`,i]));assert.deepEqual(seed.tours.map(r=>[r.id,r.order,new URL(r.url).pathname]),[['land',0,'/share/collection/71LrW'],['sea',1,'/share/collection/715J7']]);
 for(const locale of locales){const page=await readRoomDetailLocale('family',locale,paths);assert.deepEqual(page.rooms.map(r=>[r.id,r.link]),[['deluxe','/rooms/deluxeroom'],['fantasy','/rooms/fantasyroom']]);page.rooms.forEach(r=>{assert.equal(r.title,seed.translations[locale].OtherOptions.cards[r.id].title);assert.equal(r.img.src,seed.media.otherOptions.images.find(i=>i.id===r.id).image);});}
});
test('Family yönetim izin listesi, kesin oda şeması ve medya sahipliği korunur',async t=>{
 const {paths,file}=await fixture(t);assert.equal(roomDetailApiConfig('family').pageKey,'familyroom');assert.throws(()=>roomDetailApiConfig('handicap'),e=>e.status===404);assert.match((await readRoomDetailPageContent('family',paths)).revision,/^[a-f0-9]{64}$/);await assert.rejects(writeRoomDetailPageContent('family',{}, {},'x',paths),e=>e.status===400);
 for(const mutate of [s=>s.roomKey='fantasy',s=>s.translations.tr.RoomInfo.features.bad='x',s=>s.media.gallery.images.reverse(),s=>s.tours.reverse(),s=>s.media.otherOptions.images[0].id='family',s=>s.media.hero.image='/uploads/pages/deluxeroom/deluxe1.jpg',s=>s.media.otherOptions.images[0].image='/uploads/pages/deluxeroom/deluxe4.jpg',s=>s.tours[0].url='https://evil.example',s=>delete s.translations.de,s=>delete s.translations.en.BackgroundSection.list1]){const bad=structuredClone(seed);mutate(bad);assert.throws(()=>validateRoomDetailContent('family',bad));}
 const bad=structuredClone(seed);bad.media.hero.width++;await writeFile(file,JSON.stringify(bad));await assert.rejects(readRoomDetailContent('family',paths));
});
test('Family seed tekrar çalıştırıldığında Family/Deluxe JSON ve mevcut ortak görselleri ezmez',async t=>{
 const {paths,env,file}=await fixture(t);await run(process.execPath,['scripts/seed-persistent-room-details.mjs','deluxe'],{cwd:root,env});const deluxeFile=path.join(paths.contentRoot,'site-pages/deluxeroom.json'),deluxe=await readFile(deluxeFile);
 const updated=structuredClone(seed);updated.translations.tr.title=' Özel aile başlığı ';await writeFile(file,JSON.stringify(updated));const bytes=await readFile(file),shared=path.join(paths.uploadsRoot,'pages/room-options/deluxe-preview.jpg'),image=await readFile(shared);
 await run(process.execPath,['scripts/seed-persistent-room-details.mjs','family'],{cwd:root,env});assert.deepEqual(await readFile(file),bytes);assert.deepEqual(await readFile(deluxeFile),deluxe);assert.deepEqual(await readFile(shared),image);
});

test('Family medya: JPEG/PNG/WebP, boyut/piksel, üzerine yazmama ve symlink dışlama',async t=>{
 const {saveFamilyImage,listFamilyImages,listDeluxeImages}=await import('./azura-homepage-media.mjs');const {paths,file}=await fixture(t);const before=await readFile(file);
 for(const [format,mime] of [['jpeg','image/jpeg'],['png','image/png'],['webp','image/webp']]){
  const bytes=await sharp({create:{width:24,height:32,channels:3,background:'blue'}})[format]().toBuffer();const saved=await saveFamilyImage(bytes,mime,paths,()=>format);assert.equal(saved.width,24);assert.equal(saved.height,32);assert.ok(saved.image.startsWith('/uploads/pages/familyroom/'));
  await assert.rejects(saveFamilyImage(bytes,mime,paths,()=>format));assert.deepEqual(await readFile(path.join(paths.uploadsRoot,saved.image.slice('/uploads/'.length))),bytes);
 }
 await assert.rejects(saveFamilyImage(Buffer.from('<svg/>'),'image/png',paths));await assert.rejects(saveFamilyImage(Buffer.alloc(8*1024*1024+1),'image/png',paths),e=>e.status===413);
 const large=await sharp({create:{width:4001,height:4000,channels:3,background:'white'}}).png().toBuffer();await assert.rejects(saveFamilyImage(large,'image/png',paths));
 const src=path.join(paths.uploadsRoot,'pages/familyroom/family1.webp');await symlink(src,path.join(paths.uploadsRoot,'pages/familyroom/familyroom-linked.webp'));const original=await readFile(src);await assert.rejects(saveFamilyImage(original,'image/webp',paths,()=> 'linked'));assert.deepEqual(await readFile(src),original);
 await writeFile(path.join(paths.uploadsRoot,'pages/familyroom/fake.jpg'),'fake');const listed=await listFamilyImages(paths);assert.equal(listed.length,17);assert.ok(!listed.some(i=>i.image.includes('linked')||i.image.includes('fake')||i.image.includes('/deluxeroom/')));assert.ok((await listDeluxeImages(paths)).every(i=>!i.image.includes('/familyroom/')));
 assert.deepEqual(await readFile(file),before);
});
