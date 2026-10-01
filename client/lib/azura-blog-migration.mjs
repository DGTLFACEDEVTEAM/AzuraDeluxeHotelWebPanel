import {constants} from 'node:fs';
import {open,readdir,realpath,lstat,mkdir,rename,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {resolveAzuraPaths} from './azura-homepage-storage.mjs';
import {validBlogSlug,MAX_BLOG_JSON_BYTES} from './azura-blog-schema.mjs';
import {convertBlogV2ToV3,assertBlogV3AddressAvailability} from './azura-blog-v3.mjs';
import {readBlogImage} from './azura-homepage-media.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const check=(condition,message)=>{if(!condition)throw new Error(message);};
async function directory(value) {
 const stat=await lstat(value);check(stat.isDirectory()&&!stat.isSymbolicLink(),`Güvensiz dizin: ${value}`);
 return realpath(value);
}
export async function migrationRoots(options={}) {
 const roots=resolveAzuraPaths({...options,production:true}); // Explicit roots mandatory, even locally.
 for(const key of ['contentRoot','uploadsRoot'])roots[key]=await directory(roots[key]);
 for(const root of [roots.contentRoot,roots.uploadsRoot]){
  const child=path.join(root,'blog');check(await directory(child)===child,`Güvensiz blog dizini: ${child}`);
 }
 return roots;
}
async function bytesAt(file,max=MAX_BLOG_JSON_BYTES) {
 const h=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const stat=await h.stat();check(stat.isFile()&&stat.size<=max,`Geçersiz dosya: ${file}`);const bytes=await h.readFile();check(bytes.length<=max,`Dosya sınırı: ${file}`);return bytes;}finally{await h.close();}
}
async function durableWrite(file,bytes) {
 const h=await open(file,'wx',0o600);try{await h.writeFile(bytes);await h.sync();}finally{await h.close();}
}
async function syncDir(dir){const h=await open(dir,'r');try{await h.sync();}finally{await h.close();}}
const manifestOf=entries=>entries.map(({name,bytes})=>({name,size:bytes.length,sha256:hash(bytes)}));
function equalManifest(actual,expected){check(isDeepStrictEqual(actual,expected),'Kaynak/yedek manifesti değişti veya eşleşmiyor.');}
async function inventory(dir) {
 check(await directory(dir)===dir,`Güvensiz posts dizini: ${dir}`);
 const entries=[];
 for(const name of (await readdir(dir)).sort()){
  check(name.endsWith('.json')&&validBlogSlug(name.slice(0,-5)),`Beklenmeyen dosya: ${name}`);
  entries.push({name,bytes:await bytesAt(path.join(dir,name))});
 }
 return entries;
}
export async function scanBlogMigration(roots,dir=path.join(roots.contentRoot,'blog/posts')) {
 const entries=await inventory(dir),records=[],media=new Map();
 for(const entry of entries){
  let original;try{original=JSON.parse(entry.bytes.toString('utf8'));}catch{throw new Error(`Bozuk JSON: ${entry.name}`);}
  check(original.slug===entry.name.slice(0,-5),`Dosya/teknik slug eşleşmiyor: ${entry.name}`);
  const converted=convertBlogV2ToV3(original);
  if(original.storageVersion===2){
   const projected=structuredClone(converted);projected.storageVersion=2;delete projected.aliases;
   for(const p of [projected.draft,projected.published])if(p)delete p.slugs;
   check(isDeepStrictEqual(projected,original),`İçerik eşliği bozuldu: ${entry.name}`);
  }
  for(const p of [original.draft,original.published])if(p){
   for(const src of [p.coverImage,...p.contentBlocks.map(b=>b.image)].filter(Boolean))if(!media.has(src)){
    const image=await readBlogImage(src,roots);media.set(src,hash(image.bytes));
   }
  }
  entry.convert=original.storageVersion===2;
  entry.output=entry.convert?Buffer.from(JSON.stringify(converted,null,2)+'\n'):entry.bytes;
  check(entry.output.length<=MAX_BLOG_JSON_BYTES,`V3 dosya sınırı aşılıyor: ${entry.name}`);
  records.push(converted);
 }
 assertBlogV3AddressAvailability(records);
 return {entries,manifest:manifestOf(entries),media:[...media].sort(),records};
}
async function copyEntries(entries,target,output=false){
 await mkdir(target,{mode:0o700});
 for(const e of entries)await durableWrite(path.join(target,e.name),output?e.output:e.bytes);
 await syncDir(target);await syncDir(path.dirname(target));
}
async function lock(parent){
 const file=path.join(parent,'.blog-v3-migration.lock');
 await durableWrite(file,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));await syncDir(parent);
 return async()=>{await unlink(file);await syncDir(parent);};
}
async function event(run,name){await durableWrite(path.join(run,`${name}.json`),JSON.stringify({phase:name,at:new Date().toISOString()}));await syncDir(run);}
// checkpoint is dependency injection for crash tests, never a CLI/environment option.
export async function migrateBlog({apply=false,maintenance=false,checkpoint=async()=>{},...options}={}) {
 const roots=await migrationRoots(options),parent=path.join(roots.contentRoot,'blog'),posts=path.join(parent,'posts');
 check(!apply||maintenance,'--apply için --maintenance-confirmed gerekli; bütün yazıcıları/seed işlemlerini durdurun.');
 const release=apply?await lock(parent):null;
 let run;
 try{
  check((await lstat(posts)).dev===(await lstat(parent)).dev,'Posts ve staging aynı dosya sisteminde olmalı.');
  const initial=await scanBlogMigration(roots);
  const report={mode:apply?'apply':'dry-run',...roots,total:initial.entries.length,
   convert:initial.entries.filter(e=>e.convert).map(e=>e.name),unchanged:initial.entries.filter(e=>!e.convert).map(e=>e.name),errors:[]};
  if(!apply||report.convert.length===0){if(release)await release();return report;}
  run=path.join(parent,`.blog-v3-${randomUUID()}`);await mkdir(run,{mode:0o700});await syncDir(parent);
  await event(run,'00-started');await checkpoint('scanned',run);
  await copyEntries(initial.entries,path.join(run,'backup'));
  const sourceManifest=initial.manifest;
  const targetManifest=manifestOf(initial.entries.map(e=>({name:e.name,bytes:e.output})));
  await durableWrite(path.join(run,'manifest.json'),JSON.stringify({version:1,roots,source:sourceManifest,target:targetManifest,media:initial.media},null,2)+'\n');await syncDir(run);
  equalManifest(manifestOf(await inventory(path.join(run,'backup'))),sourceManifest);
  await event(run,'10-backup-verified');await checkpoint('backup',run);
  await copyEntries(initial.entries,path.join(run,'staging'),true);
  const staged=await scanBlogMigration(roots,path.join(run,'staging'));
  equalManifest(staged.manifest,targetManifest);equalManifest(staged.media,initial.media);
  await event(run,'20-staging-verified');await checkpoint('staged',run);
  const fresh=await scanBlogMigration(roots);equalManifest(fresh.manifest,sourceManifest);equalManifest(fresh.media,initial.media);
  await event(run,'30-swap-intent');
  // These are TWO renames, not a transaction. Never automatically discard recovery data.
  await rename(posts,path.join(run,'retired'));await syncDir(parent);await syncDir(run);
  await event(run,'40-source-retired');await checkpoint('retired',run);
  await rename(path.join(run,'staging'),posts);await syncDir(parent);await syncDir(run);
  await event(run,'50-installed');await checkpoint('installed',run);
  equalManifest((await scanBlogMigration(roots)).manifest,targetManifest);
  await event(run,'60-complete');await release();
  return {...report,run,backup:path.join(run,'backup'),manifest:path.join(run,'manifest.json'),staging:path.join(run,'staging'),retired:path.join(run,'retired')};
 }catch(error){error.recoveryDirectory=run;error.migrationLock=apply?path.join(parent,'.blog-v3-migration.lock'):undefined;throw error;}
}
// Explicit rollback only when the active bytes still match this migration's target.
// Modified V3 content is NEVER overwritten or converted back automatically.
export async function restoreBlogMigration({run,apply=false,maintenance=false,verifyOnly=false,...options}) {
 const roots=await migrationRoots(options),parent=path.join(roots.contentRoot,'blog');
 check(path.dirname(run)===parent&&/^\.blog-v3-[0-9a-f-]+$/.test(path.basename(run)),'Geçersiz kurtarma dizini.');
 check(await directory(run)===run,'Güvensiz kurtarma dizini.');
 check(!apply||maintenance,'Restore apply için bakım onayı gerekli.');
 check(!(apply&&verifyOnly),'Yedek doğrulaması salt okunurdur.');
 let restore;
 const release=apply?await lock(parent):null;
 try{
  const manifest=JSON.parse((await bytesAt(path.join(run,'manifest.json'),64*1024*1024)).toString('utf8'));
  check(manifest.version===1&&isDeepStrictEqual(manifest.roots,roots),'Manifest kökleri eşleşmiyor.');
  const backup=await scanBlogMigration(roots,path.join(run,'backup'));
  equalManifest(backup.manifest,manifest.source);
  if(verifyOnly)return {mode:'backup-verified',run,...roots,files:manifest.source};
  const current=await scanBlogMigration(roots);equalManifest(current.manifest,manifest.target);
  if(!apply)return {mode:'restore-dry-run',run,...roots,verified:true};
  restore=path.join(parent,`.blog-v3-${randomUUID()}`);await mkdir(restore,{mode:0o700});await syncDir(parent);
  await durableWrite(path.join(restore,'restore-from.json'),JSON.stringify({run}));
  await copyEntries(backup.entries,path.join(restore,'staging'));
  equalManifest(manifestOf(await inventory(path.join(restore,'staging'))),manifest.source);
  equalManifest((await scanBlogMigration(roots)).manifest,manifest.target);
  await rename(path.join(parent,'posts'),path.join(restore,'retired'));await syncDir(parent);await syncDir(restore);
  await rename(path.join(restore,'staging'),path.join(parent,'posts'));await syncDir(parent);await syncDir(restore);
  equalManifest((await scanBlogMigration(roots)).manifest,manifest.source);
  await event(restore,'60-restored');await release();return {mode:'restored',run:restore,originalBackup:run,...roots};
 }catch(error){error.recoveryDirectory=restore??run;error.migrationLock=apply?path.join(parent,'.blog-v3-migration.lock'):undefined;throw error;}
}
