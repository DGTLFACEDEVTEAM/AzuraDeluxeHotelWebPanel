import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
process.env.CERTIFICATE_FIXTURE_ONLY='1';
const {setup}=await import('./azura-certificates.test.mjs');
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
    try { if ((await fetch(`${base}/uploads/pages/certificates/hero.jpg`)).status === 200) return { child, base, output: () => output }; }
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


test('certificates production: four languages, media, editable text without build, restart',{timeout:180000},async t=>{
 const paths=await setup(t),port=46000+Math.floor(Math.random()*10000);let {child,base,output}=await startServer(port,paths);t.after(()=>stopServer(child));const file=path.join(paths.contentRoot,'site-pages/certificates.json'),c=JSON.parse(await readFile(file));
 const verify=async()=>{for(const l of ['tr','en','de','ru']){const res=await fetch(`${base}/${l}/certificates`);assert.equal(res.status,200,output());const html=await res.text();assert.ok(html.includes(c.translations[l].hero.title));assert.ok(html.includes(c.translations[l].feature.title));assert.ok(html.includes(c.translations[l].gallery.title));for(const img of c.media.gallery.images)assert.ok(html.includes(encodeURIComponent(img.src))||html.includes(img.src));}};
 await verify();const manifest=JSON.parse(await readFile(path.join(appRoot,'content/site-pages/certificates-sources.json')));for(const {image} of manifest){const response=await fetch(base+image);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(path.join(paths.uploadsRoot,image.slice('/uploads/'.length))));}
 for(const l of ['tr','en','de','ru'])c.translations[l].feature.title=`Updated certificate ${l}`;await writeFile(file,JSON.stringify(c));await verify();await stopServer(child);({child}=await startServer(port,paths));await verify();assert.deepEqual(JSON.parse(await readFile(file)),c);
});
