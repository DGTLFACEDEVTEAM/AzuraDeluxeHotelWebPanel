import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {readDashboardSummary,dashboardSummaryGET,parseSummaryQuery,summarizeRecords} from './azura-dashboard-summary.mjs';
import {GALLERY_CATEGORY_IDS,readGalleryManagement} from './azura-gallery-storage.mjs';
import {blogFixture} from './azura-blog-test-fixtures.mjs';
import {convertBlogV2ToV3} from './azura-blog-v3.mjs';
import {createStandardPageDraft} from './azura-pages/schema.mjs';
import {listBlogPosts,createBlogPost,mutateBlogPost,deleteBlogPost} from './azura-blog-management.mjs';
import {listManagedPages,createManagedPage,mutateManagedPage} from './azura-dynamic-pages-management.mjs';
const locales=['tr','en','de','ru'];
async function setup(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dashboard-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const paths={contentRoot:path.join(root,'content'),uploadsRoot:path.join(root,'uploads')};
 for(const part of ['blog/posts','pages','gallery'])await fs.mkdir(path.join(paths.contentRoot,part),{recursive:true});
 const gallery={schemaVersion:1,categories:GALLERY_CATEGORY_IDS.map(id=>({id,images:[]}))};
 await fs.writeFile(path.join(paths.contentRoot,'gallery/gallery.json'),JSON.stringify(gallery));
 return {paths,gallery};
}
function env(t,values){for(const [key,value]of Object.entries(values)){const previous=process.env[key];if(value===undefined)delete process.env[key];else process.env[key]=value;t.after(()=>{if(previous===undefined)delete process.env[key];else process.env[key]=previous;});}}
function pageFixture(){
 const id='11111111-1111-4111-8111-111111111111',date='2026-09-01T10:00:00.000Z';
 const draft={...createStandardPageDraft({slugs:{tr:'deneme',en:'example',de:'beispiel',ru:'primer'}}),id,createdAt:date,updatedAt:date,status:'draft'};
 draft.sections=[];draft.hero.image='/uploads/dynamic-pages/missing.png';for(const l of locales)draft.hero.translations[l].title='Page '+l;
 return {storageVersion:2,id,createdAt:date,updatedAt:date,publishedAt:null,history:[],draft,published:null};
}
test('auth, strict query, no-store, empty and missing setup',async t=>{
 const {paths}=await setup(t);env(t,{AZURA_PANEL_SERVICE_TOKEN:'x'.repeat(32),AZURA_CONTENT_ROOT:paths.contentRoot,AZURA_UPLOADS_ROOT:paths.uploadsRoot,AZURA_BLOG_CONTRACT_VERSION:undefined});
 const call=(query='',auth=true)=>dashboardSummaryGET(new Request('http://localhost/api/azura/dashboard/summary'+query,{headers:auth?{authorization:'Bearer '+'x'.repeat(32)}:{}}));
 assert.equal((await call('',false)).status,401);
 for(const q of ['?sections=bad','?sections=blog,blog','?limit=0','?limit=21','?limit=1&limit=2','?root=/tmp'])assert.equal((await call(q)).status,400);
 assert.deepEqual(parseSummaryQuery('http://local/?sections=blog&limit=20'),{sections:['blog'],limit:20});
 const response=await call();assert.equal(response.headers.get('cache-control'),'no-store');const data=await response.json();
 assert.equal(data.gallery.data.imageCount,0);assert.equal(data.blog.data.total,0);assert.equal(data.pages.data.total,0);
 await fs.rm(path.join(paths.contentRoot,'pages'),{recursive:true});assert.equal((await (await call('?sections=pages')).json()).pages.status,'error');
});
test('counts, bounded notifications, deterministic latest, partial errors and no image IO',async t=>{
 const {paths,gallery}=await setup(t);env(t,{AZURA_BLOG_CONTRACT_VERSION:'2'});
 const a=blogFixture('changed'),b=blogFixture('draft'),c=blogFixture('current');b.published=null;b.publicationUpdatedAt=null;c.draft=structuredClone(c.published);c.draft.status='draft';
 for(const r of [a,b,c])await fs.writeFile(path.join(paths.contentRoot,`blog/posts/${r.slug}.json`),JSON.stringify(r));
 const page=pageFixture();await fs.writeFile(path.join(paths.contentRoot,`pages/${page.id}.json`),JSON.stringify(page));
 for(const [i,category]of gallery.categories.slice(0,2).entries())category.images=[{id:`image-${i}`,src:'/uploads/gallery/missing.png',order:0,width:20,height:20,translations:Object.fromEntries(locales.map(l=>[l,{alt:' a '}]))}];
 await fs.writeFile(path.join(paths.contentRoot,'gallery/gallery.json'),JSON.stringify(gallery));
 t.mock.method(sharp.prototype,'metadata',()=>{throw new Error('SHARP MUST NOT RUN');});t.mock.method(sharp.prototype,'stats',()=>{throw new Error('SHARP MUST NOT RUN');});
 const original=fs.open;t.mock.method(fs,'open',async(file,...args)=>{assert.ok(!String(file).includes(paths.uploadsRoot));return original(file,...args);});syncBuiltinESMExports();t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
 const summary=await readDashboardSummary({limit:1},paths);assert.equal(summary.gallery.data.imageCount,2);
 assert.deepEqual([summary.blog.data.total,summary.blog.data.currentPublishedCount,summary.blog.data.changedCount,summary.blog.data.draftCount],[3,1,1,1]);
 assert.equal(summary.blog.data.notifications.total,2);assert.equal(summary.blog.data.notifications.items.length,1);assert.equal(summary.blog.data.latestPost.slug,'changed');assert.equal(summary.pages.data.notifications.total,1);
 for(const forbidden of ['contentBlocks','sections','history','coverImage','translations','missing.png','Paragraph'])assert.ok(!JSON.stringify(summary).includes(forbidden));
 await fs.writeFile(path.join(paths.contentRoot,'gallery/gallery.json'),'{bad');const partial=await readDashboardSummary({},paths);assert.equal(partial.gallery.status,'error');assert.equal(partial.blog.status,'ok');assert.equal(partial.pages.status,'ok');assert.ok(!JSON.stringify(partial).includes(paths.contentRoot));
 await fs.rm(path.join(paths.contentRoot,'gallery/gallery.json'));await fs.symlink(path.join(paths.contentRoot,'blog/posts/current.json'),path.join(paths.contentRoot,'gallery/gallery.json'));assert.equal((await readDashboardSummary({},paths)).gallery.status,'error');
});
test('V3 gate, migration required and valid V3 summaries',async t=>{
 const {paths}=await setup(t);env(t,{AZURA_BLOG_CONTRACT_VERSION:'3',AZURA_PANEL_SERVICE_TOKEN:'x'.repeat(32),AZURA_CONTENT_ROOT:paths.contentRoot,AZURA_UPLOADS_ROOT:paths.uploadsRoot});
 const request=version=>dashboardSummaryGET(new Request('http://local/?sections=blog',{headers:{authorization:'Bearer '+'x'.repeat(32),...(version?{'X-Azura-Blog-Contract-Version':version}:{})}}));
 assert.equal((await request()).status,409);
 const r=blogFixture();const file=path.join(paths.contentRoot,'blog/posts/example.json');await fs.writeFile(file,JSON.stringify(r));
 assert.equal((await(await request('3')).json()).blog.error.code,'BLOG_MIGRATION_REQUIRED');
 await fs.writeFile(file,JSON.stringify(convertBlogV2ToV3(r)));assert.equal((await(await request('3')).json()).blog.data.changedCount,1);
 process.env.AZURA_BLOG_CONTRACT_VERSION='bad';assert.equal((await request('3')).status,503);
});
test('live lifecycle and page notification distinction',async t=>{
 const {paths}=await setup(t);env(t,{AZURA_BLOG_CONTRACT_VERSION:'2'});
 const p=blogFixture().draft;const draft={coverImage:'',publishedAt:p.publishedAt,translations:p.translations,contentBlocks:[]};
 let r=await createBlogPost({slug:'example',draft},paths);
 const counts=async()=>{const d=(await readDashboardSummary({sections:['blog']},paths)).blog.data;return [d.currentPublishedCount,d.changedCount,d.draftCount];};
 assert.deepEqual(await counts(),[0,0,1]);r=await mutateBlogPost('example',{action:'publish'},r.revision,paths);assert.deepEqual(await counts(),[1,0,0]);
 draft.translations.tr.title='Changed';r=await mutateBlogPost('example',{action:'save',draft},r.revision,paths);assert.deepEqual(await counts(),[0,1,0]);
 r=await mutateBlogPost('example',{action:'unpublish'},r.revision,paths);assert.deepEqual(await counts(),[0,0,1]);await deleteBlogPost('example',r.revision,paths);assert.deepEqual(await counts(),[0,0,0]);
 const page=pageFixture();page.published=structuredClone(page.draft);page.published.status='published';page.draft.hero.translations.tr.title='Changed';const s=summarizeRecords([page],'pages',5);assert.equal(s.changedCount,1);assert.equal(s.notifications.total,0);
});
test('temporary representative full-list versus summary benchmark',async t=>{
 const {paths,gallery}=await setup(t);env(t,{AZURA_BLOG_CONTRACT_VERSION:'2'});
 await fs.mkdir(path.join(paths.uploadsRoot,'gallery'),{recursive:true});const bytes=await sharp({create:{width:800,height:600,channels:3,background:'blue'}}).png().toBuffer();
 for(let i=0;i<40;i++){const src=`/uploads/gallery/image-${i}.png`;await fs.writeFile(path.join(paths.uploadsRoot,`gallery/image-${i}.png`),bytes);gallery.categories[0].images.push({id:`image-${i}`,src,order:i,width:800,height:600,translations:Object.fromEntries(locales.map(l=>[l,{alt:'alt'}]))});const r=blogFixture(`post-${i}`);await fs.writeFile(path.join(paths.contentRoot,`blog/posts/${r.slug}.json`),JSON.stringify(r));}
 await fs.writeFile(path.join(paths.contentRoot,'gallery/gallery.json'),JSON.stringify(gallery));
 for(let i=0;i<20;i++){const r=pageFixture();r.id=`11111111-1111-4111-8111-${String(i).padStart(12,'0')}`;r.draft.id=r.id;for(const l of locales)r.draft.slugs[l]+=`-${i}`;await fs.writeFile(path.join(paths.contentRoot,`pages/${r.id}.json`),JSON.stringify(r));}
 let heavy=0;const stats=sharp.prototype.stats;t.mock.method(sharp.prototype,'stats',function(...args){heavy++;return stats.apply(this,args);});
 const measure=async(name,fn)=>{const before=heavy,start=performance.now();const value=await fn();t.diagnostic(`${name}: ${(performance.now()-start).toFixed(2)} ms, ${Buffer.byteLength(JSON.stringify(value))} bytes, heavy=${heavy-before}`);return value;};
 await measure('full cold (40 blog / 20 pages / 40 gallery)',async()=>({gallery:await readGalleryManagement(paths),blog:await listBlogPosts(paths),pages:await listManagedPages(paths)}));
 await measure('full warm',async()=>({gallery:await readGalleryManagement(paths),blog:await listBlogPosts(paths),pages:await listManagedPages(paths)}));
 await measure('summary',()=>readDashboardSummary({},paths));const n=heavy;await measure('summary repeat',()=>readDashboardSummary({},paths));assert.equal(heavy,n);
});

