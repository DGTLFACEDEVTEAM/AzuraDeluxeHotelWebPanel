import {constants} from 'node:fs';
import {open,readdir,realpath,lstat} from 'node:fs/promises';
import path from 'node:path';
import {LOCALES,resolveAzuraPaths} from './azura-homepage-storage.mjs';
import {createPageValidators} from './azura-page-content-validation.mjs';
import {readBlogImage} from './azura-homepage-media.mjs';
export class BlogContentError extends Error {
 constructor(message,status=400){super(message);this.name="BlogContentError";this.status=status;}
}
const {keys}=createPageValidators('blog',BlogContentError);
export const MAX_BLOG_JSON_BYTES=2*1024*1024;
export function validBlogSlug(slug) { return typeof slug==='string' && slug.length<=120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug); }
function string(value,label,max) { if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new BlogContentError(`Geçersiz blog metni: ${label}`); }
function date(value,label) { if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)throw new BlogContentError(`Geçersiz blog tarihi: ${label}`); }
function image(value) { if(typeof value!=='string'||(value!==''&&(!/^\/uploads\/blog\/[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(jpg|jpeg|png|webp)$/i.test(value)||value.includes('..'))))throw new BlogContentError('Geçersiz blog görsel yolu.'); }
function post(value,slug,status) {
 keys(value,['slug','status','coverImage','publishedAt','updatedAt','translations','contentBlocks'],'post');
 if(value.slug!==slug||value.status!==status)throw new BlogContentError('Blog kimliği/yayın durumu eşleşmiyor.');
 date(value.publishedAt,'publishedAt');date(value.updatedAt,'updatedAt');image(value.coverImage);
 keys(value.translations,LOCALES,'translations');
 for(const locale of LOCALES){const t=value.translations[locale];keys(t,['title','excerpt','content','seoTitle','seoDescription'],locale);for(const key of Object.keys(t))string(t[key],`${locale}.${key}`,key==='content'?100000:key==='title'||key==='seoTitle'?500:4000);}
 if(!LOCALES.some(l=>value.translations[l].title.trim()))throw new BlogContentError('En az bir dilde başlık gerekli.');
 if(!Array.isArray(value.contentBlocks))throw new BlogContentError('Geçersiz blog blokları.');
 const ids=new Set();for(const b of value.contentBlocks){keys(b,['id','headingLevel','image','translations'],'block');if(typeof b.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(b.id)||ids.has(b.id)||!['h2','h3'].includes(b.headingLevel))throw new BlogContentError('Geçersiz/tekrarlı blok kimliği veya başlık seviyesi.');ids.add(b.id);image(b.image);keys(b.translations,LOCALES,'block.translations');for(const l of LOCALES){keys(b.translations[l],['heading','content'],l);string(b.translations[l].heading,'heading',500);string(b.translations[l].content,'content',100000);}}
}
export function validateBlogRecord(record,slug) {
 if(!validBlogSlug(slug))throw new BlogContentError('Geçersiz blog slug.');
 keys(record,['storageVersion','slug','createdAt','updatedAt','publicationUpdatedAt','draft','published'],'record');
 if(record.storageVersion!==2||record.slug!==slug)throw new BlogContentError('Geçersiz blog storageVersion/slug.');
 date(record.createdAt,'createdAt');date(record.updatedAt,'updatedAt');
 post(record.draft,slug,'draft');
 if(record.published!==null){date(record.publicationUpdatedAt,'publicationUpdatedAt');post(record.published,slug,'published');}
 else if(record.publicationUpdatedAt!==null)throw new BlogContentError('Yayımsız kaydın publicationUpdatedAt alanı null olmalı.');
 return record;
}
export async function blogPostsDirectory(paths=resolveAzuraPaths()) {
 const root=await realpath(paths.contentRoot);let directory=root;
 for(const part of ['blog','posts']){directory=path.join(directory,part);if((await lstat(directory)).isSymbolicLink()||await realpath(directory)!==directory||!(await lstat(directory)).isDirectory())throw new BlogContentError('Güvenli olmayan blog dizini.');}
 return directory;
}
export async function readBlogRecord(slug,paths=resolveAzuraPaths()) {
 if(!validBlogSlug(slug))throw new BlogContentError('Geçersiz blog slug.');
 let handle,record;
 try {
  const directory=await blogPostsDirectory(paths);handle=await open(path.join(directory,`${slug}.json`),constants.O_RDONLY|constants.O_NOFOLLOW);
  const stat=await handle.stat();if(!stat.isFile()||stat.size>MAX_BLOG_JSON_BYTES)throw new BlogContentError('Blog kayıt boyutu/türü geçersiz.');
  const bytes=await handle.readFile();if(bytes.length>MAX_BLOG_JSON_BYTES)throw new BlogContentError('Blog kayıt boyutu aşıldı.');
  record=validateBlogRecord(JSON.parse(bytes.toString('utf8')),slug);
 } catch(error){if(error.code==='ENOENT')return null;throw new BlogContentError(`Blog kaydı okunamadı (${slug}): ${error.message}`);}
 finally {if(handle)await handle.close();}
 return record;
}
export async function readPublishedBlogPost(slug,paths=resolveAzuraPaths()) {
 const record=await readBlogRecord(slug,paths);
 if(!record?.published)return null;
 // Draft assets are not read/rendered. Only the published snapshot reaches callers.
 const published=record.published;
 for(const src of new Set([published.coverImage,...published.contentBlocks.map(b=>b.image)].filter(Boolean))){try{await readBlogImage(src,paths);}catch(error){throw new BlogContentError(`Yayımlanmış blog görseli okunamadı (${slug}): ${error.message}`);}}
 return published;
}
export async function listPublishedBlogPosts(paths=resolveAzuraPaths()) {
 let directory;try{directory=await blogPostsDirectory(paths);}catch(error){if(error.code==='ENOENT')return [];throw error;}
 const posts=[];for(const name of await readdir(directory)){if(!name.endsWith('.json'))continue;const post=await readPublishedBlogPost(name.slice(0,-5),paths);if(post)posts.push(post);}
 return posts.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.slug.localeCompare(b.slug));
}
export function selectBlogTranslation(post,locale) {
 const selected=[locale,...LOCALES.filter(l=>l!==locale)].find(l=>post.translations[l]?.title.trim());
 if(!selected)throw new BlogContentError('Okunabilir blog çevirisi yok.');
 return {locale:selected,translation:post.translations[selected]};
}
export function selectBlogBlockTranslation(block,locale) {
 const selected=[locale,...LOCALES.filter(l=>l!==locale)].find(l=>block.translations[l]?.heading.trim()||block.translations[l]?.content.trim());
 return block.translations[selected??locale]??{heading:'',content:''};
}
