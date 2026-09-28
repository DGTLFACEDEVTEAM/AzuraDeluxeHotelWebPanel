import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {blogFixture} from './azura-blog-test-fixtures.mjs';
import {validateBlogRecord,readPublishedBlogPost,listPublishedBlogPosts,selectBlogTranslation,selectBlogBlockTranslation} from './azura-blog-storage.mjs';
import {readBlogImage} from './azura-homepage-media.mjs';
const root=path.resolve(import.meta.dirname,'..');
test('published isolation, missing vs corrupt, safe files and nonoverwriting setup',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'blog-unit-'));t.after(()=>rm(dir,{recursive:true,force:true}));const paths={contentRoot:path.join(dir,'content'),uploadsRoot:path.join(dir,'uploads')};
 assert.deepEqual(await listPublishedBlogPosts(paths),[]);
 const seed=()=>execFileSync(process.execPath,['scripts/seed-persistent-blog.mjs'],{cwd:root,env:{...process.env,AZURA_CONTENT_ROOT:paths.contentRoot,AZURA_UPLOADS_ROOT:paths.uploadsRoot}});seed();
 const bytes=await sharp({create:{width:8,height:6,channels:3,background:'red'}}).png().toBuffer();await writeFile(path.join(paths.uploadsRoot,'blog/test.png'),bytes);
 const file=path.join(paths.contentRoot,'blog/posts/example.json');const record=blogFixture();await writeFile(file,JSON.stringify(record));seed();assert.deepEqual(JSON.parse(await readFile(file)),record);assert.deepEqual(await readFile(path.join(paths.uploadsRoot,'blog/test.png')),bytes);
 assert.deepEqual(await readPublishedBlogPost('example',paths),record.published);assert.equal((await listPublishedBlogPosts(paths)).length,1);assert.equal(await readPublishedBlogPost('absent',paths),null);
 record.draft.translations.en.title='SECRET EN';await writeFile(file,JSON.stringify(record));assert.equal((await readPublishedBlogPost('example',paths)).translations.en.title,'Public en');
 record.published=null;record.publicationUpdatedAt=null;await writeFile(file,JSON.stringify(record));assert.equal(await readPublishedBlogPost('example',paths),null);assert.deepEqual(await listPublishedBlogPosts(paths),[]);
 await writeFile(file,'{bad');await assert.rejects(readPublishedBlogPost('example',paths));await assert.rejects(listPublishedBlogPosts(paths));assert.equal(await readFile(file,'utf8'),'{bad');
 await assert.rejects(readPublishedBlogPost('../example',paths));await assert.rejects(readBlogImage('/uploads/blog/../test.png',paths));await assert.rejects(readBlogImage('/uploads/gallery/test.png',paths));await symlink(path.join(paths.uploadsRoot,'blog/test.png'),path.join(paths.uploadsRoot,'blog/link.png'));await assert.rejects(readBlogImage('/uploads/blog/link.png',paths));await writeFile(path.join(paths.uploadsRoot,'blog/fake.png'),'fake');await assert.rejects(readBlogImage('/uploads/blog/fake.png',paths));
 await rm(file);await symlink(path.join(paths.uploadsRoot,'blog/test.png'),file);await assert.rejects(readPublishedBlogPost('example',paths));
});
test('strict v2, dates, four languages, block identifiers and translation fallback',()=>{
 const record=blogFixture();assert.equal(validateBlogRecord(record,'example'),record);
 for(const change of [r=>r.storageVersion=1,r=>r.draft.status='published',r=>r.published.publishedAt='2026-02-30T10:00:00.000Z',r=>delete r.published.translations.ru,r=>r.published.contentBlocks[1].id='block-0',r=>r.published.contentBlocks[0].headingLevel='h1',r=>r.published.coverImage='https://outside/a.png',r=>r.slug='../example']){const value=structuredClone(record);change(value);assert.throws(()=>validateBlogRecord(value,'example'));}
 const p=record.published;for(const l of ['tr','en','de','ru'])assert.equal(selectBlogTranslation(p,l).translation,p.translations[l]);
 p.translations.de.title=' ';p.translations.de.content='do not mix';const selected=selectBlogTranslation(p,'de');assert.equal(selected.locale,'tr');assert.equal(selected.translation.content,p.translations.tr.content);
 p.contentBlocks[0].translations.tr={heading:'',content:''};assert.equal(selectBlogBlockTranslation(p.contentBlocks[0],selected.locale),p.contentBlocks[0].translations.en);
});
