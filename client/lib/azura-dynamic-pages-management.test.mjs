import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,access,symlink} from 'node:fs/promises';
import path from 'node:path';
import {createManagedPage,getManagedPage,listManagedPages,mutateManagedPage} from './azura-dynamic-pages-management.mjs';
import {readPublishedDynamicPage,listDynamicPageNavigation} from './azura-dynamic-pages-storage.mjs';
import {listDynamicPageImages,saveDynamicPageImage} from './azura-homepage-media.mjs';
import {readJsonRequest} from './azura-json-request.mjs';
import {DynamicPageError} from './azura-pages/validation.mjs';
process.env.DYNAMIC_FIXTURE_ONLY='1';
const {fixture,setup}=await import('./azura-dynamic-pages.test.mjs');
export function draftInput(){const {id,status,createdAt,updatedAt,...input}=fixture().draft;return input;}
const status=n=>e=>e.status===n;
test('lifecycle, complete revision, history/restore, slug reservation and media preservation',async t=>{
 const paths=await setup(t);let current=await createManagedPage({draft:draftInput()},paths);const id=current.record.id,file=path.join(paths.contentRoot,'pages',id+'.json');assert.equal(current.record.published,null);assert.equal(await readPublishedDynamicPage('en','example',paths),null);
 current=await mutateManagedPage(id,{action:'publish'},current.revision,paths);const live=structuredClone(current.record.published);const draft=draftInput();draft.slugs.en='new-example';draft.hero.translations.en.title='Draft changed';const originalRevision=current.revision;
 current=await mutateManagedPage(id,{action:'save',draft},current.revision,paths);assert.deepEqual(current.record.published,live);assert.equal((await listDynamicPageNavigation('en',paths))[0].href,'/en/example');assert.equal(current.record.history.length,1);assert.equal(current.record.history[0].createdBy,null);const bytes=await readFile(file);
 for(const action of [{action:'save',draft},{action:'delete'},{action:'restore',versionId:current.record.history[0].versionId}])await assert.rejects(mutateManagedPage(id,action,originalRevision,paths),status(409));assert.deepEqual(await readFile(file),bytes);
 const other=draftInput();for(const l of ['tr','en','de','ru'])other.slugs[l]+='-other';other.slugs.en='example';await assert.rejects(createManagedPage({draft:other},paths),status(409));other.slugs.en='new-example';await assert.rejects(createManagedPage({draft:other},paths),status(409));
 const restoreId=current.record.history[0].versionId;current=await mutateManagedPage(id,{action:'restore',versionId:restoreId},current.revision,paths);assert.equal(current.record.draft.slugs.en,'example');assert.deepEqual(current.record.published,live);assert.equal(current.record.history[0].draft.slugs.en,'new-example');
 for(let i=0;i<5;i++){draft.hero.translations.en.title=`Save ${i}`;current=await mutateManagedPage(id,{action:'save',draft},current.revision,paths);}assert.equal(current.record.history.length,3);
 current=await mutateManagedPage(id,{action:'publish'},current.revision,paths);assert.equal(await readPublishedDynamicPage('en','example',paths),null);assert.equal((await readPublishedDynamicPage('en','new-example',paths)).hero.translations.en.title,'Save 4');
 current=await mutateManagedPage(id,{action:'unpublish'},current.revision,paths);assert.equal(await readPublishedDynamicPage('en','new-example',paths),null);const deleted=await mutateManagedPage(id,{action:'delete'},current.revision,paths);assert.equal(deleted.deleted,true);await assert.rejects(getManagedPage(id,paths),status(404));await access(path.join(paths.uploadsRoot,'dynamic-pages/test.png'));
});
test('global queue: same revision and different pages competing for slug; recovery after errors',async t=>{
 const paths=await setup(t),draft=draftInput();let a=await createManagedPage({draft},paths);const d2=structuredClone(draft);for(const l of ['tr','en','de','ru'])d2.slugs[l]+='-second';const b=await createManagedPage({draft:d2},paths);
 const race=await Promise.allSettled([mutateManagedPage(a.record.id,{action:'publish'},a.revision,paths),mutateManagedPage(a.record.id,{action:'publish'},a.revision,paths)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.find(r=>r.status==='rejected').reason.status,409);a=await getManagedPage(a.record.id,paths);
 const x=structuredClone(draft),y=structuredClone(d2);x.slugs.en=y.slugs.en='contended';const saves=await Promise.allSettled([mutateManagedPage(a.record.id,{action:'save',draft:x},a.revision,paths),mutateManagedPage(b.record.id,{action:'save',draft:y},b.revision,paths)]);assert.equal(saves.filter(r=>r.status==='fulfilled').length,1);assert.equal(saves.find(r=>r.status==='rejected').reason.status,409);
 // Simulate old/external conflicting drafts: publication must recheck under the global queue.
 const ar=(await getManagedPage(a.record.id,paths)).record,br=(await getManagedPage(b.record.id,paths)).record;ar.draft.slugs.en=br.draft.slugs.en='externally-conflicting';await writeFile(path.join(paths.contentRoot,'pages',ar.id+'.json'),JSON.stringify(ar));await writeFile(path.join(paths.contentRoot,'pages',br.id+'.json'),JSON.stringify(br));
 const publish=await Promise.allSettled([ar,br].map(async r=>mutateManagedPage(r.id,{action:'publish'},(await getManagedPage(r.id,paths)).revision,paths)));assert.ok(publish.every(r=>r.status==='rejected'&&r.reason.status===409));
 const fresh=await getManagedPage(br.id,paths);await mutateManagedPage(br.id,{action:'delete'},fresh.revision,paths);const next=await getManagedPage(ar.id,paths);await mutateManagedPage(ar.id,{action:'publish'},next.revision,paths);
});
test('strict bodies, static paths, foreign history, section limits and safe images',async t=>{
 const paths=await setup(t),draft=draftInput();await assert.rejects(createManagedPage({draft,id:'x'},paths));for(const bad of ['rooms','zimmer','panel']){const d=structuredClone(draft);d.slugs.en=bad;await assert.rejects(createManagedPage({draft:d},paths));}
 const created=await createManagedPage({draft},paths);await assert.rejects(mutateManagedPage(created.record.id,{action:'restore',versionId:'22222222-2222-4222-8222-222222222222'},created.revision,paths),status(404));
 for(const mutate of [d=>d.hero.image='/uploads/blog/test.png',d=>d.sections[0].variant='unknown',d=>d.id='x',d=>delete d.seo.ru,d=>d.sections[1].translations.en.buttonHref='data:text/html,x',d=>d.sections=Array.from({length:101},(_,i)=>({...d.sections[0],id:`section-${i}`}))]){const d=structuredClone(draft);mutate(d);await assert.rejects(mutateManagedPage(created.record.id,{action:'save',draft:d},created.revision,paths));}
 const bytes=await readFile(path.join(paths.uploadsRoot,'dynamic-pages/test.png'));const uploaded=await saveDynamicPageImage(bytes,'image/png',paths);assert.equal(uploaded.width,80);assert.equal((await listDynamicPageImages(paths)).length,2);draft.hero.image=uploaded.image;await mutateManagedPage(created.record.id,{action:'save',draft},created.revision,paths);
 await symlink('/etc/hosts',path.join(paths.uploadsRoot,'dynamic-pages/bad.png'));assert.equal((await listDynamicPageImages(paths)).length,2);await assert.rejects(saveDynamicPageImage(Buffer.from('fake'),'image/png',paths));assert.equal((await listManagedPages(paths)).pages.length,1);
});
test('bounded JSON streaming works without Content-Length',async()=>{
 const req=new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json'},body:new ReadableStream({start(c){c.enqueue(new Uint8Array(129*1024));c.close();}}),duplex:'half'});await assert.rejects(readJsonRequest(req,DynamicPageError),status(413));
 await assert.rejects(readJsonRequest(new Request('http://localhost',{method:'POST',body:'{}'}),DynamicPageError),status(415));
});
test('parallel creation reserves drafts; missing setup is explicit; paragraph whitespace stays intact',async t=>{
 const paths=await setup(t),draft=draftInput();draft.sections[0].translations.tr.text='  İlk paragraf\n\nİkinci paragraf  ';
 const results=await Promise.allSettled([createManagedPage({draft},paths),createManagedPage({draft},paths)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 const result=results.find(r=>r.status==='fulfilled').value;assert.equal(result.record.draft.sections[0].translations.tr.text,draft.sections[0].translations.tr.text);
 const bad=structuredClone(draft);bad.hero.translations.en.title='x'.repeat(100001);const file=path.join(paths.contentRoot,'pages',result.record.id+'.json'),before=await readFile(file);await assert.rejects(mutateManagedPage(result.record.id,{action:'save',draft:bad},result.revision,paths));assert.deepEqual(await readFile(file),before);
 const absent={contentRoot:path.join(paths.contentRoot,'absent'),uploadsRoot:path.join(paths.uploadsRoot,'absent')};await assert.rejects(listManagedPages(absent),status(503));await assert.rejects(listDynamicPageImages(absent),status(503));
});
