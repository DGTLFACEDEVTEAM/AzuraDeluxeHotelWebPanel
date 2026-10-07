import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,rm,symlink,rename} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
test('production media: validated bytes, limits, symlinks, traversal and collection regressions',{timeout:90000},async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'media-serving-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const uploads=path.join(root,'uploads');for(const d of ['pages/bars','pages/certificates','gallery','blog','dynamic-pages'])await mkdir(path.join(uploads,d),{recursive:true});
 const originals={};for(const format of ['jpeg','png','webp']){const bytes=await sharp({create:{width:32,height:24,channels:3,background:'blue'}})[format]().toBuffer();originals[format]=bytes;await writeFile(path.join(uploads,`pages/bars/good.${format}`),bytes);}
 for(const d of ['pages/certificates','gallery','blog','dynamic-pages'])await writeFile(path.join(uploads,d,'good.png'),originals.png);
 await writeFile(path.join(uploads,'pages/bars/fake.png'),'fake');await writeFile(path.join(uploads,'pages/bars/broken.png'),originals.png.subarray(0,25));await writeFile(path.join(uploads,'pages/bars/wrong.png'),originals.jpeg);
 await writeFile(path.join(uploads,'pages/bars/large.png'),Buffer.alloc(8*1024*1024+1));await writeFile(path.join(uploads,'pages/bars/pixels.png'),await sharp({create:{width:4001,height:4000,channels:3,background:'red'}}).png().toBuffer());
 await symlink(path.join(uploads,'pages/bars/good.png'),path.join(uploads,'pages/bars/link.png'));await symlink(path.join(uploads,'pages/bars'),path.join(uploads,'pages/rooms'));await writeFile(path.join(root,'outside.png'),originals.png);await symlink(path.join(root,'outside.png'),path.join(uploads,'pages/bars/outside.png'));
 const port=48000+Math.floor(Math.random()*1000),base=`http://localhost:${port}`;
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','localhost','-p',String(port)],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,AZURA_CONTENT_ROOT:path.join(root,'content'),AZURA_UPLOADS_ROOT:uploads},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
 t.after(async()=>{if(child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);child.kill();setTimeout(()=>{child.kill('SIGKILL');resolve();},3000).unref();});});
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/uploads/pages/bars/good.png')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,logs);
 for(const [format,bytes]of Object.entries(originals)){const r=await fetch(`${base}/uploads/pages/bars/good.${format}`);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),`image/${format}`);assert.equal(r.headers.get('cache-control'),'public, max-age=0, must-revalidate');assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);}
 for(const name of ['fake.png','broken.png','wrong.png','large.png','pixels.png','link.png','outside.png']){const r=await fetch(`${base}/uploads/pages/bars/${name}`);assert.equal(r.status,404,name);assert.equal(await r.text(),'');}
 for(const suffix of ['pages/rooms/good.png','pages/bars/%2e%2e%2foutside.png','pages/unknown/good.png'])assert.equal((await fetch(`${base}/uploads/${suffix}`)).status,404,suffix);
 for(const d of ['pages/certificates','gallery','blog','dynamic-pages']){const r=await fetch(`${base}/uploads/${d}/good.png`);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await r.arrayBuffer()),originals.png);}
 await rename(path.join(uploads,'pages'),path.join(uploads,'original-pages'));await symlink(path.join(uploads,'original-pages'),path.join(uploads,'pages'));assert.equal((await fetch(`${base}/uploads/pages/bars/good.png`)).status,404);
});
