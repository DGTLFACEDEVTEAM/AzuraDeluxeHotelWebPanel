import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,unlink,symlink,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {performance} from 'node:perf_hooks';
import {GALLERY_CATEGORY_IDS,readGalleryContent,readGalleryImage} from './azura-gallery-storage.mjs';
import {listMediaLibrary} from './azura-media-library.mjs';
import {mediaScanCoordinator} from './azura-media-scan.mjs';
test('gallery shared cache/budget, byte contract, live JSON and safe file changes',{timeout:30000},async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'gallery-cache-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const p={contentRoot:path.join(root,'content'),uploadsRoot:path.join(root,'uploads')};
 await mkdir(path.join(p.contentRoot,'gallery'),{recursive:true});await mkdir(path.join(p.uploadsRoot,'gallery'),{recursive:true});
 const bytes=await sharp({create:{width:800,height:600,channels:3,background:'red'}}).png().toBuffer();
 const c={schemaVersion:1,categories:GALLERY_CATEGORY_IDS.map(id=>({id,images:[]}))};
 for(let i=0;i<24;i++){
  await writeFile(path.join(p.uploadsRoot,`gallery/img-${i}.png`),bytes);
  const record={id:`general-${i}`,src:`/uploads/gallery/img-${i}.png`,order:i,width:800,height:600,translations:Object.fromEntries(['tr','en','de','ru'].map(l=>[l,{alt:' preserved '}]))};c.categories[0].images.push(record);c.categories[1].images.push({...structuredClone(record),id:`rooms-${i}`});
 }
 const json=path.join(p.contentRoot,'gallery/gallery.json');await writeFile(json,JSON.stringify(c));
 let heavy=0,active=0,peak=0;const stats=sharp.prototype.stats;
 t.mock.method(sharp.prototype,'stats',async function(...args){heavy++;active++;peak=Math.max(peak,active);try{return await stats.apply(this,args);}finally{active--;}});
 const measure=async(label,fn)=>{peak=0;const n=heavy,start=performance.now();const result=await fn();t.diagnostic(`${label}: ${(performance.now()-start).toFixed(2)}ms heavy=${heavy-n} peak=${peak}`);return result;};
 assert.deepEqual(await measure('cold 48 records / 24 files',()=>readGalleryContent(p)),c);assert.equal(heavy,24);assert.ok(peak<=3);
 await measure('warm gallery',()=>readGalleryContent(p));assert.equal(heavy,24);
 // New content namespace guarantees a cold common cache, while sharing the same file namespace between both consumers.
 const other={...p,contentRoot:path.join(root,'other-content')};await mkdir(path.join(other.contentRoot,'gallery'),{recursive:true});await writeFile(path.join(other.contentRoot,'gallery/gallery.json'),JSON.stringify(c));
 const before=heavy;await measure('concurrent cold gallery + library',()=>Promise.all([readGalleryContent(other),listMediaLibrary(new URLSearchParams('scope=gallery'),other)]));assert.equal(heavy-before,24);assert.ok(peak<=3);assert.ok(mediaScanCoordinator.stats().peak<=3);
 const full=await readGalleryImage(c.categories[0].images[0].src,p);assert.deepEqual(full.bytes,bytes);assert.equal(full.info.width,800);
 c.categories[0].images[0].width=801;await writeFile(json,JSON.stringify(c));await assert.rejects(readGalleryContent(p),/ölçüleri/);
 c.categories[0].images[0].width=800;await writeFile(json,JSON.stringify(c));
 const file=path.join(p.uploadsRoot,'gallery/img-0.png');const broken=Buffer.from(bytes);broken[0]=0;await writeFile(file,broken);await assert.rejects(readGalleryContent(p));
 await writeFile(file,bytes);await readGalleryContent(p);
 await unlink(file);await assert.rejects(readGalleryContent(p));await symlink(path.join(p.uploadsRoot,'gallery/img-1.png'),file);await assert.rejects(readGalleryContent(p));
 await unlink(file);await writeFile(file,bytes);await readGalleryContent(p);
 assert.deepEqual(JSON.parse(await readFile(json)),c);
});
