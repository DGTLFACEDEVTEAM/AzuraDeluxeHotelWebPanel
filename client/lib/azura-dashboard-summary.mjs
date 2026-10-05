import {constants} from 'node:fs';
import {open,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {resolveAzuraPaths,LOCALES} from './azura-homepage-storage.mjs';
import {canonicalJson} from './azura-page-storage.mjs';
import {validateGalleryContent} from './azura-gallery-storage.mjs';
import {readBlogRecords,blogPostsDirectory} from './azura-blog-storage.mjs';
import {readDynamicRecords} from './azura-dynamic-pages-storage.mjs';
import {requirePagesDirectory} from './azura-dynamic-pages-management.mjs';
import {blogContractVersion} from './azura-blog-version.mjs';
import {hasValidServiceToken,serviceTokenConfigured} from './azura-service-auth.mjs';
const SECTIONS=['gallery','blog','pages'];
export function parseSummaryQuery(url){
 const query=new URL(url).searchParams;
 for(const key of query.keys())if(!['sections','limit'].includes(key)||query.getAll(key).length!==1)throw new Error('Geçersiz sorgu.');
 const sections=query.has('sections')?query.get('sections').split(','):SECTIONS;
 const limit=query.has('limit')?query.get('limit'):'5';
 if(!sections.length||new Set(sections).size!==sections.length||sections.some(s=>!SECTIONS.includes(s))||!/^([1-9]|1[0-9]|20)$/.test(limit))throw new Error('Geçersiz sorgu.');
 return {sections,limit:Number(limit)};
}
async function gallerySummary(paths){
 const root=await realpath(paths.contentRoot),dir=path.join(root,'gallery');
 const stat=await lstat(dir);
 if(!stat.isDirectory()||stat.isSymbolicLink()||await realpath(dir)!==dir)throw new Error('Unsafe directory');
 const file=await open(path.join(dir,'gallery.json'),constants.O_RDONLY|constants.O_NOFOLLOW);
 try{
  if(!(await file.stat()).isFile())throw new Error('Invalid file');
  // Bounded streaming read: never allocate an unbounded gallery JSON buffer.
  const chunks=[];let size=0;
  for await(const chunk of file.createReadStream({autoClose:false})){size+=chunk.length;if(size>16*1024*1024)throw new Error('Gallery JSON limit');chunks.push(chunk);}
  const gallery=validateGalleryContent(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  return {categoryCount:gallery.categories.length,imageCount:gallery.categories.reduce((n,c)=>n+c.images.length,0)};
 }finally{await file.close();}
}
function comparable(snapshot,kind){
 const ignored=kind==='blog'?['status','updatedAt','hasUnpublishedChanges']:['status','createdAt','updatedAt'];
 return canonicalJson(Object.fromEntries(Object.entries(snapshot).filter(([key])=>!ignored.includes(key))));
}
export function summarizeRecords(records,kind,limit){
 const items=records.map(record=>{
  const translations=kind==='blog'?record.draft.translations:record.draft.hero.translations;
  const title=LOCALES.map(l=>translations[l]?.title?.trim()).find(Boolean)||(kind==='blog'?'Başlıksız blog yazısı':'Başlıksız sayfa');
  return {...(kind==='blog'?{slug:record.slug}:{id:record.id}),title,status:record.published?'published':'draft',hasUnpublishedChanges:Boolean(record.published&&comparable(record.draft,kind)!==comparable(record.published,kind)),updatedAt:kind==='blog'?record.draft.updatedAt:record.updatedAt};
 }).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)||((a.slug||a.id)<(b.slug||b.id)?-1:1));
 const draftCount=items.filter(i=>i.status==='draft').length,changedCount=items.filter(i=>i.hasUnpublishedChanges).length;
 const latest=kind==='blog'?[...records].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.slug.localeCompare(b.slug))[0]:null;
 const latestItem=latest?items.find(item=>item.slug===latest.slug):null;
 const pending=items.filter(i=>i.status==='draft'||(kind==='blog'&&i.hasUnpublishedChanges));
 return {total:items.length,currentPublishedCount:items.length-draftCount-changedCount,changedCount,draftCount,
  ...(kind==='blog'?{latestPost:latestItem?{slug:latestItem.slug,title:latestItem.title}:null}:{}),
  notifications:{total:pending.length,items:pending.slice(0,limit)}};
}
export async function readDashboardSummary({sections=SECTIONS,limit=5}={},paths=resolveAzuraPaths()){
 return Object.fromEntries(await Promise.all(sections.map(async section=>{
  try{
   if(!(await lstat(await realpath(paths.contentRoot))).isDirectory())throw new Error('Content root missing');
   if(section==='blog')await blogPostsDirectory(paths);
   if(section==='pages')await requirePagesDirectory(paths);
   const data=section==='gallery'?await gallerySummary(paths):summarizeRecords(await(section==='blog'?readBlogRecords(paths):readDynamicRecords(paths)),section,limit);
   return [section,{status:'ok',data}];
  }catch(error){return [section,{status:'error',error:{code:error.code==='BLOG_MIGRATION_REQUIRED'?error.code:'SUMMARY_SOURCE_UNAVAILABLE',message:'Bu bölümün özeti okunamadı.'}}];}
 })));
}
export async function dashboardSummaryGET(request){
 const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(!serviceTokenConfigured())return json({error:'Servis tokenı yapılandırılmamış.'},503);
 if(!hasValidServiceToken(request.headers.get('authorization')))return json({error:'Yetkisiz erişim.'},401);
 let options;try{options=parseSummaryQuery(request.url);}catch{return json({error:'Geçersiz özet sorgusu.'},400);}
 try{
  if(options.sections.includes('blog')&&blogContractVersion()===3&&request.headers.get('x-azura-blog-contract-version')!=='3')return json({error:'Blog contract version 3 required',code:'BLOG_CONTRACT_VERSION_MISMATCH'},409);
  return json(await readDashboardSummary(options));
 }catch(error){return json({error:'Özet yapılandırması kullanılamıyor.',...(error.code==='BLOG_CONTRACT_CONFIGURATION_ERROR'?{code:error.code}:{})},503);}
}
