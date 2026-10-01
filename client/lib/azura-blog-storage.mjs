import {blogContractVersion} from './azura-blog-version.mjs';
import {validateBlogV3,assertBlogV3AddressAvailability,resolvePublishedBlogV3} from './azura-blog-v3.mjs';
import {constants} from 'node:fs';
import {open,readdir,realpath,lstat} from 'node:fs/promises';
import path from 'node:path';
import {LOCALES,resolveAzuraPaths} from './azura-homepage-storage.mjs';
import {readBlogImage} from './azura-homepage-media.mjs';
export {BlogContentError,validBlogSlug,validateBlogRecord,MAX_BLOG_JSON_BYTES} from './azura-blog-schema.mjs';
import {BlogContentError,validBlogSlug,validateBlogRecord,MAX_BLOG_JSON_BYTES} from './azura-blog-schema.mjs';
export function validateConfiguredBlogRecord(record,slug) {
 const version=blogContractVersion();
 if(record?.storageVersion!==version){const error=new BlogContentError(`Blog verisi V${version} ile uyumsuz; yedekli migration gerekli.`,503);error.code='BLOG_MIGRATION_REQUIRED';throw error;}
 if(record.slug!==slug)throw new BlogContentError('Blog dosya anahtarı eşleşmiyor.');
 return version===3?validateBlogV3(record):validateBlogRecord(record,slug);
}
export async function readBlogRecords(paths=resolveAzuraPaths()) {
 blogContractVersion();
 let directory;try{directory=await blogPostsDirectory(paths);}catch(error){if(error.code==='ENOENT')return [];throw error;}
 const records=[];
 for(const name of await readdir(directory))if(name.endsWith('.json')){const record=await readBlogRecord(name.slice(0,-5),paths);if(record)records.push(record);}
 if(blogContractVersion()===3)assertBlogV3AddressAvailability(records);
 return records;
}
export async function resolvePublicBlogPost(slug,locale,paths=resolveAzuraPaths()) {
 if(blogContractVersion()===2){const published=await readPublishedBlogPost(slug,paths);return published?{published,redirect:false,href:`/${locale}/news/${slug}`}:null;}
 const result=resolvePublishedBlogV3(await readBlogRecords(paths),locale,slug);
 if(result)await inspectPublishedBlogMedia(result.published,paths);
 return result;
}
async function inspectPublishedBlogMedia(published,paths){
 for(const src of new Set([published.coverImage,...published.contentBlocks.map(b=>b.image)].filter(Boolean)))await readBlogImage(src,paths);
}
export async function blogPostsDirectory(paths=resolveAzuraPaths()) {
 const root=await realpath(paths.contentRoot);let directory=root;
 for(const part of ['blog','posts']){directory=path.join(directory,part);if((await lstat(directory)).isSymbolicLink()||await realpath(directory)!==directory||!(await lstat(directory)).isDirectory())throw new BlogContentError('Güvenli olmayan blog dizini.');}
 return directory;
}
export async function readBlogRecord(slug,paths=resolveAzuraPaths()) {
 blogContractVersion();
 if(!validBlogSlug(slug))throw new BlogContentError('Geçersiz blog slug.');
 let handle,record;
 try {
  const directory=await blogPostsDirectory(paths);handle=await open(path.join(directory,`${slug}.json`),constants.O_RDONLY|constants.O_NOFOLLOW);
  const stat=await handle.stat();if(!stat.isFile()||stat.size>MAX_BLOG_JSON_BYTES)throw new BlogContentError('Blog kayıt boyutu/türü geçersiz.');
  const bytes=await handle.readFile();if(bytes.length>MAX_BLOG_JSON_BYTES)throw new BlogContentError('Blog kayıt boyutu aşıldı.');
  record=validateConfiguredBlogRecord(JSON.parse(bytes.toString('utf8')),slug);
 } catch(error){if(error.code==='ENOENT')return null;if(error.code==='BLOG_MIGRATION_REQUIRED'||error.code==='BLOG_CONTRACT_CONFIGURATION_ERROR')throw error;throw new BlogContentError(`Blog kaydı okunamadı (${slug}): ${error.message}`);}
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
 if(blogContractVersion()===3){const posts=(await readBlogRecords(paths)).filter(r=>r.published).map(r=>r.published);for(const post of posts)await inspectPublishedBlogMedia(post,paths);return posts.sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.slug.localeCompare(b.slug));}
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
