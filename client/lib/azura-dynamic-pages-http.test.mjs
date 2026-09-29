import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
process.env.DYNAMIC_FIXTURE_ONLY='1';
const {fixture,setup}=await import('./azura-dynamic-pages.test.mjs');
const appRoot=path.resolve(import.meta.dirname,'..');
async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; }); child.stderr.on("data", chunk => { output += chunk; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Next başlatılamadı: ${output}`);
    try { if ((await fetch(`${base}/uploads/dynamic-pages/test.png`)).status === 200) return { child, base, output: () => output }; }
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



test('dynamic pages production: all variants, four slugs, draft isolation, media and restart',{timeout:180000},async t=>{
 const paths=await setup(t);const port=46000+Math.floor(Math.random()*10000);let {child,base,output}=await startServer(port,paths);t.after(()=>stopServer(child));
 const get=async(url,status=200)=>{const r=await fetch(base+url);assert.equal(r.status,status,url+output());return r.text();};
 await get('/en/example',404);await get('/en/example/nested',404);
 const r=fixture(),file=path.join(paths.contentRoot,'pages',r.id+'.json');const draft={...r,published:null,publishedAt:null};await writeFile(file,JSON.stringify(draft));await get('/tr/deneme',404);
 r.published.sections[0].enabled=false;await writeFile(file,JSON.stringify(r));
 const verify=async()=>{for(const l of ['tr','en','de','ru']){const html=await get(`/${l}/${encodeURIComponent(r.published.slugs[l])}`);const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');assert.ok(visible.includes(r.published.hero.translations[l].title));assert.ok(visible.includes(`SEO ${l}`));assert.ok(!visible.includes('PRIVATE DRAFT'));assert.ok(!visible.includes(`Section 0 ${l}`));for(let i=1;i<11;i++)assert.ok(visible.includes(`Section ${i} ${l}`),`missing variant ${i}`);assert.ok(html.includes('/uploads/dynamic-pages/test.png'));assert.ok(visible.includes('hreflang="en"')||visible.includes('hrefLang="en"'));}};
 await verify();for(const l of ['tr','en','de','ru'])r.published.hero.translations[l].title=`Updated ${l}`;await writeFile(file,JSON.stringify(r));await verify();await stopServer(child);({child}=await startServer(port,paths));await verify();assert.deepEqual(JSON.parse(await readFile(file)),r);
 assert.equal((await fetch(base+'/uploads/dynamic-pages/test.png')).status,200);
});
