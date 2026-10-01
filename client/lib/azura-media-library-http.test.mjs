import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
const appRoot=path.resolve(import.meta.dirname,'..');
async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot, AZURA_PANEL_SERVICE_TOKEN: "blog-test-token-01234567890123456789" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try { if ((await fetch(`${base}/uploads/blog/test.png`)).status === 200) return { child, base, output: () => output }; }
    catch { /* server not ready */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill(); throw new Error(`Next hazır olmadı: ${output}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  await new Promise(resolve => {
    child.once("exit", resolve); child.kill();
    setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000).unref();
  });
}


test('media library HTTP authorization, strict queries, reuse and unchanged JSON',{timeout:120000},async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'library-http-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const paths={contentRoot:path.join(root,'content'),uploadsRoot:path.join(root,'uploads')};
 await mkdir(paths.contentRoot,{recursive:true});await mkdir(path.join(paths.uploadsRoot,'blog'),{recursive:true});
 const bytes=await sharp({create:{width:80,height:60,channels:3,background:'blue'}}).png().toBuffer();await writeFile(path.join(paths.uploadsRoot,'blog/test.png'),bytes);
 const jsonFile=path.join(paths.contentRoot,'untouched.json');await writeFile(jsonFile,'{"user":true}');
 const {child,base}=await startServer(46000+Math.floor(Math.random()*10000),paths);t.after(()=>stopServer(child));
 const auth={Authorization:'Bearer blog-test-token-01234567890123456789'},library='/api/azura/media-library',reuse=library+'/reuse';
 assert.equal((await fetch(base+library)).status,401);assert.equal((await fetch(base+reuse,{method:'POST'})).status,401);
 const list=await fetch(base+library+'?limit=1',{headers:auth});assert.equal(list.status,200);assert.equal(list.headers.get('cache-control'),'no-store');const result=await list.json();assert.equal(result.total,1);assert.equal(result.images[0].scope,'blog');
 const post=(body,headers={})=>fetch(base+reuse,{method:'POST',headers:{...auth,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 assert.equal((await post({image:'/uploads/blog/test.png',targetScope:'blog'})).status,200);
 const responses=await Promise.all([post({image:'/uploads/blog/test.png',targetScope:'homepage'}),post({image:'/uploads/blog/test.png',targetScope:'homepage'})]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);
 const target=await responses[0].json();assert.deepEqual(Buffer.from(await (await fetch(base+target.image)).arrayBuffer()),bytes);
 assert.equal((await (await fetch(base+library,{headers:auth})).json()).total,2);
 for(const body of [{image:'https://example.com/a.png',targetScope:'homepage'},{image:'/uploads/blog/../test.png',targetScope:'homepage'},{image:'/uploads/blog/test.png',targetScope:'room-options'},{image:'/uploads/blog/test.png',targetScope:'homepage',folder:'x'}])assert.equal((await post(body)).status,400);
 assert.equal((await post({image:'/uploads/blog/test.png',targetScope:'homepage'},{'Content-Type':'text/plain'})).status,415);
 assert.equal((await post({image:'x'.repeat(5000),targetScope:'blog'})).status,413);
 assert.equal((await fetch(base+library+'?root=/tmp',{headers:auth})).status,400);
 assert.equal(await readFile(jsonFile,'utf8'),'{"user":true}');assert.deepEqual(await readFile(path.join(paths.uploadsRoot,'blog/test.png')),bytes);
});
