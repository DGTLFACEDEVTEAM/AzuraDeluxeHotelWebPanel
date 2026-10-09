import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
const exec=promisify(execFile),script=path.resolve(import.meta.dirname,'../scripts/diagnose-dynamic-image.mjs');
test('standalone diagnostic: exactly four validated reads; no writes or sensitive output',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'image-diagnostic-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(path.join(root,'dynamic-pages'));const file=path.join(root,'dynamic-pages/test.webp');
 const bytes=await sharp({create:{width:2400,height:1792,channels:3,background:'blue'}}).webp().toBuffer();await writeFile(file,bytes);
 const run=(args)=>exec(process.execPath,[script,...args],{env:{...process.env,AZURA_UPLOADS_ROOT:root,AZURA_PANEL_SERVICE_TOKEN:'secret-marker-never-print'}});
 const args=['--uploads-root',root,'--image','/uploads/dynamic-pages/test.webp'];
 const {stdout,stderr}=await run(args),data=JSON.parse(stdout);assert.equal(stderr,'');
 assert.equal(data.concurrent.count,3);assert.equal(data.concurrent.peak,3);
 for(const sample of [data.single,...data.concurrent.samples]){assert.deepEqual(sample.calls,{metadata:1,stats:1});assert.equal(sample.image.size,bytes.length);assert.equal(sample.image.width,2400);assert.equal(sample.image.height,1792);for(const value of Object.values(sample.ms))assert.ok(value>=0);}
 assert.ok(!stdout.includes(root));assert.ok(!stdout.includes('secret-marker'));assert.ok(!stdout.includes('base64'));
 assert.deepEqual(await readFile(file),bytes);assert.deepEqual(await readdir(root),['dynamic-pages']);assert.deepEqual(await readdir(path.join(root,'dynamic-pages')),['test.webp']);
 const viaEnv=JSON.parse((await run(['--image','/uploads/dynamic-pages/test.webp'])).stdout);assert.equal(viaEnv.single.image.size,bytes.length);
 await writeFile(path.join(root,'dynamic-pages/fake.webp'),'fake');await symlink(file,path.join(root,'dynamic-pages/link.webp'));
 for(const image of ['fake.webp','link.webp','../test.webp'])await assert.rejects(run(['--image','/uploads/dynamic-pages/'+image]),e=>e.code===1&&!e.stderr.includes(root)&&!e.stderr.includes('secret-marker')&&e.stdout==='');
 await assert.rejects(run(['--uploads-root','relative','--image','/uploads/dynamic-pages/test.webp']));
});
