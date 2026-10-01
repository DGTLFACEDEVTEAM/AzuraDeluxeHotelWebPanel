import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm,symlink,unlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {blogFixture} from './azura-blog-test-fixtures.mjs';
import {convertBlogV2ToV3} from './azura-blog-v3.mjs';
import {migrateBlog,restoreBlogMigration,migrationRoots} from './azura-blog-migration.mjs';
async function fixture(t){
 const dir=await mkdtemp(path.join(os.tmpdir(),'blog-migrate-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const roots={contentRoot:path.join(dir,'content'),uploadsRoot:path.join(dir,'uploads')};
 await mkdir(path.join(roots.contentRoot,'blog/posts'),{recursive:true});await mkdir(path.join(roots.uploadsRoot,'blog'),{recursive:true});
 await writeFile(path.join(roots.uploadsRoot,'blog/test.png'),await sharp({create:{width:12,height:8,channels:3,background:'blue'}}).png().toBuffer());
 const file=path.join(roots.contentRoot,'blog/posts/example.json');const record=blogFixture();record.draft.translations.tr.content='  paragraf\n\nson\t ';
 await writeFile(file,JSON.stringify(record));return {roots,file,record,parent:path.dirname(path.dirname(file))};
}
test('dry-run CLI is readonly, explicit roots; apply backup/manifest, idempotency and rollback rehearsal',async t=>{
 const {roots,file,record,parent}=await fixture(t),before=await readFile(file);
 const r=await migrateBlog(roots);assert.deepEqual(r.convert,['example.json']);assert.deepEqual(await readFile(file),before);assert.deepEqual(await readdir(parent),['posts']);
 const cli=spawnSync(process.execPath,['scripts/migrate-blog-v3.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,AZURA_CONTENT_ROOT:roots.contentRoot,AZURA_UPLOADS_ROOT:roots.uploadsRoot},encoding:'utf8'});
 assert.equal(cli.status,0,cli.stderr);assert.equal(JSON.parse(cli.stdout).mode,'dry-run');assert.deepEqual(await readFile(file),before);
 await assert.rejects(migrationRoots({contentRoot:'',uploadsRoot:''}));await assert.rejects(migrateBlog({...roots,apply:true}),/maintenance/);
 const applied=await migrateBlog({...roots,apply:true,maintenance:true});
 const actual=JSON.parse(await readFile(file));assert.deepEqual(actual,convertBlogV2ToV3(record));
 const manifest=JSON.parse(await readFile(applied.manifest));assert.equal(manifest.source[0].size,before.length);assert.match(manifest.source[0].sha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(await readFile(path.join(applied.backup,'example.json')),before);
 const bytes=await readFile(file),again=await migrateBlog({...roots,apply:true,maintenance:true});assert.equal(again.convert.length,0);assert.deepEqual(await readFile(file),bytes);
 assert.equal((await restoreBlogMigration({...roots,run:applied.run})).verified,true);
 await restoreBlogMigration({...roots,run:applied.run,apply:true,maintenance:true});assert.deepEqual(await readFile(file),before);
});
test('null published and preexisting V3 bytes remain intact',async t=>{
 const {roots,file,record}=await fixture(t);record.published=null;record.publicationUpdatedAt=null;await writeFile(file,JSON.stringify(record));
 const v3=convertBlogV2ToV3(blogFixture('already'));const v3file=path.join(path.dirname(file),'already.json');const bytes=Buffer.from(JSON.stringify(v3)+'  \n');await writeFile(v3file,bytes);
 await migrateBlog({...roots,apply:true,maintenance:true});assert.equal(JSON.parse(await readFile(file)).published,null);assert.deepEqual(await readFile(v3file),bytes);
});
test('invalid JSON, name, symlink, missing media, collision abort before source changes',async t=>{
 for(const kind of ['json','name','symlink','media','collision'])await t.test(kind,async t=>{
  const {roots,file,record}=await fixture(t);
  if(kind==='json')await writeFile(file,'{');
  if(kind==='name'){record.slug='wrong';await writeFile(file,JSON.stringify(record));}
  if(kind==='symlink'){await unlink(file);await symlink(path.join(roots.uploadsRoot,'blog/test.png'),file);}
  if(kind==='media')await unlink(path.join(roots.uploadsRoot,'blog/test.png'));
  if(kind==='collision'){const other=convertBlogV2ToV3(blogFixture('other'));other.aliases.tr=['example'];await writeFile(path.join(path.dirname(file),'other.json'),JSON.stringify(other));}
  const before=await readFile(file);await assert.rejects(migrateBlog(roots));await assert.rejects(migrateBlog({...roots,apply:true,maintenance:true}));assert.deepEqual(await readFile(file),before);
 });
});
test('changed source rejected; migration lock excludes concurrent apply and survives failure',async t=>{
 const {roots,file,record,parent}=await fixture(t);
 await assert.rejects(migrateBlog({...roots,apply:true,maintenance:true,checkpoint:async phase=>{
  if(phase==='staged'){await assert.rejects(migrateBlog({...roots,apply:true,maintenance:true}),{code:'EEXIST'});record.draft.translations.en.title='new user edit';await writeFile(file,JSON.stringify(record));}
 }}),/manifest/);
 assert.deepEqual(JSON.parse(await readFile(file)),record);assert.ok((await readdir(parent)).includes('.blog-v3-migration.lock'));
});
test('fault checkpoints preserve source, backup, staging and installed data',async t=>{
 for(const point of ['scanned','backup','staged','retired','installed'])await t.test(point,async t=>{
  const {roots,file,parent}=await fixture(t),before=await readFile(file);let run;
  await assert.rejects(migrateBlog({...roots,apply:true,maintenance:true,checkpoint:async(phase,location)=>{run=location;if(phase===point)throw new Error('injected');}}),/injected/);
  assert.ok((await readdir(parent)).includes('.blog-v3-migration.lock'));
  if(point==='retired'){await assert.rejects(readFile(file),{code:'ENOENT'});assert.deepEqual(await readFile(path.join(run,'retired/example.json')),before);assert.equal(JSON.parse(await readFile(path.join(run,'staging/example.json'))).storageVersion,3);}
  else if(point==='installed'){assert.equal(JSON.parse(await readFile(file)).storageVersion,3);assert.deepEqual(await readFile(path.join(run,'retired/example.json')),before);}
  else assert.deepEqual(await readFile(file),before);
  if(point!=='scanned'){assert.deepEqual(await readFile(path.join(run,'backup/example.json')),before);assert.equal((await restoreBlogMigration({...roots,run,verifyOnly:true})).mode,'backup-verified');}
 });
});
test('backup tamper and post-migration user edits block rollback without data loss',async t=>{
 const {roots,file}=await fixture(t);const applied=await migrateBlog({...roots,apply:true,maintenance:true});const bytes=await readFile(file);
 const edited=JSON.parse(bytes);edited.draft.translations.en.title='user edit';await writeFile(file,JSON.stringify(edited));
 await assert.rejects(restoreBlogMigration({...roots,run:applied.run}),/manifest/);assert.deepEqual(JSON.parse(await readFile(file)),edited);
 await writeFile(file,bytes);await writeFile(path.join(applied.backup,'example.json'),'{}');await assert.rejects(restoreBlogMigration({...roots,run:applied.run}));assert.deepEqual(await readFile(file),bytes);
});
