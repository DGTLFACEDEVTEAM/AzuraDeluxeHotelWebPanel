import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,writeFile,mkdtemp,rm,symlink,unlink} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {ROOM_FEATURE_IDS,readRoomDetailLocale,readRoomDetailContent,validateRoomDetailContent,roomDetailImages,roomDetailApiConfig,readRoomDetailPageContent,writeRoomDetailPageContent} from './azura-room-detail-storage.mjs';
const root=path.resolve(import.meta.dirname,'..'),run=promisify(execFile),locales=['tr','en','de','ru'];
const seed=JSON.parse(await readFile(path.join(root,'content/site-pages/fantasyroom.json')));
async function fixture(t){const tmp=await mkdtemp(path.join(os.tmpdir(),'azura-fantasy-'));t.after(()=>rm(tmp,{recursive:true,force:true}));const paths={contentRoot:path.join(tmp,'content'),uploadsRoot:path.join(tmp,'uploads')},env={...process.env,AZURA_CONTENT_ROOT:path.join(tmp,'content'),AZURA_UPLOADS_ROOT:path.join(tmp,'uploads')};await run(process.execPath,['scripts/seed-persistent-room-details.mjs','fantasy'],{cwd:root,env});return {paths,env,file:path.join(paths.contentRoot,'site-pages/fantasyroom.json')};}

test('Fantasy dört dil: görünen metin/boşluk eşliği; Family önerisi mevcut Family metinlerinden gelir',async t=>{
 const {paths}=await fixture(t);
 for(const l of locales){const all=JSON.parse(await readFile(path.join(root,`messages/${l}.json`))),m=all.FantasyRoom,f=m.RoomFeatures,o=m.OtherOptions,shared=all.DeluxeRoom.OtherOptions;const actual=(await readRoomDetailLocale('fantasy',l,paths)).texts;
 assert.deepEqual([actual.subtitle,actual.title,actual.text1,actual.text2,actual.text3],[m.subtitle,m.title,m.span1,m.span2,m.span3]);
 assert.deepEqual(actual.RoomInfo,{subtitle:f.subtitle,title:f.title,text:f.text,title2:f.subtitle2,title3:f.subtitle3,text2:f.text2,amenities:{couples:f.span1,kingBed:f.span2,jacuzziTerrace:f.span3},features:Object.fromEntries(ROOM_FEATURE_IDS.map((id,i)=>[id,f[`feature${i+1}`]]))});
 assert.deepEqual(actual.BackgroundSection,Object.fromEntries(['subtitle','title','text','list1','list2'].map(k=>[k,m.BackgroundSection[k]])));
 assert.deepEqual(actual.RoomTour,{sea:{subtitle:m.RoomTour.span,title:m.RoomTour.title,text:m.RoomTour.text}});
 assert.deepEqual([actual.OtherOptions.span,actual.OtherOptions.title,actual.OtherOptions.buttonText],[shared.subtitle,shared.title,shared.buttonText]);
 assert.deepEqual(actual.OtherOptions.cards.deluxe,{subtitle:o.subtitle,title:o.title1,m:o.area1,capacity:o.person1,text:o.text1});
 assert.deepEqual(actual.OtherOptions.cards.family,{subtitle:shared.subtitle,title:shared.title1,m:shared.area1,capacity:shared.person1,text:shared.text1});
 }
});
test('Fantasy 15 medya / 13 dosya: bayt, ölçü, 11 galeri, tek tur ve iki önerinin kimlikleri',async t=>{
 const {paths}=await fixture(t);const records=roomDetailImages(seed.media);assert.equal(records.length,15);assert.equal(new Set(records.map(r=>r.image)).size,13);
 for(const r of records){const name=path.basename(r.image);const source=r.image.includes('/fantasyroom/')?`app/[locale]/rooms/fantasyroom/images/${name}`:name==='deluxe-preview.jpg'?'app/[locale]/rooms/deluxeroom/images/deluxe4.jpg':'app/[locale]/rooms/familyroom/images/family1.webp';const bytes=await readFile(path.join(root,source));assert.deepEqual(await readFile(path.join(root,'public',r.image)),bytes);const meta=await sharp(bytes).metadata();assert.deepEqual([r.width,r.height],[meta.width,meta.height]);}
 assert.deepEqual(seed.media.gallery.images.map(r=>[r.id,r.order]),Array.from({length:11},(_,i)=>[`fantasy-gallery-${i+1}`,i]));assert.deepEqual(seed.tours,[{id:'sea',order:0,url:'https://kuula.co/share/collection/7brLW?logo=1&info=0&fs=1&vr=1&autorotate=0.22&autop=10&autopalt=1&thumbs=4&margin=2&alpha=0.72'}]);
 for(const l of locales){const page=await readRoomDetailLocale('fantasy',l,paths);assert.deepEqual(page.rooms.map(r=>[r.id,r.link]),[['deluxe','/rooms/deluxeroom'],['family','/rooms/familyroom']]);page.rooms.forEach(r=>{assert.equal(r.title,seed.translations[l].OtherOptions.cards[r.id].title);assert.equal(r.img.src,seed.media.otherOptions.images.find(i=>i.id===r.id).image);});}
});
test('Fantasy yönetim izni, kesin şema, eksik/bozuk dosya ve symlink denetimi',async t=>{
 const {paths,file}=await fixture(t);assert.equal(roomDetailApiConfig('fantasy').folder,'fantasyroom');assert.throws(()=>roomDetailApiConfig('handicap'),e=>e.status===404);assert.match((await readRoomDetailPageContent('fantasy',paths)).revision,/^[a-f0-9]{64}$/);await assert.rejects(writeRoomDetailPageContent('fantasy',{}, {},'x',paths),e=>e.status===400);
 for(const mutate of [s=>s.roomKey='unknown',s=>delete s.translations.ru,s=>s.translations.tr.RoomInfo.amenities.sofa='x',s=>s.translations.tr.RoomInfo.features.bad='x',s=>s.media.gallery.images.reverse(),s=>s.tours[0].id='land',s=>s.tours[0].url='https://evil.example',s=>s.media.otherOptions.images[1].id='fantasy',s=>s.media.hero.image='/uploads/pages/familyroom/family1.webp',s=>delete s.translations.de.BackgroundSection.list2]){const bad=structuredClone(seed);mutate(bad);assert.throws(()=>validateRoomDetailContent('fantasy',bad));}
 for(const value of ['{',JSON.stringify({...seed,translations:{}})]){await writeFile(file,value);await assert.rejects(readRoomDetailContent('fantasy',paths));}
 const bad=structuredClone(seed);bad.media.hero.width++;await writeFile(file,JSON.stringify(bad));await assert.rejects(readRoomDetailContent('fantasy',paths));await writeFile(file,JSON.stringify(seed));
 const image=path.join(paths.uploadsRoot,'pages/fantasyroom/fantasy1.webp');await unlink(image);await assert.rejects(readRoomDetailContent('fantasy',paths));await writeFile(image,'fake');await assert.rejects(readRoomDetailContent('fantasy',paths));await unlink(image);await symlink(path.join(root,'public/uploads/pages/fantasyroom/fantasy1.webp'),image);await assert.rejects(readRoomDetailContent('fantasy',paths));
});
test('Fantasy seed mevcut Fantasy/Deluxe/Family kayıtlarını ve ortak görselleri ezmez',async t=>{
 const {paths,env,file}=await fixture(t);for(const room of ['deluxe','family'])await run(process.execPath,['scripts/seed-persistent-room-details.mjs',room],{cwd:root,env});const others=await Promise.all(['deluxeroom','familyroom'].map(r=>readFile(path.join(paths.contentRoot,`site-pages/${r}.json`))));
 const custom=structuredClone(seed);custom.translations.en.title=' Saved Fantasy ';await writeFile(file,JSON.stringify(custom));const bytes=await readFile(file),shared=path.join(paths.uploadsRoot,'pages/room-options/family-preview.webp'),img=await readFile(shared);
 await run(process.execPath,['scripts/seed-persistent-room-details.mjs','fantasy'],{cwd:root,env});assert.deepEqual(await readFile(file),bytes);assert.deepEqual(await readFile(shared),img);assert.deepEqual(await Promise.all(['deluxeroom','familyroom'].map(r=>readFile(path.join(paths.contentRoot,`site-pages/${r}.json`)))),others);
});

