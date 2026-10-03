import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,unlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import sharp from 'sharp';
import {createMediaScanCoordinator,mediaScanCoordinator} from './azura-media-scan.mjs';
import {listMediaLibrary,reuseLibraryImage} from './azura-media-library.mjs';

test('one global budget, shared scans, independent roots, error cleanup and result isolation',async()=>{
 const c=createMediaScanCoordinator(3);let active=0,peak=0,executions=0;
 const work=async()=>{executions++;const out=[];await c.map(Array.from({length:20},(_,i)=>i),async i=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;out.push(i);});return out;};
 const [a,b]=await Promise.all([c.scan('root-a:scope',work),c.scan('root-a:scope',work),c.scan('root-b:scope',work)]);
 assert.equal(executions,2);assert.equal(peak,3);assert.equal(c.stats().active,0);assert.deepEqual(a,b);a.pop();assert.equal(b.length,20);
 const bad=()=>c.scan('bad',async()=>{await c.map([1,2,3],async()=>{throw new Error('injected');});});
 const failures=await Promise.allSettled([bad(),bad()]);assert.ok(failures.every(x=>x.status==='rejected'));assert.equal(c.stats().pending,0);assert.equal(c.stats().active,0);assert.deepEqual(await c.scan('bad',async()=>['retry']),['retry']);
});

test('representative cold/warm/concurrent listings, filters, paging and filesystem changes',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'azura-scan-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const paths={contentRoot:path.join(root,'content'),uploadsRoot:path.join(root,'uploads')};
 const bytes=await sharp({create:{width:800,height:600,channels:3,background:'orange'}}).png().toBuffer();
 const populate=async roots=>{for(const scope of ['homepage','rooms','bars']){const dir=path.join(roots.uploadsRoot,'pages',scope);await mkdir(dir,{recursive:true});for(let i=0;i<24;i++)await writeFile(path.join(dir,`asset-${String(i).padStart(2,'0')}.png`),bytes);}};
 await populate(paths);
 let heavy=0,active=0,peak=0;
 const original=sharp.prototype.stats;
 t.mock.method(sharp.prototype,'stats',async function(...args){heavy++;active++;peak=Math.max(peak,active);try{return await original.apply(this,args);}finally{active--;}});
 const measure=async(name,work)=>{peak=0;const before=heavy,start=performance.now();const value=await work();t.diagnostic(`${name}: ${(performance.now()-start).toFixed(2)}ms heavy=${heavy-before} peak=${peak}`);return value;};
 const cold=await measure('cold 72 PNG / 3 scopes',()=>listMediaLibrary(new URLSearchParams('limit=100'),paths));assert.equal(cold.total,72);assert.equal(heavy,72);assert.ok(peak<=3);
 const warm=await measure('warm',()=>listMediaLibrary(new URLSearchParams('limit=100'),paths));assert.deepEqual(warm,cold);assert.equal(heavy,72);
 const fresh={contentRoot:path.join(root,'other-content'),uploadsRoot:path.join(root,'other-uploads')};await populate(fresh);
 const startScans=mediaScanCoordinator.stats().scans;
 const concurrent=await measure('two concurrent cold requests / separate fresh root',()=>Promise.all([listMediaLibrary(new URLSearchParams('limit=100'),fresh),listMediaLibrary(new URLSearchParams('limit=100'),fresh)]));
 assert.equal(heavy,144);assert.equal(mediaScanCoordinator.stats().scans-startScans,3);assert.deepEqual(concurrent[0],concurrent[1]);
 const filtered=await measure('scope+search+page1',()=>listMediaLibrary(new URLSearchParams('scope=rooms&q=asset-0&limit=3'),paths));assert.equal(filtered.total,10);assert.equal(filtered.nextOffset,3);
 const next=await measure('page2',()=>listMediaLibrary(new URLSearchParams('scope=rooms&q=asset-0&limit=3&offset=3'),paths));assert.equal(next.images[0].name,'asset-03.png');assert.equal(heavy,144);
 const file=path.join(paths.uploadsRoot,'pages/rooms/asset-00.png');await unlink(file);assert.equal((await listMediaLibrary(new URLSearchParams('scope=rooms'),paths)).total,23);
 await writeFile(file,'fake');assert.equal((await listMediaLibrary(new URLSearchParams('scope=rooms'),paths)).total,23);
 await writeFile(file,bytes);assert.equal((await listMediaLibrary(new URLSearchParams('scope=rooms'),paths)).total,24);
 const reused=await reuseLibraryImage({image:'/uploads/pages/rooms/asset-00.png',targetScope:'blog'},paths);assert.equal(reused.status,201);assert.equal((await listMediaLibrary(new URLSearchParams('scope=blog'),paths)).total,1);
 assert.ok(mediaScanCoordinator.stats().peak<=3);
});
