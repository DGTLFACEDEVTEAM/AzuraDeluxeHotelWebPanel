import test from 'node:test';
import assert from 'node:assert/strict';
import {open,mkdtemp,writeFile,rm,rename,unlink,symlink} from 'node:fs/promises';
import {constants} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {performance} from 'node:perf_hooks';
import {createImageValidationCache} from './azura-image-validation-cache.mjs';
import {inspectHomepageImage,HomepageMediaError} from './azura-homepage-media.mjs';
async function setup(t,options={}){
 const root=await mkdtemp(path.join(os.tmpdir(),'image-cache-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const file=path.join(root,'image.png');const bytes=await sharp({create:{width:1200,height:800,channels:3,background:'red'}}).png().toBuffer();await writeFile(file,bytes);
 const cache=createImageValidationCache(options);let calls=0;
 const inspect=async(...args)=>{calls++;return inspectHomepageImage(...args);};
 const read=async(overrides={})=>{const h=await open(overrides.file??file,constants.O_RDONLY|constants.O_NOFOLLOW);try{return await cache({handle:h,file,namespace:root,mimeType:'image/png',inspect,error:m=>new HomepageMediaError(m),...overrides});}finally{await h.close();}};
 return {root,file,bytes,read,cache,calls:()=>calls,inspect};
}
test('cold/warm timing and heavy calls; same-sized edit, replacement and deletion',async t=>{
 const f=await setup(t);const a=performance.now();await f.read();const cold=performance.now()-a;
 const b=performance.now();await f.read();const warm=performance.now()-b;assert.equal(f.calls(),1);
 t.diagnostic(`LOCAL temporary 1200x800 PNG: cold=${cold.toFixed(2)}ms warm=${warm.toFixed(2)}ms heavy=1 then 0`);
 const corrupt=Buffer.from(f.bytes);corrupt[0]=0;await writeFile(f.file,corrupt);await assert.rejects(f.read());assert.equal(f.calls(),2);
 const replacement=path.join(f.root,'new.png');await writeFile(replacement,f.bytes);await rename(replacement,f.file);await f.read();assert.equal(f.calls(),3);
 await unlink(f.file);await assert.rejects(f.read(),{code:'ENOENT'});
 await symlink(replacement,f.file);await assert.rejects(f.read());
});
test('same version coalesces; failed pending clears; independent files do not block',async t=>{
 const f=await setup(t);let release;const gate=new Promise(r=>{release=r;});let count=0;
 const inspect=async(...args)=>{count++;await gate;return inspectHomepageImage(...args);};
 const first=f.read({inspect});await new Promise(r=>setTimeout(r,10));
 const second=f.read({inspect});const another=path.join(f.root,'other.png');await writeFile(another,f.bytes);
 await f.read({file:another});release();await Promise.all([first,second]);assert.equal(count,1);
 const g=await setup(t);let failures=0;
 const bad=async()=>{failures++;await new Promise(r=>setTimeout(r,20));throw new HomepageMediaError('test');};
 const results=await Promise.allSettled([g.read({inspect:bad}),g.read({inspect:bad})]);assert.ok(results.every(r=>r.status==='rejected'));assert.equal(failures,1);await g.read();assert.equal(g.calls(),1);
});
test('TTL, LRU limit and distinct roots/namespaces',async t=>{
 let clock=0;const f=await setup(t,{maxEntries:1,ttlMs:10,now:()=>clock});await f.read();await f.read();assert.equal(f.calls(),1);
 clock=11;await f.read();assert.equal(f.calls(),2);
 await f.read({namespace:'other-uploads-root'});await f.read();assert.equal(f.calls(),4);
 const another=path.join(f.root,'second.png');await writeFile(another,f.bytes);await f.read({file:another});await f.read();assert.equal(f.calls(),6);
});
test('zero stat size and unreliable timestamps bypass cache, byte limits still enforced',async t=>{
 const f=await setup(t);const h=await open(f.file,'r');t.after(()=>h.close());
 for(const change of [s=>({...s,size:0n,isFile:()=>true}),s=>({...s,mtimeNs:undefined,isFile:()=>true})]){
  for(let i=0;i<2;i++){
   const handle={stat:async()=>change(await h.stat({bigint:true})),readFile:()=>Promise.resolve(f.bytes)};
   await f.cache({handle,file:f.file,namespace:f.root,mimeType:'image/png',inspect:f.inspect,error:m=>new HomepageMediaError(m)});
  }
 }
 assert.equal(f.calls(),4);
 const handle={stat:async()=>({...await h.stat({bigint:true}),size:0n,isFile:()=>true}),readFile:async()=>Buffer.alloc(8*1024*1024+1)};
 await assert.rejects(f.cache({handle,file:f.file,namespace:f.root,mimeType:'image/png',inspect:f.inspect,error:m=>new HomepageMediaError(m)}),{status:413});
});
test('mid-validation mutation never seeds stale cache',async t=>{
 const f=await setup(t);let changed=false;
 const inspect=async(bytes,mime)=>{const info=await inspectHomepageImage(bytes,mime);if(!changed){changed=true;await writeFile(f.file,'invalid');}return info;};
 await assert.rejects(f.read({inspect}),/değişti/);await assert.rejects(f.read());
 await writeFile(f.file,f.bytes);await f.read();await f.read();assert.equal(f.calls(),2);
});
test('warm shared listing still rejects replaced symlink directories and files',async t=>{
 const {mkdir}=await import('node:fs/promises');
 const {listHomepageImages}=await import('./azura-homepage-media.mjs');
 const f=await setup(t),paths={contentRoot:path.join(f.root,'content'),uploadsRoot:path.join(f.root,'uploads')};
 const folder=path.join(paths.uploadsRoot,'pages/homepage');await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'a.png'),f.bytes);
 assert.equal((await listHomepageImages(paths)).length,1);assert.equal((await listHomepageImages(paths)).length,1);
 await unlink(path.join(folder,'a.png'));await symlink(f.file,path.join(folder,'a.png'));assert.equal((await listHomepageImages(paths)).length,0);
 await rename(folder,folder+'-old');await symlink(folder+'-old',folder);await assert.rejects(listHomepageImages(paths));
});