test('Fantasy medya: JPEG/PNG/WebP, boyut/piksel, üzerine yazmama ve symlink dışlama',async t=>{
 const {saveFantasyImage,listFantasyImages,listDeluxeImages}=await import('./azura-homepage-media.mjs');const {paths,file}=await fixture(t);const before=await readFile(file);
 for(const [format,mime] of [['jpeg','image/jpeg'],['png','image/png'],['webp','image/webp']]){
  const bytes=await sharp({create:{width:24,height:32,channels:3,background:'blue'}})[format]().toBuffer();const saved=await saveFantasyImage(bytes,mime,paths,()=>format);assert.equal(saved.width,24);assert.equal(saved.height,32);assert.ok(saved.image.startsWith('/uploads/pages/fantasyroom/'));
  await assert.rejects(saveFantasyImage(bytes,mime,paths,()=>format));assert.deepEqual(await readFile(path.join(paths.uploadsRoot,saved.image.slice('/uploads/'.length))),bytes);
 }
 await assert.rejects(saveFantasyImage(Buffer.from('<svg/>'),'image/png',paths));await assert.rejects(saveFantasyImage(Buffer.alloc(8*1024*1024+1),'image/png',paths),e=>e.status===413);
 const large=await sharp({create:{width:4001,height:4000,channels:3,background:'white'}}).png().toBuffer();await assert.rejects(saveFantasyImage(large,'image/png',paths));
 const src=path.join(paths.uploadsRoot,'pages/fantasyroom/fantasy1.webp');await symlink(src,path.join(paths.uploadsRoot,'pages/fantasyroom/fantasyroom-linked.webp'));const original=await readFile(src);await assert.rejects(saveFantasyImage(original,'image/webp',paths,()=> 'linked'));assert.deepEqual(await readFile(src),original);
 await writeFile(path.join(paths.uploadsRoot,'pages/fantasyroom/fake.jpg'),'fake');const listed=await listFantasyImages(paths);assert.equal(listed.length,16);assert.ok(!listed.some(i=>i.image.includes('linked')||i.image.includes('fake')||i.image.includes('/deluxeroom/')));assert.ok((await listDeluxeImages(paths)).every(i=>!i.image.includes('/fantasyroom/')));
 assert.deepEqual(await readFile(file),before);
});
