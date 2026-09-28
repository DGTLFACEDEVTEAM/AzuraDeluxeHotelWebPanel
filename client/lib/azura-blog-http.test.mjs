import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {blogFixture} from './azura-blog-test-fixtures.mjs';
const appRoot=path.resolve(import.meta.dirname,'..');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
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


test('blog production: empty/draft/public, locale/metadata, blocks, dynamic edits and restart',{timeout:180000},async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'blog-http-'));t.after(()=>rm(dir,{recursive:true,force:true}));const paths={contentRoot:path.join(dir,'content'),uploadsRoot:path.join(dir,'uploads')};await mkdir(path.join(paths.contentRoot,'blog/posts'),{recursive:true});await mkdir(path.join(paths.uploadsRoot,'blog'),{recursive:true});
 const bytes=await sharp({create:{width:80,height:60,channels:3,background:'blue'}}).png().toBuffer();await writeFile(path.join(paths.uploadsRoot,'blog/test.png'),bytes);
 const port=46000+Math.floor(Math.random()*10000);let {child,base,output}=await startServer(port,paths);t.after(()=>stopServer(child));
 const page=async(url,status=200)=>{const response=await fetch(base+url);assert.equal(response.status,status,`${url}: ${output()}`);return response.text();};
 for(const l of ['tr','en','de','ru']){const html=await page(`/${l}/news`);const messages=JSON.parse(await readFile(path.join(appRoot,`messages/${l}.json`))).BlogNews;assert.ok(html.includes(escape(messages.empty)));assert.ok(html.includes('Azura Journal'));}
 const record=blogFixture();record.draft.translations.tr.title='SECRET PRIVATE TITLE';const file=path.join(paths.contentRoot,'blog/posts/example.json');const onlyDraft={...record,published:null,publicationUpdatedAt:null};await writeFile(file,JSON.stringify(onlyDraft));assert.ok(!(await page('/tr/news')).includes('SECRET PRIVATE'));await page('/tr/news/example',404);await page('/en/news/missing',404);
 record.published.translations.de.title='';record.published.translations.de.content='UNSELECTED GERMAN';record.published.translations.tr.content='First paragraph\n\n<script>alert("unsafe")</script>';
 await writeFile(file,JSON.stringify(record));
 const verify=async(changed=false)=>{for(const l of ['tr','en','de','ru']){const contentLocale=l==='de'?'tr':l;const title=changed?`Changed ${contentLocale}`:`Public ${contentLocale}`;const listing=await page(`/${l}/news`);assert.ok(listing.includes(escape(title)));assert.ok(listing.includes(`/${l}/news/example`));assert.ok(!listing.includes('SECRET PRIVATE'));const html=await page(`/${l}/news/example`);assert.ok(html.includes(escape(title)));assert.ok(html.includes(`SEO ${contentLocale}`));assert.ok(html.includes(`<h2`));assert.ok(html.includes(`Heading 0 ${contentLocale}`));assert.ok(html.includes(`<h3`));assert.ok(html.includes(`Heading 1 ${contentLocale}`));assert.ok(html.includes('/uploads/blog/test.png'));assert.ok(!html.includes('SECRET PRIVATE'));assert.ok(!html.includes('UNSELECTED GERMAN'));assert.ok(!html.includes('<script>alert'));if(contentLocale==='tr')assert.ok(html.includes('&lt;script&gt;'));const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');assert.ok(!visible.includes('h-[320px]'));}};
 await verify();assert.deepEqual(Buffer.from(await (await fetch(base+'/uploads/blog/test.png')).arrayBuffer()),bytes);
 for(const l of ['tr','en','ru'])record.published.translations[l].title=`Changed ${l}`;await writeFile(file,JSON.stringify(record));await verify(true);await stopServer(child);({child}=await startServer(port,paths));await verify(true);assert.deepEqual(JSON.parse(await readFile(file)),record);
 await writeFile(file,'{bad');await page('/en/news',500);assert.equal(await readFile(file,'utf8'),'{bad');
});
