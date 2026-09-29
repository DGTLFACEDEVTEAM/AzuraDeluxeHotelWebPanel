import {createHash,randomUUID} from 'node:crypto';
import {realpath,lstat,unlink,open} from 'node:fs/promises';
import path from 'node:path';
import {resolveAzuraPaths,LOCALES} from './azura-homepage-storage.mjs';
import {canonicalJson,enqueuePageWrite,writePageAtomically} from './azura-page-storage.mjs';
import {createPageValidators} from './azura-page-content-validation.mjs';
import {readDynamicRecords} from './azura-dynamic-pages-storage.mjs';
import {DynamicPageError,validatePageId,validateDynamicRecord,dynamicImages} from './azura-pages/validation.mjs';
import {readDynamicPageImage} from './azura-homepage-media.mjs';
const {keys}=createPageValidators('dynamic',DynamicPageError);
const FIELDS=['schemaVersion','template','slugs','showContactSection','hero','navigation','seo','sections'];
export const MAX_PAGE_RECORD_BYTES=4*1024*1024;
export async function requirePagesDirectory(paths=resolveAzuraPaths()){
 try{const root=await realpath(paths.contentRoot),dir=path.join(root,'pages'),stat=await lstat(dir);if(!stat.isDirectory()||stat.isSymbolicLink()||await realpath(dir)!==dir)throw new DynamicPageError('Güvensiz pages dizini.');return dir;}
 catch(e){if(e.code==='ENOENT')throw new DynamicPageError('Dinamik sayfa dizini kurulmamış; seed:dynamic-pages çalıştırın.',503);throw e;}
}
export function dynamicPageRevision(record){validateDynamicRecord(record,record.id);return createHash('sha256').update(canonicalJson(record)).digest('hex');}
const response=record=>({record,revision:dynamicPageRevision(record)});
export function pageHistoryLimit(){const v=process.env.AZURA_PAGE_HISTORY_LIMIT;if(v===undefined||v==='')return 3;const n=Number(v);if(!Number.isSafeInteger(n)||n<1||n>100)throw new DynamicPageError('AZURA_PAGE_HISTORY_LIMIT 1–100 tam sayı olmalı.',503);return n;}
async function records(paths){await requirePagesDirectory(paths);return readDynamicRecords(paths);}
function find(all,id){validatePageId(id);const record=all.find(r=>r.id===id);if(!record)throw new DynamicPageError('Sayfa bulunamadı.',404);return record;}
export async function listManagedPages(paths=resolveAzuraPaths()){return {pages:(await records(paths)).map(response)};}
export async function getManagedPage(id,paths=resolveAzuraPaths()){return response(find(await records(paths),id));}
function editable(input,id,createdAt,updatedAt){keys(input,FIELDS,'draft');return {...structuredClone(input),id,status:'draft',createdAt,updatedAt};}
function content(draft){return Object.fromEntries(FIELDS.map(k=>[k,draft[k]]));}
function limits(draft){if(draft.sections.length>100)throw new DynamicPageError('En fazla 100 bölüm olabilir.');for(const s of draft.sections)for(const key of ['images','cards','options'])if(s[key]?.length>200)throw new DynamicPageError('Koleksiyon en fazla 200 öğe olabilir.');}
async function media(draft,paths){limits(draft);for(const src of dynamicImages(draft)){try{await readDynamicPageImage(src,paths);}catch(e){throw new DynamicPageError(`Geçersiz veya bulunamayan dinamik görsel: ${src}`);}}}
function conflicts(all,draft,id){for(const r of all){if(r.id===id)continue;for(const p of [r.draft,r.published].filter(Boolean))for(const l of LOCALES)if(p.slugs[l]===draft.slugs[l])throw new DynamicPageError(`${l} slug başka sayfanın taslağında veya yayınında kullanılıyor: ${draft.slugs[l]}`,409);}}
function snapshot(record,now,limit){record.history=[{versionId:randomUUID(),createdAt:now,action:'draft-save',createdBy:null,wasPublished:Boolean(record.published),draft:structuredClone(record.draft)},...record.history].slice(0,limit);}
async function save(record,dir,exclusive=false){validateDynamicRecord(record,record.id);if(Buffer.byteLength(JSON.stringify(record,null,2)+'\n')>MAX_PAGE_RECORD_BYTES)throw new DynamicPageError('Geçmiş dahil kayıt 4 MiB sınırını aşıyor.',413);await writePageAtomically(record,path.join(dir,record.id+'.json'),{exclusive});return response(record);}
export async function createManagedPage(body,paths=resolveAzuraPaths()){
 keys(body,['draft'],'create');const input=structuredClone(body.draft),dir=await requirePagesDirectory(paths);
 return enqueuePageWrite(dir,async()=>{const all=await records(paths),id=randomUUID(),now=new Date().toISOString(),draft=editable(input,id,now,now);const record={storageVersion:2,id,createdAt:now,updatedAt:now,publishedAt:null,history:[],draft,published:null};validateDynamicRecord(record,id);await media(draft,paths);conflicts(all,draft,id);return save(record,dir,true);});
}
// The optional callback invalidates old/new published paths using the exact locked snapshots.
export async function mutateManagedPage(id,body,revision,paths=resolveAzuraPaths(),invalidate=()=>{}){
 validatePageId(id);if(!['save','publish','unpublish','restore','delete'].includes(body?.action))throw new DynamicPageError('Geçersiz işlem.');
 keys(body,body.action==='save'?['action','draft']:body.action==='restore'?['action','versionId']:['action'],'operation');const input=structuredClone(body),dir=await requirePagesDirectory(paths);
 return enqueuePageWrite(dir,async()=>{
  const all=await records(paths),record=find(all,id);if(dynamicPageRevision(record)!==revision)throw new DynamicPageError('Sayfa başka bir işlemle değişti.',409);
  const before=structuredClone(record),now=new Date(Math.max(Date.now(),Date.parse(record.updatedAt)+1)).toISOString();
  if(input.action==='delete'){await unlink(path.join(dir,id+'.json'));const handle=await open(dir,'r');try{await handle.sync();}finally{await handle.close();}await invalidate(before,null);return {deleted:true,...response(before)};}
  if(input.action==='save'||input.action==='restore'){
   let draftInput=input.draft;
   if(input.action==='restore'){validatePageId(input.versionId);const version=record.history.find(h=>h.versionId===input.versionId);if(!version)throw new DynamicPageError('Bu sayfaya ait sürüm bulunamadı.',404);draftInput=content(version.draft);}
   const draft=editable(draftInput,id,record.createdAt,now);validateDynamicRecord({...record,draft},id);await media(draft,paths);conflicts(all,draft,id);
   if(input.action==='restore'||canonicalJson(content(record.draft))!==canonicalJson(content(draft)))snapshot(record,now,pageHistoryLimit());
   record.draft=draft;
  }
  if(input.action==='publish'){await media(record.draft,paths);conflicts(all,record.draft,id);record.published={...structuredClone(record.draft),status:'published',updatedAt:now};record.publishedAt=now;}
  if(input.action==='unpublish'){record.published=null;record.publishedAt=null;}
  record.updatedAt=now;const result=await save(record,dir);await invalidate(before,record);return result;
 });
}