test('dynamic page save/publish/unpublish/delete summaries remain fresh',async t=>{
 const {paths}=await setup(t);
 const draft=createStandardPageDraft({slugs:{tr:'deneme',en:'example',de:'beispiel',ru:'primer'}});draft.sections=[];draft.hero.image='';
 const fields=['schemaVersion','template','slugs','showContactSection','hero','navigation','seo','sections'];
 const input=Object.fromEntries(fields.map(k=>[k,draft[k]]));
 let r=await createManagedPage({draft:input},paths);
 const counts=async()=>{const d=(await readDashboardSummary({sections:['pages']},paths)).pages.data;return [d.currentPublishedCount,d.changedCount,d.draftCount,d.notifications.total];};
 assert.deepEqual(await counts(),[0,0,1,1]);
 r=await mutateManagedPage(r.record.id,{action:'publish'},r.revision,paths);assert.deepEqual(await counts(),[1,0,0,0]);
 input.hero.translations.tr.title='New title';r=await mutateManagedPage(r.record.id,{action:'save',draft:input},r.revision,paths);assert.deepEqual(await counts(),[0,1,0,0]);
 r=await mutateManagedPage(r.record.id,{action:'unpublish'},r.revision,paths);assert.deepEqual(await counts(),[0,0,1,1]);
 await mutateManagedPage(r.record.id,{action:'delete'},r.revision,paths);assert.deepEqual(await counts(),[0,0,0,0]);
});

test('corrupt blog or page does not suppress other sources; latest uses root timestamp',async t=>{
 const {paths}=await setup(t);env(t,{AZURA_BLOG_CONTRACT_VERSION:'2'});
 await fs.writeFile(path.join(paths.contentRoot,'blog/posts/broken.json'),'{invalid');
 let result=await readDashboardSummary({},paths);assert.equal(result.blog.status,'error');assert.equal(result.gallery.status,'ok');assert.equal(result.pages.status,'ok');
 await fs.rm(path.join(paths.contentRoot,'blog/posts/broken.json'));
 await fs.writeFile(path.join(paths.contentRoot,'pages/11111111-1111-4111-8111-111111111111.json'),'{invalid');
 result=await readDashboardSummary({},paths);assert.equal(result.blog.status,'ok');assert.equal(result.pages.status,'error');assert.equal(result.gallery.status,'ok');
 const a=blogFixture('a'),b=blogFixture('b');b.updatedAt='2026-09-02T00:00:00.000Z';
 assert.equal(summarizeRecords([a,b],'blog',5).latestPost.slug,'b');
});
