import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {createStandardPageDraft,createPageSection,createPageGalleryImage,createPageCard,createPageOtherOption} from './azura-pages/schema.mjs';
import {BLOCK_DEFINITIONS} from './azura-pages/block-definitions.mjs';
import {validateDynamicRecord,validateDynamicHref} from './azura-pages/validation.mjs';
import {readDynamicPages,readPublishedDynamicPage,listDynamicPageNavigation} from './azura-dynamic-pages-storage.mjs';
import {dynamicLocaleHref,decodeDynamicRouteSlug,normalizePageSlug,STATIC_SEGMENTS,reservedPageSlug} from './azura-pages/routes.mjs';
export function fixture(){
 const id='11111111-1111-4111-8111-111111111111',date='2026-09-28T00:00:00.000Z';let n=0;const idFactory=()=>`item-${n++}`;
 const p={...createStandardPageDraft({slugs:{tr:'deneme',en:'example',de:'beispiel',ru:'пример'}}),id,createdAt:date,updatedAt:date,status:'published',showContactSection:false};
 p.sections=[];p.hero.image='/uploads/dynamic-pages/test.png';
 for(const [type,def] of Object.entries(BLOCK_DEFINITIONS))for(const variant of def.variants){const s=createPageSection(type,{idFactory});s.variant=variant.id;
 for(const f of def.fields.filter(f=>!f.localized)){if(f.type==='image')s[f.name]=p.hero.image;else if(f.type==='imageArray')s[f.name]=[createPageGalleryImage(p.hero.image,{idFactory})];else if(f.type==='cardArray')s[f.name]=[createPageCard(p.hero.image,{idFactory})];else if(f.type==='otherOptionArray')s[f.name]=[createPageOtherOption(p.hero.image,{idFactory})];}
 for(const l of ['tr','en','de','ru'])s.translations[l].title=`Section ${p.sections.length} ${l}`;p.sections.push(s);}
 for(const l of ['tr','en','de','ru']){p.hero.translations[l].title=`Public ${l}`;p.seo[l].title=`SEO ${l}`;}
 const draft=structuredClone(p);draft.status='draft';draft.hero.translations.tr.title='PRIVATE DRAFT';return {storageVersion:2,id,createdAt:date,updatedAt:date,publishedAt:date,history:[],draft,published:p};
}
export async function setup(t){const dir=await mkdtemp(path.join(os.tmpdir(),'azura-pages-'));t.after(()=>rm(dir,{recursive:true,force:true}));const paths={contentRoot:path.join(dir,'content'),uploadsRoot:path.join(dir,'uploads')};await mkdir(path.join(paths.contentRoot,'pages'),{recursive:true});await mkdir(path.join(paths.uploadsRoot,'dynamic-pages'),{recursive:true});await writeFile(path.join(paths.uploadsRoot,'dynamic-pages/test.png'),await sharp({create:{width:80,height:60,channels:3,background:'blue'}}).png().toBuffer());return paths;}
if(!process.env.DYNAMIC_FIXTURE_ONLY){
test('all block variants, published isolation, navigation and empty installation',async t=>{const paths=await setup(t);assert.deepEqual(await readDynamicPages(paths),[]);const r=fixture();assert.equal(r.published.sections.length,11);validateDynamicRecord(r,r.id);const file=path.join(paths.contentRoot,'pages',r.id+'.json');await writeFile(file,JSON.stringify(r));for(const l of ['tr','en','de','ru']){assert.deepEqual(await readPublishedDynamicPage(l,r.published.slugs[l],paths),r.published);assert.equal((await listDynamicPageNavigation(l,paths)).length,1);}assert.ok(!JSON.stringify(await readDynamicPages(paths)).includes('PRIVATE'));r.published=null;r.publishedAt=null;await writeFile(file,JSON.stringify(r));assert.equal(await readPublishedDynamicPage('tr','deneme',paths),null);});
test('strict schema, unsafe URLs, unknown blocks, variants and reserved slugs',()=>{for(const mutate of [r=>r.draft.slugs.tr='rooms',r=>delete r.draft.hero.translations.ru,r=>r.draft.sections[0].type='unknown',r=>r.draft.sections[0].variant='unknown',r=>r.draft.hero.image='/uploads/gallery/a.png',r=>r.draft.sections[1].translations.tr.buttonHref='javascript:alert(1)',r=>r.id='../escape']){const r=fixture();mutate(r);assert.throws(()=>validateDynamicRecord(r,r.id));}for(const u of ['javascript:alert(1)','data:text/html,a','//evil.test','https:evil.test','/\\evil','/x%0a'])assert.throws(()=>validateDynamicHref(u));assert.equal(normalizePageSlug('ПРИМЕР','ru'),'пример');assert.throws(()=>normalizePageSlug('%2frooms','en'));for(const s of STATIC_SEGMENTS)assert.equal(reservedPageSlug(s,'en'),true);assert.equal(dynamicLocaleHref({pathname:'/tr/deneme',slugs:{en:'example'}},'/tr/deneme','en'),'/en/example');assert.equal(dynamicLocaleHref({pathname:'/tr/deneme',slugs:{en:'example'}},'/tr/about','en'),null);});
test('duplicate routes, malformed files, missing media and symlinks fail explicitly',async t=>{const paths=await setup(t),r=fixture();const file=path.join(paths.contentRoot,'pages',r.id+'.json');await writeFile(file,JSON.stringify(r));await rm(path.join(paths.uploadsRoot,'dynamic-pages/test.png'));await assert.rejects(readPublishedDynamicPage('en','example',paths));await symlink('/etc/hosts',path.join(paths.uploadsRoot,'dynamic-pages/test.png'));await assert.rejects(readPublishedDynamicPage('en','example',paths));const b=structuredClone(r);b.id='22222222-2222-4222-8222-222222222222';b.draft.id=b.published.id=b.id;await writeFile(path.join(paths.contentRoot,'pages',b.id+'.json'),JSON.stringify(b));await assert.rejects(readDynamicPages(paths),/çakışması/);await writeFile(file,'{bad');await assert.rejects(readDynamicPages(paths));assert.equal(await readFile(file,'utf8'),'{bad');});
test('seed preserves records and images on repeated runs',async t=>{const paths=await setup(t),r=fixture(),file=path.join(paths.contentRoot,'pages',r.id+'.json');await writeFile(file,JSON.stringify(r));const before=await readFile(file);for(let i=0;i<2;i++)execFileSync(process.execPath,['scripts/seed-persistent-dynamic-pages.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,AZURA_CONTENT_ROOT:paths.contentRoot,AZURA_UPLOADS_ROOT:paths.uploadsRoot}});assert.deepEqual(await readFile(file),before);});
test('route inventory and encoded Unicode do not bypass reserved/path validation',async()=>{
 const root=path.resolve(import.meta.dirname,'../app/[locale]');const segments=[];
 for(const item of await readdir(root,{withFileTypes:true})){if(!item.isDirectory()||item.name.startsWith('[')||item.name.startsWith('_'))continue;try{await readFile(path.join(root,item.name,'page.js'));segments.push(item.name);}catch{}}
 assert.deepEqual(segments.sort(),[...STATIC_SEGMENTS].sort());
 const routing=await readFile(path.resolve(import.meta.dirname,'../i18n/routing.js'),'utf8');for(const match of routing.matchAll(/['"]\/([^/'"\[\n]+)/g))assert.equal(reservedPageSlug(match[1],'en'),true,match[1]);
 assert.equal(decodeDynamicRouteSlug('%D0%BF%D1%80%D0%B8%D0%BC%D0%B5%D1%80','ru'),'пример');
 for(const value of ['%2frooms','%252frooms','%2e%2e','%','x%00'])assert.throws(()=>decodeDynamicRouteSlug(value,'en'));
});

}
