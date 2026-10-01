import {migrateBlog} from './azura-blog-migration.mjs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {blogFixture} from './azura-blog-test-fixtures.mjs';
const appRoot=path.resolve(import.meta.dirname,'..');
async function startServer(port, paths) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "localhost", "-p", String(port)], {
    cwd: appRoot, env: { ...process.env, AZURA_BLOG_CONTRACT_VERSION: paths.contractVersion ?? "3", AZURA_CONTENT_ROOT: paths.contentRoot, AZURA_UPLOADS_ROOT: paths.uploadsRoot, AZURA_PANEL_SERVICE_TOKEN: "blog-test-token-01234567890123456789" },
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


test('V3 API gate, multilingual publication, aliases, concurrency, migration rejection and restart',{timeout:180000},async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'blog-v3-http-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const paths={contentRoot:path.join(dir,'content'),uploadsRoot:path.join(dir,'uploads')};
 await mkdir(path.join(paths.contentRoot,'blog/posts'),{recursive:true});await mkdir(path.join(paths.uploadsRoot,'blog'),{recursive:true});
 await writeFile(path.join(paths.uploadsRoot,'blog/test.png'),await sharp({create:{width:80,height:60,channels:3,background:'blue'}}).png().toBuffer());
 await writeFile(path.join(paths.contentRoot,'blog/posts/migrated.json'),JSON.stringify(blogFixture('migrated')));
 await migrateBlog({...paths,apply:true,maintenance:true});
 const port=46000+Math.floor(Math.random()*10000);let {child,base}=await startServer(port,paths);t.after(()=>stopServer(child));
 const root='/api/azura/blog/posts',url=root+'/technical',file=path.join(paths.contentRoot,'blog/posts/technical.json');
 const auth={Authorization:'Bearer blog-test-token-01234567890123456789','X-Azura-Blog-Contract-Version':'3'};
 const req=(address,method='GET',body,headers={})=>fetch(base+address,{method,headers:{...auth,...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
 const migrated=await (await req(root+'/migrated')).json();assert.equal(migrated.record.storageVersion,3);
 for(const locale of ['tr','en','de','ru']){const response=await fetch(`${base}/${locale}/news/migrated`);assert.equal(response.status,200);assert.ok((await response.text()).includes(`Public ${locale}`));}
 assert.equal((await fetch(base+root)).status,401);
 for(const method of ['GET','POST']){const r=await req(root,method,undefined,{'X-Azura-Blog-Contract-Version':'2'});assert.equal(r.status,409);assert.equal((await r.json()).code,'BLOG_CONTRACT_VERSION_MISMATCH');}
 const p=blogFixture().published;
 const draft={coverImage:p.coverImage,publishedAt:p.publishedAt,translations:p.translations,contentBlocks:p.contentBlocks,slugs:{tr:'yazi',en:'article',de:'artikel',ru:'statya'}};
 let r=await req(root,'POST',{slug:'technical',draft});assert.equal(r.status,201,await r.clone().text());let current=await r.json();
 const put=body=>req(url,'PUT',body,{'If-Match':`"${current.revision}"`});
 const publicGet=address=>fetch(base+address,{redirect:'manual'});
 for(const [l,s] of Object.entries(draft.slugs))assert.equal((await publicGet(`/${l}/news/${s}`)).status,404);
 for(const method of ['GET','PUT','DELETE'])assert.equal((await req(url,method,undefined,{'X-Azura-Blog-Contract-Version':''})).status,409);
 const protectedBytes=await readFile(file);
 for(const extra of [{aliases:{}},{published:{}},{storageVersion:3},{updatedAt:'2026-09-30T10:00:00.000Z'}])assert.equal((await put({action:'save',draft:{...draft,...extra}})).status,400);
 const missing=structuredClone(draft);delete missing.slugs.ru;assert.equal((await put({action:'save',draft:missing})).status,400);
 assert.equal((await req(url,'PUT',{action:'publish'})).status,428);
 assert.equal((await req(url,'PUT',{action:'publish'},{'If-Match':'bad'})).status,400);
 assert.deepEqual(await readFile(file),protectedBytes);
 const before=await readFile(file);r=await req(url,'PUT',{action:'publish'},{'If-Match':`"${current.revision}"`,'X-Azura-Blog-Contract-Version':''});assert.equal(r.status,409);assert.deepEqual(await readFile(file),before);
 current=await (await put({action:'publish'})).json();
 for(const [l,s] of Object.entries(draft.slugs)){
  const listing=await (await publicGet(`/${l}/news`)).text();assert.ok(listing.includes(`/${l}/news/${s}`));
  r=await publicGet(`/${l}/news/${s}`);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(`SEO ${l}`));assert.ok(html.includes(`/${l}/news/${s}`));assert.ok(!html.includes('SECRET DRAFT'));
 }
 assert.equal((await publicGet('/en/news/technical')).status,404);
 const changed=structuredClone(draft);for(const l of Object.keys(changed.slugs))changed.slugs[l]+='-new';
 current=await (await put({action:'save',draft:changed})).json();
 for(const [l,s] of Object.entries(draft.slugs)){assert.equal((await publicGet(`/${l}/news/${s}`)).status,200);assert.equal((await publicGet(`/${l}/news/${changed.slugs[l]}`)).status,404);}
 const oldRevision=current.revision;
 const pair=await Promise.all([put({action:'publish'}),put({action:'publish'})]);assert.deepEqual(pair.map(x=>x.status).sort(),[200,409]);current=await (await req(url)).json();
 for(const [l,s] of Object.entries(draft.slugs)){r=await publicGet(`/${l}/news/${s}`);assert.equal(r.status,308);assert.equal(r.headers.get('location'),`/${l}/news/${changed.slugs[l]}`);assert.equal((await publicGet(`/${l}/news/${changed.slugs[l]}`)).status,200);}
 const snapshot=await readFile(file);assert.equal((await req(url,'DELETE',undefined,{'If-Match':`"${oldRevision}"`})).status,409);assert.deepEqual(await readFile(file),snapshot);
 // Both a published canonical and a historical alias are reserved against other records.
 for(const candidate of [draft,changed])assert.equal((await req(root,'POST',{slug:'other',draft:candidate})).status,409);
 const parallelDraft=structuredClone(draft);for(const l of Object.keys(parallelDraft.slugs))parallelDraft.slugs[l]='parallel';
 const collisions=await Promise.all(['first','second'].map(slug=>req(root,'POST',{slug,draft:parallelDraft})));assert.deepEqual(collisions.map(x=>x.status).sort(),[201,409]);
 const revision=current.revision;await stopServer(child);({child}=await startServer(port,paths));current=await (await req(url)).json();assert.equal(current.revision,revision);assert.deepEqual(await readFile(file),snapshot);
 r=await publicGet('/en/news/article');assert.equal(r.status,308);
 current=await (await put({action:'save',draft})).json();current=await (await put({action:'publish'})).json();
 assert.equal((await publicGet('/en/news/article')).status,200);r=await publicGet('/en/news/article-new');assert.equal(r.status,308);assert.equal(r.headers.get('location'),'/en/news/article');
 current=await (await put({action:'unpublish'})).json();
 for(const [l,s] of Object.entries(draft.slugs)){assert.equal((await publicGet(`/${l}/news/${s}`)).status,404);assert.equal((await publicGet(`/${l}/news/${s}-new`)).status,404);}
 current=await (await put({action:'publish'})).json();assert.equal((await req(url,'DELETE',undefined,{'If-Match':`"${current.revision}"`})).status,200);
 assert.equal((await publicGet('/en/news/article')).status,404);assert.equal((await publicGet('/en/news/article-new')).status,404);
 // Incompatible fixture is deliberately written only to this isolated test root.
 const legacy=path.join(paths.contentRoot,'blog/posts/legacy.json');await writeFile(legacy,JSON.stringify(blogFixture('legacy')));
 r=await req(root);assert.equal(r.status,503);assert.equal((await r.json()).code,'BLOG_MIGRATION_REQUIRED');
 assert.equal((await req(root,'POST',{slug:'blocked',draft})).status,503);assert.deepEqual(JSON.parse(await readFile(legacy)),blogFixture('legacy'));
 await stopServer(child);({child}=await startServer(port,{...paths,contractVersion:'invalid'}));
 r=await req(root);assert.equal(r.status,503);assert.equal((await r.json()).code,'BLOG_CONTRACT_CONFIGURATION_ERROR');
});
