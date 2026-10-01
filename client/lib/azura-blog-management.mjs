import {blogContractVersion} from './azura-blog-version.mjs';
import {assertBlogV3AddressAvailability,planBlogV3Publication} from './azura-blog-v3.mjs';
import {createHash} from 'node:crypto';
import {unlink,open} from 'node:fs/promises';
import path from 'node:path';
import {resolveAzuraPaths} from './azura-homepage-storage.mjs';
import {canonicalJson,enqueuePageWrite,writePageAtomically} from './azura-page-storage.mjs';
import {createPageValidators} from './azura-page-content-validation.mjs';
import {readBlogImage} from './azura-homepage-media.mjs';
import {BlogContentError,validBlogSlug,validateConfiguredBlogRecord,readBlogRecords,readBlogRecord,blogPostsDirectory,MAX_BLOG_JSON_BYTES} from './azura-blog-storage.mjs';
const {keys}=createPageValidators('blog',BlogContentError);
export function blogRevision(record){validateConfiguredBlogRecord(record,record.slug);return createHash('sha256').update(canonicalJson(record)).digest('hex');}
function response(record){return {record,revision:blogRevision(record)};}
export async function getBlogPost(slug,paths=resolveAzuraPaths()){
 if(!validBlogSlug(slug))throw new BlogContentError('Geçersiz slug.');
 const record=blogContractVersion()===3?(await readBlogRecords(paths)).find(r=>r.slug===slug):await readBlogRecord(slug,paths);if(!record)throw new BlogContentError('Yazı bulunamadı.',404);return response(record);
}
export async function listBlogPosts(paths=resolveAzuraPaths()){
 const posts=(await readBlogRecords(paths)).map(response);
 posts.sort((a,b)=>b.record.updatedAt.localeCompare(a.record.updatedAt)||a.record.slug.localeCompare(b.record.slug));return {posts};
}

function draftContent(input,slug,timestamp){
 keys(input,['coverImage','publishedAt','translations','contentBlocks',...(blogContractVersion()===3?['slugs']:[])],'draft');
 return {slug,status:'draft',updatedAt:timestamp,...structuredClone(input)};
}
async function inspectDraft(post,paths){
 for(const src of new Set([post.coverImage,...post.contentBlocks.map(b=>b.image)].filter(Boolean))){
  try{await readBlogImage(src,paths);}catch{throw new BlogContentError('Blog görseli bulunamadı veya güvenli/geçerli değil.');}
 }
}
async function save(record,file,exclusive=false){
 validateConfiguredBlogRecord(record,record.slug);
 if(Buffer.byteLength(JSON.stringify(record,null,2)+'\n')>MAX_BLOG_JSON_BYTES)throw new BlogContentError('Blog kayıt boyutu 2 MiB sınırını aşıyor.',413);
 try{await writePageAtomically(record,file,{exclusive});}catch(e){if(e.code==='EEXIST')throw new BlogContentError('Slug zaten kullanılıyor.',409);throw e;}
 return response(record);
}
export async function createBlogPost(body,paths=resolveAzuraPaths()){
 keys(body,['slug','draft'],'create');if(!validBlogSlug(body.slug))throw new BlogContentError('Geçersiz slug.');
 const input=structuredClone(body);const directory=await blogPostsDirectory(paths);
 return enqueuePageWrite(directory,async()=>{
  const records=blogContractVersion()===3?await readBlogRecords(paths):[];
  if(await readBlogRecord(input.slug,paths))throw new BlogContentError('Slug zaten kullanılıyor.',409);
  const now=new Date().toISOString(),draft=draftContent(input.draft,input.slug,now);
  const record={storageVersion:blogContractVersion(),slug:input.slug,createdAt:now,updatedAt:now,publicationUpdatedAt:null,draft,published:null};
  if(record.storageVersion===3){record.aliases={tr:[],en:[],de:[],ru:[]};assertBlogV3AddressAvailability([...records,record]);}
  validateConfiguredBlogRecord(record,input.slug);await inspectDraft(draft,paths);
  return save(record,path.join(directory,`${input.slug}.json`),true);
 });
}
export async function mutateBlogPost(slug,body,revision,paths=resolveAzuraPaths()){
 if(!validBlogSlug(slug))throw new BlogContentError('Geçersiz slug.');
 if(!body||!['save','publish','unpublish'].includes(body.action))throw new BlogContentError('Geçersiz işlem.');
 keys(body,body.action==='save'?['action','draft']:['action'],'operation');const input=structuredClone(body);
 const directory=await blogPostsDirectory(paths);
 return enqueuePageWrite(directory,async()=>{
  let {record,revision:current}=await getBlogPost(slug,paths);if(current!==revision)throw new BlogContentError('Yazı başka bir işlemle değişti.',409);
  const now=new Date(Math.max(Date.now(),Date.parse(record.updatedAt)+1)).toISOString();
  if(input.action==='save'){record.draft=draftContent(input.draft,slug,now);validateConfiguredBlogRecord(record,slug);await inspectDraft(record.draft,paths);}
  if(input.action==='publish'){await inspectDraft(record.draft,paths);if(record.storageVersion===3)record=planBlogV3Publication(await readBlogRecords(paths),slug,now);else{record.published={...structuredClone(record.draft),status:'published'};record.publicationUpdatedAt=now;}}
  if(input.action==='unpublish'){record.published=null;record.publicationUpdatedAt=null;}
  if(record.storageVersion===3)assertBlogV3AddressAvailability((await readBlogRecords(paths)).map(r=>r.slug===slug?record:r));
  record.updatedAt=now;return save(record,path.join(directory,`${slug}.json`));
 });
}
export async function deleteBlogPost(slug,revision,paths=resolveAzuraPaths()){
 if(!validBlogSlug(slug))throw new BlogContentError('Geçersiz slug.');const directory=await blogPostsDirectory(paths);
 return enqueuePageWrite(directory,async()=>{
  const current=await getBlogPost(slug,paths);if(current.revision!==revision)throw new BlogContentError('Yazı başka bir işlemle değişti.',409);
  await unlink(path.join(directory,`${slug}.json`));const handle=await open(directory,'r');try{await handle.sync();}finally{await handle.close();}
  return {deleted:true,slug}; // No physical media is ever removed.
 });
}
