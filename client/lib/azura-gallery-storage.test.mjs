import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,cp,rm,writeFile,symlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {validateGalleryContent,readGalleryContent,readGalleryLocale,readGalleryImage} from './azura-gallery-storage.mjs';
const root=path.resolve(import.meta.dirname,'..');
const seed=JSON.parse(await readFile(path.join(root,'content/gallery/gallery.json')));
const manifest=JSON.parse(await readFile(path.join(root,'content/gallery/source-manifest.json')));
const paths={contentRoot:path.join(root,'content'),uploadsRoot:path.join(root,'public/uploads')};
test('gallery source identity, counts, shared sources and approved resize',async()=>{
 assert.deepEqual(seed.categories.map(c=>c.images.length),[28,7,12,6,6,12,11,13,0]);
 assert.equal(manifest.length,77);assert.equal(new Set(seed.categories.flatMap(c=>c.images.map(i=>i.id))).size,95);
 for(const m of manifest){const original=await readFile(path.join(root,m.source)),copy=await readFile(path.join(root,'public',m.src));assert.equal(createHash('sha256').update(original).digest('hex'),m.sourceSha256);assert.equal(createHash('sha256').update(copy).digest('hex'),m.outputSha256);if(!m.resized)assert.deepEqual(copy,original);else {assert.equal(m.width,4800);assert.equal(m.height,3200);assert.ok(copy.length<8*1024*1024);}}
 assert.deepEqual(await readGalleryContent(paths),seed);
 for(const l of ['tr','en','de','ru']){const localized=await readGalleryLocale(l,paths);assert.equal(localized[0].images[0].alt,'gallery');assert.equal(localized[8].images.length,0);}
});
test('strict schema with variable counts and empty collections',()=>{
 const empty=structuredClone(seed);empty.categories.forEach(c=>c.images=[]);assert.doesNotThrow(()=>validateGalleryContent(empty));
 for(const mutate of [c=>c.categories.reverse(),c=>c.categories[0].images[0].order=2,c=>c.categories[0].images[0].src='/uploads/pages/about/test.jpg',c=>delete c.categories[0].images[0].translations.ru,c=>c.categories[0].images[0].extra=true,c=>c.categories[0].images[1].id=c.categories[0].images[0].id]){const c=structuredClone(seed);mutate(c);assert.throws(()=>validateGalleryContent(c));}
});
test('seed preserves edited content; missing, mismatched, invalid files and symlinks rejected',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'gallery-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));const p={contentRoot:path.join(dir,'content'),uploadsRoot:path.join(dir,'uploads')};const env={...process.env,AZURA_CONTENT_ROOT:p.contentRoot,AZURA_UPLOADS_ROOT:p.uploadsRoot};const run=()=>execFileSync(process.execPath,['scripts/seed-persistent-gallery.mjs'],{cwd:root,env});run();const file=path.join(p.contentRoot,'gallery/gallery.json');const edited=structuredClone(seed);edited.categories[0].images[0].translations.tr.alt='  Kullanıcı  ';await writeFile(file,JSON.stringify(edited));run();assert.deepEqual(JSON.parse(await readFile(file)),edited);
 const image=edited.categories[0].images[0];image.width++;await writeFile(file,JSON.stringify(edited));await assert.rejects(readGalleryContent(p));
 await assert.rejects(readGalleryImage('/uploads/gallery/../escape.jpg',p));
 await writeFile(path.join(p.uploadsRoot,'gallery/fake.jpg'),'fake');await assert.rejects(readGalleryImage('/uploads/gallery/fake.jpg',p));
 await symlink(path.join(root,'public',seed.categories[0].images[0].src),path.join(p.uploadsRoot,'gallery/link.jpg'));await assert.rejects(readGalleryImage('/uploads/gallery/link.jpg',p));
 await assert.rejects(readGalleryImage('/uploads/gallery/missing.jpg',p));
});
